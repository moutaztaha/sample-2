import { runStatement, runQuery } from '../connection.js';

export const addImageUrlToInventory = async () => {
  try {
    // Check if column already exists
    const checkColumnSql = `SELECT COUNT(*) as count FROM pragma_table_info('inventory_items') WHERE name = 'image_url'`;
    const result = await runQuery(checkColumnSql);

    // Only add the column if it doesn't exist
    if (result[0].count === 0) {
      console.log('Adding image_url column to inventory_items table...');
      await runStatement('ALTER TABLE inventory_items ADD COLUMN image_url TEXT DEFAULT NULL');
      console.log('Successfully added image_url column to inventory_items table');
    } else {
      console.log('image_url column already exists in inventory_items table');
    }
  } catch (error) {
    // If the column already exists, SQLite will throw an error, which we can safely ignore
    if (error.message && error.message.includes('duplicate column name')) {
      console.log('image_url column already exists in inventory_items table (caught duplicate column error)');
    } else {
      console.error('Error adding image_url column:', error);
      throw error;
    }
  }
};