import 'dotenv/config';
import pool from './db.js';
import { createSpatialLayerTables } from '../models/spatial_layer.js';
import { alterExistingTables } from '../models/alter_tables_v2.js';

async function verify() {
  try {
    console.log('Connecting to database...');
    // We try to initialize tables, which also enables postgis
    await createSpatialLayerTables();
    await alterExistingTables();

    console.log('Verifying PostGIS extension...');
    const extRes = await pool.query("SELECT extname FROM pg_extension WHERE extname = 'postgis'");
    if (extRes.rows.length > 0) {
      console.log('✅ PostGIS extension is enabled.');
    } else {
      console.error('❌ PostGIS extension NOT found.');
    }

    console.log('Verifying spatial tables...');
    const tables = ['locations', 'spatial_events', 'dispatch_routes', 'regional_metrics'];
    for (const table of tables) {
      const tableRes = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_name = $1", [table]);
      if (tableRes.rows.length > 0) {
        console.log(`✅ Table '${table}' exists.`);
      } else {
        console.error(`❌ Table '${table}' NOT found.`);
      }
    }

    console.log('Verifying altered tables for spatial columns...');
    const spatialColumns = [
      { table: 'users', column: 'location_point' },
      { table: 'communities', column: 'location_point' },
      { table: 'needs', column: 'location_point' },
      { table: 'resources', column: 'location_point' }
    ];

    for (const col of spatialColumns) {
      const colRes = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = $1 AND column_name = $2", [col.table, col.column]);
      if (colRes.rows.length > 0) {
        console.log(`✅ Column '${col.column}' exists in table '${col.table}'.`);
      } else {
        console.error(`❌ Column '${col.column}' NOT found in table '${col.table}'.`);
      }
    }

  } catch (err) {
    console.error('Verification failed:', err.message);
  } finally {
    await pool.end();
  }
}

verify();
