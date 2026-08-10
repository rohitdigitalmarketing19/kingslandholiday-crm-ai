import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { initDb } from './db/connection';
import { initializeDatabase } from './db/schema';
import { errorHandler } from './middleware/errorHandler';
import leadsRouter from './routes/leads';
import agentsRouter from './routes/agents';
import quotesRouter from './routes/quotes';
import notesRouter from './routes/notes';
import templatesRouter from './routes/templates';
import aiRouter from './routes/ai';
import paymentsRouter from './routes/payments';
import opsRouter from './routes/ops';
import usersRouter from './routes/users';

import { securityHeadersMiddleware, bodySanitizerMiddleware, rateLimiterMiddleware } from './middleware/security';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '5000', 10);

// Global Security Middleware
app.use(securityHeadersMiddleware);
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(bodySanitizerMiddleware);
app.use('/api', rateLimiterMiddleware(200, 60 * 1000)); // Max 200 requests/min per IP

// Middleware to ensure DB is initialized before handling API requests
app.use(async (req, res, next) => {
  try {
    await initDb();
    next();
  } catch (err) {
    next(err);
  }
});

app.use('/api/leads', leadsRouter);
app.use('/api/agents', agentsRouter);
app.use('/api/leads', quotesRouter);
app.use('/api/leads', notesRouter);
app.use('/api/templates', templatesRouter);
app.use('/api/ai', aiRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/ops', opsRouter);
app.use('/api/users', usersRouter);

app.get('/api/health', (req, res) => { res.json({ status: 'ok', timestamp: new Date().toISOString() }); });

// Serve frontend static build files when available
const rootDir = process.cwd();
const distPath = path.join(rootDir, 'dist');
const opsDistPath = path.join(rootDir, 'operations-team-portal', 'dist');

if (fs.existsSync(opsDistPath)) {
  app.use('/ops', express.static(opsDistPath));
}

if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    if (req.path.startsWith('/ops') && fs.existsSync(path.join(opsDistPath, 'index.html'))) {
      return res.sendFile(path.join(opsDistPath, 'index.html'));
    }
    return res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.use(errorHandler);

// Initialize DB and start listening
async function startServer() {
  await initDb();
  initializeDatabase();
  
  app.listen(PORT, () => {
    console.log(`\n  🏰 Kingsland Holidays CRM — Backend\n  📡 Server running on port ${PORT}\n  📂 API: http://localhost:${PORT}/api\n`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});

export default app;
