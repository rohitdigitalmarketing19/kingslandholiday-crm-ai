import express from 'express';
import { apiAuthorization } from './middleware/auth';
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
import mastersRouter from './routes/masters';
import hotelRatesRouter from './routes/hotelRates';
import pdfDesignsRouter from './routes/pdfDesigns';
import pdfThemesRouter from './routes/pdfThemes';
import settingsRouter from './routes/settings';
import clientDocumentsRouter from './routes/clientDocuments';
import clientDetailsRouter, { publicClientDetailsRouter } from './routes/clientDetails';

import { securityHeadersMiddleware, bodySanitizerMiddleware, rateLimiterMiddleware } from './middleware/security';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || (process.env.NODE_ENV === 'production' ? '3000' : '5000'));
if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) throw new Error('PORT must be an integer between 1 and 65535.');

// Global Security Middleware
app.use(securityHeadersMiddleware);
app.use(cors({ origin: false }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(bodySanitizerMiddleware);
app.use('/api', rateLimiterMiddleware(200, 60 * 1000)); // Max 200 requests/min per IP

let startupState: 'initializing' | 'ready' | 'failed' = 'initializing';
let databaseReady: Promise<void>;
app.get('/api/health', (_req,res)=>res.status(startupState==='ready'?200:503).json({status:startupState==='ready'?'ok':startupState,timestamp:new Date().toISOString()}));
app.use('/api', async (_req,res,next)=>{
  try {await databaseReady;next();}
  catch {res.status(503).json({error:'Database initialization failed. Check the application runtime log.',code:'DATABASE_INITIALIZATION_FAILED'});}
});

app.use('/api', apiAuthorization);
app.use('/api/leads', leadsRouter);
app.use('/api/agents', agentsRouter);
app.use('/api/leads', quotesRouter);
app.use('/api/leads', notesRouter);
app.use('/api/templates', templatesRouter);
app.use('/api/ai', aiRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/ops', opsRouter);
app.use('/api/users', usersRouter);
app.use('/api/masters', mastersRouter);
app.use('/api/hotel-rates', hotelRatesRouter);
app.use('/api/pdf-designs', pdfDesignsRouter);
app.use('/api/pdf-themes', pdfThemesRouter);
app.use('/api/pdf-themes/media', express.static(path.join(process.cwd(), 'storage', 'uploads')));
app.use('/api/settings', settingsRouter);
app.use('/api/leads', clientDocumentsRouter);
app.use('/api/leads', clientDetailsRouter);
app.use('/api/public/client-details', publicClientDetailsRouter);



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

// Bind before cloud restore/migrations so managed hosting sees listen() promptly.
// API readiness remains gated until the complete migration transaction succeeds.
app.listen(PORT,'0.0.0.0',()=>console.log(`CRM listening on port ${PORT}; database status: ${startupState}`));
databaseReady=initDb().then(()=>{initializeDatabase();startupState='ready';console.log('CRM database ready.');});
databaseReady.catch(error=>{startupState='failed';console.error('Failed to initialize CRM database:',error);});

export default app;
