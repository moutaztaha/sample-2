import { runQuery, runStatement } from './connection.js';

export const addSampleBOMData = async () => {
  try {
    console.log('Adding sample BOM data...');

    // Check if we already have BOM data
    const existingBOMs = await runQuery('SELECT COUNT(*) as count FROM bill_of_materials');
    if (existingBOMs[0].count > 0) {
      console.log('Sample BOM data already exists, skipping...');
      return;
    }

    // Get user ID for created_by
    const users = await runQuery('SELECT id FROM users WHERE role = "admin" LIMIT 1');
    const adminId = users[0]?.id || 1;

    // Get finished product IDs
    const finishedProducts = await runQuery(`
      SELECT id, name, sku FROM inventory_items 
      WHERE item_type = 'finished_product'
    `);

    // Get semi-finished product IDs
    const semiFinishedProducts = await runQuery(`
      SELECT id, name, sku FROM inventory_items 
      WHERE item_type = 'semi_finished_product'
    `);

    // Get raw material IDs
    const rawMaterials = await runQuery(`
      SELECT id, name, sku FROM inventory_items 
      WHERE item_type = 'raw_material'
    `);

    // Get unit IDs
    const units = await runQuery('SELECT id, name FROM units');
    const piecesUnit = units.find(u => u.name === 'Pieces')?.id || null;
    const sheetsUnit = units.find(u => u.name === 'Sheets')?.id || null;
    const pairsUnit = units.find(u => u.name === 'Pairs')?.id || null;
    const boxesUnit = units.find(u => u.name === 'Boxes')?.id || null;

    // Insert BOMs for semi-finished products
    const semiFinishedBOMs = [
      {
        name: 'Cabinet Door - Shaker Style',
        description: 'BOM for shaker style cabinet door',
        finished_product_id: semiFinishedProducts.find(p => p.name === 'Cabinet Door - Shaker Style')?.id,
        version: '1.0',
        status: 'active',
        overhead_cost: 5.00,
        created_by: adminId
      },
      {
        name: 'Drawer Box Assembly',
        description: 'BOM for standard drawer box',
        finished_product_id: semiFinishedProducts.find(p => p.name === 'Drawer Box Assembly')?.id,
        version: '1.0',
        status: 'active',
        overhead_cost: 3.50,
        created_by: adminId
      },
      {
        name: 'Cabinet Face Frame',
        description: 'BOM for cabinet face frame',
        finished_product_id: semiFinishedProducts.find(p => p.name === 'Cabinet Face Frame')?.id,
        version: '1.0',
        status: 'active',
        overhead_cost: 4.00,
        created_by: adminId
      }
    ];

    // Insert semi-finished product BOMs
    for (const bom of semiFinishedBOMs) {
      const result = await runStatement(`
        INSERT INTO bill_of_materials (
          name, description, finished_product_id, version, status, overhead_cost, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        bom.name,
        bom.description,
        bom.finished_product_id,
        bom.version,
        bom.status,
        bom.overhead_cost,
        bom.created_by
      ]);
      
      console.log(`✅ Added BOM: ${bom.name}`);
      
      // Add components for this BOM
      await addBOMComponents(result.id, rawMaterials, null, piecesUnit, sheetsUnit, pairsUnit, boxesUnit);
      
      // Add operations for this BOM
      await addBOMOperations(result.id);
    }

    // Insert BOMs for finished products
    const finishedProductBOMs = [
      {
        name: 'Base Cabinet 24"',
        description: 'BOM for standard 24-inch base cabinet',
        finished_product_id: finishedProducts.find(p => p.name === 'Base Cabinet 24"')?.id,
        version: '1.0',
        status: 'active',
        overhead_cost: 15.00,
        created_by: adminId
      },
      {
        name: 'Wall Cabinet 30"',
        description: 'BOM for standard 30-inch wall cabinet',
        finished_product_id: finishedProducts.find(p => p.name === 'Wall Cabinet 30"')?.id,
        version: '1.0',
        status: 'active',
        overhead_cost: 12.00,
        created_by: adminId
      },
      {
        name: 'Pantry Cabinet 84"',
        description: 'BOM for 84-inch pantry cabinet',
        finished_product_id: finishedProducts.find(p => p.name === 'Pantry Cabinet 84"')?.id,
        version: '1.0',
        status: 'active',
        overhead_cost: 25.00,
        created_by: adminId
      }
    ];

    // Insert finished product BOMs
    for (const bom of finishedProductBOMs) {
      const result = await runStatement(`
        INSERT INTO bill_of_materials (
          name, description, finished_product_id, version, status, overhead_cost, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        bom.name,
        bom.description,
        bom.finished_product_id,
        bom.version,
        bom.status,
        bom.overhead_cost,
        bom.created_by
      ]);
      
      console.log(`✅ Added BOM: ${bom.name}`);
      
      // Get semi-finished BOMs
      const semiBOMs = await runQuery('SELECT id, name FROM bill_of_materials WHERE name LIKE "Cabinet%" AND id != ?', [result.id]);
      
      // Add both raw materials and semi-finished components
      await addBOMComponents(result.id, rawMaterials, semiBOMs, piecesUnit, sheetsUnit, pairsUnit, boxesUnit);
      
      // Add operations for this BOM
      await addBOMOperations(result.id);
    }

    console.log('✅ Sample BOM data added successfully!');
  } catch (error) {
    console.error('❌ Error adding sample BOM data:', error);
  }
};

// Helper function to add BOM components
async function addBOMComponents(bomId, rawMaterials, semiBOMs, piecesUnit, sheetsUnit, pairsUnit, boxesUnit) {
  // Add raw material components
  for (let i = 0; i < Math.min(5, rawMaterials.length); i++) {
    const material = rawMaterials[i];
    const quantity = Math.random() * 5 + 0.5; // Random quantity between 0.5 and 5.5
    const wasteFactor = Math.random() * 0.2; // Random waste factor between 0 and 0.2 (0-20%)
    
    // Determine appropriate unit based on material name
    let unitId = piecesUnit;
    if (material.name.includes('Plywood') || material.name.includes('Panel')) {
      unitId = sheetsUnit;
    } else if (material.name.includes('Hinges') || material.name.includes('Slides')) {
      unitId = pairsUnit;
    } else if (material.name.includes('Screws') || material.name.includes('Pins')) {
      unitId = boxesUnit;
    }
    
    await runStatement(`
      INSERT INTO bom_components (
        bom_id, item_id, quantity, unit_id, waste_factor, notes, sort_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      bomId,
      material.id,
      quantity,
      unitId,
      wasteFactor,
      `Component: ${material.name}`,
      i + 1
    ]);
  }
  
  // Add semi-finished components if available
  if (semiBOMs && semiBOMs.length > 0) {
    for (let i = 0; i < Math.min(2, semiBOMs.length); i++) {
      const semiBOM = semiBOMs[i];
      await runStatement(`
        INSERT INTO bom_components (
          bom_id, component_bom_id, quantity, unit_id, waste_factor, notes, sort_order
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        bomId,
        semiBOM.id,
        1, // Usually just need 1 of each sub-assembly
        piecesUnit,
        0.05, // 5% waste factor
        `Sub-assembly: ${semiBOM.name}`,
        i + 6 // Start after raw materials
      ]);
    }
  }
}

// Helper function to add BOM operations
async function addBOMOperations(bomId) {
  const operations = [
    {
      operation_name: 'Cut Parts',
      description: 'Cut all cabinet parts to size',
      sequence_number: 1,
      estimated_time_minutes: 45,
      labor_rate: 25.00,
      machine_required: 'Table Saw',
      skill_level: 'intermediate'
    },
    {
      operation_name: 'Drill Holes',
      description: 'Drill shelf pin and hinge holes',
      sequence_number: 2,
      estimated_time_minutes: 30,
      labor_rate: 22.00,
      machine_required: 'Drill Press',
      skill_level: 'basic'
    },
    {
      operation_name: 'Sand Parts',
      description: 'Sand all parts to 220 grit',
      sequence_number: 3,
      estimated_time_minutes: 60,
      labor_rate: 18.00,
      machine_required: 'Random Orbital Sander',
      skill_level: 'basic'
    },
    {
      operation_name: 'Assemble Cabinet',
      description: 'Assemble cabinet box with glue and screws',
      sequence_number: 4,
      estimated_time_minutes: 90,
      labor_rate: 28.00,
      machine_required: 'Assembly Table',
      skill_level: 'intermediate'
    },
    {
      operation_name: 'Install Hardware',
      description: 'Install hinges, drawer slides, and handles',
      sequence_number: 5,
      estimated_time_minutes: 45,
      labor_rate: 25.00,
      machine_required: 'Hand Tools',
      skill_level: 'intermediate'
    },
    {
      operation_name: 'Final Inspection',
      description: 'Quality check and final adjustments',
      sequence_number: 6,
      estimated_time_minutes: 15,
      labor_rate: 30.00,
      machine_required: 'None',
      skill_level: 'advanced'
    }
  ];
  
  // Add 3-6 random operations for this BOM
  const numOperations = Math.floor(Math.random() * 4) + 3; // 3-6 operations
  for (let i = 0; i < numOperations; i++) {
    const operation = operations[i];
    await runStatement(`
      INSERT INTO bom_operations (
        bom_id, operation_name, description, sequence_number,
        estimated_time_minutes, labor_rate, machine_required, skill_level
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      bomId,
      operation.operation_name,
      operation.description,
      operation.sequence_number,
      operation.estimated_time_minutes,
      operation.labor_rate,
      operation.machine_required,
      operation.skill_level
    ]);
  }
}