import fs from 'fs';
import csv from 'csv-parser';
import createCsvWriter from 'csv-writer';
import { runStatement, runQuery } from '../database/connection.js';
import { logAuditTrail } from './audit.js';

export const exportToCSV = async (data, columns, columnWidths) => {
  // Define headers based on selected columns or use defaults
  const headers = columns ? columns.map(col => {
    const width = columnWidths && columnWidths[col] ? columnWidths[col] : null;
    return { 
      id: col, 
      title: getColumnTitle(col),
      width: width // Include width if provided
    };
  }) : [
    { id: 'name', title: 'Name' },
    { id: 'sku', title: 'SKU' },
    { id: 'description', title: 'Description' },
    { id: 'category_name', title: 'Category' },
    { id: 'subcategory_name', title: 'Subcategory' },
    { id: 'unit_name', title: 'Unit' },
    { id: 'location_name', title: 'Location' },
    { id: 'supplier_name', title: 'Supplier' },
    { id: 'quantity', title: 'Quantity' },
    { id: 'min_quantity', title: 'Min Quantity' },
    { id: 'max_quantity', title: 'Max Quantity' },
    { id: 'unit_price', title: 'Unit Price' },
    { id: 'total_value', title: 'Total Value' }
  ];

  const csvWriter = createCsvWriter.createObjectCsvStringifier({
    header: headers
  });

  return csvWriter.getHeaderString() + csvWriter.stringifyRecords(data);
};

// Helper function to get column title
function getColumnTitle(columnId) {
  const titles = {
    name: 'Name',
    sku: 'SKU',
    description: 'Description',
    category_name: 'Category',
    subcategory_name: 'Subcategory',
    unit_name: 'Unit',
    location_name: 'Location',
    supplier_name: 'Supplier',
    quantity: 'Quantity',
    min_quantity: 'Min Quantity',
    max_quantity: 'Max Quantity',
    unit_price: 'Unit Price',
    total_value: 'Total Value'
  };
  return titles[columnId] || columnId;
}

export const importFromCSV = async (filePath, userId) => {
  return new Promise((resolve, reject) => {
    const results = [];
    const errors = [];
    let processed = 0;
    let imported = 0;

    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', async () => {
        try {
          // Get lookup data for foreign keys
          const [categories, subcategories, units, locations, suppliers] = await Promise.all([
            runQuery('SELECT id, name FROM categories'),
            runQuery('SELECT id, name FROM subcategories'),
            runQuery('SELECT id, name FROM units'),
            runQuery('SELECT id, name FROM locations'),
            runQuery('SELECT id, name FROM suppliers')
          ]);

          const categoryMap = new Map(categories.map(c => [c.name.toLowerCase(), c.id]));
          const subcategoryMap = new Map(subcategories.map(s => [s.name.toLowerCase(), s.id]));
          const unitMap = new Map(units.map(u => [u.name.toLowerCase(), u.id]));
          const locationMap = new Map(locations.map(l => [l.name.toLowerCase(), l.id]));
          const supplierMap = new Map(suppliers.map(s => [s.name.toLowerCase(), s.id]));

          for (const row of results) {
            processed++;
            
            try {
              if (!row.name || !row.sku) {
                errors.push(`Row ${processed}: Name and SKU are required`);
                continue;
              }

              // Map foreign key values
              const categoryId = row.category ? categoryMap.get(row.category.toLowerCase()) : null;
              const subcategoryId = row.subcategory ? subcategoryMap.get(row.subcategory.toLowerCase()) : null;
              const unitId = row.unit ? unitMap.get(row.unit.toLowerCase()) : null;
              const locationId = row.location ? locationMap.get(row.location.toLowerCase()) : null;
              const supplierId = row.supplier ? supplierMap.get(row.supplier.toLowerCase()) : null;

              const result = await runStatement(`
                INSERT OR REPLACE INTO inventory_items (
                  name, sku, description, category_id, subcategory_id,
                  unit_id, location_id, supplier_id, quantity,
                  min_quantity, max_quantity, unit_price
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              `, [
                row.name,
                row.sku,
                row.description || '',
                categoryId,
                subcategoryId,
                unitId,
                locationId,
                supplierId,
                parseInt(row.quantity) || 0,
                parseInt(row.min_quantity) || 0,
                parseInt(row.max_quantity) || 1000,
                parseFloat(row.unit_price) || 0
              ]);

              await logAuditTrail('inventory_items', result.id, 'INSERT', null, row, userId);
              imported++;

            } catch (error) {
              errors.push(`Row ${processed}: ${error.message}`);
            }
          }

          // Clean up uploaded file
          fs.unlinkSync(filePath);

          resolve({
            processed,
            imported,
            errors,
            message: `Processed ${processed} rows, imported ${imported} items`
          });

        } catch (error) {
          reject(error);
        }
      })
      .on('error', reject);
  });
};