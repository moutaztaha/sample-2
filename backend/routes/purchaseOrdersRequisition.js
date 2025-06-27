import express from 'express';
import { runQuery, runStatement } from '../database/connection.js';
import { authenticateToken } from '../middleware/auth.js';
import { logAuditTrail } from '../utils/audit.js';
import { generatePONumber, calculatePOTotals } from '../utils/purchaseOrderHelpers.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Create PO from requisition
router.post('/from-requisition/:requisitionId', async (req, res) => {
  try {
    const requisitionId = req.params.requisitionId;
    const { supplier_id, title, description, priority, expected_delivery_date } = req.body;

    if (!supplier_id) {
      return res.status(400).json({ error: 'Supplier is required' });
    }

    // Get requisition details
    const requisitions = await runQuery(`
      SELECT r.*, u.username as requester_name
      FROM requisitions r
      LEFT JOIN users u ON r.requester_id = u.id
      WHERE r.id = ?
    `, [requisitionId]);

    if (requisitions.length === 0) {
      return res.status(404).json({ error: 'Requisition not found' });
    }

    const requisition = requisitions[0];

    // Get approved requisition items
    const requisitionItems = await runQuery(`
      SELECT 
        ri.*,
        i.name as item_name,
        i.sku,
        i.description as item_description,
        i.unit_price,
        u.name as unit_name,
        u.id as unit_id
      FROM requisition_items ri
      LEFT JOIN inventory_items i ON ri.item_id = i.id
      LEFT JOIN units u ON i.unit_id = u.id
      WHERE ri.requisition_id = ? AND ri.approved_quantity > 0
    `, [requisitionId]);

    if (requisitionItems.length === 0) {
      return res.status(400).json({ error: 'No approved items found in requisition' });
    }

    // Generate PO number
    const po_number = await generatePONumber();

    // Calculate totals
    const items = requisitionItems.map(item => ({
      quantity: item.approved_quantity,
      unit_price: item.unit_price
    }));
    const { subtotal, tax_amount, shipping_cost, total_amount } = calculatePOTotals(items);

    // Create purchase order - ensure all undefined values are converted to null
    const poResult = await runStatement(`
      INSERT INTO purchase_orders (
        po_number, title, description, supplier_id, requisition_id,
        priority, order_date, expected_delivery_date, subtotal,
        tax_amount, shipping_cost, total_amount, created_by, status
      ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_DATE, ?, ?, ?, ?, ?, ?, 'draft')
    `, [
      po_number,
      title || `PO for Requisition: ${requisition.title}`,
      description || `Purchase order created from requisition: ${requisition.title}`,
      supplier_id,
      requisitionId,
      priority || requisition.priority || 'medium',
      expected_delivery_date || null,
      subtotal,
      tax_amount,
      shipping_cost,
      total_amount,
      req.user.id
    ]);

    const poId = poResult.id;

    // Add purchase order items from requisition
    for (const item of requisitionItems) {
      const total_price = item.approved_quantity * item.unit_price;
      await runStatement(`
        INSERT INTO purchase_order_items (
          po_id, item_id, item_name, item_description, sku,
          quantity, unit_price, total_price, unit_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        poId,
        item.item_id || null,
        item.item_name,
        item.item_description || null,
        item.sku || null,
        item.approved_quantity,
        item.unit_price,
        total_price,
        item.unit_id || null
      ]);
    }

    await logAuditTrail('purchase_orders', poId, 'INSERT', null, {
      ...req.body,
      requisition_id: requisitionId,
      source: 'requisition'
    }, req.user.id);

    // Emit real-time update
    if (req.app.get('io')) {
      req.app.get('io').to('po_updates').emit('po_created', {
        id: poId,
        po_number,
        title: title || `PO for Requisition: ${requisition.title}`,
        created_by_name: req.user.username,
        status: 'draft',
        source: 'requisition'
      });
    }

    res.status(201).json({ 
      id: poId, 
      po_number,
      message: 'Purchase order created from requisition successfully' 
    });
  } catch (error) {
    console.error('Error creating PO from requisition:', error);
    res.status(500).json({ error: 'Failed to create purchase order from requisition' });
  }
});

export default router;