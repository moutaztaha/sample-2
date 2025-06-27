import { runQuery } from '../database/connection.js';

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
    
    // Parts array to store all cabinet parts
    const parts = [];
    
    // Calculate dimensions based on cabinet type
    const categoryId = model.category_id;
    
    // Get category name
    const categories = await runQuery('SELECT name FROM cabinet_categories WHERE id = ?', [categoryId]);
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

// Helper function to add a part to the parts array
function addPart(parts, name, part_type, material_id, width, height, thickness, quantity,
  edge_banding_top, edge_banding_bottom, edge_banding_left, edge_banding_right,
  edge_material_id, notes, material_cost_per_unit, edge_cost_per_unit) {
  
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
    total_cost: totalCost
  });
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