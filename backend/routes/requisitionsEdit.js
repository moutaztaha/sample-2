import express from 'express';
import { runQuery, runStatement } from '../database/connection.js';
import { authenticateToken } from '../middleware/auth.js';
import { logAuditTrail } from '../utils/audit.js';
import { restoreInventoryQuantities } from '../utils/requisitionHelpers.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Update requisition (now allows editing at any status for authorized users)
router.put('/:id', async (req, res) => {
  try {
    const requisitionId = req.params.id;
    const {
      title,
      description,
      priority,
      required_date,
      department,
      items
    } = req.body;

    // Get current requisition
    const currentRequisitions = await runQuery('SELECT * FROM requisitions WHERE id = ?', [requisitionId]);
    if (currentRequisitions.length === 0) {
      return res.status(404).json({ error: 'Requisition not found' });
    }

    const currentRequisition = currentRequisitions[0];

    // Check permissions: admin can edit any, manager can edit any, user can edit their own
    const canEdit = req.user.role === 'admin' || 
                   req.user.role === 'manager' || 
                   currentRequisition.requester_id === req.user.id;

    if (!canEdit) {
      return res.status(403).json({ error: 'You do not have permission to edit this requisition' });
    }

    // If requisition was issued or partially issued, restore inventory quantities
    let inventoryRestored = false;
    if (['issued', 'partially_issued'].includes(currentRequisition.status)) {
      const restoredItemsCount = await restoreInventoryQuantities(requisitionId);
      inventoryRestored = restoredItemsCount > 0;
      console.log(`Restored inventory for ${restoredItemsCount} items from requisition ${requisitionId}`);
    }

    // Update requisition
    await runStatement(`
      UPDATE requisitions SET
        title = ?, description = ?, priority = ?, required_date = ?, department = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [title, description, priority, required_date, department, requisitionId]);

    // Update items if provided
    if (items && items.length > 0) {
      // Delete existing items
      await runStatement('DELETE FROM requisition_items WHERE requisition_id = ?', [requisitionId]);

      // Add new items
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
    }

    // Reset requisition status to pending if it was issued
    if (['issued', 'partially_issued', 'approved', 'partially_approved'].includes(currentRequisition.status)) {
      await runStatement(`
        UPDATE requisitions SET
          status = 'pending',
          approver_id = NULL,
          approval_date = NULL,
          approval_notes = NULL,
          issue_notes = NULL,
          issued_date = NULL
        WHERE id = ?
      `, [requisitionId]);
    }

    await logAuditTrail('requisitions', requisitionId, 'UPDATE', currentRequisition, {
      ...req.body,
      inventory_restored: inventoryRestored
    }, req.user.id);

    // Emit real-time update
    if (req.app.get('io')) {
      req.app.get('io').to('requisition_updates').emit('requisition_updated', {
        id: requisitionId,
        action: 'edited',
        editor_name: req.user.username,
        inventory_restored: inventoryRestored
      });
    }

    res.json({ 
      message: 'Requisition updated successfully',
      inventory_restored: inventoryRestored
    });
  } catch (error) {
    console.error('Error updating requisition:', error);
    res.status(500).json({ error: 'Failed to update requisition' });
  }
});

// Delete requisition (now allows deletion at any status for authorized users)
router.delete('/:id', async (req, res) => {
  try {
    const requisitionId = req.params.id;

    // Get current requisition
    const currentRequisitions = await runQuery('SELECT * FROM requisitions WHERE id = ?', [requisitionId]);
    if (currentRequisitions.length === 0) {
      return res.status(404).json({ error: 'Requisition not found' });
    }

    const currentRequisition = currentRequisitions[0];

    // Check permissions: admin can delete any, manager can delete any, user can delete their own
    const canDelete = req.user.role === 'admin' || 
                     req.user.role === 'manager' || 
                     currentRequisition.requester_id === req.user.id;

    if (!canDelete) {
      return res.status(403).json({ error: 'You do not have permission to delete this requisition' });
    }

    // If requisition was issued or partially issued, restore inventory quantities
    let inventoryRestored = false;
    if (['issued', 'partially_issued'].includes(currentRequisition.status)) {
      const restoredItemsCount = await restoreInventoryQuantities(requisitionId);
      inventoryRestored = restoredItemsCount > 0;
      console.log(`Restored inventory for ${restoredItemsCount} items from deleted requisition ${requisitionId}`);
    }

    // Delete requisition items first (foreign key constraint)
    await runStatement('DELETE FROM requisition_items WHERE requisition_id = ?', [requisitionId]);
    
    // Delete requisition
    await runStatement('DELETE FROM requisitions WHERE id = ?', [requisitionId]);

    await logAuditTrail('requisitions', requisitionId, 'DELETE', currentRequisition, {
      inventory_restored: inventoryRestored
    }, req.user.id);

    // Emit real-time update
    if (req.app.get('io')) {
      req.app.get('io').to('requisition_updates').emit('requisition_deleted', { 
        id: requisitionId,
        deleter_name: req.user.username,
        inventory_restored: inventoryRestored
      });
    }

    res.json({ 
      message: 'Requisition deleted successfully',
      inventory_restored: inventoryRestored
    });
  } catch (error) {
    console.error('Error deleting requisition:', error);
    res.status(500).json({ error: 'Failed to delete requisition' });
  }
});

// Get requisition statistics
router.get('/stats/overview', async (req, res) => {
  try {
    const stats = await runQuery(`
      SELECT 
        COUNT(*) as total_requisitions,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_count,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved_count,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected_count,
        SUM(CASE WHEN status = 'partially_approved' THEN 1 ELSE 0 END) as partially_approved_count,
        SUM(CASE WHEN status = 'issued' THEN 1 ELSE 0 END) as issued_count,
        SUM(CASE WHEN status = 'partially_issued' THEN 1 ELSE 0 END) as partially_issued_count,
        AVG(CASE WHEN status IN ('approved', 'rejected', 'partially_approved') AND approval_date IS NOT NULL 
            THEN julianday(approval_date) - julianday(created_at) 
            ELSE NULL END) as avg_approval_time_days
      FROM requisitions
    `);

    res.json(stats[0] || {});
  } catch (error) {
    console.error('Error fetching requisition stats:', error);
    res.status(500).json({ error: 'Failed to fetch requisition statistics' });
  }
});

export default router;