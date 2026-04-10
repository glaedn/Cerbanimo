
/**
 * Fixes PostgreSQL sequences for primary tables to prevent "duplicate key" errors.
 * This should be called during system initialization.
 */
export async function fixSequences(pool) {
  const tables = ['skills', 'tasks', 'projects', 'users', 'guilds', 'outcomes'];
  console.log('Synchronizing database sequences...');

  for (const table of tables) {
    try {
      // Use setval to reset the sequence to the current max ID + 1
      // pg_get_serial_sequence handles cases where the sequence name might not be standard
      const query = `
        SELECT setval(
          pg_get_serial_sequence('${table}', 'id'),
          coalesce(max(id), 0) + 1,
          false
        ) FROM ${table}
      `;
      await pool.query(query);
      console.log(`Successfully synchronized sequence for table: ${table}`);
    } catch (err) {
      console.error(`Failed to synchronize sequence for table ${table}:`, err.message);
    }
  }
}
