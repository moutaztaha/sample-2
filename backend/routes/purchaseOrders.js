import express from 'express';
import { runQuery, runStatement } from '../database/connection.js';
import { authenticateToken } from '../middleware/auth.js';
import { logAuditTrail } from '../utils/audit.js';
import { generatePONumber, calculatePOTotals } from '../utils/purchaseOrderHelpers.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Get all purchase orders with filters
router.get('/', async (req, res) => {
  try {
    const { status, supplier, page = 1, limit = 50 } = req.query;
    
    let sql = `
      SELECT 
        po.*,
        s.name as supplier_name,
        s.contact_person as supplier_contact,
        u.username as created_by_name,
        a.username as approved_by_name,
        COUNT(poi.id) as item_count
      FROM purchase_orders po
      LEFT JOIN suppliers s ON po.supplier_id = s.id
      LEFT JOIN users u ON po.created_by = u.id
      LEFT JOIN users a ON po.approved_by = a.id
      LEFT JOIN purchase_order_items poi ON po.id = poi.po_id
      WHERE 1=1
    `;
    
    const params = [];

    if (status) {
      sql += ` AND po.status = ?`;
      params.push(status);
    }

    if (supplier) {
      sql += ` AND po.supplier_id = ?`;
      params.push(supplier);
    }

    sql += ` GROUP BY po.id ORDER BY po.created_at DESC`;

    const offset = (page - 1) * limit;
    sql += ` LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    const purchaseOrders = await runQuery(sql, params);
    
    // Get total count for pagination
    let countSql = `SELECT COUNT(DISTINCT po.id) as total FROM purchase_orders po WHERE 1=1`;
    const countParams = [];

    if (status) {
      countSql += ` AND po.status = ?`;
      countParams.push(status);
    }

    if (supplier) {
      countSql += ` AND po.supplier_id = ?`;
      countParams.push(supplier);
    }

    const countResult = await runQuery(countSql, countParams);
    const total = countResult[0].total;

    res.json({
      purchaseOrders: purchaseOrders || [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total || 0,
        pages: Math.ceil((total || 0) / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching purchase orders:', error);
    res.status(500).json({ error: 'Failed to fetch purchase orders' });
  }
});

// Get single purchase order with items
router.get('/:id', async (req, res) => {
  try {
    const purchaseOrders = await runQuery(`
      SELECT 
        po.*,
        s.name as supplier_name,
        s.contact_person as supplier_contact,
        s.email as supplier_email,
        s.phone as supplier_phone,
        s.address as supplier_address,
        u.username as created_by_name,
        a.username as approved_by_name,
        r.title as requisition_title
      FROM purchase_orders po
      LEFT JOIN suppliers s ON po.supplier_id = s.id
      LEFT JOIN users u ON po.created_by = u.id
      LEFT JOIN users a ON po.approved_by = a.id
      LEFT JOIN requisitions r ON po.requisition_id = r.id
      WHERE po.id = ?
    `, [req.params.id]);

    if (purchaseOrders.length === 0) {
      return res.status(404).json({ error: 'Purchase order not found' });
    }

    const purchaseOrder = purchaseOrders[0];

    // Get purchase order items
    const items = await runQuery(`
      SELECT 
        poi.*,
        u.name as unit_name,
        i.sku as inventory_sku
      FROM purchase_order_items poi
      LEFT JOIN units u ON poi.unit_id = u.id
      LEFT JOIN inventory_items i ON poi.item_id = i.id
      WHERE poi.po_id = ?
      ORDER BY poi.id
    `, [req.params.id]);

    purchaseOrder.items = items || [];

    res.json(purchaseOrder);
  } catch (error) {
    console.error('Error fetching purchase order:', error);
    res.status(500).json({ error: 'Failed to fetch purchase order' });
  }
});

// Create new purchase order
router.post('/', async (req, res) => {
  try {
    const {
      title,
      description,
      supplier_id,
      requisition_id,
      priority,
      order_date,
      expected_delivery_date,
      payment_terms,
      shipping_address,
      billing_address,
      notes,
      items
    } = req.body;

    if (!title || !supplier_id || !items || items.length === 0) {
      return res.status(400).json({ error: 'Title, supplier, and items are required' });
    }

    // Generate PO number
    const po_number = await generatePONumber();

    // Calculate totals
    const { subtotal, tax_amount, shipping_cost, total_amount } = calculatePOTotals(items);

    // Create purchase order - ensure all undefined values are converted to null
    const poResult = await runStatement(`
      INSERT INTO purchase_orders (
        po_number, title, description, supplier_id, requisition_id,
        priority, order_date, expected_delivery_date, subtotal,
        tax_amount, shipping_cost, total_amount, payment_terms,
        shipping_address, billing_address, notes, created_by, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft')
    `, [
      po_number, 
      title, 
      description || null, 
      supplier_id, 
      requisition_id || null,
      priority || 'medium', 
      order_date || null, 
      expected_delivery_date || null,
      subtotal, 
      tax_amount, 
      shipping_cost, 
      total_amount,
      payment_terms || null, 
      shipping_address || null, 
      billing_address || null, 
      notes || null, 
      req.user.id
    ]);

    const poId = poResult.id;

    // Add purchase order items
    for (const item of items) {
      const total_price = item.quantity * item.unit_price;
      await runStatement(`
        INSERT INTO purchase_order_items (
          po_id, item_id, item_name, item_description, sku,
          quantity, unit_price, total_price, unit_id, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        poId, 
        item.item_id || null, 
        item.item_name, 
        item.item_description || null,
        item.sku || null, 
        item.quantity, 
        item.unit_price, 
        total_price,
        item.unit_id || null, 
        item.notes || null
      ]);
    }

    await logAuditTrail('purchase_orders', poId, 'INSERT', null, req.body, req.user.id);

    // Emit real-time update
    if (req.app.get('io')) {
      req.app.get('io').to('po_updates').emit('po_created', {
        id: poId,
        po_number,
        title,
        created_by_name: req.user.username,
        status: 'draft'
      });
    }

    res.status(201).json({ 
      id: poId, 
      po_number,
      message: 'Purchase order created successfully' 
    });
  } catch (error) {
    console.error('Error creating purchase order:', error);
    res.status(500).json({ error: 'Failed to create purchase order' });
  }
});

// Update purchase order
router.put('/:id', async (req, res) => {
  try {
    const poId = req.params.id;
    const {
      title,
      description,
      supplier_id,
      priority,
      order_date,
      expected_delivery_date,
      payment_terms,
      shipping_address,
      billing_address,
      notes,
      items
    } = req.body;

    // Get current purchase order
    const currentPOs = await runQuery('SELECT * FROM purchase_orders WHERE id = ?', [poId]);
    if (currentPOs.length === 0) {
      return res.status(404).json({ error: 'Purchase order not found' });
    }

    const currentPO = currentPOs[0];

    // Check if PO can be edited (only draft or pending_approval)
    if (!['draft', 'pending_approval'].includes(currentPO.status)) {
      return res.status(400).json({ error: `Cannot edit purchase order in ${currentPO.status} status` });
    }

    // Calculate totals
    const { subtotal, tax_amount, shipping_cost, total_amount } = calculatePOTotals(items);

    // Update purchase order
    await runStatement(`
      UPDATE purchase_orders SET
        title = ?, description = ?, supplier_id = ?, priority = ?,
        order_date = ?, expected_delivery_date = ?, subtotal = ?,
        tax_amount = ?, shipping_cost = ?, total_amount = ?,
        payment_terms = ?, shipping_address = ?, billing_address = ?,
        notes = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      title,
      description || null,
      supplier_id,
      priority || 'medium',
      order_date || null,
      expected_delivery_date || null,
      subtotal,
      tax_amount,
      shipping_cost,
      total_amount,
      payment_terms || null,
      shipping_address || null,
      billing_address || null,
      notes || null,
      poId
    ]);

    // Delete existing items
    await runStatement('DELETE FROM purchase_order_items WHERE po_id = ?', [poId]);

    // Add updated items
    for (const item of items) {
      const total_price = item.quantity * item.unit_price;
      await runStatement(`
        INSERT INTO purchase_order_items (
          po_id, item_id, item_name, item_description, sku,
          quantity, unit_price, total_price, unit_id, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        poId,
        item.item_id || null,
        item.item_name,
        item.item_description || null,
        item.sku || null,
        item.quantity,
        item.unit_price,
        total_price,
        item.unit_id || null,
        item.notes || null
      ]);
    }

    await logAuditTrail('purchase_orders', poId, 'UPDATE', currentPO, req.body, req.user.id);

    // Emit real-time update
    if (req.app.get('io')) {
      req.app.get('io').to('po_updates').emit('po_updated', {
        id: poId,
        action: 'edited',
        editor_name: req.user.username
      });
    }

    res.json({ message: 'Purchase order updated successfully' });
  } catch (error) {
    console.error('Error updating purchase order:', error);
    res.status(500).json({ error: 'Failed to update purchase order' });
  }
});

// Delete purchase order
router.delete('/:id', async (req, res) => {
  try {
    const poId = req.params.id;
    
    // Get current purchase order
    const currentPOs = await runQuery('SELECT * FROM purchase_orders WHERE id = ?', [poId]);
    if (currentPOs.length === 0) {
      return res.status(404).json({ error: 'Purchase order not found' });
    }

    const currentPO = currentPOs[0];

    // Check if PO can be deleted (only draft or cancelled)
    if (!['draft', 'cancelled'].includes(currentPO.status)) {
      return res.status(400).json({ error: `Cannot delete purchase order in ${currentPO.status} status` });
    }

    // Delete purchase order items first
    await runStatement('DELETE FROM purchase_order_items WHERE po_id = ?', [poId]);
    
    // Delete purchase order
    await runStatement('DELETE FROM purchase_orders WHERE id = ?', [poId]);

    await logAuditTrail('purchase_orders', poId, 'DELETE', currentPO, null, req.user.id);

    // Emit real-time update
    if (req.app.get('io')) {
      req.app.get('io').to('po_updates').emit('po_deleted', {
        id: poId,
        deleter_name: req.user.username
      });
    }

    res.json({ message: 'Purchase order deleted successfully' });
  } catch (error) {
    console.error('Error deleting purchase order:', error);
    res.status(500).json({ error: 'Failed to delete purchase order' });
  }
});

export default router;