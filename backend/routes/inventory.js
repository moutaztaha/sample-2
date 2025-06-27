import express from 'express';
import { runQuery, runStatement } from '../database/connection.js';
import { authenticateToken, checkPermission, checkAnyPermission } from '../middleware/auth.js';
import { logAuditTrail } from '../utils/audit.js';
import { 
  calculateTotalValue,
  handleInventoryExport,
  handleInventoryImport
} from '../utils/inventoryHelpers.js';
import { upload, getImageUrl, deleteImage, getFilenameFromUrl } from '../utils/imageStorage.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Get all inventory items with search and filters
router.get('/items', checkPermission('inventory.view'), async (req, res) => {
  try {
    const { search, category, supplier, lowStock, itemType, page = 1, limit = 50 } = req.query;
    
    let sql = `
      SELECT 
        i.*,
        c.name as category_name,
        sc.name as subcategory_name,
        u.name as unit_name,
        l.name as location_name,
        s.name as supplier_name,
        CASE WHEN i.quantity <= i.min_quantity THEN 1 ELSE 0 END as is_low_stock,
        (
          SELECT price 
          FROM price_history ph1 
          WHERE ph1.item_id = i.id 
          AND ph1.created_at < (
            SELECT MAX(ph2.created_at) 
            FROM price_history ph2 
            WHERE ph2.item_id = i.id
          )
          ORDER BY ph1.created_at DESC 
          LIMIT 1
        ) as last_price,
        (
          SELECT ROUND(AVG(price), 2)
          FROM price_history ph3
          WHERE ph3.item_id = i.id
        ) as average_price
      FROM inventory_items i
      LEFT JOIN categories c ON i.category_id = c.id
      LEFT JOIN subcategories sc ON i.subcategory_id = sc.id
      LEFT JOIN units u ON i.unit_id = u.id
      LEFT JOIN locations l ON i.location_id = l.id
      LEFT JOIN suppliers s ON i.supplier_id = s.id
      WHERE 1=1
    `;
    
    const params = [];

    if (search) {
      sql += ` AND (i.name LIKE ? OR i.sku LIKE ? OR i.description LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (category) {
      sql += ` AND i.category_id = ?`;
      params.push(category);
    }

    if (supplier) {
      sql += ` AND i.supplier_id = ?`;
      params.push(supplier);
    }

    if (lowStock === 'true') {
      sql += ` AND i.quantity <= i.min_quantity`;
    }
    
    if (itemType) {
      sql += ` AND i.item_type = ?`;
      params.push(itemType);
    }

    sql += ` ORDER BY i.updated_at DESC`;

    const offset = (page - 1) * limit;
    sql += ` LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    const items = await runQuery(sql, params);
    
    // Calculate total_value based on price priority for each item
    const itemsWithCalculatedValue = items.map(item => ({
      ...item,
      total_value: calculateTotalValue(
        item.quantity,
        item.unit_price,
        item.last_price,
        item.average_price
      )
    }));
    
    // Get total count for pagination
    let countSql = `
      SELECT COUNT(*) as total
      FROM inventory_items i
      WHERE 1=1
    `;
    const countParams = [];

    if (search) {
      countSql += ` AND (i.name LIKE ? OR i.sku LIKE ? OR i.description LIKE ?)`;
      countParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (category) {
      countSql += ` AND i.category_id = ?`;
      countParams.push(category);
    }

    if (supplier) {
      countSql += ` AND i.supplier_id = ?`;
      countParams.push(supplier);
    }

    if (lowStock === 'true') {
      countSql += ` AND i.quantity <= i.min_quantity`;
    }
    
    if (itemType) {
      countSql += ` AND i.item_type = ?`;
      countParams.push(itemType);
    }

    const countResult = await runQuery(countSql, countParams);
    const total = countResult[0].total;

    const response = {
      items: itemsWithCalculatedValue || [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total || 0,
        pages: Math.ceil((total || 0) / parseInt(limit))
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching inventory items:', error);
    res.status(500).json({ error: 'Failed to fetch inventory items' });
  }
});

// Get single inventory item
router.get('/items/:id', checkPermission('inventory.view'), async (req, res) => {
  try {
    const items = await runQuery(`
      SELECT 
        i.*,
        c.name as category_name,
        sc.name as subcategory_name,
        u.name as unit_name,
        l.name as location_name,
        s.name as supplier_name,
        (
          SELECT price 
          FROM price_history ph1 
          WHERE ph1.item_id = i.id 
          AND ph1.created_at < (
            SELECT MAX(ph2.created_at) 
            FROM price_history ph2 
            WHERE ph2.item_id = i.id
          )
          ORDER BY ph1.created_at DESC 
          LIMIT 1
        ) as last_price,
        (
          SELECT ROUND(AVG(price), 2)
          FROM price_history ph3
          WHERE ph3.item_id = i.id
        ) as average_price
      FROM inventory_items i
      LEFT JOIN categories c ON i.category_id = c.id
      LEFT JOIN subcategories sc ON i.subcategory_id = sc.id
      LEFT JOIN units u ON i.unit_id = u.id
      LEFT JOIN locations l ON i.location_id = l.id
      LEFT JOIN suppliers s ON i.supplier_id = s.id
      WHERE i.id = ?
    `, [req.params.id]);

    if (items.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const item = items[0];
    item.total_value = calculateTotalValue(
      item.quantity,
      item.unit_price,
      item.last_price,
      item.average_price
    );

    res.json(item);
  } catch (error) {
    console.error('Error fetching inventory item:', error);
    res.status(500).json({ error: 'Failed to fetch inventory item' });
  }
});

// Upload image for inventory item
router.post('/upload-image', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }
    
    // Return the image URL
    const imageUrl = getImageUrl(req.file.filename);
    
    res.json({
      success: true,
      imageUrl,
      filename: req.file.filename
    });
  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

// Create inventory item
router.post('/items', checkPermission('inventory.create'), async (req, res) => {
  try {
    const {
      name, sku, description, category_id, subcategory_id,
      unit_id, location_id, supplier_id, quantity,
      min_quantity, max_quantity, unit_price, item_type, image_url
    } = req.body;

    if (!name || !sku) {
      return res.status(400).json({ error: 'Name and SKU are required' });
    }

    // Calculate initial total value
    const totalValue = calculateTotalValue(quantity || 0, unit_price || 0, null, null);

    const result = await runStatement(`
      INSERT INTO inventory_items (
        name, sku, description, category_id, subcategory_id,
        unit_id, location_id, supplier_id, quantity,
        min_quantity, max_quantity, unit_price, total_value, item_type, image_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      name, sku, description, category_id, subcategory_id,
      unit_id, location_id, supplier_id, quantity || 0,
      min_quantity || 0, max_quantity || 1000, unit_price || 0, totalValue,
      item_type || 'raw_material', image_url || null
    ]);

    // Add price history entry
    if (unit_price && unit_price > 0) {
      await runStatement(`
        INSERT INTO price_history (item_id, price) VALUES (?, ?)
      `, [result.id, unit_price]);
    }

    // Add stock movement entry for initial stock
    if (quantity && quantity > 0) {
      await runStatement(`
        INSERT INTO stock_movements (
          item_id, movement_type, quantity, reference_type, 
          reference_id, reference_number, notes, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        result.id, 
        'in', 
        quantity, 
        'initial', 
        result.id, 
        `INIT-${result.id}`,
        'Initial stock entry',
        req.user.id
      ]);
    }

    await logAuditTrail('inventory_items', result.id, 'INSERT', null, req.body, req.user.id);

    // Emit real-time update
    if (req.app.get('io')) {
      req.app.get('io').to('inventory_updates').emit('item_created', {
        id: result.id,
        ...req.body
      });
    }

    res.status(201).json({ id: result.id, message: 'Item created successfully' });
  } catch (error) {
    console.error('Error creating inventory item:', error);
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      res.status(400).json({ error: 'SKU already exists' });
    } else {
      res.status(500).json({ error: 'Failed to create inventory item' });
    }
  }
});

// Update inventory item
router.put('/items/:id', checkPermission('inventory.edit'), async (req, res) => {
  try {
    const itemId = req.params.id;
    
    // Get current item for audit trail
    const currentItems = await runQuery(`
      SELECT i.*,
        (SELECT ROUND(AVG(price), 2) FROM price_history WHERE item_id = i.id) as average_price,
        (SELECT price FROM price_history WHERE item_id = i.id ORDER BY created_at DESC LIMIT 1) as last_price
      FROM inventory_items i WHERE i.id = ?
    `, [itemId]);
    
    if (currentItems.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const currentItem = currentItems[0];
    
    const {
      name, sku, description, category_id, subcategory_id,
      unit_id, location_id, supplier_id, quantity,
      min_quantity, max_quantity, unit_price, item_type, image_url
    } = req.body;

    // Calculate new total value
    const totalValue = calculateTotalValue(
      quantity,
      unit_price,
      currentItem.last_price,
      currentItem.average_price
    );

    // Check if image URL has changed
    const oldImageUrl = currentItem.image_url;
    const newImageUrl = image_url;
    
    // If image URL has changed and old one was a local file, delete it
    if (oldImageUrl !== newImageUrl) {
      const oldFilename = getFilenameFromUrl(oldImageUrl);
      if (oldFilename) {
        deleteImage(oldFilename);
      }
    }

    await runStatement(`
      UPDATE inventory_items SET
        name = ?, sku = ?, description = ?, category_id = ?, subcategory_id = ?,
        unit_id = ?, location_id = ?, supplier_id = ?, quantity = ?,
        min_quantity = ?, max_quantity = ?, unit_price = ?, total_value = ?, item_type = ?, image_url = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      name, sku, description, category_id, subcategory_id,
      unit_id, location_id, supplier_id, quantity,
      min_quantity, max_quantity, unit_price, totalValue, 
      item_type || 'raw_material', image_url, itemId
    ]);

    // Add price history entry if price changed
    if (unit_price && unit_price !== currentItem.unit_price) {
      await runStatement(`
        INSERT INTO price_history (item_id, price) VALUES (?, ?)
      `, [itemId, unit_price]);
    }

    // Add stock movement entry if quantity changed
    if (quantity !== currentItem.quantity) {
      const movementType = quantity > currentItem.quantity ? 'in' : 'out';
      const movementQuantity = Math.abs(quantity - currentItem.quantity);
      
      await runStatement(`
        INSERT INTO stock_movements (
          item_id, movement_type, quantity, reference_type, 
          reference_id, reference_number, notes, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        itemId, 
        movementType, 
        movementQuantity, 
        'adjustment', 
        itemId, 
        `ADJ-${Date.now()}`,
        'Quantity updated via item edit',
        req.user.id
      ]);
    }

    await logAuditTrail('inventory_items', itemId, 'UPDATE', currentItem, req.body, req.user.id);

    // Emit real-time update
    if (req.app.get('io')) {
      req.app.get('io').to('inventory_updates').emit('item_updated', {
        id: itemId,
        ...req.body
      });
    }

    res.json({ message: 'Item updated successfully' });
  } catch (error) {
    console.error('Error updating inventory item:', error);
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      res.status(400).json({ error: 'SKU already exists' });
    } else {
      res.status(500).json({ error: 'Failed to update inventory item' });
    }
  }
});

// Delete inventory item
router.delete('/items/:id', checkPermission('inventory.delete'), async (req, res) => {
  try {
    const itemId = req.params.id;
    
    // Get current item for audit trail
    const currentItems = await runQuery('SELECT * FROM inventory_items WHERE id = ?', [itemId]);
    if (currentItems.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const currentItem = currentItems[0];
    
    // Delete associated image if it exists
    if (currentItem.image_url) {
      const filename = getFilenameFromUrl(currentItem.image_url);
      if (filename) {
        deleteImage(filename);
      }
    }

    await runStatement('DELETE FROM inventory_items WHERE id = ?', [itemId]);
    await logAuditTrail('inventory_items', itemId, 'DELETE', currentItems[0], null, req.user.id);

    // Emit real-time update
    if (req.app.get('io')) {
      req.app.get('io').to('inventory_updates').emit('item_deleted', { id: itemId });
    }

    res.json({ message: 'Item deleted successfully' });
  } catch (error) {
    console.error('Error deleting inventory item:', error);
    res.status(500).json({ error: 'Failed to delete inventory item' });
  }
});

// Get dropdown data
router.get('/dropdown-data', checkPermission('inventory.view'), async (req, res) => {
  try {
    const [categories, subcategories, units, locations, suppliers] = await Promise.all([
      runQuery('SELECT * FROM categories ORDER BY name'),
      runQuery('SELECT * FROM subcategories ORDER BY name'),
      runQuery('SELECT * FROM units ORDER BY name'),
      runQuery('SELECT * FROM locations ORDER BY name'),
      runQuery('SELECT * FROM suppliers ORDER BY name')
    ]);

    res.json({
      categories: categories || [],
      subcategories: subcategories || [],
      units: units || [],
      locations: locations || [],
      suppliers: suppliers || []
    });
  } catch (error) {
    console.error('Error fetching dropdown data:', error);
    res.status(500).json({ error: 'Failed to fetch dropdown data' });
  }
});

// Export to CSV
router.get('/export/csv', checkPermission('inventory.export'), async (req, res) => {
  try {
    const { columns, title, columnWidths } = req.query;
    const options = {
      columns: columns ? columns.split(',') : undefined,
      title: title || undefined,
      columnWidths: columnWidths ? JSON.parse(columnWidths) : undefined
    };
    
    await handleInventoryExport(req, res, 'csv', options);
  } catch (error) {
    console.error('Error exporting CSV:', error);
    res.status(500).json({ error: 'Failed to export CSV' });
  }
});

// Import from CSV
router.post('/import/csv', checkPermission('inventory.import'), async (req, res) => {
  try {
    await handleInventoryImport(req, res);
  } catch (error) {
    console.error('Error importing CSV:', error);
    res.status(500).json({ error: 'Failed to import CSV' });
  }
});

// Generate PDF report
router.get('/export/pdf', checkPermission('inventory.export'), async (req, res) => {
  try {
    const { columns, title, columnWidths, orientation } = req.query;
    const options = {
      columns: columns ? columns.split(',') : undefined,
      title: title || undefined,
      columnWidths: columnWidths ? JSON.parse(columnWidths) : undefined,
      orientation: orientation || 'portrait'
    };
    
    await handleInventoryExport(req, res, 'pdf', options);
  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

// Stock adjustment endpoint
router.post('/adjust-stock', checkPermission('inventory.adjust_stock'), async (req, res) => {
  try {
    const { item_id, adjustment_type, quantity, reason } = req.body;
    
    if (!item_id || !adjustment_type || !quantity || !reason) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Get current item
    const items = await runQuery('SELECT * FROM inventory_items WHERE id = ?', [item_id]);
    if (items.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    const item = items[0];
    const currentQuantity = item.quantity;
    let newQuantity;
    
    if (adjustment_type === 'add') {
      newQuantity = currentQuantity + quantity;
    } else if (adjustment_type === 'subtract') {
      newQuantity = currentQuantity - quantity;
    } else {
      return res.status(400).json({ error: 'Invalid adjustment type' });
    }
    
    // Update item quantity
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
      adjustment_type === 'add' ? 'in' : 'out', 
      quantity, 
      'adjustment', 
      item_id, 
      `ADJ-${Date.now()}`,
      reason,
      req.user.id
    ]);
    
    // Log audit trail
    await logAuditTrail('inventory_items', item_id, 'UPDATE', 
      { quantity: currentQuantity }, 
      { quantity: newQuantity, adjustment_reason: reason }, 
      req.user.id
    );
    
    // Emit real-time update
    if (req.app.get('io')) {
      req.app.get('io').to('inventory_updates').emit('item_updated', {
        id: item_id,
        quantity: newQuantity
      });
    }
    
    res.json({ 
      message: 'Stock adjusted successfully',
      new_quantity: newQuantity
    });
  } catch (error) {
    console.error('Error adjusting stock:', error);
    res.status(500).json({ error: 'Failed to adjust stock' });
  }
});

// Get stock movements
router.get('/stock-movements', checkPermission('inventory.view_stock_movements'), async (req, res) => {
  try {
    const { itemId, startDate, endDate, movementType, page = 1, limit = 50 } = req.query;
    
    let sql = `
      SELECT 
        sm.*,
        i.name as item_name,
        u.username as created_by
      FROM stock_movements sm
      JOIN inventory_items i ON sm.item_id = i.id
      LEFT JOIN users u ON sm.created_by = u.id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (itemId) {
      sql += ` AND sm.item_id = ?`;
      params.push(itemId);
    }
    
    if (startDate) {
      sql += ` AND sm.created_at >= ?`;
      params.push(`${startDate}T00:00:00.000Z`);
    }
    
    if (endDate) {
      sql += ` AND sm.created_at <= ?`;
      params.push(`${endDate}T23:59:59.999Z`);
    }
    
    if (movementType && movementType !== 'all') {
      sql += ` AND sm.movement_type = ?`;
      params.push(movementType);
    }
    
    sql += ` ORDER BY sm.created_at DESC`;
    
    const offset = (page - 1) * limit;
    sql += ` LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));
    
    const movements = await runQuery(sql, params);
    
    // Get total count for pagination
    let countSql = `
      SELECT COUNT(*) as total
      FROM stock_movements sm
      WHERE 1=1
    `;
    
    const countParams = [];
    
    if (itemId) {
      countSql += ` AND sm.item_id = ?`;
      countParams.push(itemId);
    }
    
    if (startDate) {
      countSql += ` AND sm.created_at >= ?`;
      countParams.push(`${startDate}T00:00:00.000Z`);
    }
    
    if (endDate) {
      countSql += ` AND sm.created_at <= ?`;
      countParams.push(`${endDate}T23:59:59.999Z`);
    }
    
    if (movementType && movementType !== 'all') {
      countSql += ` AND sm.movement_type = ?`;
      countParams.push(movementType);
    }
    
    const countResult = await runQuery(countSql, countParams);
    const total = countResult[0].total;
    
    res.json({
      movements: movements || [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total || 0,
        pages: Math.ceil((total || 0) / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching stock movements:', error);
    res.status(500).json({ error: 'Failed to fetch stock movements' });
  }
});

// Export stock movements to CSV
router.get('/stock-movements/export/csv', checkPermission('inventory.export'), async (req, res) => {
  try {
    const { itemId, startDate, endDate, movementType } = req.query;
    
    let sql = `
      SELECT 
        sm.created_at,
        i.name as item_name,
        i.sku,
        sm.movement_type,
        sm.quantity,
        sm.reference_type,
        sm.reference_number,
        sm.notes,
        u.username as created_by
      FROM stock_movements sm
      JOIN inventory_items i ON sm.item_id = i.id
      LEFT JOIN users u ON sm.created_by = u.id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (itemId) {
      sql += ` AND sm.item_id = ?`;
      params.push(itemId);
    }
    
    if (startDate) {
      sql += ` AND sm.created_at >= ?`;
      params.push(`${startDate}T00:00:00.000Z`);
    }
    
    if (endDate) {
      sql += ` AND sm.created_at <= ?`;
      params.push(`${endDate}T23:59:59.999Z`);
    }
    
    if (movementType && movementType !== 'all') {
      sql += ` AND sm.movement_type = ?`;
      params.push(movementType);
    }
    
    sql += ` ORDER BY sm.created_at DESC`;
    
    const movements = await runQuery(sql, params);
    
    // Format data for CSV
    const csvData = movements.map(m => ({
      Date: new Date(m.created_at).toLocaleString(),
      Item: m.item_name,
      SKU: m.sku,
      Type: m.movement_type === 'in' ? 'Stock In' : m.movement_type === 'out' ? 'Stock Out' : 'Adjustment',
      Quantity: m.movement_type === 'in' ? m.quantity : -m.quantity,
      Reference: `${m.reference_type} (${m.reference_number})`,
      Notes: m.notes,
      'Created By': m.created_by
    }));
    
    // Generate CSV
    const { exportToCSV } = await import('../utils/csv-handler.js');
    const csvContent = await exportToCSV(csvData, [
      'Date', 'Item', 'SKU', 'Type', 'Quantity', 'Reference', 'Notes', 'Created By'
    ]);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=stock_movements.csv');
    res.send(csvContent);
  } catch (error) {
    console.error('Error exporting stock movements:', error);
    res.status(500).json({ error: 'Failed to export stock movements' });
  }
});

// Save column preferences
router.post('/column-preferences', authenticateToken, async (req, res) => {
  try {
    const { columns, preference_type, preference_data } = req.body;
    
    if ((!columns && !preference_data) || !preference_type) {
      return res.status(400).json({ error: 'Invalid data provided' });
    }
    
    // Check if user already has preferences for this type
    const existingPrefs = await runQuery(
      'SELECT * FROM user_preferences WHERE user_id = ? AND preference_type = ?',
      [req.user.id, preference_type]
    );
    
    const dataToSave = preference_data || JSON.stringify(columns);
    console.log('Saving preferences to database:', { 
      user_id: req.user.id, 
      preference_type, 
      data: dataToSave 
    });
    
    if (existingPrefs.length > 0) {
      // Update existing preferences
      await runStatement(
        'UPDATE user_preferences SET preference_data = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [dataToSave, existingPrefs[0].id]
      );
      console.log('Updated existing preferences with ID:', existingPrefs[0].id);
    } else {
      // Create new preferences
      const result = await runStatement(
        'INSERT INTO user_preferences (user_id, preference_type, preference_data) VALUES (?, ?, ?)',
        [req.user.id, preference_type, dataToSave]
      );
      console.log('Created new preferences with ID:', result.id);
    }
    
    res.json({ message: 'Column preferences saved successfully' });
  } catch (error) {
    console.error('Error saving column preferences:', error);
    res.status(500).json({ error: 'Failed to save column preferences' });
  }
});

// Get column preferences
router.get('/column-preferences', authenticateToken, async (req, res) => {
  try {
    const { preference_type } = req.query;
    
    if (!preference_type) {
      return res.status(400).json({ error: 'Preference type is required' });
    }
    
    console.log('Fetching preferences for user:', req.user.id, 'type:', preference_type);
    
    const preferences = await runQuery(
      'SELECT preference_data FROM user_preferences WHERE user_id = ? AND preference_type = ?',
      [req.user.id, preference_type]
    );
    
    if (preferences.length > 0) {
      console.log('Found preferences:', preferences[0].preference_data);
      res.json({ columns: preferences[0].preference_data });
    } else {
      console.log('No preferences found');
      res.json({ columns: null });
    }
  } catch (error) {
    console.error('Error fetching column preferences:', error);
    res.status(500).json({ error: 'Failed to fetch column preferences' });
  }
});

export default router;