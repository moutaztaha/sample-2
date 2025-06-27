import { runQuery } from '../database/connection.js';
import { exportToCSV, importFromCSV } from './csv-handler.js';
import { generatePDF } from './pdf-generator.js';
import multer from 'multer';

const upload = multer({ dest: 'uploads/' });

// Helper function to calculate total value based on price priority
export const calculateTotalValue = (quantity, unitPrice, lastPrice, averagePrice) => {
  const priceToUse = averagePrice || lastPrice || unitPrice || 0;
  return quantity * priceToUse;
};

// Handle inventory export (CSV or PDF)
export const handleInventoryExport = async (req, res, format, options = {}) => {
  // Get columns to include
  const columns = options.columns || [
    'name', 'sku', 'description', 'category_name', 'subcategory_name', 
    'unit_name', 'location_name', 'supplier_name', 'quantity', 'min_quantity', 
    'max_quantity', 'unit_price', 'total_value'
  ];
  
  // Get column widths if provided
  let columnWidths = {};
  if (req.query.columnWidths) {
    try {
      const widthsArray = JSON.parse(req.query.columnWidths);
      if (Array.isArray(widthsArray)) {
        widthsArray.forEach(col => {
          if (col.id && col.width) {
            columnWidths[col.id] = col.width;
          }
        });
      }
    } catch (error) {
      console.error('Error parsing column widths:', error);
    }
  }
  
  // Build SQL query with selected columns
  let selectColumns = `
    i.name, i.sku, i.description, i.quantity, i.min_quantity, 
    i.max_quantity, i.unit_price,
    c.name as category_name,
    sc.name as subcategory_name,
    u.name as unit_name,
    l.name as location_name,
    s.name as supplier_name,
    COALESCE(
      (SELECT ROUND(AVG(price), 2) FROM price_history WHERE item_id = i.id),
      (SELECT price FROM price_history WHERE item_id = i.id ORDER BY created_at DESC LIMIT 1),
      i.unit_price
    ) * i.quantity as total_value
  `;
  
  const items = await runQuery(`
    SELECT ${selectColumns}
    FROM inventory_items i
    LEFT JOIN categories c ON i.category_id = c.id
    LEFT JOIN subcategories sc ON i.subcategory_id = sc.id
    LEFT JOIN units u ON i.unit_id = u.id
    LEFT JOIN locations l ON i.location_id = l.id
    LEFT JOIN suppliers s ON i.supplier_id = s.id
    ORDER BY i.name
  `);

  if (format === 'csv') {
    const csvData = await exportToCSV(items || [], columns, columnWidths);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=inventory_export.csv');
    res.send(csvData);
  } else if (format === 'pdf') {
    const pdfOptions = {
      columns: columns,
      title: options.title || 'Inventory Report',
      columnWidths: columnWidths,
      orientation: options.orientation || 'portrait'
    };
    const pdfBuffer = await generatePDF(items || [], pdfOptions);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=inventory_report.pdf');
    res.send(pdfBuffer);
  }
};

// Handle inventory import from CSV
export const handleInventoryImport = async (req, res) => {
  // Use multer middleware for file upload
  upload.single('file')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: 'File upload error' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const result = await importFromCSV(req.file.path, req.user.id);
    
    // Emit real-time update
    if (req.app.get('io')) {
      req.app.get('io').to('inventory_updates').emit('bulk_import', result);
    }

    res.json(result);
  });
};