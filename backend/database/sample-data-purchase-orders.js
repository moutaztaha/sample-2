import { runQuery, runStatement } from './connection.js';

export const addSamplePurchaseOrdersData = async () => {
  try {
    console.log('Adding sample purchase order data...');

    // Check if we already have purchase orders
    const existingPOs = await runQuery('SELECT COUNT(*) as count FROM purchase_orders');
    if (existingPOs[0].count > 0) {
      console.log('Sample purchase order data already exists, skipping...');
      return;
    }

    // Get user IDs
    const users = await runQuery('SELECT id, username, role FROM users');
    const adminUser = users.find(u => u.role === 'admin');
    
    if (!adminUser) {
      console.log('No admin user found, skipping purchase order data...');
      return;
    }

    // Get supplier data
    const suppliers = await runQuery('SELECT id, name FROM suppliers');
    
    if (suppliers.length === 0) {
      console.log('No suppliers found, skipping purchase order data...');
      return;
    }

    // Get inventory items
    const inventoryItems = await runQuery(`
      SELECT id, name, sku, unit_price, unit_id FROM inventory_items 
      WHERE item_type = 'raw_material'
      LIMIT 50
    `);
    
    if (inventoryItems.length === 0) {
      console.log('No inventory items found, skipping purchase order data...');
      return;
    }

    // Get approved requisition
    const approvedRequisitions = await runQuery(`
      SELECT id, title FROM requisitions 
      WHERE status = 'approved'
      LIMIT 1
    `);

    // Sample purchase orders
    const samplePOs = [
      {
        title: 'Monthly Hardware Order',
        description: 'Regular monthly order of cabinet hardware',
        supplier_id: suppliers.find(s => s.name === 'Cabinet Makers Supply')?.id || suppliers[0].id,
        requisition_id: approvedRequisitions[0]?.id || null,
        status: 'draft',
        priority: 'medium',
        order_date: new Date().toISOString().split('T')[0],
        expected_delivery_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 14 days from now
        payment_terms: 'Net 30',
        shipping_address: '123 Manufacturing Way, Portland, OR 97201',
        created_by: adminUser.id
      },
      {
        title: 'Plywood Bulk Purchase',
        description: 'Bulk purchase of cabinet grade plywood',
        supplier_id: suppliers.find(s => s.name === 'Global Materials Ltd')?.id || suppliers[1].id,
        status: 'pending_approval',
        priority: 'high',
        order_date: new Date().toISOString().split('T')[0],
        expected_delivery_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 10 days from now
        payment_terms: 'Net 15',
        shipping_address: '123 Manufacturing Way, Portland, OR 97201',
        created_by: adminUser.id
      },
      {
        title: 'Specialty Hardware Order',
        description: 'Order of specialty hardware for custom project',
        supplier_id: suppliers.find(s => s.name === 'Industrial Equipment Co')?.id || suppliers[2].id,
        status: 'approved',
        priority: 'medium',
        order_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 5 days ago
        expected_delivery_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days from now
        payment_terms: 'Net 30',
        shipping_address: '123 Manufacturing Way, Portland, OR 97201',
        created_by: adminUser.id,
        approved_by: adminUser.id,
        approval_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
        approval_notes: 'Approved for production needs'
      },
      {
        title: 'Urgent Supplies Order',
        description: 'Urgent order of critical supplies',
        supplier_id: suppliers.find(s => s.name === 'Safety First Inc')?.id || suppliers[3].id,
        status: 'sent',
        priority: 'urgent',
        order_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days ago
        expected_delivery_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 3 days from now
        payment_terms: 'Net 15',
        shipping_address: '123 Manufacturing Way, Portland, OR 97201',
        created_by: adminUser.id,
        approved_by: adminUser.id,
        approval_date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(), // 6 days ago
        sent_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString() // 5 days ago
      },
      {
        title: 'Quarterly Supplies Order',
        description: 'Regular quarterly order of supplies',
        supplier_id: suppliers.find(s => s.name === 'Office Supplies Plus')?.id || suppliers[4].id,
        status: 'partially_received',
        priority: 'low',
        order_date: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 20 days ago
        expected_delivery_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 5 days ago
        payment_terms: 'Net 30',
        shipping_address: '123 Manufacturing Way, Portland, OR 97201',
        created_by: adminUser.id,
        approved_by: adminUser.id,
        approval_date: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000).toISOString(), // 18 days ago
        sent_date: new Date(Date.now() - 17 * 24 * 60 * 60 * 1000).toISOString() // 17 days ago
      }
    ];

    // Generate PO numbers
    let poCounter = 1;
    const year = new Date().getFullYear();

    // Insert purchase orders and their items
    for (const po of samplePOs) {
      // Generate PO number
      const poNumber = `PO-${year}-${poCounter.toString().padStart(4, '0')}`;
      poCounter++;
      
      // Calculate totals based on items that will be added
      const numItems = Math.floor(Math.random() * 5) + 3; // 3-7 items
      const selectedItems = [];
      
      // Ensure we don't add the same item twice
      while (selectedItems.length < numItems && selectedItems.length < inventoryItems.length) {
        const randomItem = inventoryItems[Math.floor(Math.random() * inventoryItems.length)];
        if (!selectedItems.includes(randomItem)) {
          selectedItems.push(randomItem);
        }
      }
      
      // Calculate subtotal
      let subtotal = 0;
      for (const item of selectedItems) {
        const quantity = Math.floor(Math.random() * 10) + 1; // 1-10 quantity
        const unitPrice = item.unit_price || 0;
        subtotal += quantity * unitPrice;
      }
      
      const taxAmount = subtotal * 0.1; // 10% tax
      const shippingCost = Math.floor(Math.random() * 50) + 10; // $10-$60 shipping
      const totalAmount = subtotal + taxAmount + shippingCost;

      // Insert purchase order
      const result = await runStatement(`
        INSERT INTO purchase_orders (
          po_number, title, description, supplier_id, requisition_id,
          status, priority, order_date, expected_delivery_date,
          subtotal, tax_amount, shipping_cost, total_amount,
          payment_terms, shipping_address, created_by,
          approved_by, approval_date, approval_notes, sent_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        poNumber,
        po.title,
        po.description,
        po.supplier_id,
        po.requisition_id || null,
        po.status,
        po.priority,
        po.order_date,
        po.expected_delivery_date,
        subtotal,
        taxAmount,
        shippingCost,
        totalAmount,
        po.payment_terms,
        po.shipping_address,
        po.created_by,
        po.approved_by || null,
        po.approval_date || null,
        po.approval_notes || null,
        po.sent_date || null
      ]);
      
      const poId = result.id;
      console.log(`✅ Added purchase order: ${po.title} (${poNumber})`);
      
      // Add items to the purchase order
      for (const item of selectedItems) {
        const quantity = Math.floor(Math.random() * 10) + 1; // 1-10 quantity
        const unitPrice = item.unit_price || 0;
        const totalPrice = quantity * unitPrice;
        
        // For partially received POs, set some received quantity
        let receivedQuantity = 0;
        if (po.status === 'partially_received') {
          receivedQuantity = Math.floor(quantity / 2); // Receive about half
        } else if (po.status === 'received') {
          receivedQuantity = quantity; // Receive all
        }
        
        await runStatement(`
          INSERT INTO purchase_order_items (
            po_id, item_id, item_name, item_description, sku,
            quantity, unit_price, total_price, received_quantity, unit_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          poId,
          item.id,
          item.name,
          `${item.name} for ${po.title}`,
          item.sku,
          quantity,
          unitPrice,
          totalPrice,
          receivedQuantity,
          item.unit_id
        ]);
      }
      
      // For partially received POs, add receiving records
      if (po.status === 'partially_received' || po.status === 'received') {
        const poItems = await runQuery('SELECT id, quantity FROM purchase_order_items WHERE po_id = ?', [poId]);
        
        for (const item of poItems) {
          const receivedQuantity = po.status === 'partially_received' ? 
            Math.floor(item.quantity / 2) : item.quantity;
          
          if (receivedQuantity > 0) {
            await runStatement(`
              INSERT INTO po_receiving (
                po_id, po_item_id, received_quantity, received_by,
                notes, batch_number, quality_check_passed
              ) VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [
              poId,
              item.id,
              receivedQuantity,
              adminUser.id,
              'Received in good condition',
              `BATCH-${poId}-${item.id}`,
              1 // Quality check passed
            ]);
          }
        }
      }
    }

    console.log('✅ Sample purchase order data added successfully!');
  } catch (error) {
    console.error('❌ Error adding sample purchase order data:', error);
  }
};