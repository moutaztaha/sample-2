import { runQuery, runStatement } from './connection.js';

export const addSampleRequisitionsData = async () => {
  try {
    console.log('Adding sample requisition data...');

    // Check if we already have requisitions
    const existingRequisitions = await runQuery('SELECT COUNT(*) as count FROM requisitions');
    if (existingRequisitions[0].count > 0) {
      console.log('Sample requisition data already exists, skipping...');
      return;
    }

    // Get user IDs
    const users = await runQuery('SELECT id, username, role FROM users');
    const adminUser = users.find(u => u.role === 'admin');
    const regularUsers = users.filter(u => u.role === 'user');
    
    if (users.length === 0) {
      console.log('No users found, skipping requisition data...');
      return;
    }

    // Get department data
    const departments = await runQuery('SELECT id, name FROM departments');
    
    // Get inventory items
    const inventoryItems = await runQuery(`
      SELECT id, name, unit_price, unit_id FROM inventory_items 
      WHERE item_type = 'raw_material'
      LIMIT 50
    `);
    
    if (inventoryItems.length === 0) {
      console.log('No inventory items found, skipping requisition data...');
      return;
    }

    // Sample requisitions
    const sampleRequisitions = [
      {
        title: 'Monthly Office Supplies',
        description: 'Regular monthly office supply requisition',
        priority: 'medium',
        required_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days from now
        department: departments[0]?.name || 'Information Technology',
        requester_id: regularUsers[0]?.id || adminUser.id,
        status: 'pending'
      },
      {
        title: 'Project Alpha Materials',
        description: 'Materials needed for Project Alpha cabinet production',
        priority: 'high',
        required_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 3 days from now
        department: departments[1]?.name || 'Operations',
        requester_id: regularUsers[1]?.id || adminUser.id,
        status: 'pending'
      },
      {
        title: 'Emergency Hardware Restock',
        description: 'Urgent restock of critical hardware components',
        priority: 'urgent',
        required_date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 day from now
        department: departments[2]?.name || 'Maintenance',
        requester_id: regularUsers[0]?.id || adminUser.id,
        status: 'pending'
      },
      {
        title: 'Quarterly Inventory Replenishment',
        description: 'Regular quarterly inventory replenishment',
        priority: 'low',
        required_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 14 days from now
        department: departments[3]?.name || 'Procurement',
        requester_id: regularUsers[1]?.id || adminUser.id,
        status: 'pending'
      },
      {
        title: 'New Project Setup',
        description: 'Materials for new kitchen cabinet project',
        priority: 'medium',
        required_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 5 days from now
        department: departments[0]?.name || 'Operations',
        requester_id: regularUsers[0]?.id || adminUser.id,
        status: 'approved'
      }
    ];

    // Insert requisitions and their items
    for (const req of sampleRequisitions) {
      const result = await runStatement(`
        INSERT INTO requisitions (
          title, description, priority, required_date, department,
          requester_id, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        req.title,
        req.description,
        req.priority,
        req.required_date,
        req.department,
        req.requester_id,
        req.status
      ]);
      
      const requisitionId = result.id;
      console.log(`✅ Added requisition: ${req.title}`);
      
      // Add 3-7 random items to each requisition
      const numItems = Math.floor(Math.random() * 5) + 3; // 3-7 items
      const selectedItems = [];
      
      // Ensure we don't add the same item twice
      while (selectedItems.length < numItems && selectedItems.length < inventoryItems.length) {
        const randomItem = inventoryItems[Math.floor(Math.random() * inventoryItems.length)];
        if (!selectedItems.includes(randomItem)) {
          selectedItems.push(randomItem);
        }
      }
      
      for (const item of selectedItems) {
        const quantity = Math.floor(Math.random() * 10) + 1; // 1-10 quantity
        const estimatedCost = item.unit_price || 0;
        
        await runStatement(`
          INSERT INTO requisition_items (
            requisition_id, item_id, quantity, estimated_cost, notes
          ) VALUES (?, ?, ?, ?, ?)
        `, [
          requisitionId,
          item.id,
          quantity,
          estimatedCost,
          `Needed for ${req.title}`
        ]);
      }
      
      // If this is an approved requisition, update the status and add approval details
      if (req.status === 'approved') {
        await runStatement(`
          UPDATE requisitions SET
            status = 'approved',
            approver_id = ?,
            approval_date = CURRENT_TIMESTAMP,
            approval_notes = 'Approved for project needs'
          WHERE id = ?
        `, [adminUser.id, requisitionId]);
        
        // Update all items to approved
        await runStatement(`
          UPDATE requisition_items SET
            status = 'approved',
            approved_quantity = quantity,
            rejected_quantity = 0
          WHERE requisition_id = ?
        `, [requisitionId]);
      }
    }

    console.log('✅ Sample requisition data added successfully!');
  } catch (error) {
    console.error('❌ Error adding sample requisition data:', error);
  }
};