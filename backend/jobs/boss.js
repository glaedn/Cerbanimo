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

const boss = new Boss({
  connectionString: process.env.POSTGRES_URL,
});

boss.on('error', error => console.error('PgBoss Error:', error));

export default boss;
