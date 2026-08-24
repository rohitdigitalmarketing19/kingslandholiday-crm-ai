import express from 'express';
import fs from 'fs';
import path from 'path';
import { getAgencySettings, updateAgencySettings, testSmtpConnection } from '../controllers/settingsController';
import { 
  dbPath, 
  createBackupSnapshot, 
  listBackupSnapshots, 
  restoreDatabaseFromBuffer, 
  restoreSnapshotByName 
} from '../db/connection';
import { initializeDatabase } from '../db/schema';

const router = express.Router();

router.get('/', (_req, res) => {
  try {
    const settings = getAgencySettings();
    res.json(settings);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch settings' });
  }
});

router.post('/', (req, res) => {
  try {
    const updated = updateAgencySettings(req.body);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update settings' });
  }
});

router.put('/', (req, res) => {
  try {
    const updated = updateAgencySettings(req.body);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update settings' });
  }
});

router.post('/test-email', async (req, res) => {
  try {
    const result = await testSmtpConnection(req.body);
    res.json(result);
  } catch (err: any) {
    console.error('Test email failed:', err);
    res.status(400).json({ error: err.message || 'Failed to send test email. Please check your SMTP settings and Gmail App Password.' });
  }
});

// Download active kingsland.db file
router.get('/backup/download', (_req, res) => {
  try {
    if (!fs.existsSync(dbPath)) {
      return res.status(404).json({ error: 'Database file not found.' });
    }
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `kingsland_crm_backup_${timestamp}.db`;
    res.download(dbPath, filename);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to download database backup.' });
  }
});

// List all automated backup snapshots
router.get('/backup/snapshots', (_req, res) => {
  try {
    const snapshots = listBackupSnapshots();
    res.json({ snapshots });
  } catch (err: any) {
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
  } catch (err: any) {
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
      initializeDatabase();
    } catch (_migErr) {}
    res.json({ success: true, message: `Successfully restored database from ${filename}.` });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to restore snapshot.' });
  }
});

// Restore from uploaded base64 data
router.post('/backup/restore-upload', async (req, res) => {
  try {
    const { fileData } = req.body;
    if (!fileData) {
      return res.status(400).json({ error: 'No database file data provided.' });
    }
    const base64Content = fileData.includes(',') ? fileData.split(',')[1] : fileData;
    const buffer = Buffer.from(base64Content, 'base64');
    if (buffer.length < 100) {
      return res.status(400).json({ error: 'Database file is invalid or empty.' });
    }
    await restoreDatabaseFromBuffer(buffer);
    try {
      initializeDatabase();
    } catch (_migErr) {}
    res.json({ success: true, message: 'Database successfully restored from uploaded backup file.' });
  } catch (err: any) {
    console.error('Database restore error:', err);
    res.status(500).json({ error: err.message || 'Failed to restore uploaded database file.' });
  }
});

export default router;
