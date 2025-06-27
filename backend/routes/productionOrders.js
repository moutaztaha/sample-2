import express from 'express';
import { runQuery, runStatement } from '../database/connection.js';
import { authenticateToken } from '../middleware/auth.js';
import { logAuditTrail } from '../utils/audit.js';
import { 
  generateProductionOrderNumber, 
  calculateProductionOrderCosts,
  createProductionOrderItemsFromBOM,
  createProductionOrderOperationsFromBOM,
  issueMaterialsForProduction,
  completeProductionOrder,
  updateOperationStatus
} from '../utils/productionOrderHelpers.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Get all production orders with filters
router.get('/', async (req, res) => {
  try {
    const { status, search, page = 1, limit = 50 } = req.query;
    
    let sql = `
      SELECT 
        p.*,
        u.username as created_by_name,
        b.name as bom_name,
        COUNT(DISTINCT poi.id) as material_count,
        COUNT(DISTINCT po.id) as operation_count
      FROM production_orders p
      LEFT JOIN users u ON p.created_by = u.id
      LEFT JOIN bill_of_materials b ON p.bom_id = b.id
      LEFT JOIN production_order_items poi ON p.id = poi.production_order_id
      LEFT JOIN production_order_operations po ON p.id = po.production_order_id
      WHERE 1=1
    `;
    
    const params = [];

    if (status) {
      sql += ` AND p.status = ?`;
      params.push(status);
    }

    if (search) {
      sql += ` AND (p.order_number LIKE ? OR p.title LIKE ? OR p.description LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    sql += ` GROUP BY p.id ORDER BY p.created_at DESC`;

    const offset = (page - 1) * limit;
    sql += ` LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    const productionOrders = await runQuery(sql, params);
    
    // Get total count for pagination
    let countSql = `SELECT COUNT(DISTINCT p.id) as total FROM production_orders p WHERE 1=1`;
    const countParams = [];

    if (status) {
      countSql += ` AND p.status = ?`;
      countParams.push(status);
    }

    if (search) {
      countSql += ` AND (p.order_number LIKE ? OR p.title LIKE ? OR p.description LIKE ?)`;
      countParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const countResult = await runQuery(countSql, countParams);
    const total = countResult[0].total;

    res.json({
      productionOrders: productionOrders || [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total || 0,
        pages: Math.ceil((total || 0) / parseInt(limit))
      }
    });
  } catch (error)  {
    console.error('Error fetching production orders:', error);
    res.status(500).json({ error: 'Failed to fetch production orders' });
  }
});

// Get single production order with details
router.get('/:id', async (req, res) => {
  try {
    const productionOrderId = req.params.id;
    
    // Get production order details
    const orders = await runQuery(`
      SELECT 
        p.*,
        u.username as created_by_name,
        b.name as bom_name,
        b.version as bom_version
      FROM production_orders p
      LEFT JOIN users u ON p.created_by = u.id
      LEFT JOIN bill_of_materials b ON p.bom_id = b.id
      WHERE p.id = ?
    `, [productionOrderId]);

    if (orders.length === 0) {
      return res.status(404).json({ error: 'Production order not found' });
    }

    const order = orders[0];

    // Get production order items (materials)
    const items = await runQuery(`
      SELECT 
        poi.*,
        i.quantity as available_quantity,
        u.name as unit_name,
        u.abbreviation as unit_abbreviation
      FROM production_order_items poi
      LEFT JOIN inventory_items i ON poi.item_id = i.id
      LEFT JOIN units u ON poi.unit_id = u.id
      WHERE poi.production_order_id = ?
      ORDER BY poi.id
    `, [productionOrderId]);

    // Get production order operations
    const operations = await runQuery(`
      SELECT 
        po.*,
        u.username as assigned_to_name
      FROM production_order_operations po
      LEFT JOIN users u ON po.assigned_to = u.id
      WHERE po.production_order_id = ?
      ORDER BY po.sequence_number
    `, [productionOrderId]);

    // Get production order issues (material issuance history)
    const issues = await runQuery(`
      SELECT 
        pi.*,
        u.username as issued_by_name,
        poi.item_name
      FROM production_order_issues pi
      LEFT JOIN users u ON pi.issued_by = u.id
      LEFT JOIN production_order_items poi ON pi.production_order_item_id = poi.id
      WHERE pi.production_order_id = ?
      ORDER BY pi.issued_date DESC
    `, [productionOrderId]);

    // Get production order completions
    const completions = await runQuery(`
      SELECT 
        pc.*,
        u.username as completed_by_name
      FROM production_order_completions pc
      LEFT JOIN users u ON pc.completed_by = u.id
      WHERE pc.production_order_id = ?
      ORDER BY pc.completion_date DESC
    `, [productionOrderId]);

    // Return complete production order with all related data
    res.json({
      ...order,
      items: items || [],
      operations: operations || [],
      issues: issues || [],
      completions: completions || []
    });
  } catch (error) {
    console.error('Error fetching production order details:', error);
    res.status(500).json({ error: 'Failed to fetch production order details' });
  }
});

// Create new production order
router.post('/', async (req, res) => {
  try {
    const {
      title,
      description,
      bom_id,
      quantity,
      priority,
      start_date,
      due_date,
      notes
    } = req.body;

    if (!title || !bom_id || !quantity) {
      return res.status(400).json({ error: 'Title, BOM, and quantity are required' });
    }

    // Get BOM details
    const boms = await runQuery(`
      SELECT b.*, i.id as finished_product_id, i.name as finished_product_name, i.sku as finished_product_sku
      FROM bill_of_materials b
      LEFT JOIN inventory_items i ON b.finished_product_id = i.id
      WHERE b.id = ?
    `, [bom_id]);

    if (boms.length === 0) {
      return res.status(404).json({ error: 'BOM not found' });
    }

    const bom = boms[0];

    // Calculate costs
    const costs = await calculateProductionOrderCosts(bom_id, quantity);

    // Generate order number
    const orderNumber = await generateProductionOrderNumber();

    // Create production order
    const result = await runStatement(`
      INSERT INTO production_orders (
        order_number, title, description, bom_id,
        status, priority, quantity, start_date, due_date,
        finished_product_id, finished_product_name, finished_product_sku,
        planned_cost, notes, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      orderNumber,
      title,
      description || '',
      bom_id,
      'draft',
      priority || 'medium',
      quantity,
      start_date || null,
      due_date || null,
      bom.finished_product_id || null,
      bom.finished_product_name || null,
      bom.finished_product_sku || null,
      costs.totalCost || 0,
      notes || '',
      req.user.id
    ]);

    const productionOrderId = result.id;

    // Create production order items from BOM components
    await createProductionOrderItemsFromBOM(productionOrderId, bom_id, quantity);

    // Create production order operations from BOM operations
    await createProductionOrderOperationsFromBOM(productionOrderId, bom_id);

    await logAuditTrail('production_orders', productionOrderId, 'INSERT', null, req.body, req.user.id);

    // Emit real-time update
    if (req.app.get('io')) {
      req.app.get('io').to('production_updates').emit('production_order_created', {
        id: productionOrderId,
        order_number: orderNumber,
        title,
        created_by_name: req.user.username,
        status: 'draft'
      });
    }

    res.status(201).json({ 
      id: productionOrderId, 
      order_number: orderNumber,
      message: 'Production order created successfully' 
    });
  } catch (error) {
    console.error('Error creating production order:', error);
    res.status(500).json({ error: 'Failed to create production order' });
  }
});

// Update production order
router.put('/:id', async (req, res) => {
  try {
    const productionOrderId = req.params.id;
    const {
      title,
      description,
      priority,
      start_date,
      due_date,
      notes
    } = req.body;

    // Get current production order
    const currentOrders = await runQuery('SELECT * FROM production_orders WHERE id = ?', [productionOrderId]);
    if (currentOrders.length === 0) {
      return res.status(404).json({ error: 'Production order not found' });
    }

    const currentOrder = currentOrders[0];

    // Check if order can be edited (only draft or planned)
    if (!['draft', 'planned'].includes(currentOrder.status)) {
      return res.status(400).json({ error: `Cannot edit production order in ${currentOrder.status} status` });
    }

    // Update production order
    await runStatement(`
      UPDATE production_orders SET
        title = ?, description = ?, priority = ?,
        start_date = ?, due_date = ?, notes = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      title,
      description || '',
      priority || 'medium',
      start_date || null,
      due_date || null,
      notes || '',
      productionOrderId
    ]);

    await logAuditTrail('production_orders', productionOrderId, 'UPDATE', currentOrder, req.body, req.user.id);

    // Emit real-time update
    if (req.app.get('io')) {
      req.app.get('io').to('production_updates').emit('production_order_updated', {
        id: productionOrderId,
        action: 'edited',
        editor_name: req.user.username
      });
    }

    res.json({ message: 'Production order updated successfully' });
  } catch (error) {
    console.error('Error updating production order:', error);
    res.status(500).json({ error: 'Failed to update production order' });
  }
});

// Update production order status
router.put('/:id/status', async (req, res) => {
  try {
    const productionOrderId = req.params.id;
    const { status } = req.body;

    if (!['draft', 'planned', 'in_progress', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    // Get current production order
    const currentOrders = await runQuery('SELECT * FROM production_orders WHERE id = ?', [productionOrderId]);
    if (currentOrders.length === 0) {
      return res.status(404).json({ error: 'Production order not found' });
    }

    const currentOrder = currentOrders[0];

    // Validate status transition
    const validTransitions = {
      'draft': ['planned', 'cancelled'],
      'planned': ['in_progress', 'cancelled'],
      'in_progress': ['completed', 'cancelled'],
      'completed': [],
      'cancelled': []
    };

    if (!validTransitions[currentOrder.status].includes(status)) {
      return res.status(400).json({ 
        error: `Invalid status transition from ${currentOrder.status} to ${status}`,
        valid_transitions: validTransitions[currentOrder.status]
      });
    }

    // Update production order status
    await runStatement(`
      UPDATE production_orders SET
        status = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [status, productionOrderId]);

    await logAuditTrail('production_orders', productionOrderId, 'UPDATE', 
      { status: currentOrder.status }, 
      { status }, 
      req.user.id
    );

    // Emit real-time update
    if (req.app.get('io')) {
      req.app.get('io').to('production_updates').emit('production_order_updated', {
        id: productionOrderId,
        status,
        updater_name: req.user.username
      });
    }

    res.json({ message: `Production order ${status} successfully` });
  } catch (error) {
    console.error('Error updating production order status:', error);
    res.status(500).json({ error: 'Failed to update production order status' });
  }
});

// Issue materials for production
router.post('/:id/issue-materials', async (req, res) => {
  try {
    const productionOrderId = req.params.id;
    const { items, notes } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Items array is required for material issuance' });
    }

    // Get current production order
    const currentOrders = await runQuery('SELECT * FROM production_orders WHERE id = ?', [productionOrderId]);
    if (currentOrders.length === 0) {
      return res.status(404).json({ error: 'Production order not found' });
    }

    const currentOrder = currentOrders[0];

    // Check if order is in a valid state for material issuance
    if (!['planned', 'in_progress'].includes(currentOrder.status)) {
      return res.status(400).json({ error: `Cannot issue materials for production order in ${currentOrder.status} status` });
    }

    // Issue materials
    const result = await issueMaterialsForProduction(productionOrderId, items, req.user.id);

    await logAuditTrail('production_orders', productionOrderId, 'UPDATE', 
      { status: currentOrder.status }, 
      { action: 'issue_materials', items, notes }, 
      req.user.id
    );

    // Emit real-time update
    if (req.app.get('io')) {
      req.app.get('io').to('production_updates').emit('production_order_updated', {
        id: productionOrderId,
        action: 'materials_issued',
        updater_name: req.user.username
      });
    }

    res.json({ 
      message: 'Materials issued successfully',
      result
    });
  } catch (error) {
    console.error('Error issuing materials:', error);
    res.status(500).json({ error: error.message || 'Failed to issue materials' });
  }
});

// Complete production (add finished product to inventory)
router.post('/:id/complete', async (req, res) => {
  try {
    const productionOrderId = req.params.id;
    const { 
      quantity, 
      quality_check_passed = true,
      batch_number,
      notes
    } = req.body;

    if (!quantity || quantity <= 0) {
      return res.status(400).json({ error: 'Valid quantity is required' });
    }

    // Get current production order
    const currentOrders = await runQuery('SELECT * FROM production_orders WHERE id = ?', [productionOrderId]);
    if (currentOrders.length === 0) {
      return res.status(404).json({ error: 'Production order not found' });
    }

    const currentOrder = currentOrders[0];

    // Check if order is in a valid state for completion
    if (currentOrder.status !== 'in_progress') {
      return res.status(400).json({ error: `Cannot complete production order in ${currentOrder.status} status` });
    }

    // Complete production order
    const result = await completeProductionOrder(productionOrderId, {
      quantity,
      quality_check_passed,
      batch_number,
      notes
    }, req.user.id);

    await logAuditTrail('production_orders', productionOrderId, 'UPDATE', 
      { status: currentOrder.status }, 
      { action: 'complete_production', quantity, quality_check_passed, batch_number, notes }, 
      req.user.id
    );

    // Emit real-time update
    if (req.app.get('io')) {
      req.app.get('io').to('production_updates').emit('production_order_updated', {
        id: productionOrderId,
        action: 'completed',
        status: 'completed',
        updater_name: req.user.username
      });
    }

    res.json({ 
      message: 'Production order completed successfully',
      result
    });
  } catch (error) {
    console.error('Error completing production order:', error);
    res.status(500).json({ error: error.message || 'Failed to complete production order' });
  }
});

// Update operation status
router.put('/operations/:id/status', async (req, res) => {
  try {
    const operationId = req.params.id;
    const { status } = req.body;

    if (!['pending', 'in_progress', 'completed', 'skipped'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    // Update operation status
    await updateOperationStatus(operationId, status, req.user.id);

    // Emit real-time update
    if (req.app.get('io')) {
      req.app.get('io').to('production_updates').emit('operation_updated', {
        id: operationId,
        status,
        updater_name: req.user.username
      });
    }

    res.json({ message: `Operation ${status} successfully` });
  } catch (error) {
    console.error('Error updating operation status:', error);
    res.status(500).json({ error: error.message || 'Failed to update operation status' });
  }
});

// Delete production order
router.delete('/:id', async (req, res) => {
  try {
    const productionOrderId = req.params.id;
    
    // Get current production order
    const currentOrders = await runQuery('SELECT * FROM production_orders WHERE id = ?', [productionOrderId]);
    if (currentOrders.length === 0) {
      return res.status(404).json({ error: 'Production order not found' });
    }

    const currentOrder = currentOrders[0];

    // Check if order can be deleted (only draft or cancelled)
    if (!['draft', 'cancelled'].includes(currentOrder.status)) {
      return res.status(400).json({ error: `Cannot delete production order in ${currentOrder.status} status` });
    }

    // Delete production order (cascade will delete related items and operations)
    await runStatement('DELETE FROM production_orders WHERE id = ?', [productionOrderId]);

    await logAuditTrail('production_orders', productionOrderId, 'DELETE', currentOrder, null, req.user.id);

    // Emit real-time update
    if (req.app.get('io')) {
      req.app.get('io').to('production_updates').emit('production_order_deleted', {
        id: productionOrderId,
        deleter_name: req.user.username
      });
    }

    res.json({ message: 'Production order deleted successfully' });
  } catch (error) {
    console.error('Error deleting production order:', error);
    res.status(500).json({ error: 'Failed to delete production order' });
  }
});

// Get production order statistics
router.get('/stats/overview', async (req, res) => {
  try {
    const stats = await runQuery(`
      SELECT 
        COUNT(*) as total_orders,
        SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as draft_count,
        SUM(CASE WHEN status = 'planned' THEN 1 ELSE 0 END) as planned_count,
        SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress_count,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_count,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_count,
        COALESCE(SUM(planned_cost), 0) as total_planned_cost,
        COALESCE(SUM(actual_cost), 0) as total_actual_cost,
        AVG(CASE WHEN completion_date IS NOT NULL AND start_date IS NOT NULL 
            THEN julianday(completion_date) - julianday(start_date) 
            ELSE NULL END) as avg_completion_time_days
      FROM production_orders
    `);

    res.json(stats[0] || {});
  } catch (error) {
    console.error('Error fetching production order stats:', error);
    res.status(500).json({ error: 'Failed to fetch production order statistics' });
  }
});

export default router;