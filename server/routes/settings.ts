import {mysqlConnectionDiagnostic} from '../db/mysqlConnectionDiagnostics';
import {mysqlEnabled,initMysql,withMysqlConnection,mysqlQuery} from '../db/mysql';
import {importSqliteIntoMysql,exportMysqlBackup,archiveMysqlBackup,listMysqlArchives,readMysqlArchive} from '../db/mysqlBackup';
import { asyncRouter } from '../utils/asyncRouter';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { getAgencySettings, updateAgencySettings, testSmtpConnection } from '../controllers/settingsController';
import { dbPath, createBackupSnapshot, listBackupSnapshots, restoreDatabaseFromBuffer, restoreSnapshotByName } from '../db/connection';
import { initializeDatabase } from '../db/schema';
const router = asyncRouter(express.Router());
router.use((_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
});
const mysqlWork=async<T>(work:()=>Promise<T>)=>{await initMysql();return withMysqlConnection(work);};
router.get('/database',async(_req,res)=>res.json({active:mysqlEnabled()?'mysql':'sqlite',mysqlConfigured:['MYSQL_HOST','MYSQL_USER','MYSQL_PASSWORD','MYSQL_DATABASE'].every(k=>!!process.env[k])}));
router.post('/database/mysql/test',async(_req,res)=>{try{await mysqlWork(async()=>{await mysqlQuery('SELECT 1 AS ready');});res.json({success:true});}catch(error:any){const diagnostic=mysqlConnectionDiagnostic(error);console.warn('MySQL connection test failed:',diagnostic.code);res.status(503).json(diagnostic);}});
router.post('/database/mysql/import',express.raw({type:'application/octet-stream',limit:'100mb'}),async(req,res)=>{
 if(!Buffer.isBuffer(req.body))return res.status(400).json({error:'Choose a CRM .db backup.'});
 try{res.json(await mysqlWork(()=>importSqliteIntoMysql(req.body)));}catch(error:any){console.error('MySQL import failed:',error.code || error.message);res.status(error.status || 500).json({error:error.status?error.message:'MySQL import failed. Existing records were retained. Check the server log for the import stage.'});}
});
router.get('/database/mysql/archives',async(_req,res)=>{try{res.json(await mysqlWork(listMysqlArchives));}catch{res.status(503).json({error:'Could not load MySQL recovery backups.'});}});
router.get('/database/mysql/archives/:id',async(req,res)=>{const buffer=await mysqlWork(()=>readMysqlArchive(req.params.id as string));res.type('application/octet-stream').attachment('kingsland-mysql-recovery-'+req.params.id+'.db').send(buffer);});
router.get('/', async (_req, res) => {
    try {
        const settings = await getAgencySettings();
        const { smtp_pass, ...safe } = settings;
        res.json({ ...safe, smtp_pass: '', has_smtp_password: !!smtp_pass });
    }
    catch (err: any) {
        res.status(500).json({ error: err.message || 'Failed to fetch settings' });
    }
});
router.post('/', async (req, res) => {
    try {
        const updated = await updateAgencySettings({ ...req.body, smtp_pass: req.body.smtp_pass || undefined });
        const { smtp_pass, ...safe } = updated;
        res.json({ ...safe, smtp_pass: '', has_smtp_password: !!smtp_pass });
    }
    catch (err: any) {
        res.status(500).json({ error: err.message || 'Failed to update settings' });
    }
});
router.put('/', async (req, res) => {
    try {
        const updated = await updateAgencySettings({ ...req.body, smtp_pass: req.body.smtp_pass || undefined });
        const { smtp_pass, ...safe } = updated;
        res.json({ ...safe, smtp_pass: '', has_smtp_password: !!smtp_pass });
    }
    catch (err: any) {
        res.status(500).json({ error: err.message || 'Failed to update settings' });
    }
});
router.post('/test-email', async (req, res) => {
    try {
        const result = await testSmtpConnection(req.body);
        res.json(result);
    }
    catch (err: any) {
        console.error('Test email failed:', err);
        res.status(400).json({ error: err.message || 'Failed to send test email. Please check your SMTP settings and Gmail App Password.' });
    }
});
// Download active kingsland.db file
router.get('/backup/download', async (_req, res) => {
    try {
        if(mysqlEnabled()){const buffer=await exportMysqlBackup();return res.type('application/octet-stream').attachment('kingsland_mysql_backup_'+new Date().toISOString().slice(0,10)+'.db').send(buffer);}
        if (!fs.existsSync(dbPath)) {
            return res.status(404).json({ error: 'Database file not found.' });
        }
        const timestamp = new Date().toISOString().split('T')[0];
        const filename = `kingsland_crm_backup_${timestamp}.db`;
        res.download(dbPath, filename);
    }
    catch (err: any) {
        res.status(500).json({ error: err.message || 'Failed to download database backup.' });
    }
});
// List all automated backup snapshots
router.get('/backup/snapshots', (_req, res) => {
    try {
        const snapshots = listBackupSnapshots();
        res.json({ snapshots });
    }
    catch (err: any) {
        res.status(500).json({ error: err.message || 'Failed to list snapshots.' });
    }
});
// Create an immediate manual snapshot
router.post('/backup/create-snapshot', (_req, res) => {
    try {
        const filename = createBackupSnapshot('manual');
        if (!filename) {
            return res.status(500).json({ error: 'Failed to create snapshot.' });
        }
        res.json({ success: true, message: `Backup snapshot ${filename} created successfully.`, filename });
    }
    catch (err: any) {
        res.status(500).json({ error: err.message || 'Failed to create snapshot.' });
    }
});
// Restore from a snapshot by filename
router.post('/backup/restore-snapshot', async (req, res) => {
    try {
        const { filename } = req.body;
        if (!filename) {
            return res.status(400).json({ error: 'Snapshot filename is required.' });
        }
        await restoreSnapshotByName(filename);
        try {
            await initializeDatabase();
        }
        catch (_migErr) { }
        res.json({ success: true, message: `Successfully restored database from ${filename}.` });
    }
    catch (err: any) {
        res.status(500).json({ error: err.message || 'Failed to restore snapshot.' });
    }
});
// Restore from uploaded base64 data
router.post('/backup/restore-upload', express.raw({ type: 'application/octet-stream', limit: '100mb' }), async (req, res) => {
    try {
        let buffer: Buffer;
        if (Buffer.isBuffer(req.body))
            buffer = req.body;
        else {
            const fileData = req.body?.fileData;
            if (typeof fileData !== 'string' || !fileData)
                return res.status(400).json({ error: 'No database file provided.' });
            buffer = Buffer.from(fileData.includes(',') ? fileData.split(',')[1] : fileData, 'base64');
        }
        if(mysqlEnabled()){const result=await importSqliteIntoMysql(buffer);return res.json(result);}
        await restoreDatabaseFromBuffer(buffer, initializeDatabase);
        res.json({ success: true, message: 'Database successfully restored from uploaded backup file.' });
    }
    catch (err: any) {
        console.error('Database restore error:', err);
        res.status(err.status || 500).json({ error: err.message || 'Failed to restore uploaded database file.' });
    }
});
export default router;
