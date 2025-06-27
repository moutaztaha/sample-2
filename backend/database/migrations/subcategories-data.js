import { runStatement, runQuery } from '../connection.js';

export const createSubcategoriesData = async () => {
  // First, ensure the categories exist before inserting subcategories
  const categoriesSQL = `
    INSERT OR IGNORE INTO categories (name, description) VALUES 
    ('Electronics', 'Electronic devices and components'),
    ('Office Supplies', 'Office and administrative supplies'),
    ('Raw Materials', 'Raw materials for production');
  `;

  await runStatement(categoriesSQL);

  // Get category IDs after ensuring they exist
  const electronicsCategory = await runQuery(
    "SELECT id FROM categories WHERE name = 'Electronics' LIMIT 1"
  );
  const officeSuppliesCategory = await runQuery(
    "SELECT id FROM categories WHERE name = 'Office Supplies' LIMIT 1"
  );
  const rawMaterialsCategory = await runQuery(
    "SELECT id FROM categories WHERE name = 'Raw Materials' LIMIT 1"
  );

  if (!electronicsCategory.length || !officeSuppliesCategory.length || !rawMaterialsCategory.length) {
    throw new Error('Required categories not found after insertion');
  }

  const electronicsId = electronicsCategory[0].id;
  const officeSuppliesId = officeSuppliesCategory[0].id;
  const rawMaterialsId = rawMaterialsCategory[0].id;

  // Insert subcategories with explicit category IDs
  const subcategoriesData = [
    // Electronics subcategories
    ['Computers', electronicsId, 'Desktop computers, laptops, and accessories'],
    ['Mobile Devices', electronicsId, 'Smartphones, tablets, and mobile accessories'],
    ['Audio Equipment', electronicsId, 'Speakers, headphones, and audio systems'],
    ['Cables & Connectors', electronicsId, 'Various cables, adapters, and connectors'],
    ['Components', electronicsId, 'Electronic components and circuit boards'],
    ['Networking', electronicsId, 'Routers, switches, and network equipment'],
    
    // Office Supplies subcategories
    ['Stationery', officeSuppliesId, 'Pens, pencils, paper, and writing materials'],
    ['Filing & Storage', officeSuppliesId, 'Folders, binders, and storage solutions'],
    ['Printing Supplies', officeSuppliesId, 'Ink cartridges, toner, and paper'],
    ['Desk Accessories', officeSuppliesId, 'Organizers, staplers, and desk items'],
    ['Presentation Materials', officeSuppliesId, 'Whiteboards, markers, and presentation tools'],
    
    // Raw Materials subcategories
    ['Wood', rawMaterialsId, 'Lumber, plywood, and wood products'],
    ['Hardware', rawMaterialsId, 'Hinges, pulls, knobs, and other cabinet hardware'],
    ['Fasteners', rawMaterialsId, 'Screws, nails, and other fastening hardware'],
    ['Finishing', rawMaterialsId, 'Stains, paints, varnishes, and edge banding']
  ];

  const insertSubcategorySQL = `
    INSERT OR IGNORE INTO subcategories (name, category_id, description) 
    VALUES (?, ?, ?)
  `;

  for (const [name, categoryId, description] of subcategoriesData) {
    await runStatement(insertSubcategorySQL, [name, categoryId, description]);
  }
};