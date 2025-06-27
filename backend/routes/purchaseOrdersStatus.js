import express from 'express';
import { runQuery, runStatement } from '../database/connection.js';
import { authenticateToken } from '../middleware/auth.js';
import { logAuditTrail } from '../utils/audit.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Update purchase order status
router.put('/:id/status', async (req, res) => {
  try {
    const { status, approval_notes } = req.body;
    const poId = req.params.id;

    if (!['pending_approval', 'approved', 'sent', 'cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    // Get current purchase order
    const currentPOs = await runQuery('SELECT * FROM purchase_orders WHERE id = ?', [poId]);
    if (currentPOs.length === 0) {
      return res.status(404).json({ error: 'Purchase order not found' });
    }

    const currentPO = currentPOs[0];

    // Update purchase order
    let updateSql = 'UPDATE purchase_orders SET status = ?, updated_at = CURRENT_TIMESTAMP';
    let params = [status];

    if (status === 'approved') {
      updateSql += ', approved_by = ?, approval_date = CURRENT_TIMESTAMP, approval_notes = ?';
      params.push(req.user.id, approval_notes || '');
    } else if (status === 'sent') {
      updateSql += ', sent_date = CURRENT_TIMESTAMP';
    }

    updateSql += ' WHERE id = ?';
    params.push(poId);

    await runStatement(updateSql, params);

    await logAuditTrail('purchase_orders', poId, 'UPDATE', currentPO, { 
      status, 
      approval_notes 
    }, req.user.id);

    // Emit real-time update
    if (req.app.get('io')) {
      req.app.get('io').to('po_updates').emit('po_updated', {
        id: poId,
        status,
        updated_by_name: req.user.username
      });
    }

    res.json({ message: `Purchase order ${status} successfully` });
  } catch (error) {
    console.error('Error updating purchase order status:', error);
    res.status(500).json({ error: 'Failed to update purchase order status' });
  }
});

export default router;