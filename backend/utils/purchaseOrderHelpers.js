import { runQuery, runStatement } from '../database/connection.js';

// Generate PO Number
export const generatePONumber = async () => {
  const year = new Date().getFullYear();
  const lastPO = await runQuery(
    'SELECT po_number FROM purchase_orders WHERE po_number LIKE ? ORDER BY id DESC LIMIT 1',
    [`PO-${year}-%`]
  );
  
  let nextNumber = 1;
  if (lastPO.length > 0) {
    const lastNumber = parseInt(lastPO[0].po_number.split('-')[2]);
    nextNumber = lastNumber + 1;
  }
  
  return `PO-${year}-${nextNumber.toString().padStart(4, '0')}`;
};

// Calculate PO totals
export const calculatePOTotals = (items) => {
  let subtotal = 0;
  items.forEach(item => {
    subtotal += (item.quantity * item.unit_price);
  });

  const tax_amount = subtotal * 0.1; // 10% tax
  const shipping_cost = 0; // Can be customized
  const total_amount = subtotal + tax_amount + shipping_cost;

  return { subtotal, tax_amount, shipping_cost, total_amount };
};