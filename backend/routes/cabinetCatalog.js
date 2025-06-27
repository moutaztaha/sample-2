import express from 'express';
import { runQuery, runStatement } from '../database/connection.js';
import { authenticateToken } from '../middleware/auth.js';
import { logAuditTrail } from '../utils/audit.js';
import { calculateCabinetParts, calculateCabinetCost } from '../utils/cabinetUtils.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Get all cabinet categories
router.get('/categories', async (req, res) => {
  try {
    const categories = await runQuery(`
      SELECT * FROM cabinet_categories
      ORDER BY name
    `);
    res.json(categories);
  } catch (error) {
    console.error('Error fetching cabinet categories:', error);
    res.status(500).json({ error: 'Failed to fetch cabinet categories' });
  }
});

// Get all cabinet models
router.get('/models', async (req, res) => {
  try {
    const { category, search } = req.query;
    
    let sql = `
      SELECT m.*, c.name as category_name
      FROM cabinet_models m
      JOIN cabinet_categories c ON m.category_id = c.id
      WHERE m.is_active = 1
    `;
    
    const params = [];
    
    if (category) {
      sql += ` AND m.category_id = ?`;
      params.push(category);
    }
    
    if (search) {
      sql += ` AND (m.name LIKE ? OR m.description LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }
    
    sql += ` ORDER BY m.name`;
    
    const models = await runQuery(sql, params);
    res.json(models);
  } catch (error) {
    console.error('Error fetching cabinet models:', error);
    res.status(500).json({ error: 'Failed to fetch cabinet models' });
  }
});

// Get a specific cabinet model
router.get('/models/:id', async (req, res) => {
  try {
    const modelId = req.params.id;
    
    const models = await runQuery(`
      SELECT m.*, c.name as category_name
      FROM cabinet_models m
      JOIN cabinet_categories c ON m.category_id = c.id
      WHERE m.id = ?
    `, [modelId]);
    
    if (models.length === 0) {
      return res.status(404).json({ error: 'Cabinet model not found' });
    }
    
    res.json(models[0]);
  } catch (error) {
    console.error('Error fetching cabinet model:', error);
    res.status(500).json({ error: 'Failed to fetch cabinet model' });
  }
});

// Get all cabinet materials
router.get('/materials', async (req, res) => {
  try {
    const { type } = req.query;
    
    let sql = `
      SELECT * FROM cabinet_materials
      WHERE is_active = 1
    `;
    
    const params = [];
    
    if (type) {
      sql += ` AND type = ?`;
      params.push(type);
    }
    
    sql += ` ORDER BY name`;
    
    const materials = await runQuery(sql, params);
    res.json(materials);
  } catch (error) {
    console.error('Error fetching cabinet materials:', error);
    res.status(500).json({ error: 'Failed to fetch cabinet materials' });
  }
});

// Get all cabinet hardware
router.get('/hardware', async (req, res) => {
  try {
    const { type } = req.query;
    
    let sql = `
      SELECT h.*, s.name as supplier_name
      FROM cabinet_hardware h
      LEFT JOIN suppliers s ON h.supplier_id = s.id
      WHERE h.is_active = 1
    `;
    
    const params = [];
    
    if (type) {
      sql += ` AND h.type = ?`;
      params.push(type);
    }
    
    sql += ` ORDER BY h.name`;
    
    const hardware = await runQuery(sql, params);
    res.json(hardware);
  } catch (error) {
    console.error('Error fetching cabinet hardware:', error);
    res.status(500).json({ error: 'Failed to fetch cabinet hardware' });
  }
});

// Get all cabinet projects
router.get('/projects', async (req, res) => {
  try {
    const { status, search, page = 1, limit = 50 } = req.query;
    
    let sql = `
      SELECT 
        p.*,
        u.username as created_by_name,
        COUNT(DISTINCT pi.id) as item_count
      FROM cabinet_projects p
      LEFT JOIN users u ON p.created_by = u.id
      LEFT JOIN cabinet_project_items pi ON p.id = pi.project_id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (status) {
      sql += ` AND p.status = ?`;
      params.push(status);
    }
    
    if (search) {
      sql += ` AND (p.name LIKE ? OR p.description LIKE ? OR p.customer_name LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    
    sql += ` GROUP BY p.id ORDER BY p.created_at DESC`;
    
    const offset = (page - 1) * limit;
    sql += ` LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));
    
    const projects = await runQuery(sql, params);
    
    // Get total count for pagination
    let countSql = `SELECT COUNT(DISTINCT p.id) as total FROM cabinet_projects p WHERE 1=1`;
    const countParams = [];
    
    if (status) {
      countSql += ` AND p.status = ?`;
      countParams.push(status);
    }
    
    if (search) {
      countSql += ` AND (p.name LIKE ? OR p.description LIKE ? OR p.customer_name LIKE ?)`;
      countParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    
    const countResult = await runQuery(countSql, countParams);
    const total = countResult[0].total;
    
    res.json({
      projects,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching cabinet projects:', error);
    res.status(500).json({ error: 'Failed to fetch cabinet projects' });
  }
});

// Get a specific cabinet project with items and parts
router.get('/projects/:id', async (req, res) => {
  try {
    const projectId = req.params.id;
    
    // Get project details
    const projects = await runQuery(`
      SELECT 
        p.*,
        u.username as created_by_name
      FROM cabinet_projects p
      LEFT JOIN users u ON p.created_by = u.id
      WHERE p.id = ?
    `, [projectId]);
    
    if (projects.length === 0) {
      return res.status(404).json({ error: 'Cabinet project not found' });
    }
    
    const project = projects[0];
    
    // Get project items
    const items = await runQuery(`
      SELECT 
        pi.*,
        m.name as model_name,
        m.image_url as model_image,
        c.name as category_name,
        pm.name as panel_material_name,
        em.name as edge_material_name,
        bm.name as back_material_name,
        dm.name as door_material_name
      FROM cabinet_project_items pi
      LEFT JOIN cabinet_models m ON pi.model_id = m.id
      LEFT JOIN cabinet_categories c ON m.category_id = c.id
      LEFT JOIN cabinet_materials pm ON pi.panel_material_id = pm.id
      LEFT JOIN cabinet_materials em ON pi.edge_material_id = em.id
      LEFT JOIN cabinet_materials bm ON pi.back_material_id = bm.id
      LEFT JOIN cabinet_materials dm ON pi.door_material_id = dm.id
      WHERE pi.project_id = ?
      ORDER BY pi.id
    `, [projectId]);
    
    // Get parts for each item
    const parts = await runQuery(`
      SELECT 
        p.*,
        m.name as material_name,
        m.color as material_color,
        em.name as edge_material_name,
        em.color as edge_material_color
      FROM cabinet_parts p
      LEFT JOIN cabinet_materials m ON p.material_id = m.id
      LEFT JOIN cabinet_materials em ON p.edge_material_id = em.id
      WHERE p.project_id = ?
      ORDER BY p.project_item_id, p.id
    `, [projectId]);
    
    // Group parts by project item
    const itemsWithParts = items.map(item => {
      const itemParts = parts.filter(part => part.project_item_id === item.id);
      return {
        ...item,
        parts: itemParts
      };
    });
    
    // Return complete project with items and parts
    res.json({
      ...project,
      items: itemsWithParts
    });
  } catch (error) {
    console.error('Error fetching cabinet project:', error);
    res.status(500).json({ error: 'Failed to fetch cabinet project' });
  }
});

// Create a new cabinet project
router.post('/projects', async (req, res) => {
  try {
    const {
      name,
      description,
      customer_name,
      customer_email,
      customer_phone,
      status = 'draft'
    } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Project name is required' });
    }
    
    const result = await runStatement(`
      INSERT INTO cabinet_projects (
        name, description, customer_name, customer_email, customer_phone,
        status, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      name,
      description || '',
      customer_name || '',
      customer_email || '',
      customer_phone || '',
      status,
      req.user.id
    ]);
    
    await logAuditTrail('cabinet_projects', result.id, 'INSERT', null, req.body, req.user.id);
    
    res.status(201).json({
      id: result.id,
      message: 'Cabinet project created successfully'
    });
  } catch (error) {
    console.error('Error creating cabinet project:', error);
    res.status(500).json({ error: 'Failed to create cabinet project' });
  }
});

// Update an existing cabinet project
router.put('/projects/:id', async (req, res) => {
  try {
    const projectId = req.params.id;
    const {
      name,
      description,
      customer_name,
      customer_email,
      customer_phone,
      status
    } = req.body;
    
    // Check if project exists
    const existingProjects = await runQuery('SELECT * FROM cabinet_projects WHERE id = ?', [projectId]);
    if (existingProjects.length === 0) {
      return res.status(404).json({ error: 'Cabinet project not found' });
    }
    
    const existingProject = existingProjects[0];
    
    if (!name) {
      return res.status(400).json({ error: 'Project name is required' });
    }
    
    // Update project
    await runStatement(`
      UPDATE cabinet_projects 
      SET name = ?, description = ?, customer_name = ?, customer_email = ?, 
          customer_phone = ?, status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      name,
      description || '',
      customer_name || '',
      customer_email || '',
      customer_phone || '',
      status || existingProject.status,
      projectId
    ]);
    
    await logAuditTrail('cabinet_projects', projectId, 'UPDATE', existingProject, req.body, req.user.id);
    
    res.json({
      message: 'Cabinet project updated successfully'
    });
  } catch (error) {
    console.error('Error updating cabinet project:', error);
    res.status(500).json({ error: 'Failed to update cabinet project' });
  }
});

// Add a cabinet to a project
router.post('/projects/:id/items', async (req, res) => {
  try {
    const projectId = req.params.id;
    const {
      model_id,
      name,
      width,
      height,
      depth,
      quantity = 1,
      panel_material_id,
      edge_material_id,
      back_material_id,
      door_material_id,
      hardware_config,
      custom_options
    } = req.body;
    
    if (!model_id || !width || !height || !depth) {
      return res.status(400).json({ error: 'Model ID, width, height, and depth are required' });
    }
    
    // Check if project exists
    const projects = await runQuery('SELECT * FROM cabinet_projects WHERE id = ?', [projectId]);
    if (projects.length === 0) {
      return res.status(404).json({ error: 'Cabinet project not found' });
    }
    
    // Check if model exists
    const models = await runQuery('SELECT * FROM cabinet_models WHERE id = ?', [model_id]);
    if (models.length === 0) {
      return res.status(404).json({ error: 'Cabinet model not found' });
    }
    
    const model = models[0];
    
    // Validate dimensions
    if (width < model.min_width || width > model.max_width) {
      return res.status(400).json({ 
        error: `Width must be between ${model.min_width}mm and ${model.max_width}mm` 
      });
    }
    
    if (height < model.min_height || height > model.max_height) {
      return res.status(400).json({ 
        error: `Height must be between ${model.min_height}mm and ${model.max_height}mm` 
      });
    }
    
    if (depth < model.min_depth || depth > model.max_depth) {
      return res.status(400).json({ 
        error: `Depth must be between ${model.min_depth}mm and ${model.max_depth}mm` 
      });
    }
    
    // Calculate cabinet parts and cost
    const cabinetName = name || `${model.name} ${width}x${height}x${depth}mm`;
    
    // Calculate parts and cost
    const { parts, totalCost } = await calculateCabinetParts({
      model_id,
      width,
      height,
      depth,
      panel_material_id,
      edge_material_id,
      back_material_id,
      door_material_id,
      hardware_config: typeof hardware_config === 'string' ? JSON.parse(hardware_config) : hardware_config
    });
    
    const unitCost = totalCost;
    const itemTotalCost = unitCost * quantity;
    
    // Insert cabinet item
    const itemResult = await runStatement(`
      INSERT INTO cabinet_project_items (
        project_id, model_id, name, width, height, depth, quantity,
        panel_material_id, edge_material_id, back_material_id, door_material_id,
        hardware_config, custom_options, unit_cost, total_cost
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      projectId,
      model_id,
      cabinetName,
      width,
      height,
      depth,
      quantity,
      panel_material_id || null,
      edge_material_id || null,
      back_material_id || null,
      door_material_id || null,
      JSON.stringify(hardware_config || {}),
      JSON.stringify(custom_options || {}),
      unitCost,
      itemTotalCost
    ]);
    
    const itemId = itemResult.id;
    
    // Insert parts
    for (const part of parts) {
      await runStatement(`
        INSERT INTO cabinet_parts (
          project_id, project_item_id, name, part_type, material_id,
          width, height, thickness, quantity,
          edge_banding_top, edge_banding_bottom, edge_banding_left, edge_banding_right,
          edge_material_id, notes, unit_cost, total_cost, grain_direction
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        projectId,
        itemId,
        part.name,
        part.part_type,
        part.material_id,
        part.width,
        part.height,
        part.thickness,
        part.quantity,
        part.edge_banding_top ? 1 : 0,
        part.edge_banding_bottom ? 1 : 0,
        part.edge_banding_left ? 1 : 0,
        part.edge_banding_right ? 1 : 0,
        part.edge_material_id || null,
        part.notes || '',
        part.unit_cost,
        part.total_cost,
        part.grain_direction || 'no_grain'
      ]);
    }
    
    // Update project total cost
    await runStatement(`
      UPDATE cabinet_projects 
      SET total_cost = (SELECT SUM(total_cost) FROM cabinet_project_items WHERE project_id = ?)
      WHERE id = ?
    `, [projectId, projectId]);
    
    await logAuditTrail('cabinet_project_items', itemId, 'INSERT', null, req.body, req.user.id);
    
    res.status(201).json({
      id: itemId,
      unit_cost: unitCost,
      total_cost: itemTotalCost,
      parts_count: parts.length,
      message: 'Cabinet added to project successfully'
    });
  } catch (error) {
    console.error('Error adding cabinet to project:', error);
    res.status(500).json({ error: 'Failed to add cabinet to project' });
  }
});

// Calculate cabinet parts and cost without saving
router.post('/calculate', async (req, res) => {
  try {
    const {
      model_id,
      width,
      height,
      depth,
      panel_material_id,
      edge_material_id,
      back_material_id,
      door_material_id,
      hardware_config
    } = req.body;
    
    if (!model_id || !width || !height || !depth) {
      return res.status(400).json({ error: 'Model ID, width, height, and depth are required' });
    }
    
    // Check if model exists
    const models = await runQuery('SELECT * FROM cabinet_models WHERE id = ?', [model_id]);
    if (models.length === 0) {
      return res.status(404).json({ error: 'Cabinet model not found' });
    }
    
    const model = models[0];
    
    // Validate dimensions
    if (width < model.min_width || width > model.max_width) {
      return res.status(400).json({ 
        error: `Width must be between ${model.min_width}mm and ${model.max_width}mm` 
      });
    }
    
    if (height < model.min_height || height > model.max_height) {
      return res.status(400).json({ 
        error: `Height must be between ${model.min_height}mm and ${model.max_height}mm` 
      });
    }
    
    if (depth < model.min_depth || depth > model.max_depth) {
      return res.status(400).json({ 
        error: `Depth must be between ${model.min_depth}mm and ${model.max_depth}mm` 
      });
    }
    
    // Calculate parts and cost
    const { parts, totalCost } = await calculateCabinetParts({
      model_id,
      width,
      height,
      depth,
      panel_material_id,
      edge_material_id,
      back_material_id,
      door_material_id,
      hardware_config: typeof hardware_config === 'string' ? JSON.parse(hardware_config) : hardware_config
    });
    
    res.json({
      model_name: model.name,
      dimensions: {
        width,
        height,
        depth
      },
      parts_count: parts.length,
      parts,
      total_cost: totalCost
    });
  } catch (error) {
    console.error('Error calculating cabinet:', error);
    res.status(500).json({ error: 'Failed to calculate cabinet' });
  }
});

// Generate cutting optimization for a project
router.get('/projects/:id/cutting-optimization', async (req, res) => {
  try {
    const projectId = req.params.id;
    
    // Get all parts for the project
    const parts = await runQuery(`
      SELECT 
        p.*,
        m.name as material_name,
        m.width as sheet_width,
        m.height as sheet_height
      FROM cabinet_parts p
      JOIN cabinet_materials m ON p.material_id = m.id
      WHERE p.project_id = ? AND m.type = 'panel'
      ORDER BY m.id, p.width DESC, p.height DESC
    `, [projectId]);
    
    if (parts.length === 0) {
      return res.status(404).json({ error: 'No parts found for this project' });
    }
    
    // Group parts by material
    const materialGroups = {};
    
    parts.forEach(part => {
      if (!materialGroups[part.material_id]) {
        materialGroups[part.material_id] = {
          material_id: part.material_id,
          material_name: part.material_name,
          sheet_width: part.sheet_width,
          sheet_height: part.sheet_height,
          parts: []
        };
      }
      
      // Add part multiple times based on quantity
      for (let i = 0; i < part.quantity; i++) {
        materialGroups[part.material_id].parts.push({
          id: part.id,
          name: part.name,
          width: part.width,
          height: part.height,
          part_type: part.part_type,
          grain_direction: part.grain_direction
        });
      }
    });
    
    // For each material group, perform a simple bin packing algorithm
    // This is a placeholder for a more sophisticated algorithm
    const optimizationResults = {};
    
    Object.values(materialGroups).forEach(group => {
      // Sort parts by height (descending)
      const sortedParts = [...group.parts].sort((a, b) => b.height - a.height);
      
      const sheets = [];
      let currentSheet = {
        width: group.sheet_width,
        height: group.sheet_height,
        remainingWidth: group.sheet_width,
        remainingHeight: group.sheet_height,
        parts: []
      };
      
      sheets.push(currentSheet);
      
      // Simple first-fit algorithm
      sortedParts.forEach(part => {
        let placed = false;
        
        // Try to place in existing sheets
        for (let i = 0; i < sheets.length; i++) {
          const sheet = sheets[i];
          
          // Check if part fits in current sheet
          if (part.width <= sheet.remainingWidth && part.height <= sheet.height) {
            // Place part
            sheet.parts.push({
              ...part,
              x: sheet.width - sheet.remainingWidth,
              y: 0
            });
            
            // Update remaining width
            sheet.remainingWidth -= part.width;
            placed = true;
            break;
          }
        }
        
        // If part couldn't be placed, create a new sheet
        if (!placed) {
          const newSheet = {
            width: group.sheet_width,
            height: group.sheet_height,
            remainingWidth: group.sheet_width - part.width,
            remainingHeight: group.sheet_height,
            parts: [{
              ...part,
              x: 0,
              y: 0
            }]
          };
          
          sheets.push(newSheet);
        }
      });
      
      optimizationResults[group.material_id] = {
        material_name: group.material_name,
        sheet_width: group.sheet_width,
        sheet_height: group.sheet_height,
        sheets_count: sheets.length,
        sheets
      };
    });
    
    res.json({
      project_id: projectId,
      materials_count: Object.keys(materialGroups).length,
      total_parts: parts.length,
      optimization: optimizationResults
    });
  } catch (error) {
    console.error('Error generating cutting optimization:', error);
    res.status(500).json({ error: 'Failed to generate cutting optimization' });
  }
});

// Get all part types
router.get('/part-types', async (req, res) => {
  try {
    const partTypes = await runQuery(`
      SELECT * FROM part_types
      ORDER BY name
    `);
    res.json(partTypes);
  } catch (error) {
    console.error('Error fetching part types:', error);
    res.status(500).json({ error: 'Failed to fetch part types' });
  }
});

// Get a specific part type
router.get('/part-types/:id', async (req, res) => {
  try {
    const partTypeId = req.params.id;
    
    const partTypes = await runQuery(`
      SELECT * FROM part_types
      WHERE id = ?
    `, [partTypeId]);
    
    if (partTypes.length === 0) {
      return res.status(404).json({ error: 'Part type not found' });
    }
    
    res.json(partTypes[0]);
  } catch (error) {
    console.error('Error fetching part type:', error);
    res.status(500).json({ error: 'Failed to fetch part type' });
  }
});

// Create a new part type
router.post('/part-types', async (req, res) => {
  try {
    const {
      name,
      description,
      default_formula_width,
      default_formula_height,
      default_thickness,
      default_material_type,
      default_edge_material_type,
      is_standard_part
    } = req.body;
    
    if (!name || !default_formula_width || !default_formula_height) {
      return res.status(400).json({ error: 'Name, default width formula, and default height formula are required' });
    }
    
    const result = await runStatement(`
      INSERT INTO part_types (
        name, description, default_formula_width, default_formula_height,
        default_thickness, default_material_type, default_edge_material_type,
        is_standard_part
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      name,
      description || '',
      default_formula_width,
      default_formula_height,
      default_thickness || 18,
      default_material_type || 'panel',
      default_edge_material_type || 'edge_banding',
      is_standard_part !== undefined ? is_standard_part : 1
    ]);
    
    await logAuditTrail('part_types', result.id, 'INSERT', null, req.body, req.user.id);
    
    res.status(201).json({
      id: result.id,
      message: 'Part type created successfully'
    });
  } catch (error) {
    console.error('Error creating part type:', error);
    res.status(500).json({ error: 'Failed to create part type' });
  }
});

// Update a part type
router.put('/part-types/:id', async (req, res) => {
  try {
    const partTypeId = req.params.id;
    const {
      name,
      description,
      default_formula_width,
      default_formula_height,
      default_thickness,
      default_material_type,
      default_edge_material_type,
      is_standard_part
    } = req.body;
    
    // Check if part type exists
    const existingPartTypes = await runQuery('SELECT * FROM part_types WHERE id = ?', [partTypeId]);
    if (existingPartTypes.length === 0) {
      return res.status(404).json({ error: 'Part type not found' });
    }
    
    if (!name || !default_formula_width || !default_formula_height) {
      return res.status(400).json({ error: 'Name, default width formula, and default height formula are required' });
    }
    
    await runStatement(`
      UPDATE part_types
      SET name = ?, description = ?, default_formula_width = ?, default_formula_height = ?,
          default_thickness = ?, default_material_type = ?, default_edge_material_type = ?,
          is_standard_part = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      name,
      description || '',
      default_formula_width,
      default_formula_height,
      default_thickness || 18,
      default_material_type || 'panel',
      default_edge_material_type || 'edge_banding',
      is_standard_part !== undefined ? is_standard_part : 1,
      partTypeId
    ]);
    
    await logAuditTrail('part_types', partTypeId, 'UPDATE', existingPartTypes[0], req.body, req.user.id);
    
    res.json({
      message: 'Part type updated successfully'
    });
  } catch (error) {
    console.error('Error updating part type:', error);
    res.status(500).json({ error: 'Failed to update part type' });
  }
});

// Delete a part type
router.delete('/part-types/:id', async (req, res) => {
  try {
    const partTypeId = req.params.id;
    
    // Check if part type exists
    const existingPartTypes = await runQuery('SELECT * FROM part_types WHERE id = ?', [partTypeId]);
    if (existingPartTypes.length === 0) {
      return res.status(404).json({ error: 'Part type not found' });
    }
    
    // Check if part type is used in any cabinet model
    const usedInModels = await runQuery('SELECT COUNT(*) as count FROM cabinet_model_parts WHERE part_type_id = ?', [partTypeId]);
    if (usedInModels[0].count > 0) {
      return res.status(400).json({ error: 'Cannot delete part type that is used in cabinet models' });
    }
    
    await runStatement('DELETE FROM part_types WHERE id = ?', [partTypeId]);
    
    await logAuditTrail('part_types', partTypeId, 'DELETE', existingPartTypes[0], null, req.user.id);
    
    res.json({
      message: 'Part type deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting part type:', error);
    res.status(500).json({ error: 'Failed to delete part type' });
  }
});

// Get all parts for a cabinet model
router.get('/models/:modelId/parts', async (req, res) => {
  try {
    const modelId = req.params.modelId;
    
    // Check if model exists
    const models = await runQuery('SELECT * FROM cabinet_models WHERE id = ?', [modelId]);
    if (models.length === 0) {
      return res.status(404).json({ error: 'Cabinet model not found' });
    }
    
    const modelParts = await runQuery(`
      SELECT 
        cmp.*,
        pt.name as part_type_name,
        pt.description as part_type_description,
        pt.default_formula_width,
        pt.default_formula_height,
        pt.default_thickness,
        pt.default_material_type,
        pt.default_edge_material_type
      FROM cabinet_model_parts cmp
      JOIN part_types pt ON cmp.part_type_id = pt.id
      WHERE cmp.model_id = ?
      ORDER BY cmp.sort_order
    `, [modelId]);
    
    res.json(modelParts);
  } catch (error) {
    console.error('Error fetching model parts:', error);
    res.status(500).json({ error: 'Failed to fetch model parts' });
  }
});

// Add a part to a cabinet model
router.post('/models/:modelId/parts', async (req, res) => {
  try {
    const modelId = req.params.modelId;
    const {
      part_type_id,
      quantity_formula,
      custom_formula_width,
      custom_formula_height,
      default_edge_top,
      default_edge_bottom,
      default_edge_left,
      default_edge_right,
      sort_order
    } = req.body;
    
    // Check if model exists
    const models = await runQuery('SELECT * FROM cabinet_models WHERE id = ?', [modelId]);
    if (models.length === 0) {
      return res.status(404).json({ error: 'Cabinet model not found' });
    }
    
    // Check if part type exists
    const partTypes = await runQuery('SELECT * FROM part_types WHERE id = ?', [part_type_id]);
    if (partTypes.length === 0) {
      return res.status(404).json({ error: 'Part type not found' });
    }
    
    // Check if this part type is already assigned to this model
    const existingParts = await runQuery(
      'SELECT * FROM cabinet_model_parts WHERE model_id = ? AND part_type_id = ?',
      [modelId, part_type_id]
    );
    
    if (existingParts.length > 0) {
      return res.status(400).json({ error: 'This part type is already assigned to this model' });
    }
    
    const result = await runStatement(`
      INSERT INTO cabinet_model_parts (
        model_id, part_type_id, quantity_formula, custom_formula_width,
        custom_formula_height, default_edge_top, default_edge_bottom,
        default_edge_left, default_edge_right, sort_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      modelId,
      part_type_id,
      quantity_formula || '1',
      custom_formula_width || null,
      custom_formula_height || null,
      default_edge_top ? 1 : 0,
      default_edge_bottom ? 1 : 0,
      default_edge_left ? 1 : 0,
      default_edge_right ? 1 : 0,
      sort_order || 0
    ]);
    
    await logAuditTrail('cabinet_model_parts', result.id, 'INSERT', null, req.body, req.user.id);
    
    res.status(201).json({
      id: result.id,
      message: 'Part added to model successfully'
    });
  } catch (error) {
    console.error('Error adding part to model:', error);
    res.status(500).json({ error: 'Failed to add part to model' });
  }
});

// Update a model part
router.put('/models/:modelId/parts/:partId', async (req, res) => {
  try {
    const modelId = req.params.modelId;
    const partId = req.params.partId;
    const {
      quantity_formula,
      custom_formula_width,
      custom_formula_height,
      default_edge_top,
      default_edge_bottom,
      default_edge_left,
      default_edge_right,
      sort_order
    } = req.body;
    
    // Check if model part exists
    const existingParts = await runQuery(
      'SELECT * FROM cabinet_model_parts WHERE id = ? AND model_id = ?',
      [partId, modelId]
    );
    
    if (existingParts.length === 0) {
      return res.status(404).json({ error: 'Model part not found' });
    }
    
    await runStatement(`
      UPDATE cabinet_model_parts
      SET quantity_formula = ?, custom_formula_width = ?, custom_formula_height = ?,
          default_edge_top = ?, default_edge_bottom = ?, default_edge_left = ?,
          default_edge_right = ?, sort_order = ?
      WHERE id = ?
    `, [
      quantity_formula || '1',
      custom_formula_width || null,
      custom_formula_height || null,
      default_edge_top ? 1 : 0,
      default_edge_bottom ? 1 : 0,
      default_edge_left ? 1 : 0,
      default_edge_right ? 1 : 0,
      sort_order || 0,
      partId
    ]);
    
    await logAuditTrail('cabinet_model_parts', partId, 'UPDATE', existingParts[0], req.body, req.user.id);
    
    res.json({
      message: 'Model part updated successfully'
    });
  } catch (error) {
    console.error('Error updating model part:', error);
    res.status(500).json({ error: 'Failed to update model part' });
  }
});

// Delete a model part
router.delete('/models/:modelId/parts/:partId', async (req, res) => {
  try {
    const modelId = req.params.modelId;
    const partId = req.params.partId;
    
    // Check if model part exists
    const existingParts = await runQuery(
      'SELECT * FROM cabinet_model_parts WHERE id = ? AND model_id = ?',
      [partId, modelId]
    );
    
    if (existingParts.length === 0) {
      return res.status(404).json({ error: 'Model part not found' });
    }
    
    await runStatement('DELETE FROM cabinet_model_parts WHERE id = ?', [partId]);
    
    await logAuditTrail('cabinet_model_parts', partId, 'DELETE', existingParts[0], null, req.user.id);
    
    res.json({
      message: 'Model part deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting model part:', error);
    res.status(500).json({ error: 'Failed to delete model part' });
  }
});

// Get all accessories
router.get('/accessories', async (req, res) => {
  try {
    const { type } = req.query;
    
    let sql = `
      SELECT a.*, s.name as supplier_name
      FROM cabinet_accessories a
      LEFT JOIN suppliers s ON a.supplier_id = s.id
      WHERE a.is_active = 1
    `;
    
    const params = [];
    
    if (type) {
      sql += ` AND a.type = ?`;
      params.push(type);
    }
    
    sql += ` ORDER BY a.name`;
    
    const accessories = await runQuery(sql, params);
    res.json(accessories);
  } catch (error) {
    console.error('Error fetching accessories:', error);
    res.status(500).json({ error: 'Failed to fetch accessories' });
  }
});

// Create a new accessory
router.post('/accessories', async (req, res) => {
  try {
    const {
      name,
      description,
      type,
      unit_cost,
      default_quantity_formula,
      supplier_id,
      is_active
    } = req.body;
    
    if (!name || !type || unit_cost === undefined) {
      return res.status(400).json({ error: 'Name, type, and unit cost are required' });
    }
    
    const result = await runStatement(`
      INSERT INTO cabinet_accessories (
        name, description, type, unit_cost, default_quantity_formula,
        supplier_id, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      name,
      description || '',
      type,
      unit_cost,
      default_quantity_formula || '1',
      supplier_id || null,
      is_active !== undefined ? is_active : 1
    ]);
    
    await logAuditTrail('cabinet_accessories', result.id, 'INSERT', null, req.body, req.user.id);
    
    res.status(201).json({
      id: result.id,
      message: 'Accessory created successfully'
    });
  } catch (error) {
    console.error('Error creating accessory:', error);
    res.status(500).json({ error: 'Failed to create accessory' });
  }
});

// Get all accessories for a cabinet model
router.get('/models/:modelId/accessories', async (req, res) => {
  try {
    const modelId = req.params.modelId;
    
    // Check if model exists
    const models = await runQuery('SELECT * FROM cabinet_models WHERE id = ?', [modelId]);
    if (models.length === 0) {
      return res.status(404).json({ error: 'Cabinet model not found' });
    }
    
    const modelAccessories = await runQuery(`
      SELECT 
        cma.*,
        ca.name as accessory_name,
        ca.description as accessory_description,
        ca.type as accessory_type,
        ca.unit_cost,
        ca.default_quantity_formula
      FROM cabinet_model_accessories cma
      JOIN cabinet_accessories ca ON cma.accessory_id = ca.id
      WHERE cma.model_id = ?
      ORDER BY ca.type, ca.name
    `, [modelId]);
    
    res.json(modelAccessories);
  } catch (error) {
    console.error('Error fetching model accessories:', error);
    res.status(500).json({ error: 'Failed to fetch model accessories' });
  }
});

// Add an accessory to a cabinet model
router.post('/models/:modelId/accessories', async (req, res) => {
  try {
    const modelId = req.params.modelId;
    const {
      accessory_id,
      quantity_formula,
      is_required
    } = req.body;
    
    // Check if model exists
    const models = await runQuery('SELECT * FROM cabinet_models WHERE id = ?', [modelId]);
    if (models.length === 0) {
      return res.status(404).json({ error: 'Cabinet model not found' });
    }
    
    // Check if accessory exists
    const accessories = await runQuery('SELECT * FROM cabinet_accessories WHERE id = ?', [accessory_id]);
    if (accessories.length === 0) {
      return res.status(404).json({ error: 'Accessory not found' });
    }
    
    // Check if this accessory is already assigned to this model
    const existingAccessories = await runQuery(
      'SELECT * FROM cabinet_model_accessories WHERE model_id = ? AND accessory_id = ?',
      [modelId, accessory_id]
    );
    
    if (existingAccessories.length > 0) {
      return res.status(400).json({ error: 'This accessory is already assigned to this model' });
    }
    
    const result = await runStatement(`
      INSERT INTO cabinet_model_accessories (
        model_id, accessory_id, quantity_formula, is_required
      ) VALUES (?, ?, ?, ?)
    `, [
      modelId,
      accessory_id,
      quantity_formula || null,
      is_required !== undefined ? is_required : 1
    ]);
    
    await logAuditTrail('cabinet_model_accessories', result.id, 'INSERT', null, req.body, req.user.id);
    
    res.status(201).json({
      id: result.id,
      message: 'Accessory added to model successfully'
    });
  } catch (error) {
    console.error('Error adding accessory to model:', error);
    res.status(500).json({ error: 'Failed to add accessory to model' });
  }
});

export default router;