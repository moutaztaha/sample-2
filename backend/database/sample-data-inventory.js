import { runQuery, runStatement } from './connection.js';

export const addSampleInventoryData = async () => {
  try {
    console.log('Adding sample inventory data...');

    // Check if we already have inventory items
    const existingItems = await runQuery('SELECT COUNT(*) as count FROM inventory_items');
    if (existingItems[0].count > 0) {
      console.log('Sample data already exists, skipping...');
      return;
    }

    // Get IDs for foreign key references
    const categories = await runQuery('SELECT id, name FROM categories');
    const subcategories = await runQuery('SELECT id, name, category_id FROM subcategories');
    const units = await runQuery('SELECT id, name FROM units');
    const locations = await runQuery('SELECT id, name FROM locations');
    const suppliers = await runQuery('SELECT id, name FROM suppliers');

    // Add some sample suppliers first if none exist
    if (suppliers.length === 0) {
      const sampleSuppliers = [
        { name: 'TechCorp Solutions', contact_person: 'John Smith', email: 'john@techcorp.com', phone: '+1-555-0101', address: '123 Tech Street, Silicon Valley, CA 94000' },
        { name: 'Office Supplies Plus', contact_person: 'Sarah Johnson', email: 'sarah@officesupplies.com', phone: '+1-555-0102', address: '456 Business Ave, New York, NY 10001' },
        { name: 'Industrial Equipment Co', contact_person: 'Mike Wilson', email: 'mike@industrial.com', phone: '+1-555-0103', address: '789 Factory Road, Detroit, MI 48201' },
        { name: 'Global Materials Ltd', contact_person: 'Lisa Chen', email: 'lisa@globalmaterials.com', phone: '+1-555-0104', address: '321 Import Blvd, Los Angeles, CA 90210' },
        { name: 'Safety First Inc', contact_person: 'David Brown', email: 'david@safetyfirst.com', phone: '+1-555-0105', address: '654 Protection Way, Chicago, IL 60601' },
        { name: 'Cabinet Makers Supply', contact_person: 'Robert Johnson', email: 'robert@cabinetmakers.com', phone: '+1-555-0106', address: '789 Woodworking Lane, Portland, OR 97201' }
      ];

      for (const supplier of sampleSuppliers) {
        await runStatement(
          'INSERT INTO suppliers (name, contact_person, email, phone, address) VALUES (?, ?, ?, ?, ?)',
          [supplier.name, supplier.contact_person, supplier.email, supplier.phone, supplier.address]
        );
      }

      // Refresh suppliers list
      const newSuppliers = await runQuery('SELECT id, name FROM suppliers');
      suppliers.push(...newSuppliers);
    }

    // Helper function to get random item from array
    const getRandomItem = (array) => array[Math.floor(Math.random() * array.length)];

    // Sample inventory items
    const sampleItems = [
      // Raw Materials
      {
        name: 'Cabinet Grade Plywood 3/4"',
        sku: 'CAB-PLY-001',
        description: '4x8 sheet of 3/4" cabinet grade plywood, birch',
        category: 'Raw Materials',
        subcategory: 'Wood',
        unit: 'Sheets',
        quantity: 50,
        min_quantity: 10,
        max_quantity: 100,
        unit_price: 65.99,
        item_type: 'raw_material'
      },
      {
        name: 'Cabinet Hinges Soft-Close',
        sku: 'CAB-HINGE-001',
        description: 'Soft-close concealed cabinet hinges, 110° opening',
        category: 'Raw Materials',
        subcategory: 'Hardware',
        unit: 'Pairs',
        quantity: 200,
        min_quantity: 50,
        max_quantity: 500,
        unit_price: 4.99,
        item_type: 'raw_material'
      },
      {
        name: 'Cabinet Door Pulls',
        sku: 'CAB-PULL-001',
        description: 'Brushed nickel cabinet door pulls, 5" center to center',
        category: 'Raw Materials',
        subcategory: 'Hardware',
        unit: 'Pieces',
        quantity: 150,
        min_quantity: 30,
        max_quantity: 300,
        unit_price: 3.49,
        item_type: 'raw_material'
      },
      {
        name: 'Drawer Slides Full Extension',
        sku: 'CAB-SLIDE-001',
        description: 'Full extension drawer slides, 18", soft-close',
        category: 'Raw Materials',
        subcategory: 'Hardware',
        unit: 'Pairs',
        quantity: 120,
        min_quantity: 30,
        max_quantity: 250,
        unit_price: 12.99,
        item_type: 'raw_material'
      },
      {
        name: 'Cabinet Screws',
        sku: 'CAB-SCREW-001',
        description: 'Cabinet assembly screws, #8 x 1-1/4", 100 pack',
        category: 'Raw Materials',
        subcategory: 'Fasteners',
        unit: 'Boxes',
        quantity: 40,
        min_quantity: 10,
        max_quantity: 80,
        unit_price: 8.99,
        item_type: 'raw_material'
      },
      {
        name: 'Edge Banding',
        sku: 'CAB-EDGE-001',
        description: 'Pre-glued wood veneer edge banding, 50ft roll, birch',
        category: 'Raw Materials',
        subcategory: 'Finishing',
        unit: 'Rolls',
        quantity: 25,
        min_quantity: 5,
        max_quantity: 50,
        unit_price: 19.99,
        item_type: 'raw_material'
      },
      {
        name: 'Cabinet Back Panel',
        sku: 'CAB-BACK-001',
        description: '1/4" plywood for cabinet backs, 4x8 sheet',
        category: 'Raw Materials',
        subcategory: 'Wood',
        unit: 'Sheets',
        quantity: 30,
        min_quantity: 8,
        max_quantity: 60,
        unit_price: 32.99,
        item_type: 'raw_material'
      },
      {
        name: 'Cabinet Shelf Pins',
        sku: 'CAB-PIN-001',
        description: 'Metal shelf support pins, 100 pack',
        category: 'Raw Materials',
        subcategory: 'Hardware',
        unit: 'Boxes',
        quantity: 15,
        min_quantity: 3,
        max_quantity: 30,
        unit_price: 9.99,
        item_type: 'raw_material'
      },
      {
        name: 'Solid Wood - Maple',
        sku: 'WOOD-MAPLE-001',
        description: 'Solid maple lumber, 4/4 thickness, 8ft lengths',
        category: 'Raw Materials',
        subcategory: 'Wood',
        unit: 'Pieces',
        quantity: 75,
        min_quantity: 15,
        max_quantity: 150,
        unit_price: 45.99,
        item_type: 'raw_material'
      },
      {
        name: 'Wood Glue',
        sku: 'GLUE-WOOD-001',
        description: 'Professional grade wood glue, 1 gallon',
        category: 'Raw Materials',
        subcategory: 'Finishing',
        unit: 'Bottles',
        quantity: 20,
        min_quantity: 5,
        max_quantity: 40,
        unit_price: 18.99,
        item_type: 'raw_material'
      },
      
      // Semi-Finished Products
      {
        name: 'Cabinet Door - Shaker Style',
        sku: 'SEMI-DOOR-001',
        description: 'Unfinished shaker style cabinet door, 24"x30"',
        category: 'Raw Materials',
        subcategory: 'Wood',
        unit: 'Pieces',
        quantity: 25,
        min_quantity: 5,
        max_quantity: 50,
        unit_price: 45.99,
        item_type: 'semi_finished_product'
      },
      {
        name: 'Drawer Box Assembly',
        sku: 'SEMI-DRAWER-001',
        description: 'Pre-assembled drawer box, 18"x6"',
        category: 'Raw Materials',
        subcategory: 'Wood',
        unit: 'Pieces',
        quantity: 30,
        min_quantity: 10,
        max_quantity: 60,
        unit_price: 35.99,
        item_type: 'semi_finished_product'
      },
      {
        name: 'Cabinet Face Frame',
        sku: 'SEMI-FRAME-001',
        description: 'Pre-assembled face frame for 24" base cabinet',
        category: 'Raw Materials',
        subcategory: 'Wood',
        unit: 'Pieces',
        quantity: 20,
        min_quantity: 5,
        max_quantity: 40,
        unit_price: 28.99,
        item_type: 'semi_finished_product'
      },
      {
        name: 'Cabinet Side Panel',
        sku: 'SEMI-SIDE-001',
        description: 'Finished side panel for 30" tall cabinet',
        category: 'Raw Materials',
        subcategory: 'Wood',
        unit: 'Pieces',
        quantity: 40,
        min_quantity: 10,
        max_quantity: 80,
        unit_price: 32.99,
        item_type: 'semi_finished_product'
      },
      {
        name: 'Cabinet Shelf',
        sku: 'SEMI-SHELF-001',
        description: 'Adjustable cabinet shelf, 24"x16"',
        category: 'Raw Materials',
        subcategory: 'Wood',
        unit: 'Pieces',
        quantity: 60,
        min_quantity: 15,
        max_quantity: 120,
        unit_price: 18.99,
        item_type: 'semi_finished_product'
      },
      
      // Finished Products
      {
        name: 'Base Cabinet 24"',
        sku: 'CAB-BASE-24',
        description: 'Finished 24" base cabinet with door and drawer',
        category: 'Furniture',
        subcategory: 'Cabinets',
        unit: 'Pieces',
        quantity: 10,
        min_quantity: 2,
        max_quantity: 20,
        unit_price: 299.99,
        item_type: 'finished_product'
      },
      {
        name: 'Wall Cabinet 30"',
        sku: 'CAB-WALL-30',
        description: 'Finished 30" wall cabinet with adjustable shelves',
        category: 'Furniture',
        subcategory: 'Cabinets',
        unit: 'Pieces',
        quantity: 8,
        min_quantity: 2,
        max_quantity: 16,
        unit_price: 249.99,
        item_type: 'finished_product'
      },
      {
        name: 'Pantry Cabinet 84"',
        sku: 'CAB-PANTRY-84',
        description: 'Finished 84" tall pantry cabinet with adjustable shelves',
        category: 'Furniture',
        subcategory: 'Cabinets',
        unit: 'Pieces',
        quantity: 5,
        min_quantity: 1,
        max_quantity: 10,
        unit_price: 599.99,
        item_type: 'finished_product'
      },
      {
        name: 'Vanity Cabinet 36"',
        sku: 'CAB-VANITY-36',
        description: 'Finished 36" bathroom vanity cabinet',
        category: 'Furniture',
        subcategory: 'Cabinets',
        unit: 'Pieces',
        quantity: 6,
        min_quantity: 2,
        max_quantity: 12,
        unit_price: 349.99,
        item_type: 'finished_product'
      },
      {
        name: 'Kitchen Island 48"',
        sku: 'CAB-ISLAND-48',
        description: 'Finished 48" kitchen island with storage',
        category: 'Furniture',
        subcategory: 'Cabinets',
        unit: 'Pieces',
        quantity: 3,
        min_quantity: 1,
        max_quantity: 6,
        unit_price: 899.99,
        item_type: 'finished_product'
      }
    ];

    // Insert sample items
    for (const item of sampleItems) {
      try {
        // Find matching category
        const category = categories.find(c => c.name === item.category);
        const subcategory = subcategories.find(s => s.name === item.subcategory && s.category_id === category?.id);
        const unit = units.find(u => u.name === item.unit);
        const location = getRandomItem(locations);
        const supplier = getRandomItem(suppliers);

        await runStatement(`
          INSERT INTO inventory_items (
            name, sku, description, category_id, subcategory_id,
            unit_id, location_id, supplier_id, quantity,
            min_quantity, max_quantity, unit_price, item_type
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          item.name,
          item.sku,
          item.description,
          category?.id || null,
          subcategory?.id || null,
          unit?.id || null,
          location?.id || null,
          supplier?.id || null,
          item.quantity,
          item.min_quantity,
          item.max_quantity,
          item.unit_price,
          item.item_type
        ]);

        console.log(`✅ Added: ${item.name}`);
      } catch (error) {
        console.error(`❌ Failed to add ${item.name}:`, error.message);
      }
    }

    console.log('✅ Sample inventory data added successfully!');
  } catch (error) {
    console.error('❌ Error adding sample data:', error);
  }
};