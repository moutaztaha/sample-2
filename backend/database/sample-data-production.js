import { runQuery, runStatement } from './connection.js';

export const addSampleProductionOrdersData = async () => {
  try {
    console.log('Adding sample production order data...');

    // Check if we already have production orders
    const existingOrders = await runQuery('SELECT COUNT(*) as count FROM production_orders');
    if (existingOrders[0].count > 0) {
      console.log('Sample production order data already exists, skipping...');
      return;
    }

    // Get user IDs
    const users = await runQuery('SELECT id, username, role FROM users');
    const adminUser = users.find(u => u.role === 'admin');
    
    if (!adminUser) {
      console.log('No admin user found, skipping production order data...');
      return;
    }

    // Get BOMs for finished products
    const boms = await runQuery(`
      SELECT b.id, b.name, b.total_cost, i.id as product_id, i.name as product_name, i.sku as product_sku
      FROM bill_of_materials b
      LEFT JOIN inventory_items i ON b.finished_product_id = i.id
      WHERE b.status = 'active' AND i.item_type = 'finished_product'
    `);
    
    if (boms.length === 0) {
      console.log('No active BOMs found, skipping production order data...');
      return;
    }

    // Generate production order numbers
    let orderCounter = 1;
    const year = new Date().getFullYear();

    // Sample production orders
    const sampleOrders = [
      {
        title: 'Base Cabinet Production Run',
        description: 'Monthly production run of base cabinets',
        bom_id: boms.find(b => b.name.includes('Base Cabinet'))?.id || boms[0].id,
        status: 'draft',
        priority: 'medium',
        quantity: 10,
        start_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days from now
        due_date: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 21 days from now
        notes: 'Regular monthly production run',
        created_by: adminUser.id
      },
      {
        title: 'Wall Cabinet Production',
        description: 'Production of wall cabinets for Project XYZ',
        bom_id: boms.find(b => b.name.includes('Wall Cabinet'))?.id || boms[0].id,
        status: 'planned',
        priority: 'high',
        quantity: 15,
        start_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 3 days from now
        due_date: new Date(Date.now() + 17 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 17 days from now
        notes: 'High priority for Project XYZ',
        created_by: adminUser.id
      },
      {
        title: 'Pantry Cabinet Special Order',
        description: 'Custom pantry cabinets for Johnson residence',
        bom_id: boms.find(b => b.name.includes('Pantry'))?.id || boms[0].id,
        status: 'in_progress',
        priority: 'urgent',
        quantity: 5,
        start_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 5 days ago
        due_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 5 days from now
        notes: 'Custom order with special finishes',
        created_by: adminUser.id
      },
      {
        title: 'Base Cabinet Small Batch',
        description: 'Small batch of base cabinets for inventory',
        bom_id: boms.find(b => b.name.includes('Base Cabinet'))?.id || boms[0].id,
        status: 'completed',
        priority: 'low',
        quantity: 3,
        start_date: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 20 days ago
        due_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 5 days ago
        completion_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days ago
        notes: 'Completed ahead of schedule',
        created_by: adminUser.id
      }
    ];

    // Insert production orders
    for (const order of sampleOrders) {
      // Generate order number
      const orderNumber = `PRO-${year}-${orderCounter.toString().padStart(4, '0')}`;
      orderCounter++;
      
      // Get BOM details
      const bom = boms.find(b => b.id === order.bom_id) || boms[0];
      const plannedCost = bom.total_cost * order.quantity;
      
      // Insert production order
      const result = await runStatement(`
        INSERT INTO production_orders (
          order_number, title, description, bom_id, status, priority,
          quantity, start_date, due_date, completion_date,
          finished_product_id, finished_product_name, finished_product_sku,
          planned_cost, actual_cost, notes, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        orderNumber,
        order.title,
        order.description,
        order.bom_id,
        order.status,
        order.priority,
        order.quantity,
        order.start_date,
        order.due_date,
        order.completion_date || null,
        bom.product_id,
        bom.product_name,
        bom.product_sku,
        plannedCost,
        order.status === 'completed' ? plannedCost : 0, // Set actual cost for completed orders
        order.notes,
        order.created_by
      ]);
      
      const orderId = result.id;
      console.log(`✅ Added production order: ${order.title} (${orderNumber})`);
      
      // Add production order items from BOM components
      await addProductionOrderItems(orderId, order.bom_id, order.quantity, order.status);
      
      // Add production order operations from BOM operations
      await addProductionOrderOperations(orderId, order.bom_id, order.status);
      
      // For completed orders, add completion record
      if (order.status === 'completed') {
        await runStatement(`
          INSERT INTO production_order_completions (
            production_order_id, quantity, completed_by,
            completion_date, quality_check_passed, batch_number, notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
          orderId,
          order.quantity,
          adminUser.id,
          order.completion_date,
          1, // Quality check passed
          `BATCH-${orderNumber}`,
          'Completed successfully'
        ]);
      }
    }

    console.log('✅ Sample production order data added successfully!');
  } catch (error) {
    console.error('❌ Error adding sample production order data:', error);
  }
};

// Helper function to add production order items
async function addProductionOrderItems(orderId, bomId, quantity, status) {
  // Get BOM components
  const components = await runQuery(`
    SELECT 
      bc.*,
      i.name as item_name,
      i.sku as item_sku,
      u.id as unit_id,
      u.name as unit_name,
      CASE 
        WHEN bc.item_id IS NOT NULL THEN 'item'
        WHEN bc.component_bom_id IS NOT NULL THEN 'bom'
        ELSE NULL
      END as component_type
    FROM bom_components bc
    LEFT JOIN inventory_items i ON bc.item_id = i.id
    LEFT JOIN units u ON bc.unit_id = u.id
    WHERE bc.bom_id = ?
  `, [bomId]);
  
  // Insert production order items
  for (const component of components) {
    const requiredQuantity = component.quantity * quantity * (1 + component.waste_factor);
    
    // For in_progress or completed orders, set some issued quantity
    let issuedQuantity = 0;
    if (status === 'in_progress') {
      issuedQuantity = requiredQuantity * 0.7; // Issue about 70%
    } else if (status === 'completed') {
      issuedQuantity = requiredQuantity; // Issue all
    }
    
    // Determine status based on issued quantity
    let itemStatus = 'pending';
    if (issuedQuantity >= requiredQuantity) {
      itemStatus = 'issued';
    } else if (issuedQuantity > 0) {
      itemStatus = 'partial';
    }
    
    const itemResult = await runStatement(`
      INSERT INTO production_order_items (
        production_order_id, item_id, item_name, item_sku,
        component_type, component_bom_id, required_quantity, issued_quantity,
        unit_id, unit_name, unit_cost, total_cost, waste_factor, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      orderId,
      component.item_id || null,
      component.item_name || 'Unknown Item',
      component.item_sku || null,
      component.component_type,
      component.component_bom_id || null,
      requiredQuantity,
      issuedQuantity,
      component.unit_id || null,
      component.unit_name || null,
      component.unit_cost || 0,
      component.total_cost * quantity || 0,
      component.waste_factor || 0,
      itemStatus
    ]);
    
    // For in_progress or completed orders, add issue records
    if (issuedQuantity > 0) {
      await runStatement(`
        INSERT INTO production_order_issues (
          production_order_id, production_order_item_id,
          quantity, issued_by, notes
        ) VALUES (?, ?, ?, ?, ?)
      `, [
        orderId,
        itemResult.id, // Use the ID from the newly inserted production_order_items record
        issuedQuantity,
        1, // Admin user ID
        'Issued for production'
      ]);
    }
  }
}

// Helper function to add production order operations
async function addProductionOrderOperations(orderId, bomId, status) {
  // Get BOM operations
  const operations = await runQuery(`
    SELECT * FROM bom_operations
    WHERE bom_id = ?
    ORDER BY sequence_number
  `, [bomId]);
  
  // Insert production order operations
  for (const operation of operations) {
    // Determine operation status based on production order status
    let operationStatus = 'pending';
    let actualStartDate = null;
    let actualEndDate = null;
    let actualTimeMinutes = null;
    
    if (status === 'in_progress') {
      // For in-progress orders, set earlier operations to completed, middle ones to in_progress, later ones to pending
      const sequencePosition = operation.sequence_number / operations.length;
      
      if (sequencePosition < 0.4) {
        operationStatus = 'completed';
        actualStartDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(); // 5 days ago
        actualEndDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(); // 3 days ago
        actualTimeMinutes = operation.estimated_time_minutes * (0.8 + Math.random() * 0.4); // 80-120% of estimate
      } else if (sequencePosition < 0.6) {
        operationStatus = 'in_progress';
        actualStartDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(); // 2 days ago
      } else {
        operationStatus = 'pending';
      }
    } else if (status === 'completed') {
      // All operations completed for completed orders
      operationStatus = 'completed';
      actualStartDate = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(); // 15 days ago
      actualEndDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(); // 10 days ago
      actualTimeMinutes = operation.estimated_time_minutes * (0.8 + Math.random() * 0.4); // 80-120% of estimate
    }
    
    await runStatement(`
      INSERT INTO production_order_operations (
        production_order_id, operation_name, description,
        sequence_number, status, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_time_minutes,
        actual_time_minutes, labor_rate, machine_required, skill_level
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      orderId,
      operation.operation_name,
      operation.description || null,
      operation.sequence_number || 1,
      operationStatus,
      null, // planned_start_date
      null, // planned_end_date
      actualStartDate,
      actualEndDate,
      operation.estimated_time_minutes || 0,
      actualTimeMinutes,
      operation.labor_rate || 0,
      operation.machine_required || null,
      operation.skill_level || 'basic',
    ]);
  }
}