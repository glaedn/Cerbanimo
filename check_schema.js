import pool from './backend/db.js';
const res = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'projects'");
console.log(res.rows.map(r => r.column_name));
process.exit(0);
