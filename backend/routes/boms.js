import express from 'express';
import { runQuery, runStatement } from '../database/connection.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { logAuditTrail } from '../utils/audit.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Get all BOMs with summary information
router.get('/', async (req, res) => {
  try {
    const { status, search, page = 1, limit = 50 } = req.query;
    
    let sql = `
      SELECT 
        b.*,
        u.username as created_by_name,
        i.name as finished_product_name,
        i.sku as finished_product_sku,
        COUNT(DISTINCT bc.id) as component_count,
        COUNT(DISTINCT bo.id) as operation_count
      FROM bill_of_materials b
      LEFT JOIN users u ON b.created_by = u.id
      LEFT JOIN inventory_items i ON b.finished_product_id = i.id
      LEFT JOIN bom_components bc ON b.id = bc.bom_id
      LEFT JOIN bom_operations bo ON b.id = bo.bom_id
      WHERE 1=1
    `;
    
    const params = [];

    if (status) {
      sql += ` AND b.status = ?`;
      params.push(status);
    }

    if (search) {
      sql += ` AND (b.name LIKE ? OR b.description LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }

    sql += ` GROUP BY b.id ORDER BY b.updated_at DESC`;

    const offset = (page - 1) * limit;
    sql += ` LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    const boms = await runQuery(sql, params);
    
    // Get total count for pagination
    let countSql = `SELECT COUNT(DISTINCT b.id) as total FROM bill_of_materials b WHERE 1=1`;
    const countParams = [];

    if (status) {
      countSql += ` AND b.status = ?`;
      countParams.push(status);
    }

    if (search) {
      countSql += ` AND (b.name LIKE ? OR b.description LIKE ?)`;
      countParams.push(`%${search}%`, `%${search}%`);
    }

    const countResult = await runQuery(countSql, countParams);
    const total = countResult[0].total;

    res.json({
      boms: boms || [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total || 0,
        pages: Math.ceil((total || 0) / parseInt(limit))
      }
    });
  } catch (error)  {
    console.error('Error fetching BOMs:', error);
    res.status(500).json({ error: 'Failed to fetch BOMs' });
  }
});

// Get single BOM with components and operations
router.get('/:id', async (req, res) => {
  try {
    const bomId = req.params.id;
    
    // Get BOM details
    const boms = await runQuery(`
      SELECT 
        b.*,
        u.username as created_by_name,
        i.name as finished_product_name,
        i.sku as finished_product_sku
      FROM bill_of_materials b
      LEFT JOIN users u ON b.created_by = u.id
      LEFT JOIN inventory_items i ON b.finished_product_id = i.id
      WHERE b.id = ?
    `, [bomId]);

    if (boms.length === 0) {
      return res.status(404).json({ error: 'BOM not found' });
    }

    const bom = boms[0];

    // Get BOM components (including sub-BOMs)
    const components = await runQuery(`
      SELECT 
        bc.*,
        i.name as item_name,
        i.sku as item_sku,
        i.description as item_description,
        u.name as unit_name,
        u.abbreviation as unit_abbreviation,
        c.name as category_name,
        sub_bom.name as component_bom_name,
        sub_bom.version as component_bom_version,
        sub_bom.total_cost as component_bom_cost,
        CASE 
          WHEN bc.item_id IS NOT NULL THEN 'item'
          WHEN bc.component_bom_id IS NOT NULL THEN 'bom'
          ELSE NULL
        END as component_type
      FROM bom_components bc
      LEFT JOIN inventory_items i ON bc.item_id = i.id
      LEFT JOIN units u ON bc.unit_id = u.id
      LEFT JOIN categories c ON i.category_id = c.id
      LEFT JOIN bill_of_materials sub_bom ON bc.component_bom_id = sub_bom.id
      WHERE bc.bom_id = ?
      ORDER BY bc.sort_order
    `, [bomId]);

    // Get BOM operations
    const operations = await runQuery(`
      SELECT * FROM bom_operations
      WHERE bom_id = ?
      ORDER BY sequence_number
    `, [bomId]);

    // Return complete BOM with components and operations
    res.json({
      ...bom,
      components: components || [],
      operations: operations || []
    });
  } catch (error) {
    console.error('Error fetching BOM details:', error);
    res.status(500).json({ error: 'Failed to fetch BOM details' });
  }
});

// Create new BOM
router.post('/', async (req, res) => {
  try {
    const {
      name,
      description,
      finished_product_id,
      version,
      status,
      unit_cost,
      labor_cost,
      overhead_cost,
      total_cost,
      components,
      operations
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    // Calculate costs if not provided
    const calculatedUnitCost = components?.reduce((sum, comp) => sum + (comp.total_cost || 0), 0) || 0;
    const calculatedLaborCost = operations?.reduce((sum, op) => 
      sum + ((op.estimated_time_minutes / 60) * (op.labor_rate || 0)), 0) || 0;
    const calculatedOverheadCost = overhead_cost || 0;
    const calculatedTotalCost = calculatedUnitCost + calculatedLaborCost + calculatedOverheadCost;

    // Create BOM
    const result = await runStatement(`
      INSERT INTO bill_of_materials (
        name, description, finished_product_id, version, status,
        unit_cost, labor_cost, overhead_cost, total_cost, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      name,
      description || '',
      finished_product_id || null,
      version || '1.0',
      status || 'draft',
      unit_cost || calculatedUnitCost,
      labor_cost || calculatedLaborCost,
      overhead_cost || calculatedOverheadCost,
      total_cost || calculatedTotalCost,
      req.user.id
    ]);

    const bomId = result.id;

    // Add components if provided
    if (components && Array.isArray(components) && components.length > 0) {
      for (let i = 0; i < components.length; i++) {
        const component = components[i];
        
        // Validate that either item_id or component_bom_id is provided, but not both
        if ((!component.item_id && !component.component_bom_id) || 
            (component.item_id && component.component_bom_id)) {
          continue; // Skip invalid components
        }
        
        if (!component.quantity || component.quantity <= 0) continue;

        let unitCost = 0;
        let totalCost = 0;

        if (component.item_id) {
          // Get current item price
          const items = await runQuery('SELECT unit_price FROM inventory_items WHERE id = ?', [component.item_id]);
          unitCost = items.length > 0 ? items[0].unit_price : 0;
          totalCost = (component.quantity * unitCost) * (1 + (component.waste_factor || 0));
        } else if (component.component_bom_id) {
          // Get sub-BOM cost
          const subBoms = await runQuery('SELECT total_cost FROM bill_of_materials WHERE id = ?', [component.component_bom_id]);
          unitCost = subBoms.length > 0 ? subBoms[0].total_cost : 0;
          totalCost = (component.quantity * unitCost) * (1 + (component.waste_factor || 0));
        }

        await runStatement(`
          INSERT INTO bom_components (
            bom_id, item_id, component_bom_id, quantity, unit_id, unit_cost, total_cost,
            waste_factor, notes, sort_order
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          bomId,
          component.item_id || null,
          component.component_bom_id || null,
          component.quantity,
          component.unit_id || null,
          component.unit_cost || unitCost,
          component.total_cost || totalCost,
          component.waste_factor || 0,
          component.notes || '',
          i + 1 // Use index for sort order
        ]);
      }
    }

    // Add operations if provided
    if (operations && Array.isArray(operations) && operations.length > 0) {
      for (let i = 0; i < operations.length; i++) {
        const operation = operations[i];
        if (!operation.operation_name) continue;

        await runStatement(`
          INSERT INTO bom_operations (
            bom_id, operation_name, description, sequence_number,
            estimated_time_minutes, labor_rate, machine_required,
            skill_level, notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          bomId,
          operation.operation_name,
          operation.description || '',
          operation.sequence_number || (i + 1),
          operation.estimated_time_minutes || 0,
          operation.labor_rate || 0,
          operation.machine_required || '',
          operation.skill_level || 'basic',
          operation.notes || ''
        ]);
      }
    }

    // Update BOM with recalculated costs
    await updateBOMCosts(bomId);

    await logAuditTrail('bill_of_materials', bomId, 'INSERT', null, req.body, req.user.id);

    res.status(201).json({ 
      id: bomId, 
      message: 'BOM created successfully' 
    });
  } catch (error) {
    console.error('Error creating BOM:', error);
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      res.status(400).json({ error: 'BOM name already exists' });
    } else {
      res.status(500).json({ error: 'Failed to create BOM' });
    }
  }
});

// Update BOM
router.put('/:id', async (req, res) => {
  try {
    const bomId = req.params.id;
    const {
      name,
      description,
      finished_product_id,
      version,
      status,
      unit_cost,
      labor_cost,
      overhead_cost,
      total_cost,
      components,
      operations
    } = req.body;

    // Get current BOM for audit trail
    const currentBOMs = await runQuery('SELECT * FROM bill_of_materials WHERE id = ?', [bomId]);
    if (currentBOMs.length === 0) {
      return res.status(404).json({ error: 'BOM not found' });
    }

    // Update BOM
    await runStatement(`
      UPDATE bill_of_materials SET
        name = ?, description = ?, finished_product_id = ?, version = ?, status = ?,
        unit_cost = ?, labor_cost = ?, overhead_cost = ?, total_cost = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      name,
      description || '',
      finished_product_id || null,
      version || '1.0',
      status || 'draft',
      unit_cost || 0,
      labor_cost || 0,
      overhead_cost || 0,
      total_cost || 0,
      bomId
    ]);

    // Update components if provided
    if (components && Array.isArray(components)) {
      // Delete existing components
      await runStatement('DELETE FROM bom_components WHERE bom_id = ?', [bomId]);

      // Add new components
      for (let i = 0; i < components.length; i++) {
        const component = components[i];
        
        // Validate that either item_id or component_bom_id is provided, but not both
        if ((!component.item_id && !component.component_bom_id) || 
            (component.item_id && component.component_bom_id)) {
          continue; // Skip invalid components
        }
        
        if (!component.quantity || component.quantity <= 0) continue;

        let unitCost = 0;
        let totalCost = 0;

        if (component.item_id) {
          // Get current item price
          const items = await runQuery('SELECT unit_price FROM inventory_items WHERE id = ?', [component.item_id]);
          unitCost = items.length > 0 ? items[0].unit_price : 0;
          totalCost = (component.quantity * unitCost) * (1 + (component.waste_factor || 0));
        } else if (component.component_bom_id) {
          // Get sub-BOM cost
          const subBoms = await runQuery('SELECT total_cost FROM bill_of_materials WHERE id = ?', [component.component_bom_id]);
          unitCost = subBoms.length > 0 ? subBoms[0].total_cost : 0;
          totalCost = (component.quantity * unitCost) * (1 + (component.waste_factor || 0));
        }

        await runStatement(`
          INSERT INTO bom_components (
            bom_id, item_id, component_bom_id, quantity, unit_id, unit_cost, total_cost,
            waste_factor, notes, sort_order
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          bomId,
          component.item_id || null,
          component.component_bom_id || null,
          component.quantity,
          component.unit_id || null,
          component.unit_cost || unitCost,
          component.total_cost || totalCost,
          component.waste_factor || 0,
          component.notes || '',
          i + 1 // Use index for sort order
        ]);
      }
    }

    // Update operations if provided
    if (operations && Array.isArray(operations)) {
      // Delete existing operations
      await runStatement('DELETE FROM bom_operations WHERE bom_id = ?', [bomId]);

      // Add new operations
      for (let i = 0; i < operations.length; i++) {
        const operation = operations[i];
        if (!operation.operation_name) continue;

        await runStatement(`
          INSERT INTO bom_operations (
            bom_id, operation_name, description, sequence_number,
            estimated_time_minutes, labor_rate, machine_required,
            skill_level, notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          bomId,
          operation.operation_name,
          operation.description || '',
          operation.sequence_number || (i + 1),
          operation.estimated_time_minutes || 0,
          operation.labor_rate || 0,
          operation.machine_required || '',
          operation.skill_level || 'basic',
          operation.notes || ''
        ]);
      }
    }

    // Update BOM with recalculated costs
    await updateBOMCosts(bomId);

    await logAuditTrail('bill_of_materials', bomId, 'UPDATE', currentBOMs[0], req.body, req.user.id);

    res.json({ message: 'BOM updated successfully' });
  } catch (error) {
    console.error('Error updating BOM:', error);
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      res.status(400).json({ error: 'BOM name already exists' });
    } else {
      res.status(500).json({ error: 'Failed to update BOM' });
    }
  }
});

// Delete BOM
router.delete('/:id', async (req, res) => {
  try {
    const bomId = req.params.id;
    
    // Get current BOM for audit trail
    const currentBOMs = await runQuery('SELECT * FROM bill_of_materials WHERE id = ?', [bomId]);
    if (currentBOMs.length === 0) {
      return res.status(404).json({ error: 'BOM not found' });
    }

    // Check if this BOM is used as a component in other BOMs
    const usedAsComponent = await runQuery(
      'SELECT COUNT(*) as count FROM bom_components WHERE component_bom_id = ?',
      [bomId]
    );
    
    if (usedAsComponent[0].count > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete BOM that is used as a component in other BOMs',
        usedCount: usedAsComponent[0].count
      });
    }

    // Delete BOM (components and operations will be deleted via CASCADE)
    await runStatement('DELETE FROM bill_of_materials WHERE id = ?', [bomId]);

    await logAuditTrail('bill_of_materials', bomId, 'DELETE', currentBOMs[0], null, req.user.id);
    
    res.json({ message: 'BOM deleted successfully' });
  } catch (error) {
    console.error('Error deleting BOM:', error);
    res.status(500).json({ error: 'Failed to delete BOM' });
  }
});

// Get all BOMs for dropdown selection (simplified list)
router.get('/dropdown/list', async (req, res) => {
  try {
    const boms = await runQuery(`
      SELECT id, name, version, status, total_cost
      FROM bill_of_materials
      WHERE status != 'archived'
      ORDER BY name
    `);
    
    res.json(boms || []);
  } catch (error) {
    console.error('Error fetching BOM dropdown list:', error);
    res.status(500).json({ error: 'Failed to fetch BOM list' });
  }
});

// Recursively calculate BOM costs
async function calculateBOMCostRecursive(bomId) {
  try {
    // Get all components for this BOM
    const components = await runQuery(`
      SELECT 
        bc.*,
        CASE 
          WHEN bc.item_id IS NOT NULL THEN 'item'
          WHEN bc.component_bom_id IS NOT NULL THEN 'bom'
          ELSE NULL
        END as component_type
      FROM bom_components bc
      WHERE bc.bom_id = ?
    `, [bomId]);
    
    let totalComponentCost = 0;
    
    // Calculate cost for each component
    for (const component of components) {
      let componentCost = 0;
      
      if (component.component_type === 'item') {
        // For inventory items, use the stored unit cost
        componentCost = component.unit_cost * component.quantity * (1 + component.waste_factor);
      } else if (component.component_type === 'bom') {
        // For sub-BOMs, get the latest total cost
        const subBom = await runQuery(
          'SELECT total_cost FROM bill_of_materials WHERE id = ?',
          [component.component_bom_id]
        );
        
        if (subBom.length > 0) {
          componentCost = subBom[0].total_cost * component.quantity * (1 + component.waste_factor);
        }
      }
      
      // Update the component's total cost
      await runStatement(
        'UPDATE bom_components SET total_cost = ? WHERE id = ?',
        [componentCost, component.id]
      );
      
      totalComponentCost += componentCost;
    }
    
    return totalComponentCost;
  } catch (error) {
    console.error('Error in recursive BOM cost calculation:', error);
    throw error;
  }
}

// Helper function to update BOM costs
async function updateBOMCosts(bomId) {
  try {
    // Calculate component costs recursively
    const unitCost = await calculateBOMCostRecursive(bomId);

    // Calculate labor costs
    const laborCostsResult = await runQuery(`
      SELECT SUM((estimated_time_minutes / 60.0) * labor_rate) as labor_cost
      FROM bom_operations
      WHERE bom_id = ?
    `, [bomId]);
    const laborCost = laborCostsResult[0]?.labor_cost || 0;

    // Get current overhead cost
    const bomResult = await runQuery(`
      SELECT overhead_cost FROM bill_of_materials WHERE id = ?
    `, [bomId]);
    const overheadCost = bomResult[0]?.overhead_cost || 0;

    // Calculate total cost
    const totalCost = unitCost + laborCost + overheadCost;

    // Update BOM with calculated costs
    await runStatement(`
      UPDATE bill_of_materials SET
        unit_cost = ?,
        labor_cost = ?,
        total_cost = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [unitCost, laborCost, totalCost, bomId]);

    return { unitCost, laborCost, overheadCost, totalCost };
  } catch (error) {
    console.error('Error updating BOM costs:', error);
    throw error;
  }
}

export default router;