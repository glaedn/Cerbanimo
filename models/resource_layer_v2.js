const pool = require('../backend/db.js');

const createResourceLayerTables = async () => {
  const resourceAllocationsTableQuery = `
    CREATE TABLE IF NOT EXISTS resource_allocations (
      id SERIAL PRIMARY KEY,
      resource_id INTEGER REFERENCES resources(id) ON DELETE CASCADE,
      task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      start_time TIMESTAMP WITH TIME ZONE,
      end_time TIMESTAMP WITH TIME ZONE,
      status VARCHAR(50) DEFAULT 'reserved', -- 'reserved', 'allocated', 'completed', 'cancelled'
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const resourceConflictsTableQuery = `
    CREATE TABLE IF NOT EXISTS resource_conflicts (
      id SERIAL PRIMARY KEY,
      resource_id INTEGER REFERENCES resources(id) ON DELETE CASCADE,
      allocation_id_1 INTEGER REFERENCES resource_allocations(id) ON DELETE CASCADE,
      allocation_id_2 INTEGER REFERENCES resource_allocations(id) ON DELETE CASCADE,
      conflict_type VARCHAR(100), -- 'double_booking', 'pledge_withdrawn'
      status VARCHAR(50) DEFAULT 'open', -- 'open', 'resolved'
      resolution TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  try {
    await pool.query(resourceAllocationsTableQuery);
    await pool.query(resourceConflictsTableQuery);
    console.log('PostgreSQL: Resource layer tables (allocations, conflicts) created.');
  } catch (err) {
    console.error('PostgreSQL: Error creating resource layer tables:', err);
  }
};

module.exports = { createResourceLayerTables };
