import { runQuery, runStatement } from '../database/connection.js';

// Generate Production Order Number
export const generateProductionOrderNumber = async () => {
  const year = new Date().getFullYear();
  const lastPO = await runQuery(
    'SELECT order_number FROM production_orders WHERE order_number LIKE ? ORDER BY id DESC LIMIT 1',
    [`PRO-${year}-%`]
  );
  
  let nextNumber = 1;
  if (lastPO.length > 0) {
    const lastNumber = parseInt(lastPO[0].order_number.split('-')[2]);
    nextNumber = lastNumber + 1;
  }
  
  return `PRO-${year}-${nextNumber.toString().padStart(4, '0')}`;
};

// Calculate Production Order Costs
export const calculateProductionOrderCosts = async (bomId, quantity) => {
  try {
    // Get BOM details
    const boms = await runQuery('SELECT * FROM bill_of_materials WHERE id = ?', [bomId]);
    if (boms.length === 0) {
      throw new Error('BOM not found');
    }
    
    const bom = boms[0];
    
    // Calculate costs based on BOM and quantity
    const materialCost = bom.unit_cost * quantity;
    const laborCost = bom.labor_cost * quantity;
    const overheadCost = bom.overhead_cost * quantity;
    const totalCost = bom.total_cost * quantity;
    
    return {
      materialCost,
      laborCost,
      overheadCost,
      totalCost
    };
  } catch (error) {
    console.error('Error calculating production order costs:', error);
    throw error;
  }
};

// Create Production Order Items from BOM
export const createProductionOrderItemsFromBOM = async (productionOrderId, bomId, quantity) => {
  try {
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
      
      await runStatement(`
        INSERT INTO production_order_items (
          production_order_id, item_id, item_name, item_sku,
          component_type, component_bom_id, required_quantity,
          unit_id, unit_name, unit_cost, total_cost, waste_factor
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        productionOrderId,
        component.item_id || null,
        component.item_name || 'Unknown Item',
        component.item_sku || null,
        component.component_type,
        component.component_bom_id || null,
        requiredQuantity,
        component.unit_id || null,
        component.unit_name || null,
        component.unit_cost || 0,
        component.total_cost * quantity || 0,
        component.waste_factor || 0
      ]);
    }
    
    return components.length;
  } catch (error) {
    console.error('Error creating production order items:', error);
    throw error;
  }
};

// Create Production Order Operations from BOM
export const createProductionOrderOperationsFromBOM = async (productionOrderId, bomId) => {
  try {
    // Get BOM operations
    const operations = await runQuery(`
      SELECT * FROM bom_operations
      WHERE bom_id = ?
      ORDER BY sequence_number
    `, [bomId]);
    
    // Insert production order operations
    for (const operation of operations) {
      await runStatement(`
        INSERT INTO production_order_operations (
          production_order_id, operation_name, description,
          sequence_number, estimated_time_minutes, labor_rate,
          machine_required, skill_level, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        productionOrderId,
        operation.operation_name,
        operation.description || null,
        operation.sequence_number || 1,
        operation.estimated_time_minutes || 0,
        operation.labor_rate || 0,
        operation.machine_required || null,
        operation.skill_level || 'basic',
        operation.notes || null
      ]);
    }
    
    return operations.length;
  } catch (error) {
    console.error('Error creating production order operations:', error);
    throw error;
  }
};

// Issue materials for production order
export const issueMaterialsForProduction = async (productionOrderId, items, userId) => {
  try {
    // Start a transaction
    await runStatement('BEGIN TRANSACTION');
    
    for (const item of items) {
      // Get current item details
      const orderItems = await runQuery(`
        SELECT poi.*, i.quantity as available_quantity
        FROM production_order_items poi
        JOIN inventory_items i ON poi.item_id = i.id
        WHERE poi.id = ? AND poi.production_order_id = ?
      `, [item.production_order_item_id, productionOrderId]);
      
      if (orderItems.length === 0) {
        throw new Error(`Production order item not found: ${item.production_order_item_id}`);
      }
      
      const orderItem = orderItems[0];
      
      // Validate quantity
      if (item.quantity <= 0) {
        throw new Error('Issue quantity must be greater than zero');
      }
      
      if (item.quantity > orderItem.required_quantity - orderItem.issued_quantity) {
        throw new Error(`Cannot issue more than remaining required quantity (${orderItem.required_quantity - orderItem.issued_quantity})`);
      }
      
      if (item.quantity > orderItem.available_quantity) {
        throw new Error(`Insufficient inventory for item ${orderItem.item_name}. Available: ${orderItem.available_quantity}, Requested: ${item.quantity}`);
      }
      
      // Update production order item
      await runStatement(`
        UPDATE production_order_items
        SET issued_quantity = issued_quantity + ?,
            status = CASE
              WHEN issued_quantity + ? >= required_quantity THEN 'issued'
              ELSE 'partial'
            END
        WHERE id = ?
      `, [item.quantity, item.quantity, item.production_order_item_id]);
      
      // Update inventory quantity
      await runStatement(`
        UPDATE inventory_items
        SET quantity = quantity - ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [item.quantity, orderItem.item_id]);
      
      // Record stock movement
      await runStatement(`
        INSERT INTO stock_movements (
          item_id, movement_type, quantity, reference_type, 
          reference_id, reference_number, notes, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        orderItem.item_id, 
        'out', 
        item.quantity, 
        'production_order', 
        productionOrderId, 
        `PRO-${productionOrderId}`,
        item.notes || 'Material issued for production',
        userId
      ]);
      
      // Record issue in production_order_issues
      await runStatement(`
        INSERT INTO production_order_issues (
          production_order_id, production_order_item_id,
          quantity, issued_by, notes
        ) VALUES (?, ?, ?, ?, ?)
      `, [
        productionOrderId,
        item.production_order_item_id,
        item.quantity,
        userId,
        item.notes || null
      ]);
    }
    
    // Check if all items are fully issued
    const remainingItems = await runQuery(`
      SELECT COUNT(*) as count
      FROM production_order_items
      WHERE production_order_id = ? AND status != 'issued'
    `, [productionOrderId]);
    
    // Update production order status if needed
    if (remainingItems[0].count === 0) {
      await runStatement(`
        UPDATE production_orders
        SET status = CASE
          WHEN status = 'planned' THEN 'in_progress'
          ELSE status
        END,
        updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [productionOrderId]);
    } else {
      // Ensure the status is at least 'in_progress' if materials have been issued
      await runStatement(`
        UPDATE production_orders
        SET status = CASE
          WHEN status = 'draft' OR status = 'planned' THEN 'in_progress'
          ELSE status
        END,
        updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [productionOrderId]);
    }
    
    // Commit the transaction
    await runStatement('COMMIT');
    
    return { success: true };
  } catch (error) {
    // Rollback the transaction on error
    await runStatement('ROLLBACK');
    console.error('Error issuing materials for production:', error);
    throw error;
  }
};

// Complete production order (add finished product to inventory)
export const completeProductionOrder = async (productionOrderId, completionData, userId) => {
  try {
    // Start a transaction
    await runStatement('BEGIN TRANSACTION');
    
    // Get production order details
    const orders = await runQuery(`
      SELECT * FROM production_orders WHERE id = ?
    `, [productionOrderId]);
    
    if (orders.length === 0) {
      throw new Error('Production order not found');
    }
    
    const order = orders[0];
    
    // Validate completion data
    if (!completionData.quantity || completionData.quantity <= 0) {
      throw new Error('Completion quantity must be greater than zero');
    }
    
    if (completionData.quantity > order.quantity) {
      throw new Error(`Cannot complete more than ordered quantity (${order.quantity})`);
    }
    
    // Record completion
    await runStatement(`
      INSERT INTO production_order_completions (
        production_order_id, quantity, completed_by,
        quality_check_passed, batch_number, notes
      ) VALUES (?, ?, ?, ?, ?, ?)
    `, [
      productionOrderId,
      completionData.quantity,
      userId,
      completionData.quality_check_passed !== false ? 1 : 0,
      completionData.batch_number || null,
      completionData.notes || null
    ]);
    
    // If quality check passed, add to inventory
    if (completionData.quality_check_passed !== false) {
      // If there's a finished product ID, update inventory
      if (order.finished_product_id) {
        // Get current quantity
        const items = await runQuery('SELECT quantity FROM inventory_items WHERE id = ?', [order.finished_product_id]);
        
        if (items.length > 0) {
          const currentQuantity = items[0].quantity;
          const newQuantity = currentQuantity + completionData.quantity;
          
          // Update inventory
          await runStatement(`
            UPDATE inventory_items
            SET quantity = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `, [newQuantity, order.finished_product_id]);
          
          // Record stock movement
          await runStatement(`
            INSERT INTO stock_movements (
              item_id, movement_type, quantity, reference_type, 
              reference_id, reference_number, notes, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            order.finished_product_id, 
            'in', 
            completionData.quantity, 
            'production_order', 
            productionOrderId, 
            `PRO-${order.order_number}`,
            completionData.notes || 'Production completed',
            userId
          ]);
        }
      }
    }
    
    // Update production order status
    await runStatement(`
      UPDATE production_orders
      SET status = 'completed',
          completion_date = CURRENT_DATE,
          actual_cost = planned_cost, -- In a real system, you might calculate actual costs
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [productionOrderId]);
    
    // Commit the transaction
    await runStatement('COMMIT');
    
    return { success: true };
  } catch (error) {
    // Rollback the transaction on error
    await runStatement('ROLLBACK');
    console.error('Error completing production order:', error);
    throw error;
  }
};

// Update operation status
export const updateOperationStatus = async (operationId, status, userId) => {
  try {
    // Get operation details
    const operations = await runQuery(`
      SELECT po.*, p.id as production_order_id, p.status as order_status
      FROM production_order_operations po
      JOIN production_orders p ON po.production_order_id = p.id
      WHERE po.id = ?
    `, [operationId]);
    
    if (operations.length === 0) {
      throw new Error('Operation not found');
    }
    
    const operation = operations[0];
    
    // Validate status change
    if (operation.order_status === 'completed' || operation.order_status === 'cancelled') {
      throw new Error(`Cannot update operation for ${operation.order_status} production order`);
    }
    
    // Update operation status
    let updateSql = `
      UPDATE production_order_operations
      SET status = ?
    `;
    
    const params = [status];
    
    // Add timestamps based on status
    if (status === 'in_progress') {
      updateSql += `, actual_start_date = CURRENT_TIMESTAMP`;
    } else if (status === 'completed') {
      updateSql += `, actual_end_date = CURRENT_TIMESTAMP`;
      
      // Calculate actual time if we have a start date
      updateSql += `, actual_time_minutes = CASE 
        WHEN actual_start_date IS NOT NULL 
        THEN ROUND((julianday(CURRENT_TIMESTAMP) - julianday(actual_start_date)) * 1440) 
        ELSE estimated_time_minutes 
      END`;
    }
    
    updateSql += ` WHERE id = ?`;
    params.push(operationId);
    
    await runStatement(updateSql, params);
    
    // Check if all operations are completed
    if (status === 'completed') {
      const pendingOps = await runQuery(`
        SELECT COUNT(*) as count
        FROM production_order_operations
        WHERE production_order_id = ? AND status NOT IN ('completed', 'skipped')
      `, [operation.production_order_id]);
      
      // If no pending operations, update production order status
      if (pendingOps[0].count === 0) {
        await runStatement(`
          UPDATE production_orders
          SET status = 'completed',
              completion_date = CURRENT_DATE,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ? AND status != 'completed'
        `, [operation.production_order_id]);
      }
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error updating operation status:', error);
    throw error;
  }
};