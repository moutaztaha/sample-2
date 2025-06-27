import { runQuery, runStatement } from '../database/connection.js';

// Helper function to restore inventory quantities
export const restoreInventoryQuantities = async (requisitionId) => {
  try {
    // Get all issued items for this requisition
    const issuedItems = await runQuery(`
      SELECT item_id, COALESCE(issued_quantity, 0) as issued_quantity
      FROM requisition_items 
      WHERE requisition_id = ? AND issued_quantity > 0
    `, [requisitionId]);

    // Restore inventory quantities
    for (const item of issuedItems) {
      if (item.issued_quantity > 0) {
        await runStatement(`
          UPDATE inventory_items 
          SET quantity = quantity + ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [item.issued_quantity, item.item_id]);
      }
    }

    return issuedItems.length;
  } catch (error) {
    console.error('Error restoring inventory quantities:', error);
    throw error;
  }
};

// Validate item issue quantities
export const validateItemIssue = async (requisitionId, itemId, issueQuantity) => {
  // Get the requisition item to check approved quantity
  const requisitionItems = await runQuery(`
    SELECT * FROM requisition_items 
    WHERE requisition_id = ? AND item_id = ?
  `, [requisitionId, itemId]);

  if (requisitionItems.length === 0) {
    throw new Error(`Requisition item ${itemId} not found`);
  }

  const requisitionItem = requisitionItems[0];
  
  if (issueQuantity > requisitionItem.approved_quantity) {
    throw new Error(`Cannot issue more than approved quantity for item ${itemId}`);
  }

  // Check inventory availability
  const inventoryItems = await runQuery(`
    SELECT quantity FROM inventory_items WHERE id = ?
  `, [itemId]);

  if (inventoryItems.length === 0) {
    throw new Error(`Inventory item ${itemId} not found`);
  }

  const currentQuantity = inventoryItems[0].quantity;
  
  if (issueQuantity > currentQuantity) {
    throw new Error(`Insufficient inventory for item ${itemId}. Available: ${currentQuantity}, Requested: ${issueQuantity}`);
  }
};

// Process item approvals and return status flags
export const processItemApprovals = async (requisitionId, items) => {
  let hasApproved = false;
  let hasRejected = false;
  let hasPartial = false;

  for (const itemApproval of items) {
    const { item_id, approved_quantity, rejected_quantity, approval_notes: itemNotes } = itemApproval;
    
    // Get the original requisition item
    const originalItems = await runQuery(`
      SELECT * FROM requisition_items 
      WHERE requisition_id = ? AND item_id = ?
    `, [requisitionId, item_id]);

    if (originalItems.length === 0) {
      continue; // Skip if item not found
    }

    const originalItem = originalItems[0];
    const totalProcessed = (approved_quantity || 0) + (rejected_quantity || 0);
    
    if (totalProcessed > originalItem.quantity) {
      throw new Error(`Total approved + rejected quantity cannot exceed requested quantity for item ${item_id}`);
    }

    // Determine item status
    let itemStatus = 'pending';
    if (approved_quantity > 0 && rejected_quantity === 0 && approved_quantity === originalItem.quantity) {
      itemStatus = 'approved';
      hasApproved = true;
    } else if (rejected_quantity > 0 && approved_quantity === 0 && rejected_quantity === originalItem.quantity) {
      itemStatus = 'rejected';
      hasRejected = true;
    } else if (approved_quantity > 0 || rejected_quantity > 0) {
      itemStatus = 'partially_approved';
      hasPartial = true;
      hasApproved = true;
    }

    // Update requisition item
    await runStatement(`
      UPDATE requisition_items SET
        approved_quantity = ?,
        rejected_quantity = ?,
        approval_notes = ?,
        status = ?
      WHERE requisition_id = ? AND item_id = ?
    `, [
      approved_quantity || 0,
      rejected_quantity || 0,
      itemNotes || '',
      itemStatus,
      requisitionId,
      item_id
    ]);
  }

  return { hasApproved, hasRejected, hasPartial };
};

// Calculate overall requisition status based on item statuses
export const calculateRequisitionStatus = (hasApproved, hasRejected, hasPartial) => {
  if (hasPartial) {
    return 'partially_approved';
  } else if (hasApproved && !hasRejected) {
    return 'approved';
  } else if (hasRejected && !hasApproved) {
    return 'rejected';
  }
  return 'pending';
};