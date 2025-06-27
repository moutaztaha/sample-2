import { runQuery, runStatement } from './connection.js';

export const addSampleCabinetData = async () => {
  try {
    console.log('Adding sample cabinet catalog data...');

    // Check if we already have cabinet categories
    const existingCategories = await runQuery('SELECT COUNT(*) as count FROM cabinet_categories');
    if (existingCategories[0].count > 0) {
      console.log('Sample cabinet data already exists, skipping...');
      return;
    }

    // Add cabinet categories
    const categories = [
      { name: 'Base Cabinets', description: 'Standard floor-mounted cabinets for kitchens' },
      { name: 'Wall Cabinets', description: 'Wall-mounted upper cabinets for kitchens' },
      { name: 'Tall Cabinets', description: 'Full-height cabinets for pantry and storage' },
      { name: 'Vanity Cabinets', description: 'Bathroom vanity cabinets' },
      { name: 'Island Cabinets', description: 'Kitchen island components' },
      { name: 'Specialty Cabinets', description: 'Corner, appliance, and specialty cabinets' }
    ];

    for (const category of categories) {
      await runStatement(
        'INSERT INTO cabinet_categories (name, description) VALUES (?, ?)',
        [category.name, category.description]
      );
    }
    console.log('✅ Added cabinet categories');

    // Get category IDs
    const categoryMap = {};
    const categoryRows = await runQuery('SELECT id, name FROM cabinet_categories');
    categoryRows.forEach(row => {
      categoryMap[row.name] = row.id;
    });

    // Add cabinet models
    const models = [
      // Base Cabinets
      {
        name: 'Standard Base Cabinet',
        category_id: categoryMap['Base Cabinets'],
        description: 'Standard base cabinet with one door and one adjustable shelf',
        default_width: 600,
        default_height: 720,
        default_depth: 580,
        min_width: 300,
        max_width: 1200,
        min_height: 720,
        max_height: 720,
        min_depth: 580,
        max_depth: 580,
        image_url: '/cabinet-images/base-standard.jpg',
        construction_notes: 'Standard construction with 18mm panels and 6mm back panel'
      },
      {
        name: 'Base Cabinet with Drawers',
        category_id: categoryMap['Base Cabinets'],
        description: 'Base cabinet with three drawers',
        default_width: 600,
        default_height: 720,
        default_depth: 580,
        min_width: 300,
        max_width: 1200,
        min_height: 720,
        max_height: 720,
        min_depth: 580,
        max_depth: 580,
        image_url: '/cabinet-images/base-drawers.jpg',
        construction_notes: 'Three equal height drawers with full extension slides'
      },
      {
        name: 'Sink Base Cabinet',
        category_id: categoryMap['Base Cabinets'],
        description: 'Base cabinet designed for sink installation with double doors',
        default_width: 800,
        default_height: 720,
        default_depth: 580,
        min_width: 600,
        max_width: 1200,
        min_height: 720,
        max_height: 720,
        min_depth: 580,
        max_depth: 580,
        image_url: '/cabinet-images/base-sink.jpg',
        construction_notes: 'Double doors with cutout for plumbing'
      },
      
      // Wall Cabinets
      {
        name: 'Standard Wall Cabinet',
        category_id: categoryMap['Wall Cabinets'],
        description: 'Standard wall cabinet with one door and two adjustable shelves',
        default_width: 600,
        default_height: 720,
        default_depth: 320,
        min_width: 300,
        max_width: 1200,
        min_height: 600,
        max_height: 900,
        min_depth: 320,
        max_depth: 320,
        image_url: '/cabinet-images/wall-standard.jpg',
        construction_notes: 'Standard construction with 18mm panels and 6mm back panel'
      },
      {
        name: 'Wall Cabinet with Glass Door',
        category_id: categoryMap['Wall Cabinets'],
        description: 'Wall cabinet with glass door and two adjustable shelves',
        default_width: 600,
        default_height: 720,
        default_depth: 320,
        min_width: 300,
        max_width: 900,
        min_height: 600,
        max_height: 900,
        min_depth: 320,
        max_depth: 320,
        image_url: '/cabinet-images/wall-glass.jpg',
        construction_notes: 'Glass door with aluminum frame'
      },
      
      // Tall Cabinets
      {
        name: 'Pantry Cabinet',
        category_id: categoryMap['Tall Cabinets'],
        description: 'Full height pantry cabinet with two doors and five adjustable shelves',
        default_width: 600,
        default_height: 2100,
        default_depth: 580,
        min_width: 400,
        max_width: 1200,
        min_height: 2000,
        max_height: 2400,
        min_depth: 580,
        max_depth: 580,
        image_url: '/cabinet-images/tall-pantry.jpg',
        construction_notes: 'Double doors with five adjustable shelves'
      },
      {
        name: 'Oven Housing Cabinet',
        category_id: categoryMap['Tall Cabinets'],
        description: 'Tall cabinet designed for built-in oven and microwave',
        default_width: 600,
        default_height: 2100,
        default_depth: 580,
        min_width: 600,
        max_width: 600,
        min_height: 2000,
        max_height: 2400,
        min_depth: 580,
        max_depth: 580,
        image_url: '/cabinet-images/tall-oven.jpg',
        construction_notes: 'Cutouts for oven and microwave with one drawer at bottom'
      }
    ];

    for (const model of models) {
      await runStatement(`
        INSERT INTO cabinet_models (
          name, category_id, description, default_width, default_height, default_depth,
          min_width, max_width, min_height, max_height, min_depth, max_depth,
          image_url, construction_notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        model.name, model.category_id, model.description, model.default_width, model.default_height, model.default_depth,
        model.min_width, model.max_width, model.min_height, model.max_height, model.min_depth, model.max_depth,
        model.image_url, model.construction_notes
      ]);
    }
    console.log('✅ Added cabinet models');

    // Add cabinet materials
    const materials = [
      // Panel materials
      {
        name: 'White Melamine',
        description: '18mm white melamine particleboard',
        type: 'panel',
        thickness: 18,
        width: 2440,
        height: 1220,
        unit: 'sheet',
        cost_per_unit: 45.99,
        color: 'white'
      },
      {
        name: 'Oak Melamine',
        description: '18mm oak melamine particleboard',
        type: 'panel',
        thickness: 18,
        width: 2440,
        height: 1220,
        unit: 'sheet',
        cost_per_unit: 65.99,
        color: 'oak'
      },
      {
        name: 'Gray Melamine',
        description: '18mm gray melamine particleboard',
        type: 'panel',
        thickness: 18,
        width: 2440,
        height: 1220,
        unit: 'sheet',
        cost_per_unit: 55.99,
        color: 'gray'
      },
      
      // Back panel materials
      {
        name: 'White Hardboard',
        description: '6mm white hardboard for cabinet backs',
        type: 'back_panel',
        thickness: 6,
        width: 2440,
        height: 1220,
        unit: 'sheet',
        cost_per_unit: 25.99,
        color: 'white'
      },
      
      // Edge banding materials
      {
        name: 'White Edge Banding',
        description: '22mm white PVC edge banding',
        type: 'edge_banding',
        thickness: 1,
        width: 22,
        height: null,
        unit: 'meter',
        cost_per_unit: 0.75,
        color: 'white'
      },
      {
        name: 'Oak Edge Banding',
        description: '22mm oak PVC edge banding',
        type: 'edge_banding',
        thickness: 1,
        width: 22,
        height: null,
        unit: 'meter',
        cost_per_unit: 1.25,
        color: 'oak'
      },
      {
        name: 'Gray Edge Banding',
        description: '22mm gray PVC edge banding',
        type: 'edge_banding',
        thickness: 1,
        width: 22,
        height: null,
        unit: 'meter',
        cost_per_unit: 0.95,
        color: 'gray'
      }
    ];

    for (const material of materials) {
      await runStatement(`
        INSERT INTO cabinet_materials (
          name, description, type, thickness, width, height,
          unit, cost_per_unit, color
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        material.name, material.description, material.type, material.thickness, material.width, material.height,
        material.unit, material.cost_per_unit, material.color
      ]);
    }
    console.log('✅ Added cabinet materials');

    // Add cabinet hardware
    const hardware = [
      {
        name: 'Concealed Hinge',
        description: '110° opening angle concealed hinge',
        type: 'hinge',
        unit_cost: 2.50,
        supplier_id: null
      },
      {
        name: 'Drawer Slide',
        description: '450mm full extension drawer slide',
        type: 'drawer_slide',
        unit_cost: 8.99,
        supplier_id: null
      },
      {
        name: 'Cabinet Handle',
        description: '128mm stainless steel bar handle',
        type: 'handle',
        unit_cost: 3.75,
        supplier_id: null
      },
      {
        name: 'Shelf Pin',
        description: '5mm shelf support pin',
        type: 'shelf_pin',
        unit_cost: 0.15,
        supplier_id: null
      },
      {
        name: 'Connecting Bolt',
        description: 'Cabinet connecting bolt and nut',
        type: 'connector',
        unit_cost: 0.45,
        supplier_id: null
      }
    ];

    for (const item of hardware) {
      await runStatement(`
        INSERT INTO cabinet_hardware (
          name, description, type, unit_cost, supplier_id
        ) VALUES (?, ?, ?, ?, ?)
      `, [
        item.name, item.description, item.type, item.unit_cost, item.supplier_id
      ]);
    }
    console.log('✅ Added cabinet hardware');

    // Create a sample project
    const userId = 1; // Admin user
    
    const projectResult = await runStatement(`
      INSERT INTO cabinet_projects (
        name, description, customer_name, customer_email, customer_phone,
        status, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      'Sample Kitchen Project',
      'Sample kitchen project with various cabinets',
      'John Smith',
      'john@example.com',
      '555-123-4567',
      'draft',
      userId
    ]);
    
    const projectId = projectResult.id;
    
    // Get material IDs
    const whitePanelMaterial = await runQuery("SELECT id FROM cabinet_materials WHERE name = 'White Melamine'");
    const whiteEdgeMaterial = await runQuery("SELECT id FROM cabinet_materials WHERE name = 'White Edge Banding'");
    const whiteBackMaterial = await runQuery("SELECT id FROM cabinet_materials WHERE name = 'White Hardboard'");
    
    // Get model IDs
    const baseModel = await runQuery("SELECT id FROM cabinet_models WHERE name = 'Standard Base Cabinet'");
    const wallModel = await runQuery("SELECT id FROM cabinet_models WHERE name = 'Standard Wall Cabinet'");
    
    // Add project items
    const projectItems = [
      {
        project_id: projectId,
        model_id: baseModel[0].id,
        name: 'Base Cabinet 600mm',
        width: 600,
        height: 720,
        depth: 580,
        quantity: 2,
        panel_material_id: whitePanelMaterial[0].id,
        edge_material_id: whiteEdgeMaterial[0].id,
        back_material_id: whiteBackMaterial[0].id,
        door_material_id: whitePanelMaterial[0].id,
        hardware_config: JSON.stringify({
          hinges: 2,
          handles: 1,
          shelf_pins: 4
        }),
        unit_cost: 120.00,
        total_cost: 240.00
      },
      {
        project_id: projectId,
        model_id: wallModel[0].id,
        name: 'Wall Cabinet 600mm',
        width: 600,
        height: 720,
        depth: 320,
        quantity: 2,
        panel_material_id: whitePanelMaterial[0].id,
        edge_material_id: whiteEdgeMaterial[0].id,
        back_material_id: whiteBackMaterial[0].id,
        door_material_id: whitePanelMaterial[0].id,
        hardware_config: JSON.stringify({
          hinges: 2,
          handles: 1,
          shelf_pins: 8
        }),
        unit_cost: 95.00,
        total_cost: 190.00
      }
    ];
    
    for (const item of projectItems) {
      const itemResult = await runStatement(`
        INSERT INTO cabinet_project_items (
          project_id, model_id, name, width, height, depth, quantity,
          panel_material_id, edge_material_id, back_material_id, door_material_id,
          hardware_config, unit_cost, total_cost
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        item.project_id, item.model_id, item.name, item.width, item.height, item.depth, item.quantity,
        item.panel_material_id, item.edge_material_id, item.back_material_id, item.door_material_id,
        item.hardware_config, item.unit_cost, item.total_cost
      ]);
      
      // Generate some sample parts for this item
      await generateSampleParts(itemResult.id, item);
    }
    
    // Update project total cost
    await runStatement(`
      UPDATE cabinet_projects 
      SET total_cost = (SELECT SUM(total_cost) FROM cabinet_project_items WHERE project_id = ?)
      WHERE id = ?
    `, [projectId, projectId]);
    
    console.log('✅ Added sample cabinet project');
    
    console.log('✅ Sample cabinet data added successfully!');
  } catch (error) {
    console.error('❌ Error adding sample cabinet data:', error);
  }
};

// Helper function to generate sample parts for a cabinet
async function generateSampleParts(projectItemId, item) {
  try {
    // Get project ID
    const projectId = item.project_id;
    
    // Get material IDs
    const panelMaterialId = item.panel_material_id;
    const edgeMaterialId = item.edge_material_id;
    const backMaterialId = item.back_material_id;
    
    // Calculate dimensions based on cabinet size
    // Subtract material thickness for internal parts
    const materialThickness = 18; // mm
    
    // For a basic cabinet, we need:
    // 2 sides, 1 top, 1 bottom, 1 back, 1 shelf, 1-2 doors
    
    // Sides
    const sideHeight = item.height;
    const sideWidth = item.depth;
    
    // Top/Bottom
    const topBottomWidth = item.width - (2 * materialThickness);
    const topBottomDepth = item.depth;
    
    // Back
    const backWidth = item.width - (2 * materialThickness);
    const backHeight = item.height - (2 * materialThickness);
    
    // Shelf
    const shelfWidth = item.width - (2 * materialThickness);
    const shelfDepth = item.depth - 20; // Set back from front
    
    // Door
    const doorWidth = item.width;
    const doorHeight = item.height;
    
    // Parts to create
    const parts = [
      // Left side
      {
        name: 'Left Side',
        part_type: 'side_panel',
        material_id: panelMaterialId,
        width: sideWidth,
        height: sideHeight,
        thickness: materialThickness,
        quantity: 1,
        edge_banding_top: true,
        edge_banding_bottom: true,
        edge_banding_left: false,
        edge_banding_right: true,
        edge_material_id: edgeMaterialId,
        notes: 'Left side panel'
      },
      // Right side
      {
        name: 'Right Side',
        part_type: 'side_panel',
        material_id: panelMaterialId,
        width: sideWidth,
        height: sideHeight,
        thickness: materialThickness,
        quantity: 1,
        edge_banding_top: true,
        edge_banding_bottom: true,
        edge_banding_left: true,
        edge_banding_right: false,
        edge_material_id: edgeMaterialId,
        notes: 'Right side panel'
      },
      // Top
      {
        name: 'Top',
        part_type: 'horizontal_panel',
        material_id: panelMaterialId,
        width: topBottomWidth,
        height: topBottomDepth,
        thickness: materialThickness,
        quantity: 1,
        edge_banding_top: false,
        edge_banding_bottom: false,
        edge_banding_left: false,
        edge_banding_right: true,
        edge_material_id: edgeMaterialId,
        notes: 'Top panel'
      },
      // Bottom
      {
        name: 'Bottom',
        part_type: 'horizontal_panel',
        material_id: panelMaterialId,
        width: topBottomWidth,
        height: topBottomDepth,
        thickness: materialThickness,
        quantity: 1,
        edge_banding_top: false,
        edge_banding_bottom: false,
        edge_banding_left: false,
        edge_banding_right: true,
        edge_material_id: edgeMaterialId,
        notes: 'Bottom panel'
      },
      // Back
      {
        name: 'Back',
        part_type: 'back_panel',
        material_id: backMaterialId,
        width: backWidth,
        height: backHeight,
        thickness: 6, // Typically thinner
        quantity: 1,
        edge_banding_top: false,
        edge_banding_bottom: false,
        edge_banding_left: false,
        edge_banding_right: false,
        edge_material_id: null,
        notes: 'Back panel'
      },
      // Shelf
      {
        name: 'Shelf',
        part_type: 'shelf',
        material_id: panelMaterialId,
        width: shelfWidth,
        height: shelfDepth,
        thickness: materialThickness,
        quantity: 1,
        edge_banding_top: false,
        edge_banding_bottom: false,
        edge_banding_left: false,
        edge_banding_right: true,
        edge_material_id: edgeMaterialId,
        notes: 'Adjustable shelf'
      },
      // Door
      {
        name: 'Door',
        part_type: 'door',
        material_id: panelMaterialId,
        width: doorWidth,
        height: doorHeight,
        thickness: materialThickness,
        quantity: 1,
        edge_banding_top: true,
        edge_banding_bottom: true,
        edge_banding_left: true,
        edge_banding_right: true,
        edge_material_id: edgeMaterialId,
        notes: 'Cabinet door'
      }
    ];
    
    // Calculate costs
    const materialCostQuery = await runQuery('SELECT cost_per_unit FROM cabinet_materials WHERE id = ?', [panelMaterialId]);
    const materialCost = materialCostQuery[0]?.cost_per_unit || 0;
    
    const edgeCostQuery = await runQuery('SELECT cost_per_unit FROM cabinet_materials WHERE id = ?', [edgeMaterialId]);
    const edgeCost = edgeCostQuery[0]?.cost_per_unit || 0;
    
    // Insert parts
    for (const part of parts) {
      // Calculate part area in square meters
      const partArea = (part.width * part.height) / 1000000; // Convert from mm² to m²
      
      // Calculate edge banding length in meters
      let edgeBandingLength = 0;
      if (part.edge_banding_top) edgeBandingLength += part.width / 1000;
      if (part.edge_banding_bottom) edgeBandingLength += part.width / 1000;
      if (part.edge_banding_left) edgeBandingLength += part.height / 1000;
      if (part.edge_banding_right) edgeBandingLength += part.height / 1000;
      
      // Calculate part cost (simplified)
      const panelCost = partArea * materialCost;
      const edgeCost = edgeBandingLength * edgeCost;
      const unitCost = panelCost + edgeCost;
      const totalCost = unitCost * part.quantity;
      
      await runStatement(`
        INSERT INTO cabinet_parts (
          project_id, project_item_id, name, part_type, material_id,
          width, height, thickness, quantity,
          edge_banding_top, edge_banding_bottom, edge_banding_left, edge_banding_right,
          edge_material_id, notes, unit_cost, total_cost
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        projectId, projectItemId, part.name, part.part_type, part.material_id,
        part.width, part.height, part.thickness, part.quantity,
        part.edge_banding_top, part.edge_banding_bottom, part.edge_banding_left, part.edge_banding_right,
        part.edge_material_id, part.notes, unitCost, totalCost
      ]);
    }
  } catch (error) {
    console.error('Error generating sample parts:', error);
  }
}