import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import pool from './db.js';
import boss from './jobs/boss.js';
import apiV1Routes from './routes/api_v1/index.js';
import kamiyaChatRoutes from './routes/kamiya_chats.js';
import resolveUser from './middlewares/resolveUser.js';
import { apiAuthenticate } from './services/apiAuthService.js';
import { PROJECT_BOOTSTRAP_QUEUE, startProjectBootstrapWorker } from './jobs/workers/projectBootstrapWorker.js';
import { AUTOMATION_EXECUTION_QUEUE, startAutomationWorker } from './jobs/workers/automationWorker.js';
import { assertDeterministicProviderAllowed } from './services/ProjectBootstrapDeterministicProvider.js';

const app = express();
const port = Number(process.env.PORT || 4400);
const requestLog = [];

assertE2EServerAllowed();
if (process.env.CERBANIMO_PROJECT_BOOTSTRAP_PROVIDER === 'deterministic') {
  assertDeterministicProviderAllowed();
}

app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json({ limit: '1mb' }));

app.use((req, _res, next) => {
  if (!req.path.startsWith('/__e2e')) {
    requestLog.push({
      method: req.method,
      path: req.originalUrl,
      at: new Date().toISOString()
    });
  }
  next();
});

app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({
      ok: true,
      service: 'cerbanimo-e2e-api',
      queues: [PROJECT_BOOTSTRAP_QUEUE, AUTOMATION_EXECUTION_QUEUE],
      database: safeDatabaseTarget(process.env.POSTGRES_URL || process.env.DATABASE_URL || '')
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message || String(error) });
  }
});

app.get('/__e2e/requests', (_req, res) => {
  res.json({ requests: requestLog });
});

app.post('/__e2e/requests/reset', (_req, res) => {
  requestLog.length = 0;
  res.json({ ok: true });
});

app.use('/kamiya', apiAuthenticate, resolveUser, kamiyaChatRoutes);
app.use('/api/v1', apiV1Routes);

app.use((error, _req, res, _next) => {
  console.error('[Cerbanimo E2E] unhandled error:', error);
  res.status(error.status || error.statusCode || 500).json({
    ok: false,
    error: {
      code: error.code || error.status || 'E2E_SERVER_ERROR',
      message: error.message || 'Cerbanimo E2E server error'
    }
  });
});

let server;
try {
  await boss.start();
  await boss.createQueue(PROJECT_BOOTSTRAP_QUEUE).catch((error) => {
    console.warn(`[Cerbanimo E2E] queue creation notice for ${PROJECT_BOOTSTRAP_QUEUE}:`, error.message);
  });
  await boss.createQueue(AUTOMATION_EXECUTION_QUEUE).catch((error) => {
    console.warn(`[Cerbanimo E2E] queue creation notice for ${AUTOMATION_EXECUTION_QUEUE}:`, error.message);
  });
  await startProjectBootstrapWorker();
  await startAutomationWorker();

  server = app.listen(port, '127.0.0.1', () => {
    console.log(`[Cerbanimo E2E] API listening on http://127.0.0.1:${port}`);
  });
} catch (error) {
  console.error('[Cerbanimo E2E] startup failed:', error);
  process.exitCode = 1;
  await shutdown();
}

process.on('SIGINT', () => void shutdown(0));
process.on('SIGTERM', () => void shutdown(0));

async function shutdown(code) {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  await boss.stop().catch(() => {});
  await pool.end().catch(() => {});
  if (typeof code === 'number') process.exit(code);
}

function assertE2EServerAllowed() {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('Cerbanimo E2E API server requires NODE_ENV=test.');
  }
  if (process.env.CERBANIMO_E2E_MODE !== 'true') {
    throw new Error('Cerbanimo E2E API server requires CERBANIMO_E2E_MODE=true.');
  }
  const target = safeDatabaseTarget(process.env.POSTGRES_URL || process.env.DATABASE_URL || '');
  if (!/(e2e|test)/i.test(target.database)) {
    throw new Error('Cerbanimo E2E API server requires a database name containing e2e or test.');
  }
  if (/(neon\.tech|amazonaws\.com|render\.com|onrender\.com|prod|production)/i.test(`${target.host}/${target.database}`)) {
    throw new Error('Cerbanimo E2E API server refused a production-like database host or name.');
  }
}

function safeDatabaseTarget(value) {
  try {
    const url = new URL(value);
    return {
      host: url.hostname,
      database: url.pathname.replace(/^\/+/, '')
    };
  } catch {
    return { host: '', database: '' };
  }
}
