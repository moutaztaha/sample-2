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
          edge_material_id, notes, unit_cost, total_cost
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        part.total_cost
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
          part_type: part.part_type
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

export default router;