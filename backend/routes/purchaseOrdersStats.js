import express from 'express';
import { runQuery } from '../database/connection.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Get purchase order statistics
router.get('/stats/overview', async (req, res) => {
  try {
    const stats = await runQuery(`
      SELECT 
        COUNT(*) as total_pos,
        SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as draft_count,
        SUM(CASE WHEN status = 'pending_approval' THEN 1 ELSE 0 END) as pending_approval_count,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved_count,
        SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent_count,
        SUM(CASE WHEN status = 'partially_received' THEN 1 ELSE 0 END) as partially_received_count,
        SUM(CASE WHEN status = 'received' THEN 1 ELSE 0 END) as received_count,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_count,
        SUM(total_amount) as total_value,
        AVG(total_amount) as avg_order_value
      FROM purchase_orders
    `);

    res.json(stats[0] || {});
  } catch (error) {
    console.error('Error fetching purchase order stats:', error);
    res.status(500).json({ error: 'Failed to fetch purchase order statistics' });
  }
});

export default router;