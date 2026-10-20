import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import AdmZip from 'adm-zip';
import { queryAll, queryOne, runQuery } from '../db/connection';

const STORAGE_DIR = path.join(process.cwd(), 'storage', 'client-documents');
const TICKET_SECRET = process.env.APP_SECRET || 'kingsland_crm_secure_token_secret_2026';

// Ensure secure storage directory exists outside web root
if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

export const ALLOWED_DOC_TYPES = [
  'Passport',
  'Aadhaar Card',
  'PAN Card',
  'Visa',
  'Driving Licence',
  'Voter ID',
  'Other'
] as const;

export type ClientDocType = typeof ALLOWED_DOC_TYPES[number];

/**
 * Validates real file MIME type using file magic bytes header
 */
export function detectRealMimeType(buffer: Buffer): 'application/pdf' | 'image/jpeg' | 'image/png' | 'image/webp' | null {
  if (!buffer || buffer.length < 4) return null;

  // PDF magic number: %PDF- (0x25 0x50 0x44 0x46)
  if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
    return 'application/pdf';
  }

  // JPEG magic number: 0xFF 0xD8 0xFF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }

  // PNG magic number: 0x89 0x50 0x4E 0x47 0x0D 0x0A 0x1A 0x0A
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'image/png';
  }

  // WebP magic number: RIFF....WEBP (0x52 0x49 0x46 0x46 ... 0x57 0x45 0x42 0x50)
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return 'image/webp';
  }

  return null;
}

/**
 * Sanitizes user-provided filename to prevent path traversal & weird characters
 */
export function sanitizeFilename(rawName: string): string {
  const base = path.basename(rawName || 'document');
  const safe = base.replace(/[^a-zA-Z0-9._-]/g, '_');
  return safe.length > 100 ? safe.slice(0, 100) : safe;
}

/**
 * Generate HMAC signed short-lived ticket for secure document streaming
 */
export function generateSignedDocumentTicket(docId: string, leadId: string, expiresInMinutes = 15): { ticket: string; expiresAt: number } {
  const expiresAt = Date.now() + expiresInMinutes * 60 * 1000;
  const payload = `${docId}:${leadId}:${expiresAt}`;
  const hmac = crypto.createHmac('sha256', TICKET_SECRET).update(payload).digest('hex');
  const ticket = Buffer.from(`${payload}:${hmac}`).toString('base64url');
  return { ticket, expiresAt };
}

/**
 * Verify signed document ticket
 */
export function verifySignedDocumentTicket(docId: string, leadId: string, ticketStr: string): boolean {
  try {
    const raw = Buffer.from(ticketStr, 'base64url').toString('utf8');
    const parts = raw.split(':');
    if (parts.length !== 4) return false;
    const [tDocId, tLeadId, tExpStr, tHmac] = parts;
    const expiresAt = parseInt(tExpStr, 10);
    if (tDocId !== docId || tLeadId !== leadId) return false;
    if (Date.now() > expiresAt) return false;

    const expectedPayload = `${tDocId}:${tLeadId}:${tExpStr}`;
    const expectedHmac = crypto.createHmac('sha256', TICKET_SECRET).update(expectedPayload).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(tHmac), Buffer.from(expectedHmac));
  } catch (_e) {
    return false;
  }
}

/**
 * Checks if the request comes from an authenticated Admin
 */
export function getRequesterInfo(req: Request): { isAdmin: boolean; userId: string; userName: string } {
  const userRole = (req.headers['x-user-role'] as string) || '';
  const userId = (req.headers['x-user-id'] as string) || '';

  if (userId) {
    const user = queryOne('SELECT id, name, role, access_level FROM users WHERE id = ?', [userId]);
    if (user) {
      const isAdmin = (user.role?.toLowerCase() === 'admin' || user.id === 'usr-admin-1') && user.access_level !== 'ViewOnly';
      return { isAdmin, userId: user.id, userName: user.name || 'Admin' };
    }
  }

  if (userRole.toLowerCase() === 'admin') {
    return { isAdmin: true, userId: userId || 'admin', userName: 'Admin' };
  }

  return { isAdmin: false, userId: userId || 'unknown', userName: 'Guest' };
}

export function getParam(req: Request, key: string): string {
  const val = req.params[key];
  if (Array.isArray(val)) return val[0] || '';
  return String(val || '');
}

/**
 * Log audit events for sensitive document operations
 */
export function logDocumentAudit(
  documentId: string,
  leadId: string,
  action: 'upload' | 'view' | 'download' | 'delete' | 'zip_download' | 'update',
  req: Request,
  requester: { userId: string; userName: string },
  details = ''
): void {
  try {
    const rawFwd = req.headers['x-forwarded-for'];
    const ip = (Array.isArray(rawFwd) ? rawFwd[0] : (typeof rawFwd === 'string' ? rawFwd.split(',')[0].trim() : '')) || req.socket.remoteAddress || '127.0.0.1';
    const rawUa = req.headers['user-agent'];
    const userAgent = Array.isArray(rawUa) ? rawUa[0] : (rawUa || '');
    // Security: Ensure full ID numbers are never in details
    const cleanDetails = details.replace(/\b\d{12}\b/g, '************').replace(/\b[A-PR-WYa-pr-wy]\d{7}\b/g, '********');

    runQuery(
      `INSERT INTO client_document_audit_logs 
        (id, document_id, lead_id, action, user_id, user_name, ip_address, user_agent, details, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      [uuidv4(), documentId, leadId, action, requester.userId, requester.userName, ip, userAgent.slice(0, 250), cleanDetails]
    );
  } catch (err: any) {
    console.error('Document audit log write error:', err.message);
  }
}

/**
 * POST /api/leads/:leadId/documents
 * Upload one or multiple client documents for a converted lead
 */
export async function uploadDocuments(req: Request, res: Response): Promise<void> {
  try {
    const requester = getRequesterInfo(req);
    if (!requester.isAdmin) {
      res.status(403).json({ error: 'Forbidden: Admin access required to upload client documents.' });
      return;
    }

    const leadId = getParam(req, 'leadId');
    const lead = queryOne('SELECT id, trip_id, status FROM leads WHERE id = ?', [leadId]);
    if (!lead) {
      res.status(404).json({ error: 'Lead not found.' });
      return;
    }

    // Verify lead status is Converted
    const isConverted = lead.status === 'Closed Won' || lead.status === 'Converted';
    if (!isConverted) {
      res.status(400).json({ error: 'Client documents can only be attached to Converted leads.' });
      return;
    }

    const files = (req.files as Express.Multer.File[]) || (req.file ? [req.file] : []);
    if (!files || files.length === 0) {
      res.status(400).json({ error: 'No files uploaded. Allowed types: JPG, PNG, PDF (max 10 MB).' });
      return;
    }

    const docTypeRaw = (req.body.doc_type || 'Other').trim();
    const docType = ALLOWED_DOC_TYPES.includes(docTypeRaw as any) ? docTypeRaw : 'Other';
    const travellerId = req.body.traveller_id ? String(req.body.traveller_id).trim() : null;
    const note = (req.body.note || '').trim();

    const savedDocs = [];

    for (const file of files) {
      // 1. Validate file size (10 MB max)
      if (file.size > 10 * 1024 * 1024) {
        res.status(400).json({ error: `File "${file.originalname}" exceeds the 10 MB limit.` });
        return;
      }

      // 2. Validate real MIME type via magic bytes
      const detectedMime = detectRealMimeType(file.buffer);
      if (!detectedMime) {
        res.status(400).json({
          error: `File "${file.originalname}" is not a valid JPG, PNG, WebP, or PDF document.`
        });
        return;
      }

      // 3. Generate random stored filename
      const docId = `doc_${uuidv4().replace(/-/g, '')}`;
      const ext = detectedMime === 'application/pdf' ? '.pdf' : detectedMime === 'image/png' ? '.png' : detectedMime === 'image/webp' ? '.webp' : '.jpg';
      const storedFileName = `${docId}_${Date.now()}${ext}`;
      const storedFilePath = path.join(STORAGE_DIR, storedFileName);

      // 4. Save to secure storage outside web root
      fs.writeFileSync(storedFilePath, file.buffer);

      const safeOriginalName = sanitizeFilename(file.originalname);

      // 5. Insert record into database
      runQuery(
        `INSERT INTO client_documents 
          (id, lead_id, doc_type, traveller_id, note, original_filename, stored_path, mime_type, size_bytes, uploaded_by, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
        [
          docId,
          leadId,
          docType,
          travellerId,
          note,
          safeOriginalName,
          storedFileName, // Relative to STORAGE_DIR
          detectedMime,
          file.size,
          requester.userName
        ]
      );

      // 6. Audit log
      logDocumentAudit(docId, leadId, 'upload', req, requester, `Uploaded ${docType} (${safeOriginalName}, ${(file.size / 1024).toFixed(1)} KB)`);

      savedDocs.push({
        id: docId,
        lead_id: leadId,
        doc_type: docType,
        traveller_id: travellerId,
        note,
        original_filename: safeOriginalName,
        mime_type: detectedMime,
        size_bytes: file.size,
        uploaded_by: requester.userName
      });
    }

    res.json({
      success: true,
      message: `Successfully uploaded ${savedDocs.length} document(s).`,
      documents: savedDocs
    });
  } catch (err: any) {
    console.error('Error uploading client documents:', err);
    res.status(500).json({ error: err.message || 'Failed to upload client documents.' });
  }
}

/**
 * GET /api/leads/:leadId/documents
 * List all active (non-deleted) client documents for a lead
 */
export async function listDocuments(req: Request, res: Response): Promise<void> {
  try {
    const requester = getRequesterInfo(req);
    if (!requester.isAdmin) {
      res.status(403).json({ error: 'Forbidden: Admin access required.' });
      return;
    }

    const leadId = getParam(req, 'leadId');

    const rows = queryAll(
      `SELECT d.*, t.name as traveller_name, t.type as traveller_type 
       FROM client_documents d
       LEFT JOIN lead_travellers t ON d.traveller_id = t.id
       WHERE d.lead_id = ? AND d.deleted_at IS NULL
       ORDER BY d.created_at DESC`,
      [leadId]
    );

    const countsByType: Record<string, number> = {};
    for (const type of ALLOWED_DOC_TYPES) {
      countsByType[type] = 0;
    }
    rows.forEach(r => {
      countsByType[r.doc_type] = (countsByType[r.doc_type] || 0) + 1;
    });

    res.json({
      totalCount: rows.length,
      countsByType,
      documents: rows.map(r => ({
        id: r.id,
        lead_id: r.lead_id,
        doc_type: r.doc_type,
        traveller_id: r.traveller_id,
        traveller_name: r.traveller_name || null,
        traveller_type: r.traveller_type || null,
        note: r.note || '',
        original_filename: r.original_filename,
        mime_type: r.mime_type,
        size_bytes: r.size_bytes,
        uploaded_by: r.uploaded_by,
        created_at: r.created_at
      }))
    });
  } catch (err: any) {
    console.error('Error listing client documents:', err);
    res.status(500).json({ error: 'Failed to list client documents.' });
  }
}

/**
 * GET /api/leads/:leadId/documents/:docId/signed-token
 * Generate short-lived signed ticket for preview or download URL
 */
export async function getSignedDocumentToken(req: Request, res: Response): Promise<void> {
  try {
    const requester = getRequesterInfo(req);
    if (!requester.isAdmin) {
      res.status(403).json({ error: 'Forbidden: Admin access required.' });
      return;
    }

    const leadId = getParam(req, 'leadId');
    const docId = getParam(req, 'docId');
    const doc = queryOne('SELECT id FROM client_documents WHERE id = ? AND lead_id = ? AND deleted_at IS NULL', [docId, leadId]);
    if (!doc) {
      res.status(404).json({ error: 'Document not found.' });
      return;
    }

    const { ticket, expiresAt } = generateSignedDocumentTicket(docId, leadId, 15);
    res.json({ ticket, expiresAt });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to generate signed ticket.' });
  }
}

/**
 * GET /api/leads/:leadId/documents/:docId/file
 * Securely stream file content for inline preview or download attachment
 */
export async function getDocumentFile(req: Request, res: Response): Promise<void> {
  try {
    const leadId = getParam(req, 'leadId');
    const docId = getParam(req, 'docId');
    const ticket = req.query.ticket as string | undefined;

    // Check authorization: Admin headers OR valid signed ticket
    let requester = getRequesterInfo(req);
    const hasValidTicket = ticket ? verifySignedDocumentTicket(docId, leadId, ticket) : false;

    if (!requester.isAdmin && !hasValidTicket) {
      res.status(403).json({ error: 'Forbidden: Access to sensitive client documents is restricted.' });
      return;
    }

    const doc = queryOne('SELECT * FROM client_documents WHERE id = ? AND lead_id = ? AND deleted_at IS NULL', [docId, leadId]);
    if (!doc) {
      res.status(404).json({ error: 'Document not found or has been deleted.' });
      return;
    }

    const fullFilePath = path.join(STORAGE_DIR, doc.stored_path);
    if (!fs.existsSync(fullFilePath)) {
      res.status(404).json({ error: 'Document file storage missing.' });
      return;
    }

    const isDownload = req.query.download === '1' || req.query.download === 'true';
    const disposition = isDownload ? 'attachment' : 'inline';
    const cleanFilename = sanitizeFilename(doc.original_filename);

    // Audit logging
    logDocumentAudit(
      docId,
      leadId,
      isDownload ? 'download' : 'view',
      req,
      requester,
      `${isDownload ? 'Downloaded' : 'Previewed'} ${doc.doc_type} (${cleanFilename})`
    );

    res.setHeader('Content-Type', doc.mime_type || 'application/octet-stream');
    res.setHeader('Content-Disposition', `${disposition}; filename="${cleanFilename}"`);
    res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    const readStream = fs.createReadStream(fullFilePath);
    readStream.pipe(res);
  } catch (err: any) {
    console.error('Error streaming document file:', err);
    res.status(500).json({ error: 'Failed to stream document file.' });
  }
}

/**
 * GET /api/leads/:leadId/documents/download-all
 * Download all active client documents for this lead as a single ZIP archive
 */
export async function downloadAllZip(req: Request, res: Response): Promise<void> {
  try {
    const ticket = req.query.ticket as string | undefined;
    const requester = getRequesterInfo(req);
    const leadId = getParam(req, 'leadId');

    const hasValidTicket = ticket ? verifySignedDocumentTicket('all', leadId, ticket) : false;
    if (!requester.isAdmin && !hasValidTicket) {
      res.status(403).json({ error: 'Forbidden: Admin access required.' });
      return;
    }

    const lead = queryOne('SELECT id, trip_id, name FROM leads WHERE id = ?', [leadId]);
    if (!lead) {
      res.status(404).json({ error: 'Lead not found.' });
      return;
    }

    const docs = queryAll(
      `SELECT d.*, t.name as traveller_name 
       FROM client_documents d
       LEFT JOIN lead_travellers t ON d.traveller_id = t.id
       WHERE d.lead_id = ? AND d.deleted_at IS NULL
       ORDER BY d.doc_type ASC, d.created_at ASC`,
      [leadId]
    );

    if (!docs || docs.length === 0) {
      res.status(400).json({ error: 'No documents available to download for this lead.' });
      return;
    }

    const zip = new AdmZip();
    const usedNames = new Set<string>();

    for (let i = 0; i < docs.length; i++) {
      const d = docs[i];
      const filePath = path.join(STORAGE_DIR, d.stored_path);
      if (fs.existsSync(filePath)) {
        const fileContent = fs.readFileSync(filePath);
        // Prefix with doc type and traveller for organization
        const prefix = d.traveller_name ? `${d.doc_type}_${d.traveller_name}` : d.doc_type;
        let entryName = `${prefix}_${sanitizeFilename(d.original_filename)}`;
        if (usedNames.has(entryName)) {
          entryName = `${i + 1}_${entryName}`;
        }
        usedNames.add(entryName);
        zip.addFile(entryName, fileContent);
      }
    }

    const zipBuffer = zip.toBuffer();
    const cleanLeadName = (lead.name || 'Client').replace(/[^a-zA-Z0-9]/g, '_');
    const zipName = `ClientDocuments_${lead.trip_id || lead.id}_${cleanLeadName}.zip`;

    // Audit log
    logDocumentAudit(
      'all',
      leadId,
      'zip_download',
      req,
      requester,
      `Downloaded all ${docs.length} documents as ZIP (${(zipBuffer.length / 1024).toFixed(1)} KB)`
    );

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${zipName}"`);
    res.setHeader('Content-Length', zipBuffer.length.toString());
    res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    res.send(zipBuffer);
  } catch (err: any) {
    console.error('Error generating document ZIP archive:', err);
    res.status(500).json({ error: 'Failed to create documents ZIP archive.' });
  }
}

/**
 * DELETE /api/leads/:leadId/documents/:docId
 * Soft-delete a client document (record retained, hidden from active list)
 */
export async function deleteDocument(req: Request, res: Response): Promise<void> {
  try {
    const requester = getRequesterInfo(req);
    if (!requester.isAdmin) {
      res.status(403).json({ error: 'Forbidden: Admin access required.' });
      return;
    }

    const leadId = getParam(req, 'leadId');
    const docId = getParam(req, 'docId');
    const doc = queryOne('SELECT * FROM client_documents WHERE id = ? AND lead_id = ? AND deleted_at IS NULL', [docId, leadId]);
    if (!doc) {
      res.status(404).json({ error: 'Document not found or already deleted.' });
      return;
    }

    // Soft delete
    runQuery(`UPDATE client_documents SET deleted_at = datetime('now') WHERE id = ?`, [docId]);

    // Audit log
    logDocumentAudit(docId, leadId, 'delete', req, requester, `Soft-deleted ${doc.doc_type} (${doc.original_filename})`);

    res.json({
      success: true,
      message: 'Document deleted successfully (soft-deleted).'
    });
  } catch (err: any) {
    console.error('Error deleting client document:', err);
    res.status(500).json({ error: 'Failed to delete client document.' });
  }
}

/**
 * PUT /api/leads/:leadId/documents/:docId
 * Update document metadata (note, doc_type, traveller_id)
 */
export async function updateDocument(req: Request, res: Response): Promise<void> {
  try {
    const requester = getRequesterInfo(req);
    if (!requester.isAdmin) {
      res.status(403).json({ error: 'Forbidden: Admin access required.' });
      return;
    }

    const leadId = getParam(req, 'leadId');
    const docId = getParam(req, 'docId');
    const doc = queryOne('SELECT * FROM client_documents WHERE id = ? AND lead_id = ? AND deleted_at IS NULL', [docId, leadId]);
    if (!doc) {
      res.status(404).json({ error: 'Document not found.' });
      return;
    }

    const docTypeRaw = req.body.doc_type ? String(req.body.doc_type).trim() : doc.doc_type;
    const docType = ALLOWED_DOC_TYPES.includes(docTypeRaw as any) ? docTypeRaw : doc.doc_type;
    const travellerId = req.body.traveller_id !== undefined ? (req.body.traveller_id ? String(req.body.traveller_id).trim() : null) : doc.traveller_id;
    const note = req.body.note !== undefined ? String(req.body.note).trim() : doc.note;

    runQuery(
      `UPDATE client_documents SET doc_type = ?, traveller_id = ?, note = ? WHERE id = ?`,
      [docType, travellerId, note, docId]
    );

    logDocumentAudit(docId, leadId, 'update', req, requester, `Updated metadata for ${docType}`);

    res.json({
      success: true,
      message: 'Document details updated successfully.'
    });
  } catch (err: any) {
    console.error('Error updating document metadata:', err);
    res.status(500).json({ error: 'Failed to update document.' });
  }
}
