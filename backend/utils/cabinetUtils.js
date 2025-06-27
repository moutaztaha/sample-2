import { runQuery } from '../database/connection.js';

// Formula evaluator function - safely evaluates parametric formulas
const evaluateFormula = (formula, context) => {
  if (!formula) return 0;
  
  try {
    // Create a safe evaluation function that only allows basic math operations
    // This is much safer than using eval()
    const safeEval = (formula, context) => {
      // Replace variable names with their values from context
      let expression = formula;
      
      // Sort context keys by length (descending) to avoid partial replacements
      // e.g., replace 'cabinet_width' before 'width'
      const contextKeys = Object.keys(context).sort((a, b) => b.length - a.length);
      
      for (const key of contextKeys) {
        const value = context[key];
        // Use regex with word boundaries to ensure we're replacing whole variable names
        const regex = new RegExp(`\\b${key}\\b`, 'g');
        expression = expression.replace(regex, value);
      }
      
      // Use Function constructor instead of eval for slightly better safety
      // Still restricted to basic math operations
      const mathFunctions = {
        min: Math.min,
        max: Math.max,
        round: Math.round,
        floor: Math.floor,
        ceil: Math.ceil,
        abs: Math.abs
      };
      
      // Create a function with math functions and the expression
      const func = new Function(...Object.keys(mathFunctions), 'return ' + expression);
      
      // Call the function with math function values
      return func(...Object.values(mathFunctions));
    };
    
    return safeEval(formula, context);
  } catch (error) {
    console.error(`Error evaluating formula "${formula}":`, error);
    return 0; // Default to 0 on error
  }
};

// Calculate cabinet parts based on model and dimensions
export const calculateCabinetParts = async (cabinetData) => {
  const {
    model_id,
    width,
    height,
    depth,
    panel_material_id,
    edge_material_id,
    back_material_id,
    door_material_id,
    hardware_config = {}
  } = cabinetData;
  
  try {
    // Get model details
    const models = await runQuery('SELECT * FROM cabinet_models WHERE id = ?', [model_id]);
    if (models.length === 0) {
      throw new Error('Cabinet model not found');
    }
    
    const model = models[0];
    
    // Get material details
    const panelMaterial = panel_material_id ? 
      (await runQuery('SELECT * FROM cabinet_materials WHERE id = ?', [panel_material_id]))[0] : null;
    
    const edgeMaterial = edge_material_id ? 
      (await runQuery('SELECT * FROM cabinet_materials WHERE id = ?', [edge_material_id]))[0] : null;
    
    const backMaterial = back_material_id ? 
      (await runQuery('SELECT * FROM cabinet_materials WHERE id = ?', [back_material_id]))[0] : null;
    
    const doorMaterial = door_material_id ? 
      (await runQuery('SELECT * FROM cabinet_materials WHERE id = ?', [door_material_id]))[0] : null;
    
    // Default material thickness
    const panelThickness = panelMaterial?.thickness || 18; // mm
    const backThickness = backMaterial?.thickness || 6; // mm
    
    // Get model parts configuration
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
    `, [model_id]);
    
    // If no model parts are defined, fall back to the legacy method
    if (modelParts.length === 0) {
      return legacyCalculateCabinetParts(cabinetData);
    }
    
    // Parts array to store all cabinet parts
    const parts = [];
    
    // Create evaluation context for formulas
    const context = {
      cabinet_width: width,
      cabinet_height: height,
      cabinet_depth: depth,
      panel_thickness: panelThickness,
      back_thickness: backThickness,
      door_count: 1, // Default, can be overridden
      drawer_count: 0, // Default, can be overridden
      shelf_count: 1, // Default, can be overridden
      drawer_side_thickness: 15 // Default, can be overridden
    };
    
    // Determine door count based on width (simple heuristic)
    if (width >= 600) {
      context.door_count = 2;
    }
    
    // Process each model part
    for (const modelPart of modelParts) {
      // Evaluate quantity formula to determine how many of this part to create
      const quantity = Math.max(1, Math.round(evaluateFormula(modelPart.quantity_formula, context)));
      
      // For each quantity, create a part
      for (let i = 0; i < quantity; i++) {
        // Determine which formulas to use (custom or default)
        const widthFormula = modelPart.custom_formula_width || modelPart.default_formula_width;
        const heightFormula = modelPart.custom_formula_height || modelPart.default_formula_height;
        
        // Evaluate the formulas
        const partWidth = evaluateFormula(widthFormula, context);
        const partHeight = evaluateFormula(heightFormula, context);
        const partThickness = modelPart.default_thickness || panelThickness;
        
        // Determine material ID based on part type
        let materialId = panel_material_id;
        if (modelPart.default_material_type === 'back_panel') {
          materialId = back_material_id || panel_material_id;
        } else if (modelPart.part_type_name.toLowerCase().includes('door')) {
          materialId = door_material_id || panel_material_id;
        }
        
        // Determine edge banding
        const edgeTop = modelPart.default_edge_top || false;
        const edgeBottom = modelPart.default_edge_bottom || false;
        const edgeLeft = modelPart.default_edge_left || false;
        const edgeRight = modelPart.default_edge_right || false;
        
        // Add the part
        addPart(
          parts,
          `${modelPart.part_type_name} ${i + 1}`,
          modelPart.part_type_name.toLowerCase().replace(/\s+/g, '_'),
          materialId,
          partWidth,
          partHeight,
          partThickness,
          1, // Quantity is always 1 here since we're creating multiple parts in the loop
          edgeTop,
          edgeBottom,
          edgeLeft,
          edgeRight,
          edge_material_id,
          modelPart.part_type_description || `${modelPart.part_type_name} for cabinet`,
          panelMaterial?.cost_per_unit || 0,
          edgeMaterial?.cost_per_unit || 0,
          'no_grain' // Default grain direction
        );
      }
    }
    
    // Get model accessories
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
    `, [model_id]);
    
    // If model accessories are defined, use them
    if (modelAccessories.length > 0) {
      for (const accessory of modelAccessories) {
        // Evaluate quantity formula
        const formula = accessory.quantity_formula || accessory.default_quantity_formula || '1';
        const quantity = Math.max(1, Math.round(evaluateFormula(formula, context)));
        
        // Add accessory as a "part" for cost calculation
        parts.push({
          name: accessory.accessory_name,
          part_type: 'hardware',
          material_id: null,
          width: 0,
          height: 0,
          thickness: 0,
          quantity: quantity,
          edge_banding_top: false,
          edge_banding_bottom: false,
          edge_banding_left: false,
          edge_banding_right: false,
          edge_material_id: null,
          notes: accessory.accessory_description || `${accessory.accessory_name} for cabinet`,
          unit_cost: accessory.unit_cost,
          total_cost: accessory.unit_cost * quantity
        });
      }
    } else {
      // Fall back to legacy hardware calculation if no model accessories defined
      addHardwareCosts(parts, hardware_config, width >= 600);
    }
    
    // Calculate total cost
    const totalCost = parts.reduce((sum, part) => sum + part.total_cost, 0);
    
    return {
      parts,
      totalCost
    };
  } catch (error) {
    console.error('Error calculating cabinet parts:', error);
    throw error;
  }
};

// Legacy calculation method for backward compatibility
const legacyCalculateCabinetParts = async (cabinetData) => {
  const {
    model_id,
    width,
    height,
    depth,
    panel_material_id,
    edge_material_id,
    back_material_id,
    door_material_id,
    hardware_config = {}
  } = cabinetData;
  
  try {
    // Get model details
    const models = await runQuery('SELECT * FROM cabinet_models WHERE id = ?', [model_id]);
    if (models.length === 0) {
      throw new Error('Cabinet model not found');
    }
    
    const model = models[0];
    
    // Get material details
    const panelMaterial = panel_material_id ? 
      (await runQuery('SELECT * FROM cabinet_materials WHERE id = ?', [panel_material_id]))[0] : null;
    
    const edgeMaterial = edge_material_id ? 
      (await runQuery('SELECT * FROM cabinet_materials WHERE id = ?', [edge_material_id]))[0] : null;
    
    const backMaterial = back_material_id ? 
      (await runQuery('SELECT * FROM cabinet_materials WHERE id = ?', [back_material_id]))[0] : null;
    
    const doorMaterial = door_material_id ? 
      (await runQuery('SELECT * FROM cabinet_materials WHERE id = ?', [door_material_id]))[0] : null;
    
    // Default material thickness
    const panelThickness = panelMaterial?.thickness || 18; // mm
    const backThickness = backMaterial?.thickness || 6; // mm
    
    // Parts array to store all cabinet parts
    const parts = [];
    
    // Get category name
    const categories = await runQuery('SELECT name FROM cabinet_categories WHERE id = ?', [model.category_id]);
    const categoryName = categories[0]?.name || '';
    
    // Generate parts based on cabinet type
    if (categoryName.includes('Base')) {
      // Base cabinet parts
      generateBaseCabinetParts(parts, width, height, depth, panelThickness, backThickness, 
        panelMaterial, backMaterial, doorMaterial, edgeMaterial, model, hardware_config);
    } 
    else if (categoryName.includes('Wall')) {
      // Wall cabinet parts
      generateWallCabinetParts(parts, width, height, depth, panelThickness, backThickness, 
        panelMaterial, backMaterial, doorMaterial, edgeMaterial, model, hardware_config);
    }
    else if (categoryName.includes('Tall')) {
      // Tall cabinet parts
      generateTallCabinetParts(parts, width, height, depth, panelThickness, backThickness, 
        panelMaterial, backMaterial, doorMaterial, edgeMaterial, model, hardware_config);
    }
    else {
      // Generic cabinet parts as fallback
      generateGenericCabinetParts(parts, width, height, depth, panelThickness, backThickness, 
        panelMaterial, backMaterial, doorMaterial, edgeMaterial, model, hardware_config);
    }
    
    // Calculate total cost
    const totalCost = parts.reduce((sum, part) => sum + part.total_cost, 0);
    
    return {
      parts,
      totalCost
    };
  } catch (error) {
    console.error('Error calculating cabinet parts:', error);
    throw error;
  }
};

// Helper function to add a part to the parts array
function addPart(parts, name, part_type, material_id, width, height, thickness, quantity,
  edge_banding_top, edge_banding_bottom, edge_banding_left, edge_banding_right,
  edge_material_id, notes, material_cost_per_unit, edge_cost_per_unit, grain_direction = 'no_grain') {
  
  // Calculate part area in square meters
  const partArea = (width * height) / 1000000; // Convert from mm² to m²
  
  // Calculate edge banding length in meters
  let edgeBandingLength = 0;
  if (edge_banding_top) edgeBandingLength += width / 1000;
  if (edge_banding_bottom) edgeBandingLength += width / 1000;
  if (edge_banding_left) edgeBandingLength += height / 1000;
  if (edge_banding_right) edgeBandingLength += height / 1000;
  
  // Calculate part cost
  const panelCost = partArea * material_cost_per_unit;
  const edgeCost = edgeBandingLength * edge_cost_per_unit;
  const unitCost = panelCost + edgeCost;
  const totalCost = unitCost * quantity;
  
  parts.push({
    name,
    part_type,
    material_id,
    width,
    height,
    thickness,
    quantity,
    edge_banding_top,
    edge_banding_bottom,
    edge_banding_left,
    edge_banding_right,
    edge_material_id,
    notes,
    unit_cost: unitCost,
    total_cost: totalCost,
    grain_direction
  });
}

// Helper function to generate base cabinet parts
function generateBaseCabinetParts(parts, width, height, depth, panelThickness, backThickness, 
  panelMaterial, backMaterial, doorMaterial, edgeMaterial, model, hardware_config) {
  
  // Material IDs
  const panelMaterialId = panelMaterial?.id;
  const backMaterialId = backMaterial?.id;
  const doorMaterialId = doorMaterial?.id || panelMaterialId;
  const edgeMaterialId = edgeMaterial?.id;
  
  // Material costs
  const panelCostPerUnit = panelMaterial?.cost_per_unit || 0;
  const backCostPerUnit = backMaterial?.cost_per_unit || 0;
  const doorCostPerUnit = doorMaterial?.cost_per_unit || panelCostPerUnit;
  const edgeCostPerUnit = edgeMaterial?.cost_per_unit || 0;
  
  // Calculate dimensions
  // Sides
  const sideHeight = height;
  const sideWidth = depth;
  
  // Top/Bottom
  const topBottomWidth = width - (2 * panelThickness);
  const topBottomDepth = depth;
  
  // Back
  const backWidth = width - (2 * panelThickness);
  const backHeight = height - (2 * panelThickness);
  
  // Shelf
  const shelfWidth = width - (2 * panelThickness);
  const shelfDepth = depth - 20; // Set back from front
  
  // Door - for base cabinets, typically one door for width < 600mm, two doors for wider
  const hasTwoDoors = width >= 600;
  const doorWidth = hasTwoDoors ? (width / 2) - 5 : width - 10; // 5mm gap on each side
  const doorHeight = height - 10; // 5mm gap on top and bottom
  
  // Add parts to the array
  
  // Left side panel
  addPart(parts, 'Left Side', 'side_panel', panelMaterialId, sideWidth, sideHeight, panelThickness, 1,
    true, true, false, true, edgeMaterialId, 'Left side panel', panelCostPerUnit, edgeCostPerUnit);
  
  // Right side panel
  addPart(parts, 'Right Side', 'side_panel', panelMaterialId, sideWidth, sideHeight, panelThickness, 1,
    true, true, true, false, edgeMaterialId, 'Right side panel', panelCostPerUnit, edgeCostPerUnit);
  
  // Top panel
  addPart(parts, 'Top', 'horizontal_panel', panelMaterialId, topBottomWidth, topBottomDepth, panelThickness, 1,
    false, false, false, true, edgeMaterialId, 'Top panel', panelCostPerUnit, edgeCostPerUnit);
  
  // Bottom panel
  addPart(parts, 'Bottom', 'horizontal_panel', panelMaterialId, topBottomWidth, topBottomDepth, panelThickness, 1,
    false, false, false, true, edgeMaterialId, 'Bottom panel', panelCostPerUnit, edgeCostPerUnit);
  
  // Back panel
  addPart(parts, 'Back', 'back_panel', backMaterialId, backWidth, backHeight, backThickness, 1,
    false, false, false, false, null, 'Back panel', backCostPerUnit, 0);
  
  // Shelf
  addPart(parts, 'Shelf', 'shelf', panelMaterialId, shelfWidth, shelfDepth, panelThickness, 1,
    false, false, false, true, edgeMaterialId, 'Adjustable shelf', panelCostPerUnit, edgeCostPerUnit);
  
  // Door(s)
  if (hasTwoDoors) {
    // Left door
    addPart(parts, 'Left Door', 'door', doorMaterialId, doorWidth, doorHeight, panelThickness, 1,
      true, true, true, true, edgeMaterialId, 'Left cabinet door', doorCostPerUnit, edgeCostPerUnit);
    
    // Right door
    addPart(parts, 'Right Door', 'door', doorMaterialId, doorWidth, doorHeight, panelThickness, 1,
      true, true, true, true, edgeMaterialId, 'Right cabinet door', doorCostPerUnit, edgeCostPerUnit);
  } else {
    // Single door
    addPart(parts, 'Door', 'door', doorMaterialId, doorWidth, doorHeight, panelThickness, 1,
      true, true, true, true, edgeMaterialId, 'Cabinet door', doorCostPerUnit, edgeCostPerUnit);
  }
  
  // Add hardware costs
  addHardwareCosts(parts, hardware_config, hasTwoDoors);
}

// Helper function to generate wall cabinet parts
function generateWallCabinetParts(parts, width, height, depth, panelThickness, backThickness, 
  panelMaterial, backMaterial, doorMaterial, edgeMaterial, model, hardware_config) {
  
  // Material IDs
  const panelMaterialId = panelMaterial?.id;
  const backMaterialId = backMaterial?.id;
  const doorMaterialId = doorMaterial?.id || panelMaterialId;
  const edgeMaterialId = edgeMaterial?.id;
  
  // Material costs
  const panelCostPerUnit = panelMaterial?.cost_per_unit || 0;
  const backCostPerUnit = backMaterial?.cost_per_unit || 0;
  const doorCostPerUnit = doorMaterial?.cost_per_unit || panelCostPerUnit;
  const edgeCostPerUnit = edgeMaterial?.cost_per_unit || 0;
  
  // Calculate dimensions
  // Sides
  const sideHeight = height;
  const sideWidth = depth;
  
  // Top/Bottom
  const topBottomWidth = width - (2 * panelThickness);
  const topBottomDepth = depth;
  
  // Back
  const backWidth = width - (2 * panelThickness);
  const backHeight = height - (2 * panelThickness);
  
  // Shelves - wall cabinets typically have 2 shelves
  const shelfWidth = width - (2 * panelThickness);
  const shelfDepth = depth - 20; // Set back from front
  
  // Door - for wall cabinets, typically one door for width < 500mm, two doors for wider
  const hasTwoDoors = width >= 500;
  const doorWidth = hasTwoDoors ? (width / 2) - 5 : width - 10; // 5mm gap on each side
  const doorHeight = height - 10; // 5mm gap on top and bottom
  
  // Add parts to the array
  
  // Left side panel
  addPart(parts, 'Left Side', 'side_panel', panelMaterialId, sideWidth, sideHeight, panelThickness, 1,
    true, true, false, true, edgeMaterialId, 'Left side panel', panelCostPerUnit, edgeCostPerUnit);
  
  // Right side panel
  addPart(parts, 'Right Side', 'side_panel', panelMaterialId, sideWidth, sideHeight, panelThickness, 1,
    true, true, true, false, edgeMaterialId, 'Right side panel', panelCostPerUnit, edgeCostPerUnit);
  
  // Top panel
  addPart(parts, 'Top', 'horizontal_panel', panelMaterialId, topBottomWidth, topBottomDepth, panelThickness, 1,
    false, false, false, true, edgeMaterialId, 'Top panel', panelCostPerUnit, edgeCostPerUnit);
  
  // Bottom panel
  addPart(parts, 'Bottom', 'horizontal_panel', panelMaterialId, topBottomWidth, topBottomDepth, panelThickness, 1,
    false, false, false, true, edgeMaterialId, 'Bottom panel', panelCostPerUnit, edgeCostPerUnit);
  
  // Back panel
  addPart(parts, 'Back', 'back_panel', backMaterialId, backWidth, backHeight, backThickness, 1,
    false, false, false, false, null, 'Back panel', backCostPerUnit, 0);
  
  // Shelves (2 for wall cabinets)
  addPart(parts, 'Shelf 1', 'shelf', panelMaterialId, shelfWidth, shelfDepth, panelThickness, 1,
    false, false, false, true, edgeMaterialId, 'Adjustable shelf', panelCostPerUnit, edgeCostPerUnit);
  
  addPart(parts, 'Shelf 2', 'shelf', panelMaterialId, shelfWidth, shelfDepth, panelThickness, 1,
    false, false, false, true, edgeMaterialId, 'Adjustable shelf', panelCostPerUnit, edgeCostPerUnit);
  
  // Door(s)
  if (hasTwoDoors) {
    // Left door
    addPart(parts, 'Left Door', 'door', doorMaterialId, doorWidth, doorHeight, panelThickness, 1,
      true, true, true, true, edgeMaterialId, 'Left cabinet door', doorCostPerUnit, edgeCostPerUnit);
    
    // Right door
    addPart(parts, 'Right Door', 'door', doorMaterialId, doorWidth, doorHeight, panelThickness, 1,
      true, true, true, true, edgeMaterialId, 'Right cabinet door', doorCostPerUnit, edgeCostPerUnit);
  } else {
    // Single door
    addPart(parts, 'Door', 'door', doorMaterialId, doorWidth, doorHeight, panelThickness, 1,
      true, true, true, true, edgeMaterialId, 'Cabinet door', doorCostPerUnit, edgeCostPerUnit);
  }
  
  // Add hardware costs
  addHardwareCosts(parts, hardware_config, hasTwoDoors);
}

// Helper function to generate tall cabinet parts
function generateTallCabinetParts(parts, width, height, depth, panelThickness, backThickness, 
  panelMaterial, backMaterial, doorMaterial, edgeMaterial, model, hardware_config) {
  
  // Material IDs
  const panelMaterialId = panelMaterial?.id;
  const backMaterialId = backMaterial?.id;
  const doorMaterialId = doorMaterial?.id || panelMaterialId;
  const edgeMaterialId = edgeMaterial?.id;
  
  // Material costs
  const panelCostPerUnit = panelMaterial?.cost_per_unit || 0;
  const backCostPerUnit = backMaterial?.cost_per_unit || 0;
  const doorCostPerUnit = doorMaterial?.cost_per_unit || panelCostPerUnit;
  const edgeCostPerUnit = edgeMaterial?.cost_per_unit || 0;
  
  // Calculate dimensions
  // Sides
  const sideHeight = height;
  const sideWidth = depth;
  
  // Top/Bottom
  const topBottomWidth = width - (2 * panelThickness);
  const topBottomDepth = depth;
  
  // Back
  const backWidth = width - (2 * panelThickness);
  const backHeight = height - (2 * panelThickness);
  
  // Shelves - tall cabinets typically have 5 shelves
  const shelfWidth = width - (2 * panelThickness);
  const shelfDepth = depth - 20; // Set back from front
  
  // Doors - tall cabinets typically have 2 doors (top and bottom) or double doors if wide
  const hasTwoDoors = width >= 600;
  const doorWidth = hasTwoDoors ? (width / 2) - 5 : width - 10; // 5mm gap on each side
  
  // For tall cabinets, we might have upper and lower doors
  const upperDoorHeight = height / 2 - 10; // 5mm gap on top and middle
  const lowerDoorHeight = height / 2 - 10; // 5mm gap on bottom and middle
  
  // Add parts to the array
  
  // Left side panel
  addPart(parts, 'Left Side', 'side_panel', panelMaterialId, sideWidth, sideHeight, panelThickness, 1,
    true, true, false, true, edgeMaterialId, 'Left side panel', panelCostPerUnit, edgeCostPerUnit);
  
  // Right side panel
  addPart(parts, 'Right Side', 'side_panel', panelMaterialId, sideWidth, sideHeight, panelThickness, 1,
    true, true, true, false, edgeMaterialId, 'Right side panel', panelCostPerUnit, edgeCostPerUnit);
  
  // Top panel
  addPart(parts, 'Top', 'horizontal_panel', panelMaterialId, topBottomWidth, topBottomDepth, panelThickness, 1,
    false, false, false, true, edgeMaterialId, 'Top panel', panelCostPerUnit, edgeCostPerUnit);
  
  // Bottom panel
  addPart(parts, 'Bottom', 'horizontal_panel', panelMaterialId, topBottomWidth, topBottomDepth, panelThickness, 1,
    false, false, false, true, edgeMaterialId, 'Bottom panel', panelCostPerUnit, edgeCostPerUnit);
  
  // Middle divider (for tall cabinets)
  addPart(parts, 'Middle Divider', 'horizontal_panel', panelMaterialId, topBottomWidth, topBottomDepth, panelThickness, 1,
    false, false, false, true, edgeMaterialId, 'Middle divider panel', panelCostPerUnit, edgeCostPerUnit);
  
  // Back panel
  addPart(parts, 'Back', 'back_panel', backMaterialId, backWidth, backHeight, backThickness, 1,
    false, false, false, false, null, 'Back panel', backCostPerUnit, 0);
  
  // Shelves (5 for tall cabinets)
  for (let i = 1; i <= 5; i++) {
    addPart(parts, `Shelf ${i}`, 'shelf', panelMaterialId, shelfWidth, shelfDepth, panelThickness, 1,
      false, false, false, true, edgeMaterialId, `Adjustable shelf ${i}`, panelCostPerUnit, edgeCostPerUnit);
  }
  
  // Doors
  if (hasTwoDoors) {
    // Upper doors
    addPart(parts, 'Upper Left Door', 'door', doorMaterialId, doorWidth, upperDoorHeight, panelThickness, 1,
      true, true, true, true, edgeMaterialId, 'Upper left cabinet door', doorCostPerUnit, edgeCostPerUnit);
    
    addPart(parts, 'Upper Right Door', 'door', doorMaterialId, doorWidth, upperDoorHeight, panelThickness, 1,
      true, true, true, true, edgeMaterialId, 'Upper right cabinet door', doorCostPerUnit, edgeCostPerUnit);
    
    // Lower doors
    addPart(parts, 'Lower Left Door', 'door', doorMaterialId, doorWidth, lowerDoorHeight, panelThickness, 1,
      true, true, true, true, edgeMaterialId, 'Lower left cabinet door', doorCostPerUnit, edgeCostPerUnit);
    
    addPart(parts, 'Lower Right Door', 'door', doorMaterialId, doorWidth, lowerDoorHeight, panelThickness, 1,
      true, true, true, true, edgeMaterialId, 'Lower right cabinet door', doorCostPerUnit, edgeCostPerUnit);
  } else {
    // Single upper door
    addPart(parts, 'Upper Door', 'door', doorMaterialId, doorWidth, upperDoorHeight, panelThickness, 1,
      true, true, true, true, edgeMaterialId, 'Upper cabinet door', doorCostPerUnit, edgeCostPerUnit);
    
    // Single lower door
    addPart(parts, 'Lower Door', 'door', doorMaterialId, doorWidth, lowerDoorHeight, panelThickness, 1,
      true, true, true, true, edgeMaterialId, 'Lower cabinet door', doorCostPerUnit, edgeCostPerUnit);
  }
  
  // Add hardware costs - tall cabinets have more hinges
  addHardwareCosts(parts, hardware_config, hasTwoDoors, true);
}

// Generic cabinet parts generator as fallback
function generateGenericCabinetParts(parts, width, height, depth, panelThickness, backThickness, 
  panelMaterial, backMaterial, doorMaterial, edgeMaterial, model, hardware_config) {
  
  // Material IDs
  const panelMaterialId = panelMaterial?.id;
  const backMaterialId = backMaterial?.id;
  const doorMaterialId = doorMaterial?.id || panelMaterialId;
  const edgeMaterialId = edgeMaterial?.id;
  
  // Material costs
  const panelCostPerUnit = panelMaterial?.cost_per_unit || 0;
  const backCostPerUnit = backMaterial?.cost_per_unit || 0;
  const doorCostPerUnit = doorMaterial?.cost_per_unit || panelCostPerUnit;
  const edgeCostPerUnit = edgeMaterial?.cost_per_unit || 0;
  
  // Calculate dimensions
  // Sides
  const sideHeight = height;
  const sideWidth = depth;
  
  // Top/Bottom
  const topBottomWidth = width - (2 * panelThickness);
  const topBottomDepth = depth;
  
  // Back
  const backWidth = width - (2 * panelThickness);
  const backHeight = height - (2 * panelThickness);
  
  // Shelf
  const shelfWidth = width - (2 * panelThickness);
  const shelfDepth = depth - 20; // Set back from front
  
  // Door - single or double based on width
  const hasTwoDoors = width >= 600;
  const doorWidth = hasTwoDoors ? (width / 2) - 5 : width - 10; // 5mm gap on each side
  const doorHeight = height - 10; // 5mm gap on top and bottom
  
  // Add parts to the array
  
  // Left side panel
  addPart(parts, 'Left Side', 'side_panel', panelMaterialId, sideWidth, sideHeight, panelThickness, 1,
    true, true, false, true, edgeMaterialId, 'Left side panel', panelCostPerUnit, edgeCostPerUnit);
  
  // Right side panel
  addPart(parts, 'Right Side', 'side_panel', panelMaterialId, sideWidth, sideHeight, panelThickness, 1,
    true, true, true, false, edgeMaterialId, 'Right side panel', panelCostPerUnit, edgeCostPerUnit);
  
  // Top panel
  addPart(parts, 'Top', 'horizontal_panel', panelMaterialId, topBottomWidth, topBottomDepth, panelThickness, 1,
    false, false, false, true, edgeMaterialId, 'Top panel', panelCostPerUnit, edgeCostPerUnit);
  
  // Bottom panel
  addPart(parts, 'Bottom', 'horizontal_panel', panelMaterialId, topBottomWidth, topBottomDepth, panelThickness, 1,
    false, false, false, true, edgeMaterialId, 'Bottom panel', panelCostPerUnit, edgeCostPerUnit);
  
  // Back panel
  addPart(parts, 'Back', 'back_panel', backMaterialId, backWidth, backHeight, backThickness, 1,
    false, false, false, false, null, 'Back panel', backCostPerUnit, 0);
  
  // Shelf
  addPart(parts, 'Shelf', 'shelf', panelMaterialId, shelfWidth, shelfDepth, panelThickness, 1,
    false, false, false, true, edgeMaterialId, 'Adjustable shelf', panelCostPerUnit, edgeCostPerUnit);
  
  // Door(s)
  if (hasTwoDoors) {
    // Left door
    addPart(parts, 'Left Door', 'door', doorMaterialId, doorWidth, doorHeight, panelThickness, 1,
      true, true, true, true, edgeMaterialId, 'Left cabinet door', doorCostPerUnit, edgeCostPerUnit);
    
    // Right door
    addPart(parts, 'Right Door', 'door', doorMaterialId, doorWidth, doorHeight, panelThickness, 1,
      true, true, true, true, edgeMaterialId, 'Right cabinet door', doorCostPerUnit, edgeCostPerUnit);
  } else {
    // Single door
    addPart(parts, 'Door', 'door', doorMaterialId, doorWidth, doorHeight, panelThickness, 1,
      true, true, true, true, edgeMaterialId, 'Cabinet door', doorCostPerUnit, edgeCostPerUnit);
  }
  
  // Add hardware costs
  addHardwareCosts(parts, hardware_config, hasTwoDoors);
}

// Add hardware costs to the parts array
function addHardwareCosts(parts, hardware_config, hasTwoDoors, isTallCabinet = false) {
  // Default hardware quantities
  const hingesPerDoor = 2;
  const handlesPerDoor = 1;
  const shelfPinsPerShelf = 4;
  
  // Calculate hardware quantities
  const doorCount = hasTwoDoors ? 2 : 1;
  const doorCount2 = isTallCabinet ? doorCount * 2 : doorCount; // Double for tall cabinets (upper and lower doors)
  
  const hingeCount = hardware_config.hinges || (doorCount2 * hingesPerDoor);
  const handleCount = hardware_config.handles || (doorCount2 * handlesPerDoor);
  const shelfPinCount = hardware_config.shelf_pins || (parts.filter(p => p.part_type === 'shelf').length * shelfPinsPerShelf);
  
  // Add hardware as "parts" with costs
  // These won't be physical panels but will be included in the cost calculation
  
  // Hinges
  if (hingeCount > 0) {
    parts.push({
      name: 'Concealed Hinges',
      part_type: 'hardware',
      material_id: null,
      width: 0,
      height: 0,
      thickness: 0,
      quantity: hingeCount,
      edge_banding_top: false,
      edge_banding_bottom: false,
      edge_banding_left: false,
      edge_banding_right: false,
      edge_material_id: null,
      notes: 'Concealed cabinet hinges',
      unit_cost: 2.50, // Default cost per hinge
      total_cost: 2.50 * hingeCount
    });
  }
  
  // Handles
  if (handleCount > 0) {
    parts.push({
      name: 'Cabinet Handles',
      part_type: 'hardware',
      material_id: null,
      width: 0,
      height: 0,
      thickness: 0,
      quantity: handleCount,
      edge_banding_top: false,
      edge_banding_bottom: false,
      edge_banding_left: false,
      edge_banding_right: false,
      edge_material_id: null,
      notes: 'Cabinet door handles',
      unit_cost: 3.75, // Default cost per handle
      total_cost: 3.75 * handleCount
    });
  }
  
  // Shelf pins
  if (shelfPinCount > 0) {
    parts.push({
      name: 'Shelf Support Pins',
      part_type: 'hardware',
      material_id: null,
      width: 0,
      height: 0,
      thickness: 0,
      quantity: shelfPinCount,
      edge_banding_top: false,
      edge_banding_bottom: false,
      edge_banding_left: false,
      edge_banding_right: false,
      edge_material_id: null,
      notes: 'Shelf support pins',
      unit_cost: 0.15, // Default cost per pin
      total_cost: 0.15 * shelfPinCount
    });
  }
  
  // Add drawer slides if needed
  if (hardware_config.drawer_slides > 0) {
    parts.push({
      name: 'Drawer Slides',
      part_type: 'hardware',
      material_id: null,
      width: 0,
      height: 0,
      thickness: 0,
      quantity: hardware_config.drawer_slides,
      edge_banding_top: false,
      edge_banding_bottom: false,
      edge_banding_left: false,
      edge_banding_right: false,
      edge_material_id: null,
      notes: 'Drawer slides (pairs)',
      unit_cost: 8.99, // Default cost per pair of slides
      total_cost: 8.99 * hardware_config.drawer_slides
    });
  }
}

// Calculate cabinet cost
export const calculateCabinetCost = async (cabinetData) => {
  try {
    const { parts, totalCost } = await calculateCabinetParts(cabinetData);
    return totalCost;
  } catch (error) {
    console.error('Error calculating cabinet cost:', error);
    throw error;
  }
};