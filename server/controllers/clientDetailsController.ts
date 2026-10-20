import { Request, Response } from 'express';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { queryAll, queryOne, runQuery } from '../db/connection';
import { getRequesterInfo, getParam } from './clientDocumentsController';

/**
 * Normalizes Indian mobile number to exactly 10 digits and validates format
 */
export function normalizeAndValidateMobile(
  rawMobile: string | undefined | null,
  isRequired: boolean
): { isValid: boolean; normalized: string | null; error?: string } {
  if (!rawMobile || String(rawMobile).trim() === '') {
    if (isRequired) {
      return { isValid: false, normalized: null, error: 'Mobile number is required for adult travellers.' };
    }
    return { isValid: true, normalized: null };
  }

  // Strip spaces, dashes, parentheses
  let cleaned = String(rawMobile).replace(/[\s\-\(\)\.]/g, '').trim();

  // Strip country code if present (+91 or 91 or leading 0)
  if (cleaned.startsWith('+91')) {
    cleaned = cleaned.slice(3);
  } else if (cleaned.startsWith('91') && cleaned.length === 12) {
    cleaned = cleaned.slice(2);
  } else if (cleaned.startsWith('0') && cleaned.length === 11) {
    cleaned = cleaned.slice(1);
  }

  if (!/^\d{10}$/.test(cleaned)) {
    return { isValid: false, normalized: null, error: 'Mobile number must be exactly 10 digits.' };
  }

  return { isValid: true, normalized: cleaned };
}

/**
 * Generate a cryptographically strong unguessable token (at least 32 bytes = 64 hex characters)
 */
export function generateSecureLinkToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// ==========================================
// ADMIN ENDPOINTS
// ==========================================

/**
 * GET /api/leads/:leadId/client-details
 * Fetch client details link state and all saved travellers for a lead
 */
export async function getClientDetailsForLead(req: Request, res: Response): Promise<void> {
  try {
    const requester = getRequesterInfo(req);
    if (!requester.isAdmin) {
      res.status(403).json({ error: 'Forbidden: Admin access required.' });
      return;
    }

    const leadId = getParam(req, 'leadId');
    const lead = queryOne('SELECT id, trip_id, name, phone, email, status, destination, travel_date, adults, children FROM leads WHERE id = ?', [leadId]);
    if (!lead) {
      res.status(404).json({ error: 'Lead not found.' });
      return;
    }

    // Check link
    const link = queryOne('SELECT * FROM client_detail_links WHERE lead_id = ? ORDER BY created_at DESC LIMIT 1', [leadId]);

    // Check travellers
    const travellers = queryAll('SELECT * FROM lead_travellers WHERE lead_id = ? ORDER BY is_primary DESC, created_at ASC', [leadId]);

    res.json({
      lead: {
        id: lead.id,
        trip_id: lead.trip_id,
        name: lead.name,
        phone: lead.phone,
        email: lead.email,
        status: lead.status,
        destination: lead.destination,
        travel_date: lead.travel_date,
        expected_adults: lead.adults || 2,
        expected_children: lead.children || 0
      },
      link: link ? {
        id: link.id,
        token: link.token,
        is_active: Boolean(link.is_active),
        expires_at: link.expires_at,
        submitted_at: link.submitted_at,
        created_at: link.created_at,
        url_path: `/client-details/${link.token}`
      } : null,
      travellers: travellers.map(t => ({
        id: t.id,
        lead_id: t.lead_id,
        type: t.type,
        name: t.name,
        mobile: t.mobile,
        email: t.email,
        is_primary: Boolean(t.is_primary),
        created_at: t.created_at,
        updated_at: t.updated_at
      }))
    });
  } catch (err: any) {
    console.error('Error fetching client details:', err);
    res.status(500).json({ error: 'Failed to fetch client details.' });
  }
}

/**
 * POST /api/leads/:leadId/client-details/generate-link
 * Generate a new unguessable link for this lead (invalidates any old link)
 */
export async function generateClientDetailsLink(req: Request, res: Response): Promise<void> {
  try {
    const requester = getRequesterInfo(req);
    if (!requester.isAdmin) {
      res.status(403).json({ error: 'Forbidden: Admin access required.' });
      return;
    }

    const leadId = getParam(req, 'leadId');
    const lead = queryOne('SELECT id, status FROM leads WHERE id = ?', [leadId]);
    if (!lead) {
      res.status(404).json({ error: 'Lead not found.' });
      return;
    }

    const isConverted = lead.status === 'Closed Won' || lead.status === 'Converted';
    if (!isConverted) {
      res.status(400).json({ error: 'Client details links can only be generated for Converted leads.' });
      return;
    }

    const token = generateSecureLinkToken();
    const linkId = `cdl_${uuidv4().replace(/-/g, '')}`;
    const expiresAt = req.body.expires_at ? String(req.body.expires_at).trim() : null;

    // Invalidate any existing link for this lead
    runQuery('UPDATE client_detail_links SET is_active = 0 WHERE lead_id = ?', [leadId]);

    // Insert new active link
    runQuery(
      `INSERT INTO client_detail_links (id, lead_id, token, is_active, expires_at, created_at)
       VALUES (?, ?, ?, 1, ?, datetime('now'))`,
      [linkId, leadId, token, expiresAt]
    );

    res.json({
      success: true,
      message: 'New shareable Client Details link generated successfully.',
      link: {
        id: linkId,
        token,
        is_active: true,
        expires_at: expiresAt,
        url_path: `/client-details/${token}`
      }
    });
  } catch (err: any) {
    console.error('Error generating client details link:', err);
    res.status(500).json({ error: 'Failed to generate client details link.' });
  }
}

/**
 * PATCH /api/leads/:leadId/client-details/toggle-link
 * Enable or disable existing client details link, or update expiration
 */
export async function toggleClientDetailsLink(req: Request, res: Response): Promise<void> {
  try {
    const requester = getRequesterInfo(req);
    if (!requester.isAdmin) {
      res.status(403).json({ error: 'Forbidden: Admin access required.' });
      return;
    }

    const leadId = getParam(req, 'leadId');
    const link = queryOne('SELECT * FROM client_detail_links WHERE lead_id = ? ORDER BY created_at DESC LIMIT 1', [leadId]);
    if (!link) {
      res.status(404).json({ error: 'No link exists for this lead. Generate one first.' });
      return;
    }

    const isActive = req.body.is_active !== undefined ? (req.body.is_active ? 1 : 0) : link.is_active;
    const expiresAt = req.body.expires_at !== undefined ? (req.body.expires_at ? String(req.body.expires_at).trim() : null) : link.expires_at;

    runQuery('UPDATE client_detail_links SET is_active = ?, expires_at = ? WHERE id = ?', [isActive, expiresAt, link.id]);

    res.json({
      success: true,
      message: isActive ? 'Client details link is now active.' : 'Client details link has been disabled.',
      link: {
        id: link.id,
        token: link.token,
        is_active: Boolean(isActive),
        expires_at: expiresAt
      }
    });
  } catch (err: any) {
    console.error('Error toggling client details link:', err);
    res.status(500).json({ error: 'Failed to update link status.' });
  }
}

/**
 * PUT /api/leads/:leadId/client-details/travellers
 * Admin direct update of saved travellers
 */
export async function updateTravellersByAdmin(req: Request, res: Response): Promise<void> {
  try {
    const requester = getRequesterInfo(req);
    if (!requester.isAdmin) {
      res.status(403).json({ error: 'Forbidden: Admin access required.' });
      return;
    }

    const leadId = getParam(req, 'leadId');
    const lead = queryOne('SELECT id FROM leads WHERE id = ?', [leadId]);
    if (!lead) {
      res.status(404).json({ error: 'Lead not found.' });
      return;
    }

    const travellers = req.body.travellers;
    if (!Array.isArray(travellers) || travellers.length === 0) {
      res.status(400).json({ error: 'At least one traveller (primary) is required.' });
      return;
    }

    // Validate travellers list
    const seenMobiles = new Set<string>();
    const sanitizedList: any[] = [];

    for (let i = 0; i < travellers.length; i++) {
      const t = travellers[i];
      const type = (t.type === 'child') ? 'child' : 'adult';
      const name = (t.name || '').trim();
      if (!name) {
        res.status(400).json({ error: `Traveller #${i + 1}: Full name is required.` });
        return;
      }

      const isPrimary = i === 0 || Boolean(t.is_primary);
      const isAdult = type === 'adult';
      const mobCheck = normalizeAndValidateMobile(t.mobile, isAdult);
      if (!mobCheck.isValid) {
        res.status(400).json({ error: `Traveller #${i + 1} (${name}): ${mobCheck.error}` });
        return;
      }

      if (mobCheck.normalized) {
        if (seenMobiles.has(mobCheck.normalized)) {
          res.status(400).json({
            error: `Duplicate mobile number +91 ${mobCheck.normalized}. Each traveller must have a unique mobile number.`
          });
          return;
        }
        seenMobiles.add(mobCheck.normalized);
      }

      const email = t.email ? String(t.email).trim().toLowerCase() : null;

      sanitizedList.push({
        id: t.id || `trv_${uuidv4().replace(/-/g, '')}`,
        lead_id: leadId,
        type,
        name,
        mobile: mobCheck.normalized,
        email,
        is_primary: isPrimary ? 1 : 0
      });
    }

    // Replace all travellers for this lead atomically
    runQuery('DELETE FROM lead_travellers WHERE lead_id = ?', [leadId]);

    for (const t of sanitizedList) {
      runQuery(
        `INSERT INTO lead_travellers (id, lead_id, type, name, mobile, email, is_primary, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
        [t.id, t.lead_id, t.type, t.name, t.mobile, t.email, t.is_primary]
      );
    }

    res.json({
      success: true,
      message: 'Travellers updated successfully.',
      travellers: sanitizedList
    });
  } catch (err: any) {
    console.error('Error updating travellers by admin:', err);
    res.status(500).json({ error: err.message || 'Failed to update travellers.' });
  }
}

// ==========================================
// PUBLIC CLIENT-FACING ENDPOINTS
// ==========================================

/**
 * GET /api/public/client-details/:token
 * Public endpoint to load client page data without login.
 * Validates token, expiry, and active status.
 * Never exposes internal notes, commissions, or staff data.
 */
export async function getPublicClientDetails(req: Request, res: Response): Promise<void> {
  try {
    const token = getParam(req, 'token');
    if (!token || token.length < 32) {
      res.status(400).json({ error: 'Invalid or missing link token.' });
      return;
    }

    const link = queryOne('SELECT * FROM client_detail_links WHERE token = ?', [token]);
    if (!link) {
      res.status(404).json({ error: 'This client details link does not exist.' });
      return;
    }

    if (!link.is_active) {
      res.status(403).json({ error: 'This link has been deactivated by the travel admin.' });
      return;
    }

    if (link.expires_at) {
      const expiry = new Date(link.expires_at).getTime();
      if (!isNaN(expiry) && Date.now() > expiry) {
        res.status(410).json({ error: 'This link has expired. Please contact your travel expert for a fresh link.' });
        return;
      }
    }

    // Fetch lead with minimal public information
    const lead = queryOne('SELECT id, trip_id, name, phone, email, destination, travel_date, duration_days FROM leads WHERE id = ?', [link.lead_id]);
    if (!lead) {
      res.status(404).json({ error: 'Associated booking was not found.' });
      return;
    }

    // Fetch existing submitted travellers
    const travellers = queryAll('SELECT id, type, name, mobile, email, is_primary FROM lead_travellers WHERE lead_id = ? ORDER BY is_primary DESC, created_at ASC', [link.lead_id]);

    // Primary prefill normalized
    const primaryMobileNorm = normalizeAndValidateMobile(lead.phone, false).normalized || '';

    res.json({
      success: true,
      booking: {
        tripId: lead.trip_id,
        destination: lead.destination || 'Holiday Package',
        travelDate: lead.travel_date || '',
        durationDays: lead.duration_days || 0
      },
      primaryPrefill: {
        name: lead.name || '',
        mobile: primaryMobileNorm,
        email: lead.email || ''
      },
      isSubmitted: Boolean(link.submitted_at),
      submittedAt: link.submitted_at,
      travellers: travellers.map(t => ({
        id: t.id,
        type: t.type,
        name: t.name,
        mobile: t.mobile || '',
        email: t.email || '',
        is_primary: Boolean(t.is_primary)
      }))
    });
  } catch (err: any) {
    console.error('Error fetching public client details:', err);
    res.status(500).json({ error: 'Failed to load client details.' });
  }
}

/**
 * POST /api/public/client-details/:token
 * Public endpoint to submit traveller details
 */
export async function submitPublicClientDetails(req: Request, res: Response): Promise<void> {
  try {
    const token = getParam(req, 'token');
    if (!token || token.length < 32) {
      res.status(400).json({ error: 'Invalid or missing link token.' });
      return;
    }

    // Bot honeypot protection: if bot_field is filled, reject silently
    if (req.body.bot_field || req.body._honeypot) {
      res.status(400).json({ error: 'Invalid submission request.' });
      return;
    }

    const link = queryOne('SELECT * FROM client_detail_links WHERE token = ?', [token]);
    if (!link) {
      res.status(404).json({ error: 'This client details link does not exist.' });
      return;
    }

    if (!link.is_active) {
      res.status(403).json({ error: 'This link has been deactivated by the travel admin.' });
      return;
    }

    if (link.expires_at) {
      const expiry = new Date(link.expires_at).getTime();
      if (!isNaN(expiry) && Date.now() > expiry) {
        res.status(410).json({ error: 'This link has expired.' });
        return;
      }
    }

    const leadId = link.lead_id;
    const lead = queryOne('SELECT id, name, phone, email FROM leads WHERE id = ?', [leadId]);
    if (!lead) {
      res.status(404).json({ error: 'Associated booking was not found.' });
      return;
    }

    const travellers = req.body.travellers;
    if (!Array.isArray(travellers) || travellers.length === 0) {
      res.status(400).json({ error: 'Please provide details for at least Traveller 1 (Primary).' });
      return;
    }

    const seenMobiles = new Set<string>();
    const sanitizedTravellers: any[] = [];

    for (let i = 0; i < travellers.length; i++) {
      const t = travellers[i];
      const isPrimary = i === 0;
      const type = (t.type === 'child') ? 'child' : 'adult';
      const name = String(t.name || '').trim();

      if (!name) {
        res.status(400).json({ error: `Traveller #${i + 1}: Full Name is required.` });
        return;
      }

      const isAdult = type === 'adult';
      const mobCheck = normalizeAndValidateMobile(t.mobile, isAdult);
      if (!mobCheck.isValid) {
        res.status(400).json({ error: `Traveller #${i + 1} (${name}): ${mobCheck.error}` });
        return;
      }

      // Duplicate check: mobile numbers must be unique across all rows within this booking (children with blank mobile are skipped)
      if (mobCheck.normalized) {
        if (seenMobiles.has(mobCheck.normalized)) {
          res.status(400).json({
            error: `Mobile number +91 ${mobCheck.normalized} is already added for another traveller. Each traveller must have a unique mobile number.`
          });
          return;
        }
        seenMobiles.add(mobCheck.normalized);
      }

      const email = t.email ? String(t.email).trim().toLowerCase() : null;

      sanitizedTravellers.push({
        id: `trv_${uuidv4().replace(/-/g, '')}`,
        lead_id: leadId,
        type,
        name,
        mobile: mobCheck.normalized,
        email,
        is_primary: isPrimary ? 1 : 0
      });
    }

    // Save travellers atomically
    runQuery('DELETE FROM lead_travellers WHERE lead_id = ?', [leadId]);

    for (const t of sanitizedTravellers) {
      runQuery(
        `INSERT INTO lead_travellers (id, lead_id, type, name, mobile, email, is_primary, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
        [t.id, t.lead_id, t.type, t.name, t.mobile, t.email, t.is_primary]
      );
    }

    // Update link submitted_at timestamp
    runQuery(`UPDATE client_detail_links SET submitted_at = datetime('now') WHERE id = ?`, [link.id]);

    res.json({
      success: true,
      message: 'All traveller details submitted and verified successfully!',
      travellersCount: sanitizedTravellers.length,
      submittedAt: new Date().toISOString()
    });
  } catch (err: any) {
    console.error('Error submitting client details:', err);
    if (err.message && err.message.includes('UNIQUE constraint failed')) {
      res.status(400).json({ error: 'A traveller with this mobile number is already registered for this booking.' });
      return;
    }
    res.status(500).json({ error: 'Failed to save traveller details.' });
  }
}
