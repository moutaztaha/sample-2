import express from 'express';
import { runQuery, runStatement } from '../database/connection.js';
import { authenticateToken } from '../middleware/auth.js';
import { logAuditTrail } from '../utils/audit.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Receive items
router.post('/:id/receive', async (req, res) => {
  try {
    const { items, notes } = req.body;
    const poId = req.params.id;

    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ error: 'Items array is required for receiving' });
    }

    // Get current purchase order
    const currentPOs = await runQuery('SELECT * FROM purchase_orders WHERE id = ?', [poId]);
    if (currentPOs.length === 0) {
      return res.status(404).json({ error: 'Purchase order not found' });
    }

    const currentPO = currentPOs[0];

    if (!['sent', 'partially_received'].includes(currentPO.status)) {
      return res.status(400).json({ error: 'Only sent or partially received purchase orders can have items received' });
    }

    // Process each item receiving
    for (const itemReceiving of items) {
      const { po_item_id, received_quantity, batch_number, expiry_date, quality_check_passed } = itemReceiving;
      
      if (received_quantity <= 0) continue;

      // Get PO item details
      const poItems = await runQuery(`
        SELECT poi.*, i.id as inventory_item_id
        FROM purchase_order_items poi
        LEFT JOIN inventory_items i ON poi.item_id = i.id
        WHERE poi.id = ? AND poi.po_id = ?
      `, [po_item_id, poId]);

      if (poItems.length === 0) continue;

      const poItem = poItems[0];

      // Record receiving
      await runStatement(`
        INSERT INTO po_receiving (
          po_id, po_item_id, received_quantity, received_by,
          notes, batch_number, expiry_date, quality_check_passed
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        poId, po_item_id, received_quantity, req.user.id,
        notes || '', batch_number || '', expiry_date || null,
        quality_check_passed !== false ? 1 : 0
      ]);

      // Update received quantity in PO item
      await runStatement(`
        UPDATE purchase_order_items 
        SET received_quantity = received_quantity + ?
        WHERE id = ?
      `, [received_quantity, po_item_id]);

      // Update inventory if item exists and quality check passed
      if (poItem.inventory_item_id && quality_check_passed !== false) {
        // Get current quantity
        const inventoryItems = await runQuery('SELECT quantity FROM inventory_items WHERE id = ?', [poItem.inventory_item_id]);
        if (inventoryItems.length > 0) {
          const currentQuantity = inventoryItems[0].quantity;
          const newQuantity = currentQuantity + received_quantity;
          
          // Update inventory quantity
          await runStatement(`
            UPDATE inventory_items 
            SET quantity = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `, [newQuantity, poItem.inventory_item_id]);
          
          // Record stock movement
          await runStatement(`
            INSERT INTO stock_movements (
              item_id, movement_type, quantity, reference_type, 
              reference_id, reference_number, notes, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            poItem.inventory_item_id, 
            'in', 
            received_quantity, 
            'purchase_order', 
            poId, 
            `PO-${currentPO.po_number}`,
            `Received from PO: ${currentPO.po_number}`,
            req.user.id
          ]);
        }
      }
    }

    // Check if all items are fully received
    const receivingStatus = await runQuery(`
      SELECT 
        SUM(quantity) as total_ordered,
        SUM(received_quantity) as total_received
      FROM purchase_order_items 
      WHERE po_id = ?
    `, [poId]);

    let newStatus = currentPO.status;
    if (receivingStatus.length > 0) {
      const { total_ordered, total_received } = receivingStatus[0];
      
      if (total_received >= total_ordered) {
        newStatus = 'received';
        await runStatement(`
          UPDATE purchase_orders SET
            status = 'received',
            actual_delivery_date = CURRENT_DATE,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [poId]);
      } else if (total_received > 0) {
        newStatus = 'partially_received';
        await runStatement(`
          UPDATE purchase_orders SET
            status = 'partially_received',
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [poId]);
      }
    }

    await logAuditTrail('purchase_orders', poId, 'UPDATE', currentPO, { 
      action: 'receive_items',
      items,
      new_status: newStatus
    }, req.user.id);

    // Emit real-time update
    if (req.app.get('io')) {
      req.app.get('io').to('po_updates').emit('po_updated', {
        id: poId,
        action: 'items_received',
        status: newStatus,
        receiver_name: req.user.username
      });
    }

    res.json({ 
      message: 'Items received successfully',
      status: newStatus
    });
  } catch (error) {
    console.error('Error receiving items:', error);
    res.status(500).json({ error: 'Failed to receive items' });
  }
});

export default router;