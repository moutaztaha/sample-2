import { runStatement, runQuery } from '../connection.js';

export const addGrainDirectionToCabinetParts = async () => {
  /*
    # Add grain direction to cabinet parts

    1. Changes
      - Add \`grain_direction\` column to \`cabinet_parts\` table
      - This column tracks wood grain orientation for each part
      - Supports 'with_grain', 'against_grain', or 'no_grain' values
    
    2. Purpose
      - Enable tracking of grain direction for proper wood panel cutting
      - Support manufacturing requirements for grain matching
      - Improve cutting optimization by considering grain direction
  */

  try {
    // Check if column already exists
    const checkColumnSql = `SELECT COUNT(*) as count FROM pragma_table_info('cabinet_parts') WHERE name = 'grain_direction'`;
    const result = await runQuery(checkColumnSql);

    // Only add the column if it doesn't exist
    if (result[0].count === 0) {
      console.log('Adding grain_direction column to cabinet_parts table...');
      await runStatement(`
        ALTER TABLE cabinet_parts 
        ADD COLUMN grain_direction TEXT 
        DEFAULT 'no_grain' 
        CHECK (grain_direction IN ('with_grain', 'against_grain', 'no_grain'))
      `);
      console.log('Successfully added grain_direction column to cabinet_parts table');
    } else {
      console.log('grain_direction column already exists in cabinet_parts table');
    }
  } catch (error) {
    // If the column already exists, SQLite will throw an error, which we can safely ignore
    if (error.message && error.message.includes('duplicate column name')) {
      console.log('grain_direction column already exists in cabinet_parts table (caught duplicate column error)');
    } else {
      console.error('Error adding grain_direction column:', error);
      throw error;
    }
  }
};