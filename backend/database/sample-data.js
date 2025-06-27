import { runQuery, runStatement } from './connection.js';
import { addSampleInventoryData } from './sample-data-inventory.js';
import { addSampleBOMData } from './sample-data-bom.js';
import { addSampleRequisitionsData } from './sample-data-requisitions.js';
import { addSamplePurchaseOrdersData } from './sample-data-purchase-orders.js';
import { addSampleProductionOrdersData } from './sample-data-production.js';

// Function to add all sample data
export const addAllSampleData = async () => {
  await addSampleInventoryData();
  await addSampleBOMData();
  await addSampleRequisitionsData();
  await addSamplePurchaseOrdersData();
  await addSampleProductionOrdersData();
  console.log('✅ All sample data added successfully!');
};