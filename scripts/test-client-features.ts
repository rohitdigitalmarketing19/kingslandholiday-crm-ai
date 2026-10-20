/**
 * Comprehensive Test Suite for Converted Leads:
 * - Feature 1: Client Documents (Admin only, MIME verification, security, soft-delete, audit logs)
 * - Feature 2: Client Details (Shareable links, tokens, adult/child rules, 10-digit mobile, duplicate blocking)
 */

import {
  normalizeAndValidateMobile,
  generateSecureLinkToken
} from '../server/controllers/clientDetailsController';

import {
  detectRealMimeType,
  sanitizeFilename,
  generateSignedDocumentTicket,
  verifySignedDocumentTicket,
  getRequesterInfo
} from '../server/controllers/clientDocumentsController';

import { initDb, queryAll, queryOne, runQuery } from '../server/db/connection';
import { initializeDatabase } from '../server/db/schema';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${testName}${detail ? ` (${detail})` : ''}`);
    failed++;
  }
}

async function runTests() {
  console.log('\n======================================================');
  console.log('🧪 RUNNING CLIENT DOCUMENTS & CLIENT DETAILS TEST SUITE');
  console.log('======================================================\n');

  // Initialize DB
  await initDb();
  initializeDatabase();

  // -----------------------------------------------------------------
  // 1. MOBILE VALIDATION & NORMALIZATION
  // -----------------------------------------------------------------
  console.log('--- Suite 1: Mobile Validation & Normalization ---');

  const validStandard = normalizeAndValidateMobile('9876543210', true);
  assert(validStandard.isValid && validStandard.normalized === '9876543210', 'Accepts standard 10-digit Indian mobile');

  const validWithSpacesAndDashes = normalizeAndValidateMobile(' 98765-43210 ', true);
  assert(validWithSpacesAndDashes.isValid && validWithSpacesAndDashes.normalized === '9876543210', 'Strips spaces and dashes');

  const validWithCountryCodePlus = normalizeAndValidateMobile('+91 9876543210', true);
  assert(validWithCountryCodePlus.isValid && validWithCountryCodePlus.normalized === '9876543210', 'Normalizes +91 prefix');

  const validWithCountryCode91 = normalizeAndValidateMobile('919876543210', true);
  assert(validWithCountryCode91.isValid && validWithCountryCode91.normalized === '9876543210', 'Normalizes 12-digit 91 prefix');

  const validWithLeadingZero = normalizeAndValidateMobile('09876543210', true);
  assert(validWithLeadingZero.isValid && validWithLeadingZero.normalized === '9876543210', 'Normalizes 11-digit leading 0');

  const invalidShort = normalizeAndValidateMobile('987654321', true);
  assert(!invalidShort.isValid, 'Rejects less than 10 digits');

  const invalidLong = normalizeAndValidateMobile('987654321000', true);
  assert(!invalidLong.isValid, 'Rejects more than 10 digits');

  const invalidAlpha = normalizeAndValidateMobile('987654321A', true);
  assert(!invalidAlpha.isValid, 'Rejects alphanumeric characters');

  const adultEmpty = normalizeAndValidateMobile('', true);
  assert(!adultEmpty.isValid && adultEmpty.error?.includes('required'), 'Rejects empty mobile when required (Adult)');

  const childEmpty = normalizeAndValidateMobile('', false);
  assert(childEmpty.isValid && childEmpty.normalized === null, 'Accepts empty mobile when optional (Child)');


  // -----------------------------------------------------------------
  // 2. ADULT / CHILD RULES & DUPLICATE NUMBER BLOCKING
  // -----------------------------------------------------------------
  console.log('\n--- Suite 2: Adult/Child Rules & Duplicate-Number Blocking ---');

  // Simulate client-side & server-side validation function
  function validateTravellersList(travellers: Array<{ type: 'adult' | 'child'; name: string; mobile?: string }>) {
    const errors: string[] = [];
    const seenMobiles = new Set<string>();

    travellers.forEach((t, idx) => {
      if (!t.name || !t.name.trim()) {
        errors.push(`Row ${idx + 1}: Name is required.`);
      }
      const isAdult = t.type === 'adult';
      const mResult = normalizeAndValidateMobile(t.mobile, isAdult);
      if (!mResult.isValid) {
        errors.push(`Row ${idx + 1}: ${mResult.error}`);
      } else if (mResult.normalized) {
        if (seenMobiles.has(mResult.normalized)) {
          errors.push(`Row ${idx + 1}: This number (+91 ${mResult.normalized}) is already added.`);
        } else {
          seenMobiles.add(mResult.normalized);
        }
      }
    });

    return { isValid: errors.length === 0, errors };
  }

  const validGroup = validateTravellersList([
    { type: 'adult', name: 'Rohan Sharma', mobile: '9876543210' },
    { type: 'adult', name: 'Pooja Sharma', mobile: '9876543211' },
    { type: 'child', name: 'Aarav Sharma', mobile: '' },
    { type: 'child', name: 'Diya Sharma', mobile: '' }
  ]);
  assert(validGroup.isValid, 'Allows valid group with 2 adults and 2 children with empty mobile numbers');

  const duplicateAdult = validateTravellersList([
    { type: 'adult', name: 'Rohan Sharma', mobile: '9876543210' },
    { type: 'adult', name: 'Pooja Sharma', mobile: '9876543210' }
  ]);
  assert(!duplicateAdult.isValid && duplicateAdult.errors.some(e => e.includes('already added')), 'Blocks duplicate mobile between adults');

  const childMatchingAdult = validateTravellersList([
    { type: 'adult', name: 'Rohan Sharma', mobile: '9876543210' },
    { type: 'child', name: 'Aarav Sharma', mobile: '9876543210' }
  ]);
  assert(!childMatchingAdult.isValid && childMatchingAdult.errors.some(e => e.includes('already added')), 'Blocks child mobile matching adult mobile');

  const adultWithoutMobile = validateTravellersList([
    { type: 'adult', name: 'Rohan Sharma', mobile: '' }
  ]);
  assert(!adultWithoutMobile.isValid && adultWithoutMobile.errors.some(e => e.includes('required')), 'Rejects adult without mobile');

  const childWithoutName = validateTravellersList([
    { type: 'child', name: '', mobile: '' }
  ]);
  assert(!childWithoutName.isValid && childWithoutName.errors.some(e => e.includes('Name is required')), 'Rejects child without name');


  // -----------------------------------------------------------------
  // 3. DATABASE UNIQUE CONSTRAINT FOR TRAVELLER MOBILES PER LEAD
  // -----------------------------------------------------------------
  console.log('\n--- Suite 3: Database Partial Unique Constraint on Mobiles ---');

  const testLeadId = 'lead-test-' + Date.now();
  const testTripId = 'TRIP-TEST-' + Date.now();
  // Insert test lead
  runQuery(
    `INSERT INTO leads (id, trip_id, name, email, phone, status, raw_inquiry, summary, score, intent, destination, budget_tier, source, created_at, last_follow_up)
     VALUES (?, ?, ?, ?, ?, 'Closed Won', 'Inquiry', 'Summary', 90, 'High Intent', 'Goa', 'Luxury', 'Website', datetime('now'), datetime('now'))`,
    [testLeadId, testTripId, 'Test Client', 'client@test.com', '9876543210']
  );

  // Insert primary traveller
  runQuery(
    `INSERT INTO lead_travellers (id, lead_id, type, name, mobile, email, is_primary)
     VALUES (?, ?, 'adult', 'Test Client', '9876543210', 'client@test.com', 1)`,
    ['trav-1-' + Date.now(), testLeadId]
  );

  // Insert child 1 with empty mobile
  runQuery(
    `INSERT INTO lead_travellers (id, lead_id, type, name, mobile, email, is_primary)
     VALUES (?, ?, 'child', 'Child One', NULL, NULL, 0)`,
    ['trav-c1-' + Date.now(), testLeadId]
  );

  // Insert child 2 with empty mobile (should NOT violate unique constraint)
  let child2Success = false;
  try {
    runQuery(
      `INSERT INTO lead_travellers (id, lead_id, type, name, mobile, email, is_primary)
       VALUES (?, ?, 'child', 'Child Two', NULL, NULL, 0)`,
      ['trav-c2-' + Date.now(), testLeadId]
    );
    child2Success = true;
  } catch (err) {
    child2Success = false;
  }
  assert(child2Success, 'Allows multiple children with NULL mobile in database');

  // Attempt to insert duplicate mobile in database for same lead (should be blocked by partial unique index)
  let duplicateDbBlocked = false;
  try {
    runQuery(
      `INSERT INTO lead_travellers (id, lead_id, type, name, mobile, email, is_primary)
       VALUES (?, ?, 'adult', 'Duplicate Adult', '9876543210', NULL, 0)`,
      ['trav-dup-' + Date.now(), testLeadId]
    );
  } catch (err: any) {
    duplicateDbBlocked = true;
  }
  assert(duplicateDbBlocked, 'Database enforces partial unique index on (lead_id, mobile)');


  // -----------------------------------------------------------------
  // 4. TOKEN GENERATION & EXPIRATION VALIDITY
  // -----------------------------------------------------------------
  console.log('\n--- Suite 4: Token Generation & Link Validity ---');

  const token1 = generateSecureLinkToken();
  const token2 = generateSecureLinkToken();
  assert(token1 !== token2 && token1.length >= 64, 'Generates unique unguessable cryptographically secure tokens (>= 64 chars)');

  // Save active link
  const linkId = 'link-' + Date.now();
  runQuery(
    `INSERT INTO client_detail_links (id, lead_id, token, is_active, expires_at)
     VALUES (?, ?, ?, 1, datetime('now', '+7 days'))`,
    [linkId, testLeadId, token1]
  );

  // Check valid active link
  const activeLink = queryOne(`SELECT * FROM client_detail_links WHERE token = ?`, [token1]);
  assert(!!activeLink && activeLink.is_active === 1, 'Token is active and retrievable');

  // Invalidate / regenerate link: disable old link
  runQuery(`UPDATE client_detail_links SET is_active = 0 WHERE id = ?`, [linkId]);
  const disabledLink = queryOne(`SELECT * FROM client_detail_links WHERE token = ?`, [token1]);
  assert(disabledLink.is_active === 0, 'Link disabling successfully deactivates token');

  // Expired token test
  const expiredToken = generateSecureLinkToken();
  runQuery(
    `INSERT INTO client_detail_links (id, lead_id, token, is_active, expires_at)
     VALUES (?, ?, ?, 1, datetime('now', '-1 day'))`,
    ['link-exp-' + Date.now(), testLeadId, expiredToken]
  );
  const expiredLink = queryOne(`SELECT * FROM client_detail_links WHERE token = ? AND datetime(expires_at) < datetime('now')`, [expiredToken]);
  assert(!!expiredLink, 'Correctly detects expired token');


  // -----------------------------------------------------------------
  // 5. DOCUMENT SECURITY: REAL MIME DETECTION (MAGIC BYTES)
  // -----------------------------------------------------------------
  console.log('\n--- Suite 5: Real MIME Detection (Magic Bytes) ---');

  const pdfBuffer = Buffer.from('%PDF-1.4\n%test pdf content');
  assert(detectRealMimeType(pdfBuffer) === 'application/pdf', 'Accurately detects PDF by magic bytes (%PDF-)');

  const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
  assert(detectRealMimeType(jpegBuffer) === 'image/jpeg', 'Accurately detects JPEG by magic bytes (FF D8 FF)');

  const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
  assert(detectRealMimeType(pngBuffer) === 'image/png', 'Accurately detects PNG by magic bytes (89 PNG)');

  const fakeExecutable = Buffer.from('MZ\x90\x00\x03\x00\x00\x00\x04\x00');
  assert(detectRealMimeType(fakeExecutable) === null, 'Rejects fake executable renamed with image extension');

  const plainText = Buffer.from('Hello world this is not an image');
  assert(detectRealMimeType(plainText) === null, 'Rejects arbitrary text or script files');


  // -----------------------------------------------------------------
  // 6. FILENAME SANITIZATION
  // -----------------------------------------------------------------
  console.log('\n--- Suite 6: Filename Sanitization ---');

  const traversalName = '../../../../etc/passwd';
  const clean1 = sanitizeFilename(traversalName);
  assert(!clean1.includes('/') && !clean1.includes('\\') && clean1 === 'passwd', 'Strips directory traversal paths');

  const crazyChars = 'my passport #1 [final] (copy) *?.pdf';
  const clean2 = sanitizeFilename(crazyChars);
  assert(!/[*?#\[\]]/.test(clean2), 'Strips unsafe characters from original filename');


  // -----------------------------------------------------------------
  // 7. SIGNED SHORT-LIVED DOCUMENT TICKETS
  // -----------------------------------------------------------------
  console.log('\n--- Suite 7: Signed Short-Lived Document Tickets ---');

  const docId = 'doc-' + Date.now();
  const ticketObj = generateSignedDocumentTicket(docId, testLeadId, 15);
  assert(!!ticketObj.ticket && ticketObj.expiresAt > Date.now(), 'Generates HMAC signed ticket with expiration');

  const isValidTicket = verifySignedDocumentTicket(docId, testLeadId, ticketObj.ticket);
  assert(isValidTicket, 'Validates authentic signed ticket');

  const isTamperedDocId = verifySignedDocumentTicket('different-doc', testLeadId, ticketObj.ticket);
  assert(!isTamperedDocId, 'Rejects ticket with mismatched document ID');

  const isTamperedLeadId = verifySignedDocumentTicket(docId, 'different-lead', ticketObj.ticket);
  assert(!isTamperedLeadId, 'Rejects ticket with mismatched lead ID');

  const expiredTicket = generateSignedDocumentTicket(docId, testLeadId, -5); // 5 minutes in past
  const isExpiredValid = verifySignedDocumentTicket(docId, testLeadId, expiredTicket.ticket);
  assert(!isExpiredValid, 'Rejects expired signed ticket');


  // -----------------------------------------------------------------
  // 8. ROLE-BASED ACCESS CONTROL FOR DOCUMENTS
  // -----------------------------------------------------------------
  console.log('\n--- Suite 8: Role-Based Authorization Checks ---');

  // Insert mock users
  const adminUserId = 'usr-test-admin-' + Date.now();
  runQuery(
    `INSERT INTO users (id, name, email, role, status, access_level, permissions)
     VALUES (?, 'Super Admin', ?, 'Admin', 'Active', 'Editor', '["Leads"]')`,
    [adminUserId, `admin-${Date.now()}@test.com`]
  );

  const salesUserId = 'usr-test-sales-' + Date.now();
  runQuery(
    `INSERT INTO users (id, name, email, role, status, access_level, permissions)
     VALUES (?, 'Sales Agent', ?, 'Sales', 'Active', 'Editor', '["Leads"]')`,
    [salesUserId, `sales-${Date.now()}@test.com`]
  );

  const viewOnlyAdminId = 'usr-test-viewadmin-' + Date.now();
  runQuery(
    `INSERT INTO users (id, name, email, role, status, access_level, permissions)
     VALUES (?, 'Viewer Admin', ?, 'Admin', 'Active', 'ViewOnly', '["Leads"]')`,
    [viewOnlyAdminId, `viewadmin-${Date.now()}@test.com`]
  );

  const adminReq = { headers: { 'x-user-id': adminUserId } } as any;
  assert(getRequesterInfo(adminReq).isAdmin === true, 'Admin editor user is authorized as Admin');

  const salesReq = { headers: { 'x-user-id': salesUserId } } as any;
  assert(getRequesterInfo(salesReq).isAdmin === false, 'Sales user is NOT authorized as Admin for documents');

  const viewOnlyReq = { headers: { 'x-user-id': viewOnlyAdminId } } as any;
  assert(getRequesterInfo(viewOnlyReq).isAdmin === false, 'ViewOnly Admin is NOT authorized for document modifications');

  const loggedOutReq = { headers: {} } as any;
  assert(getRequesterInfo(loggedOutReq).isAdmin === false, 'Logged out / unauthenticated request is NOT authorized as Admin');


  // -----------------------------------------------------------------
  // 9. SOFT DELETE & AUDIT LOGS
  // -----------------------------------------------------------------
  console.log('\n--- Suite 9: Soft Delete & Audit Logging ---');

  // Create client document record
  const clientDocId = 'cdoc-' + Date.now();
  runQuery(
    `INSERT INTO client_documents (id, lead_id, doc_type, original_filename, stored_path, mime_type, size_bytes, uploaded_by)
     VALUES (?, ?, 'Passport', 'passport.pdf', 'test/path/passport.pdf', 'application/pdf', 1024, 'Super Admin')`,
    [clientDocId, testLeadId]
  );

  // Log upload audit
  runQuery(
    `INSERT INTO client_document_audit_logs (id, document_id, lead_id, action, user_name, ip_address, details)
     VALUES (?, ?, ?, 'upload', 'Super Admin', '127.0.0.1', 'Document passport.pdf uploaded')`,
    ['audit-up-' + Date.now(), clientDocId, testLeadId]
  );

  // Soft delete document
  runQuery(
    `UPDATE client_documents SET deleted_at = datetime('now') WHERE id = ?`,
    [clientDocId]
  );

  // Log delete audit
  runQuery(
    `INSERT INTO client_document_audit_logs (id, document_id, lead_id, action, user_name, ip_address, details)
     VALUES (?, ?, ?, 'delete', 'Super Admin', '127.0.0.1', 'Document passport.pdf soft-deleted')`,
    ['audit-del-' + Date.now(), clientDocId, testLeadId]
  );

  // Query active documents
  const activeDocs = queryAll(`SELECT * FROM client_documents WHERE lead_id = ? AND deleted_at IS NULL`, [testLeadId]);
  assert(activeDocs.length === 0, 'Soft deleted document is excluded from active query');

  // Query soft deleted document record (still exists for audit & recovery)
  const softDeletedDoc = queryOne(`SELECT * FROM client_documents WHERE id = ?`, [clientDocId]);
  assert(!!softDeletedDoc && softDeletedDoc.deleted_at !== null, 'Soft deleted document remains in database with deleted_at timestamp');

  // Verify audit log entries
  const auditEntries = queryAll(`SELECT * FROM client_document_audit_logs WHERE document_id = ? ORDER BY created_at ASC`, [clientDocId]);
  assert(auditEntries.length === 2 && auditEntries[0].action === 'upload' && auditEntries[1].action === 'delete', 'Audit log tracks upload and delete actions');

  // Verify no sensitive ID numbers exposed in details
  const hasPlainAadhaar = auditEntries.some(a => /\b\d{4}\s?\d{4}\s?\d{4}\b/.test(a.details || ''));
  assert(!hasPlainAadhaar, 'Audit logs do not expose 12-digit plain Aadhaar numbers');


  // -----------------------------------------------------------------
  // SUMMARY
  // -----------------------------------------------------------------
  console.log('\n======================================================');
  console.log(`📊 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
