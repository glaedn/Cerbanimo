import * as PgBossNamespace from 'pg-boss';
import 'dotenv/config';

// Handle both ES module and CJS styles
let Boss;
if (PgBossNamespace.PgBoss) {
  Boss = PgBossNamespace.PgBoss;
} else if (PgBossNamespace.default && PgBossNamespace.default.PgBoss) {
  Boss = PgBossNamespace.default.PgBoss;
} else if (PgBossNamespace.default) {
  Boss = PgBossNamespace.default;
} else {
  Boss = PgBossNamespace;
}

const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL || 'postgresql://localhost:5432/postgres';

if (!process.env.POSTGRES_URL && !process.env.DATABASE_URL) {
  console.warn('Neither POSTGRES_URL nor DATABASE_URL found, using default for PgBoss');
}

const boss = new Boss(connectionString);

boss.on('error', error => console.error('PgBoss Error:', error));

export default boss;
