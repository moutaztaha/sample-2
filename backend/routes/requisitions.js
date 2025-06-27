import express from 'express';
import { runQuery, runStatement } from '../database/connection.js';
import { authenticateToken } from '../middleware/auth.js';
import { logAuditTrail } from '../utils/audit.js';
import { 
  restoreInventoryQuantities,
  validateItemIssue,
  processItemApprovals,
  calculateRequisitionStatus
} from '../utils/requisitionHelpers.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Get all requisitions with filters
router.get('/', async (req, res) => {
  try {
    const { status, requester, page = 1, limit = 50 } = req.query;
    
    let sql = `
      SELECT 
        r.*,
        u.username as requester_name,
        a.username as approver_name,
        COALESCE(COUNT(ri.id), 0) as item_count,
        COALESCE(SUM(ri.quantity * ri.estimated_cost), 0) as total_estimated_cost
      FROM requisitions r
      LEFT JOIN users u ON r.requester_id = u.id
      LEFT JOIN users a ON r.approver_id = a.id
      LEFT JOIN requisition_items ri ON r.id = ri.requisition_id
      WHERE 1=1
    `;
    
    const params = [];

    if (status) {
      sql += ` AND r.status = ?`;
      params.push(status);
    }

    if (requester) {
      sql += ` AND r.requester_id = ?`;
      params.push(requester);
    }

    sql += ` GROUP BY r.id ORDER BY r.created_at DESC`;

    const offset = (page - 1) * limit;
    sql += ` LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    const requisitions = await runQuery(sql, params);
    
    // Get total count for pagination
    let countSql = `SELECT COUNT(DISTINCT r.id) as total FROM requisitions r WHERE 1=1`;
    const countParams = [];

    if (status) {
      countSql += ` AND r.status = ?`;
      countParams.push(status);
    }

    if (requester) {
      countSql += ` AND r.requester_id = ?`;
      countParams.push(requester);
    }

    const countResult = await runQuery(countSql, countParams);
    const total = countResult[0].total;

    res.json({
      requisitions: requisitions || [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total || 0,
        pages: Math.ceil((total || 0) / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching requisitions:', error);
    res.status(500).json({ error: 'Failed to fetch requisitions' });
  }
});

// Get single requisition with items
router.get('/:id', async (req, res) => {
  try {
    const requisitions = await runQuery(`
      SELECT 
        r.*,
        u.username as requester_name,
        a.username as approver_name
      FROM requisitions r
      LEFT JOIN users u ON r.requester_id = u.id
      LEFT JOIN users a ON r.approver_id = a.id
      WHERE r.id = ?
    `, [req.params.id]);

    if (requisitions.length === 0) {
      return res.status(404).json({ error: 'Requisition not found' });
    }

    const requisition = requisitions[0];

    // Get requisition items with approval details
    const items = await runQuery(`
      SELECT 
        ri.*,
        i.name as item_name,
        i.sku,
        i.unit_price as current_unit_price,
        i.quantity as available_quantity,
        u.name as unit_name,
        c.name as category_name
      FROM requisition_items ri
      LEFT JOIN inventory_items i ON ri.item_id = i.id
      LEFT JOIN units u ON i.unit_id = u.id
      LEFT JOIN categories c ON i.category_id = c.id
      WHERE ri.requisition_id = ?
      ORDER BY ri.created_at
    `, [req.params.id]);

    requisition.items = items || [];

    res.json(requisition);
  } catch (error) {
    console.error('Error fetching requisition:', error);
    res.status(500).json({ error: 'Failed to fetch requisition' });
  }
});

// Create new requisition
router.post('/', async (req, res) => {
  try {
    const {
      title,
      description,
      priority,
      required_date,
      department,
      items
    } = req.body;

    if (!title || !items || items.length === 0) {
      return res.status(400).json({ error: 'Title and items are required' });
    }

    // Create requisition
    const requisitionResult = await runStatement(`
      INSERT INTO requisitions (
        title, description, priority, required_date, department,
        requester_id, status
      ) VALUES (?, ?, ?, ?, ?, ?, 'pending')
    `, [
      title,
      description || '',
      priority || 'medium',
      required_date,
      department || '',
      req.user.id
    ]);

    const requisitionId = requisitionResult.id;

    // Add requisition items
    for (const item of items) {
      await runStatement(`
        INSERT INTO requisition_items (
          requisition_id, item_id, quantity, estimated_cost, notes, status
        ) VALUES (?, ?, ?, ?, ?, 'pending')
      `, [
        requisitionId,
        item.item_id,
        item.quantity,
        item.estimated_cost || 0,
        item.notes || ''
      ]);
    }

    await logAuditTrail('requisitions', requisitionId, 'INSERT', null, req.body, req.user.id);

    // Emit real-time update
    if (req.app.get('io')) {
      req.app.get('io').to('requisition_updates').emit('requisition_created', {
        id: requisitionId,
        title,
        requester_name: req.user.username,
        status: 'pending'
      });
    }

    res.status(201).json({ id: requisitionId, message: 'Requisition created successfully' });
  } catch (error) {
    console.error('Error creating requisition:', error);
    res.status(500).json({ error: 'Failed to create requisition' });
  }
});

// Update requisition status with partial approval support
router.put('/:id/approve', async (req, res) => {
  try {
    const { items, approval_notes } = req.body;
    const requisitionId = req.params.id;

    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ error: 'Items array is required for approval' });
    }

    // Get current requisition
    const currentRequisitions = await runQuery('SELECT * FROM requisitions WHERE id = ?', [requisitionId]);
    if (currentRequisitions.length === 0) {
      return res.status(404).json({ error: 'Requisition not found' });
    }

    const currentRequisition = currentRequisitions[0];

    if (currentRequisition.status !== 'pending') {
      return res.status(400).json({ error: 'Only pending requisitions can be approved' });
    }

    // Process item approvals and determine overall status
    const { hasApproved, hasRejected, hasPartial } = await processItemApprovals(requisitionId, items);
    const requisitionStatus = calculateRequisitionStatus(hasApproved, hasRejected, hasPartial);

    // Update requisition
    await runStatement(`
      UPDATE requisitions SET
        status = ?,
        approver_id = ?,
        approval_date = CURRENT_TIMESTAMP,
        approval_notes = ?
      WHERE id = ?
    `, [requisitionStatus, req.user.id, approval_notes || '', requisitionId]);

    await logAuditTrail('requisitions', requisitionId, 'UPDATE', currentRequisition, { 
      status: requisitionStatus, 
      approval_notes,
      items 
    }, req.user.id);

    // Emit real-time update
    if (req.app.get('io')) {
      req.app.get('io').to('requisition_updates').emit('requisition_updated', {
        id: requisitionId,
        status: requisitionStatus,
        approver_name: req.user.username
      });
    }

    res.json({ 
      message: `Requisition ${requisitionStatus.replace('_', ' ')} successfully`,
      status: requisitionStatus
    });
  } catch (error) {
    console.error('Error processing requisition approval:', error);
    res.status(500).json({ error: 'Failed to process requisition approval' });
  }
});

// Issue items from approved requisition
router.put('/:id/issue', async (req, res) => {
  try {
    const { items, issue_notes } = req.body;
    const requisitionId = req.params.id;

    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ error: 'Items array is required for issuing' });
    }

    // Get current requisition
    const currentRequisitions = await runQuery('SELECT * FROM requisitions WHERE id = ?', [requisitionId]);
    if (currentRequisitions.length === 0) {
      return res.status(404).json({ error: 'Requisition not found' });
    }

    const currentRequisition = currentRequisitions[0];

    if (!['approved', 'partially_approved'].includes(currentRequisition.status)) {
      return res.status(400).json({ error: 'Only approved or partially approved requisitions can have items issued' });
    }

    // Process each item issue with validation
    for (const itemIssue of items) {
      const { item_id, issue_quantity, issue_notes: itemNotes } = itemIssue;
      
      if (issue_quantity <= 0) continue;

      // Validate item issue
      await validateItemIssue(requisitionId, item_id, issue_quantity);

      // Update inventory - deduct issued quantity
      const inventoryItems = await runQuery('SELECT quantity FROM inventory_items WHERE id = ?', [item_id]);
      const currentQuantity = inventoryItems[0].quantity;
      const newQuantity = currentQuantity - issue_quantity;
      
      await runStatement(`
        UPDATE inventory_items 
        SET quantity = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [newQuantity, item_id]);

      // Record stock movement
      await runStatement(`
        INSERT INTO stock_movements (
          item_id, movement_type, quantity, reference_type, 
          reference_id, reference_number, notes, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        item_id, 
        'out', 
        issue_quantity, 
        'requisition', 
        requisitionId, 
        `REQ-${requisitionId}`,
        itemNotes || 'Item issued from requisition',
        req.user.id
      ]);

      // Update requisition item with issued quantity
      await runStatement(`
        UPDATE requisition_items SET
          issued_quantity = COALESCE(issued_quantity, 0) + ?,
          issue_notes = ?,
          issued_date = CURRENT_TIMESTAMP,
          issued_by = ?
        WHERE requisition_id = ? AND item_id = ?
      `, [issue_quantity, itemNotes || '', req.user.id, requisitionId, item_id]);
    }

    // Check if all approved items have been fully issued
    const itemsStatus = await runQuery(`
      SELECT 
        SUM(approved_quantity) as total_approved,
        SUM(COALESCE(issued_quantity, 0)) as total_issued
      FROM requisition_items 
      WHERE requisition_id = ? AND approved_quantity > 0
    `, [requisitionId]);

    let newRequisitionStatus = currentRequisition.status;
    
    if (itemsStatus.length > 0) {
      const { total_approved, total_issued } = itemsStatus[0];
      
      if (total_issued >= total_approved) {
        newRequisitionStatus = 'issued';
      } else if (total_issued > 0) {
        newRequisitionStatus = 'partially_issued';
      }
    }

    // Update requisition with issue notes and new status
    await runStatement(`
      UPDATE requisitions SET
        issue_notes = ?,
        issued_date = CURRENT_TIMESTAMP,
        status = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [issue_notes || '', newRequisitionStatus, requisitionId]);

    await logAuditTrail('requisitions', requisitionId, 'UPDATE', currentRequisition, { 
      action: 'issue_items',
      issue_notes,
      items,
      new_status: newRequisitionStatus
    }, req.user.id);

    // Emit real-time update
    if (req.app.get('io')) {
      req.app.get('io').to('requisition_updates').emit('requisition_updated', {
        id: requisitionId,
        action: 'items_issued',
        status: newRequisitionStatus,
        issuer_name: req.user.username
      });
    }

    res.json({ 
      message: 'Items issued successfully',
      status: newRequisitionStatus
    });
  } catch (error) {
    console.error('Error issuing items:', error);
    res.status(500).json({ error: 'Failed to issue items' });
  }
});

// Legacy status update endpoint (for backward compatibility)
router.put('/:id/status', async (req, res) => {
  try {
    const { status, approval_notes } = req.body;
    const requisitionId = req.params.id;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    // Get current requisition
    const currentRequisitions = await runQuery('SELECT * FROM requisitions WHERE id = ?', [requisitionId]);
    if (currentRequisitions.length === 0) {
      return res.status(404).json({ error: 'Requisition not found' });
    }

    const currentRequisition = currentRequisitions[0];

    if (currentRequisition.status !== 'pending') {
      return res.status(400).json({ error: 'Only pending requisitions can be approved or rejected' });
    }

    // Get all items for this requisition
    const items = await runQuery(`
      SELECT ri.*, i.quantity as current_quantity
      FROM requisition_items ri
      JOIN inventory_items i ON ri.item_id = i.id
      WHERE ri.requisition_id = ?
    `, [requisitionId]);

    // Update all items with the same status
    for (const item of items) {
      if (status === 'approved') {
        await runStatement(`
          UPDATE requisition_items SET
            approved_quantity = quantity,
            rejected_quantity = 0,
            status = 'approved'
          WHERE id = ?
        `, [item.id]);
      } else {
        await runStatement(`
          UPDATE requisition_items SET
            approved_quantity = 0,
            rejected_quantity = quantity,
            status = 'rejected'
          WHERE id = ?
        `, [item.id]);
      }
    }

    // Update requisition
    await runStatement(`
      UPDATE requisitions SET
        status = ?,
        approver_id = ?,
        approval_date = CURRENT_TIMESTAMP,
        approval_notes = ?
      WHERE id = ?
    `, [status, req.user.id, approval_notes || '', requisitionId]);

    await logAuditTrail('requisitions', requisitionId, 'UPDATE', currentRequisition, { status, approval_notes }, req.user.id);

    // Emit real-time update
    if (req.app.get('io')) {
      req.app.get('io').to('requisition_updates').emit('requisition_updated', {
        id: requisitionId,
        status,
        approver_name: req.user.username
      });
    }

    res.json({ message: `Requisition ${status} successfully` });
  } catch (error) {
    console.error('Error updating requisition status:', error);
    res.status(500).json({ error: 'Failed to update requisition status' });
  }
});

export default router;