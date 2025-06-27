import express from 'express';
import { runQuery, runStatement } from '../database/connection.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { logAuditTrail } from '../utils/audit.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// CATEGORIES ROUTES
router.get('/categories', async (req, res) => {
  try {
    const categories = await runQuery(`
      SELECT c.*, 
             COUNT(sc.id) as subcategory_count,
             COUNT(i.id) as item_count
      FROM categories c
      LEFT JOIN subcategories sc ON c.id = sc.category_id
      LEFT JOIN inventory_items i ON c.id = i.category_id
      GROUP BY c.id
      ORDER BY c.name
    `);
    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

router.post('/categories', requireAdmin, async (req, res) => {
  try {
    const { name, description } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const result = await runStatement(
      'INSERT INTO categories (name, description) VALUES (?, ?)',
      [name, description || '']
    );

    await logAuditTrail('categories', result.id, 'INSERT', null, req.body, req.user.id);
    res.status(201).json({ id: result.id, message: 'Category created successfully' });
  } catch (error) {
    console.error('Error creating category:', error);
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      res.status(400).json({ error: 'Category name already exists' });
    } else {
      res.status(500).json({ error: 'Failed to create category' });
    }
  }
});

router.put('/categories/:id', requireAdmin, async (req, res) => {
  try {
    const { name, description } = req.body;
    const categoryId = req.params.id;

    const currentCategories = await runQuery('SELECT * FROM categories WHERE id = ?', [categoryId]);
    if (currentCategories.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    await runStatement(
      'UPDATE categories SET name = ?, description = ? WHERE id = ?',
      [name, description || '', categoryId]
    );

    await logAuditTrail('categories', categoryId, 'UPDATE', currentCategories[0], req.body, req.user.id);
    res.json({ message: 'Category updated successfully' });
  } catch (error) {
    console.error('Error updating category:', error);
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      res.status(400).json({ error: 'Category name already exists' });
    } else {
      res.status(500).json({ error: 'Failed to update category' });
    }
  }
});

router.delete('/categories/:id', requireAdmin, async (req, res) => {
  try {
    const categoryId = req.params.id;

    const currentCategories = await runQuery('SELECT * FROM categories WHERE id = ?', [categoryId]);
    if (currentCategories.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // Check if category has items
    const items = await runQuery('SELECT COUNT(*) as count FROM inventory_items WHERE category_id = ?', [categoryId]);
    if (items[0].count > 0) {
      return res.status(400).json({ error: 'Cannot delete category with existing items' });
    }

    await runStatement('DELETE FROM categories WHERE id = ?', [categoryId]);
    await logAuditTrail('categories', categoryId, 'DELETE', currentCategories[0], null, req.user.id);
    
    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

// SUBCATEGORIES ROUTES
router.get('/subcategories', async (req, res) => {
  try {
    const subcategories = await runQuery(`
      SELECT sc.*, c.name as category_name,
             COUNT(i.id) as item_count
      FROM subcategories sc
      LEFT JOIN categories c ON sc.category_id = c.id
      LEFT JOIN inventory_items i ON sc.id = i.subcategory_id
      GROUP BY sc.id
      ORDER BY c.name, sc.name
    `);
    res.json(subcategories);
  } catch (error) {
    console.error('Error fetching subcategories:', error);
    res.status(500).json({ error: 'Failed to fetch subcategories' });
  }
});

router.post('/subcategories', requireAdmin, async (req, res) => {
  try {
    const { name, category_id, description } = req.body;
    
    if (!name || !category_id) {
      return res.status(400).json({ error: 'Name and category are required' });
    }

    const result = await runStatement(
      'INSERT INTO subcategories (name, category_id, description) VALUES (?, ?, ?)',
      [name, category_id, description || '']
    );

    await logAuditTrail('subcategories', result.id, 'INSERT', null, req.body, req.user.id);
    res.status(201).json({ id: result.id, message: 'Subcategory created successfully' });
  } catch (error) {
    console.error('Error creating subcategory:', error);
    res.status(500).json({ error: 'Failed to create subcategory' });
  }
});

router.put('/subcategories/:id', requireAdmin, async (req, res) => {
  try {
    const { name, category_id, description } = req.body;
    const subcategoryId = req.params.id;

    const currentSubcategories = await runQuery('SELECT * FROM subcategories WHERE id = ?', [subcategoryId]);
    if (currentSubcategories.length === 0) {
      return res.status(404).json({ error: 'Subcategory not found' });
    }

    await runStatement(
      'UPDATE subcategories SET name = ?, category_id = ?, description = ? WHERE id = ?',
      [name, category_id, description || '', subcategoryId]
    );

    await logAuditTrail('subcategories', subcategoryId, 'UPDATE', currentSubcategories[0], req.body, req.user.id);
    res.json({ message: 'Subcategory updated successfully' });
  } catch (error) {
    console.error('Error updating subcategory:', error);
    res.status(500).json({ error: 'Failed to update subcategory' });
  }
});

router.delete('/subcategories/:id', requireAdmin, async (req, res) => {
  try {
    const subcategoryId = req.params.id;

    const currentSubcategories = await runQuery('SELECT * FROM subcategories WHERE id = ?', [subcategoryId]);
    if (currentSubcategories.length === 0) {
      return res.status(404).json({ error: 'Subcategory not found' });
    }

    // Check if subcategory has items
    const items = await runQuery('SELECT COUNT(*) as count FROM inventory_items WHERE subcategory_id = ?', [subcategoryId]);
    if (items[0].count > 0) {
      return res.status(400).json({ error: 'Cannot delete subcategory with existing items' });
    }

    await runStatement('DELETE FROM subcategories WHERE id = ?', [subcategoryId]);
    await logAuditTrail('subcategories', subcategoryId, 'DELETE', currentSubcategories[0], null, req.user.id);
    
    res.json({ message: 'Subcategory deleted successfully' });
  } catch (error) {
    console.error('Error deleting subcategory:', error);
    res.status(500).json({ error: 'Failed to delete subcategory' });
  }
});

// UNITS ROUTES
router.get('/units', async (req, res) => {
  try {
    const units = await runQuery(`
      SELECT u.*, COUNT(i.id) as item_count
      FROM units u
      LEFT JOIN inventory_items i ON u.id = i.unit_id
      GROUP BY u.id
      ORDER BY u.name
    `);
    res.json(units);
  } catch (error) {
    console.error('Error fetching units:', error);
    res.status(500).json({ error: 'Failed to fetch units' });
  }
});

router.post('/units', requireAdmin, async (req, res) => {
  try {
    const { name, abbreviation } = req.body;
    
    if (!name || !abbreviation) {
      return res.status(400).json({ error: 'Name and abbreviation are required' });
    }

    const result = await runStatement(
      'INSERT INTO units (name, abbreviation) VALUES (?, ?)',
      [name, abbreviation]
    );

    await logAuditTrail('units', result.id, 'INSERT', null, req.body, req.user.id);
    res.status(201).json({ id: result.id, message: 'Unit created successfully' });
  } catch (error) {
    console.error('Error creating unit:', error);
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      res.status(400).json({ error: 'Unit name or abbreviation already exists' });
    } else {
      res.status(500).json({ error: 'Failed to create unit' });
    }
  }
});

router.put('/units/:id', requireAdmin, async (req, res) => {
  try {
    const { name, abbreviation } = req.body;
    const unitId = req.params.id;

    const currentUnits = await runQuery('SELECT * FROM units WHERE id = ?', [unitId]);
    if (currentUnits.length === 0) {
      return res.status(404).json({ error: 'Unit not found' });
    }

    await runStatement(
      'UPDATE units SET name = ?, abbreviation = ? WHERE id = ?',
      [name, abbreviation, unitId]
    );

    await logAuditTrail('units', unitId, 'UPDATE', currentUnits[0], req.body, req.user.id);
    res.json({ message: 'Unit updated successfully' });
  } catch (error) {
    console.error('Error updating unit:', error);
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      res.status(400).json({ error: 'Unit name or abbreviation already exists' });
    } else {
      res.status(500).json({ error: 'Failed to update unit' });
    }
  }
});

router.delete('/units/:id', requireAdmin, async (req, res) => {
  try {
    const unitId = req.params.id;

    const currentUnits = await runQuery('SELECT * FROM units WHERE id = ?', [unitId]);
    if (currentUnits.length === 0) {
      return res.status(404).json({ error: 'Unit not found' });
    }

    // Check if unit has items
    const items = await runQuery('SELECT COUNT(*) as count FROM inventory_items WHERE unit_id = ?', [unitId]);
    if (items[0].count > 0) {
      return res.status(400).json({ error: 'Cannot delete unit with existing items' });
    }

    await runStatement('DELETE FROM units WHERE id = ?', [unitId]);
    await logAuditTrail('units', unitId, 'DELETE', currentUnits[0], null, req.user.id);
    
    res.json({ message: 'Unit deleted successfully' });
  } catch (error) {
    console.error('Error deleting unit:', error);
    res.status(500).json({ error: 'Failed to delete unit' });
  }
});

// LOCATIONS ROUTES
router.get('/locations', async (req, res) => {
  try {
    const locations = await runQuery(`
      SELECT l.*, COUNT(i.id) as item_count
      FROM locations l
      LEFT JOIN inventory_items i ON l.id = i.location_id
      GROUP BY l.id
      ORDER BY l.name
    `);
    res.json(locations);
  } catch (error) {
    console.error('Error fetching locations:', error);
    res.status(500).json({ error: 'Failed to fetch locations' });
  }
});

router.post('/locations', requireAdmin, async (req, res) => {
  try {
    const { name, description } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const result = await runStatement(
      'INSERT INTO locations (name, description) VALUES (?, ?)',
      [name, description || '']
    );

    await logAuditTrail('locations', result.id, 'INSERT', null, req.body, req.user.id);
    res.status(201).json({ id: result.id, message: 'Location created successfully' });
  } catch (error) {
    console.error('Error creating location:', error);
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      res.status(400).json({ error: 'Location name already exists' });
    } else {
      res.status(500).json({ error: 'Failed to create location' });
    }
  }
});

router.put('/locations/:id', requireAdmin, async (req, res) => {
  try {
    const { name, description } = req.body;
    const locationId = req.params.id;

    const currentLocations = await runQuery('SELECT * FROM locations WHERE id = ?', [locationId]);
    if (currentLocations.length === 0) {
      return res.status(404).json({ error: 'Location not found' });
    }

    await runStatement(
      'UPDATE locations SET name = ?, description = ? WHERE id = ?',
      [name, description || '', locationId]
    );

    await logAuditTrail('locations', locationId, 'UPDATE', currentLocations[0], req.body, req.user.id);
    res.json({ message: 'Location updated successfully' });
  } catch (error) {
    console.error('Error updating location:', error);
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      res.status(400).json({ error: 'Location name already exists' });
    } else {
      res.status(500).json({ error: 'Failed to update location' });
    }
  }
});

router.delete('/locations/:id', requireAdmin, async (req, res) => {
  try {
    const locationId = req.params.id;

    const currentLocations = await runQuery('SELECT * FROM locations WHERE id = ?', [locationId]);
    if (currentLocations.length === 0) {
      return res.status(404).json({ error: 'Location not found' });
    }

    // Check if location has items
    const items = await runQuery('SELECT COUNT(*) as count FROM inventory_items WHERE location_id = ?', [locationId]);
    if (items[0].count > 0) {
      return res.status(400).json({ error: 'Cannot delete location with existing items' });
    }

    await runStatement('DELETE FROM locations WHERE id = ?', [locationId]);
    await logAuditTrail('locations', locationId, 'DELETE', currentLocations[0], null, req.user.id);
    
    res.json({ message: 'Location deleted successfully' });
  } catch (error) {
    console.error('Error deleting location:', error);
    res.status(500).json({ error: 'Failed to delete location' });
  }
});

// SUPPLIERS ROUTES
router.get('/suppliers', async (req, res) => {
  try {
    const suppliers = await runQuery(`
      SELECT s.*, COUNT(i.id) as item_count
      FROM suppliers s
      LEFT JOIN inventory_items i ON s.id = i.supplier_id
      GROUP BY s.id
      ORDER BY s.name
    `);
    res.json(suppliers);
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    res.status(500).json({ error: 'Failed to fetch suppliers' });
  }
});

router.post('/suppliers', requireAdmin, async (req, res) => {
  try {
    const { name, contact_person, email, phone, address } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const result = await runStatement(
      'INSERT INTO suppliers (name, contact_person, email, phone, address) VALUES (?, ?, ?, ?, ?)',
      [name, contact_person || '', email || '', phone || '', address || '']
    );

    await logAuditTrail('suppliers', result.id, 'INSERT', null, req.body, req.user.id);
    res.status(201).json({ id: result.id, message: 'Supplier created successfully' });
  } catch (error) {
    console.error('Error creating supplier:', error);
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      res.status(400).json({ error: 'Supplier name already exists' });
    } else {
      res.status(500).json({ error: 'Failed to create supplier' });
    }
  }
});

router.put('/suppliers/:id', requireAdmin, async (req, res) => {
  try {
    const { name, contact_person, email, phone, address } = req.body;
    const supplierId = req.params.id;

    const currentSuppliers = await runQuery('SELECT * FROM suppliers WHERE id = ?', [supplierId]);
    if (currentSuppliers.length === 0) {
      return res.status(404).json({ error: 'Supplier not found' });
    }

    await runStatement(
      'UPDATE suppliers SET name = ?, contact_person = ?, email = ?, phone = ?, address = ? WHERE id = ?',
      [name, contact_person || '', email || '', phone || '', address || '', supplierId]
    );

    await logAuditTrail('suppliers', supplierId, 'UPDATE', currentSuppliers[0], req.body, req.user.id);
    res.json({ message: 'Supplier updated successfully' });
  } catch (error) {
    console.error('Error updating supplier:', error);
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      res.status(400).json({ error: 'Supplier name already exists' });
    } else {
      res.status(500).json({ error: 'Failed to update supplier' });
    }
  }
});

router.delete('/suppliers/:id', requireAdmin, async (req, res) => {
  try {
    const supplierId = req.params.id;

    const currentSuppliers = await runQuery('SELECT * FROM suppliers WHERE id = ?', [supplierId]);
    if (currentSuppliers.length === 0) {
      return res.status(404).json({ error: 'Supplier not found' });
    }

    // Check if supplier has items
    const items = await runQuery('SELECT COUNT(*) as count FROM inventory_items WHERE supplier_id = ?', [supplierId]);
    if (items[0].count > 0) {
      return res.status(400).json({ error: 'Cannot delete supplier with existing items' });
    }

    await runStatement('DELETE FROM suppliers WHERE id = ?', [supplierId]);
    await logAuditTrail('suppliers', supplierId, 'DELETE', currentSuppliers[0], null, req.user.id);
    
    res.json({ message: 'Supplier deleted successfully' });
  } catch (error) {
    console.error('Error deleting supplier:', error);
    res.status(500).json({ error: 'Failed to delete supplier' });
  }
});

// DEPARTMENTS ROUTES
router.get('/departments', async (req, res) => {
  try {
    const departments = await runQuery(`
      SELECT d.*,
             COUNT(DISTINCT r.id) as requisition_count
      FROM departments d
      LEFT JOIN requisitions r ON d.name = r.department
      GROUP BY d.id
      ORDER BY d.name
    `);
    res.json(departments);
  } catch (error) {
    console.error('Error fetching departments:', error);
    res.status(500).json({ error: 'Failed to fetch departments' });
  }
});

router.post('/departments', requireAdmin, async (req, res) => {
  try {
    const { name, description, manager, budget } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const result = await runStatement(
      'INSERT INTO departments (name, description, manager, budget) VALUES (?, ?, ?, ?)',
      [name, description || '', manager || '', budget || 0]
    );

    await logAuditTrail('departments', result.id, 'INSERT', null, req.body, req.user.id);
    res.status(201).json({ id: result.id, message: 'Department created successfully' });
  } catch (error) {
    console.error('Error creating department:', error);
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      res.status(400).json({ error: 'Department name already exists' });
    } else {
      res.status(500).json({ error: 'Failed to create department' });
    }
  }
});

router.put('/departments/:id', requireAdmin, async (req, res) => {
  try {
    const { name, description, manager, budget } = req.body;
    const departmentId = req.params.id;

    const currentDepartments = await runQuery('SELECT * FROM departments WHERE id = ?', [departmentId]);
    if (currentDepartments.length === 0) {
      return res.status(404).json({ error: 'Department not found' });
    }

    await runStatement(
      'UPDATE departments SET name = ?, description = ?, manager = ?, budget = ? WHERE id = ?',
      [name, description || '', manager || '', budget || 0, departmentId]
    );

    await logAuditTrail('departments', departmentId, 'UPDATE', currentDepartments[0], req.body, req.user.id);
    res.json({ message: 'Department updated successfully' });
  } catch (error) {
    console.error('Error updating department:', error);
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      res.status(400).json({ error: 'Department name already exists' });
    } else {
      res.status(500).json({ error: 'Failed to update department' });
    }
  }
});

router.delete('/departments/:id', requireAdmin, async (req, res) => {
  try {
    const departmentId = req.params.id;

    const currentDepartments = await runQuery('SELECT * FROM departments WHERE id = ?', [departmentId]);
    if (currentDepartments.length === 0) {
      return res.status(404).json({ error: 'Department not found' });
    }

    // Check if department has requisitions
    const requisitions = await runQuery('SELECT COUNT(*) as count FROM requisitions WHERE department = ?', [currentDepartments[0].name]);
    if (requisitions[0].count > 0) {
      return res.status(400).json({ error: 'Cannot delete department with existing requisitions' });
    }

    await runStatement('DELETE FROM departments WHERE id = ?', [departmentId]);
    await logAuditTrail('departments', departmentId, 'DELETE', currentDepartments[0], null, req.user.id);
    
    res.json({ message: 'Department deleted successfully' });
  } catch (error) {
    console.error('Error deleting department:', error);
    res.status(500).json({ error: 'Failed to delete department' });
  }
});

export default router;