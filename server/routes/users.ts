import { Router } from 'express';
import { queryAll, runQuery } from '../db/connection';
import { v4 as uuidv4 } from 'uuid';
import nodemailer from 'nodemailer';
import { getAgencySettings } from '../controllers/settingsController';

const router = Router();

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || process.env.SMTP_USER || 'rohit.digitalmarketing19@gmail.com').trim().toLowerCase();
const ADMIN_NAME = (process.env.ADMIN_NAME || 'Rohit (Admin)').trim();
const ADMIN_PHONE = (process.env.ADMIN_PHONE || '+91 6376983416').trim();
const ADMIN_PASSWORD = (process.env.ADMIN_PASSWORD || 'admin@kingsland123').trim();

// In-memory OTP store for password resets (Admin verification)
const otpStore: Record<string, { code: string; expiresAt: number }> = {};

// In-memory store for 1-Click Magic Login Links & User OTPs
interface MagicLoginRecord {
  userId: string;
  email: string;
  otpCode: string;
  expiresAt: number;
}
const magicTokenStore: Record<string, MagicLoginRecord> = {};
const userLoginOtpStore: Record<string, { magicToken: string; otpCode: string; expiresAt: number }> = {};

// Helper to send email via SMTP with fallback logging
async function sendEmailUtil({ to, subject, html }: { to: string; subject: string; html: string }): Promise<boolean> {
  const settings = getAgencySettings();
  const smtpUser = (settings.smtp_user || process.env.SMTP_USER || process.env.EMAIL_USER || 'rohit.digitalmarketing19@gmail.com').trim();
  const rawPass = settings.smtp_pass || process.env.SMTP_PASS || process.env.EMAIL_PASS || '';
  const smtpPass = rawPass.replace(/\s+/g, '');
  const smtpHost = settings.smtp_host || process.env.SMTP_HOST || 'smtp.gmail.com';
  const smtpPort = Number(settings.smtp_port || process.env.SMTP_PORT || 587);
  const smtpFromName = settings.smtp_from_name || 'Kingsland Holidays CRM';

  if (smtpUser && smtpPass) {
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: { user: smtpUser, pass: smtpPass }
      });

      await transporter.sendMail({
        from: `"${smtpFromName}" <${smtpUser}>`,
        to,
        subject,
        html
      });
      console.log(`✉️ Real email successfully sent via SMTP to ${to}: "${subject}"`);
      return true;
    } catch (mailErr: any) {
      console.error(`❌ SMTP Dispatch failed to ${to}:`, mailErr.message);
      return false;
    }
  } else {
    console.log(`⚠️ [SMTP Note] SMTP Password not yet configured in Settings. Email logged for ${to}: "${subject}"`);
    return false;
  }
}

// Full default permissions array
const ALL_PERMISSIONS = [
  'Dashboard',
  'Leads',
  'New Inquiry',
  'Follow-ups',
  'Saved Itinerary',
  'HotelVouchers',
  'Operations',
  'Payments',
  'Accounts',
  'Invoices',
  'Analytics',
  'Sales Team',
  'User Management'
];

const SALES_PERMISSIONS = [
  'Dashboard',
  'Leads',
  'New Inquiry',
  'Follow-ups',
  'Saved Itinerary',
  'Analytics'
];

const OPS_PERMISSIONS = [
  'Operations',
  'HotelVouchers',
  'Saved Itinerary'
];

const ACCOUNTS_PERMISSIONS = [
  'Accounts',
  'Invoices',
  'Operations'
];

// Helper to format user row - includes real password so admin can view/manage accounts
function formatUserRow(row: any) {
  let permissions: string[] = [];
  try {
    permissions = typeof row.permissions === 'string' ? JSON.parse(row.permissions) : row.permissions || [];
  } catch (e) {
    permissions = [];
  }
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone || '',
    password: row.password || 'kingsland123',
    role: row.role || 'Sales',
    department: row.department || 'Sales',
    status: row.status || 'Active',
    accessLevel: (row.access_level || 'Editor') as 'Editor' | 'ViewOnly',
    permissions: Array.isArray(permissions) ? permissions : [],
    avatar: row.avatar || '',
    createdAt: row.created_at || new Date().toISOString()
  };
}

// GET /api/users - Fetch all users
router.get('/', (req, res) => {
  try {
    // Clean up legacy demo users if present
    try {
      runQuery("DELETE FROM users WHERE id IN ('usr-sales-1', 'usr-ops-1', 'usr-acc-1') OR LOWER(email) IN ('sarah.sales@kingslandholidays.com', 'vikram.ops@kingslandholidays.com', 'accounts.kingsland@gmail.com')");
    } catch (_cleanErr) {}

    const rows = queryAll('SELECT * FROM users ORDER BY created_at DESC');
    
    // Seed default admin user if database is empty
    if (!rows || rows.length === 0) {
      const now = new Date().toISOString();
      
      // Primary Admin user only
      runQuery(
        `INSERT OR IGNORE INTO users (id, name, email, phone, password, role, department, status, access_level, permissions, avatar, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          'usr-admin-1',
          ADMIN_NAME,
          ADMIN_EMAIL,
          ADMIN_PHONE,
          ADMIN_PASSWORD,
          'Admin',
          'Management',
          'Active',
          'Editor',
          JSON.stringify(ALL_PERMISSIONS),
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
          now
        ]
      );

      const refreshed = queryAll('SELECT * FROM users ORDER BY created_at DESC');
      return res.json((refreshed || []).map(formatUserRow));
    }

    res.json(rows.map(formatUserRow));
  } catch (err: any) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// POST /api/users/login - Authenticate user credentials
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const rows = queryAll('SELECT * FROM users WHERE LOWER(email) = ?', [cleanEmail]);

    if (!rows || rows.length === 0) {
      return res.status(401).json({ error: 'No CRM account found with this email address.' });
    }

    const userRow = rows[0];

    if (userRow.status !== 'Active') {
      return res.status(403).json({ error: 'Account is deactivated. Contact Primary Admin.' });
    }

    const storedPassword = userRow.password || 'kingsland123';
    if (password.trim() !== storedPassword.trim()) {
      return res.status(401).json({ error: 'Incorrect password. Please try again.' });
    }

    res.json({
      success: true,
      message: `Welcome back, ${userRow.name}!`,
      user: formatUserRow(userRow)
    });
  } catch (err: any) {
    console.error('Error logging in user:', err);
    res.status(500).json({ error: 'Failed to process login.' });
  }
});

// POST /api/users/send-admin-otp - Send 6-digit OTP to Admin Email for password resets
router.post('/send-admin-otp', async (req, res) => {
  try {
    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes valid

    otpStore[ADMIN_EMAIL] = { code: generatedOtp, expiresAt };

    console.log(`🔐 OTP generated for Admin (${ADMIN_EMAIL}): ${generatedOtp}`);

    let emailDispatched = false;
    const smtpUser = (process.env.SMTP_USER || process.env.EMAIL_USER || '').trim();
    const rawPass = process.env.SMTP_PASS || process.env.EMAIL_PASS || '';
    const smtpPass = rawPass.replace(/\s+/g, '');
    const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
    const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);

    if (smtpUser && smtpPass) {
      try {
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: smtpPort === 465,
          auth: { user: smtpUser, pass: smtpPass }
        });

        await transporter.sendMail({
          from: `"Kingsland Holidays Security" <${smtpUser}>`,
          to: ADMIN_EMAIL,
          subject: `🔐 Kingsland CRM Admin Security OTP: ${generatedOtp}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px; background-color: #ffffff;">
              <h2 style="color: #0f172a; font-size: 20px; font-weight: 800; margin-top: 0;">🏰 Kingsland Holidays CRM</h2>
              <p style="color: #475569; font-size: 14px;">An Admin OTP Code was requested to reset/update a staff password.</p>
              <div style="background-color: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 20px; text-align: center; margin: 20px 0;">
                <span style="font-size: 32px; font-weight: 900; letter-spacing: 8px; color: #4f46e5; font-family: monospace;">${generatedOtp}</span>
              </div>
              <p style="color: #64748b; font-size: 12px;">This code is valid for 10 minutes. If you did not request this OTP, please secure your admin account.</p>
            </div>
          `
        });
        emailDispatched = true;
        console.log(`✉️ Real email sent via SMTP to ${ADMIN_EMAIL}`);
      } catch (mailErr: any) {
        console.error('SMTP Mail error:', mailErr.message);
      }
    }

    res.json({
      success: true,
      message: '✓ 6-Digit Security OTP sent. Please check your admin Gmail.',
      emailSent: emailDispatched,
      expiresInSeconds: 600
    });
  } catch (err: any) {
    console.error('Error sending OTP:', err);
    res.status(500).json({ error: 'Failed to generate OTP.' });
  }
});

// POST /api/users/verify-admin-otp - Verify Admin OTP code
router.post('/verify-admin-otp', (req, res) => {
  try {
    const { otpCode } = req.body;
    const record = otpStore[ADMIN_EMAIL];

    if (!record) {
      return res.status(400).json({ error: 'No OTP generated. Please click "Send OTP to Admin Email" first.' });
    }

    if (Date.now() > record.expiresAt) {
      delete otpStore[ADMIN_EMAIL];
      return res.status(400).json({ error: 'OTP has expired. Please request a new OTP.' });
    }

    if (record.code !== (otpCode || '').trim()) {
      return res.status(400).json({ error: 'Invalid 6-digit OTP Code. Please verify and try again.' });
    }

    res.json({ success: true, verified: true, message: 'OTP successfully verified by Admin!' });
  } catch (err: any) {
    console.error('Error verifying OTP:', err);
    res.status(500).json({ error: 'Failed to verify OTP.' });
  }
});

// PUT /api/users/:id/change-password - Change user password with Admin OTP verification
router.put('/:id/change-password', (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword, otpCode } = req.body;

    if (!newPassword || newPassword.trim().length < 4) {
      return res.status(400).json({ error: 'New password must be at least 4 characters long.' });
    }

    // Check OTP
    const record = otpStore[ADMIN_EMAIL];
    if (!record || record.code !== (otpCode || '').trim() || Date.now() > record.expiresAt) {
      return res.status(400).json({ error: 'OTP Verification Failed! Enter the valid 6-digit code sent to your admin Gmail.' });
    }

    // Update password in DB by ID or Email
    runQuery('UPDATE users SET password = ? WHERE id = ? OR LOWER(email) = LOWER(?)', [newPassword.trim(), id, id]);

    // Clear OTP after successful use
    delete otpStore[ADMIN_EMAIL];

    const updated = queryAll('SELECT * FROM users WHERE id = ? OR LOWER(email) = LOWER(?)', [id, id]);
    if (!updated || updated.length === 0) {
      return res.status(404).json({ error: 'User account not found with this ID or Email.' });
    }

    res.json({
      success: true,
      message: `Password updated successfully for ${updated[0].name}`,
      user: formatUserRow(updated[0])
    });
  } catch (err: any) {
    console.error('Error updating password:', err);
    res.status(500).json({ error: 'Failed to update password' });
  }
});

// POST /api/users - Create new team user
router.post('/', (req, res) => {
  try {
    const { name, email, phone, password, role, department, permissions, status, accessLevel } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: 'Name and Email are required.' });
    }

    const id = `usr-${uuidv4().slice(0, 8)}`;
    const now = new Date().toISOString();
    const userRole = role || 'Sales';
    const userDept = department || (userRole === 'Operations' ? 'Operations' : userRole === 'Accounts' ? 'Accounts' : userRole === 'Admin' ? 'Management' : 'Sales');
    const userAccessLevel = accessLevel || (userRole === 'Accounts' ? 'ViewOnly' : 'Editor');
    const userPassword = password ? password.trim() : 'kingsland123';

    let assignedPermissions = permissions;
    if (!Array.isArray(assignedPermissions) || assignedPermissions.length === 0) {
      if (userRole === 'Admin') assignedPermissions = ALL_PERMISSIONS;
      else if (userRole === 'Operations') assignedPermissions = OPS_PERMISSIONS;
      else if (userRole === 'Accounts') assignedPermissions = ACCOUNTS_PERMISSIONS;
      else assignedPermissions = SALES_PERMISSIONS;
    }

    const avatarUrl = userRole === 'Admin'
      ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'
      : userRole === 'Operations'
      ? 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150'
      : userRole === 'Accounts'
      ? 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150'
      : 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150';

    runQuery(
      `INSERT INTO users (id, name, email, phone, password, role, department, status, access_level, permissions, avatar, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        name.trim(),
        email.trim().toLowerCase(),
        phone ? phone.trim() : '',
        userPassword,
        userRole,
        userDept,
        status || 'Active',
        userAccessLevel,
        JSON.stringify(assignedPermissions),
        avatarUrl,
        now
      ]
    );

    // Generate 1-Click Login Link for the new user
    const magicToken = `mag_${uuidv4()}`;
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days valid for new account welcome
    magicTokenStore[magicToken] = {
      userId: id,
      email: email.trim().toLowerCase(),
      otpCode: '',
      expiresAt
    };

    const protocol = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'http';
    const host = (req.headers['x-forwarded-host'] as string) || req.get('host') || 'localhost:3000';
    const origin = (req.headers.origin as string) || `${protocol}://${host}`;
    const magicLinkUrl = `${origin}/?magicToken=${magicToken}&email=${encodeURIComponent(email.trim())}`;

    // Send Welcome Email with credentials and 1-click link
    sendEmailUtil({
      to: email.trim().toLowerCase(),
      subject: `🏰 Welcome to Kingsland Holidays CRM - Your Account Credentials & Login Link`,
      html: `
        <div style="font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; padding: 32px; background-color: #ffffff; color: #0f172a;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #0f172a; font-size: 22px; font-weight: 800; margin: 0;">🏰 Kingsland Holidays CRM</h1>
            <p style="color: #64748b; font-size: 13px; margin-top: 4px; font-weight: 500;">Team Member Account Created</p>
          </div>
          <p style="font-size: 15px; color: #334155;">Hello <strong>${name.trim()}</strong>,</p>
          <p style="font-size: 14px; color: #475569; line-height: 1.5;">
            An account has been created for you on the <strong>Kingsland Holidays CRM</strong> portal under the <strong>${userRole}</strong> team.
          </p>
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin: 20px 0;">
            <div style="font-size: 13px; color: #334155; margin-bottom: 6px;"><strong>Email:</strong> ${email.trim().toLowerCase()}</div>
            <div style="font-size: 13px; color: #334155; margin-bottom: 6px;"><strong>Password:</strong> ${userPassword}</div>
            <div style="font-size: 13px; color: #334155;"><strong>Role:</strong> ${userRole} (${userDept})</div>
          </div>
          <div style="text-align: center; margin: 28px 0;">
            <a href="${magicLinkUrl}" style="background-color: #4f46e5; color: #ffffff; text-decoration: none; padding: 14px 32px; font-size: 15px; font-weight: 700; border-radius: 12px; display: inline-block;">
              🚀 1-Click Login to CRM
            </a>
          </div>
          <p style="font-size: 12px; color: #64748b; word-break: break-all;">
            Direct Link: <a href="${magicLinkUrl}" style="color: #4f46e5;">${magicLinkUrl}</a>
          </p>
        </div>
      `
    }).catch(() => {});

    const created = queryAll('SELECT * FROM users WHERE id = ?', [id]);
    res.status(201).json(formatUserRow(created[0]));
  } catch (err: any) {
    console.error('Error creating user:', err);
    res.status(500).json({ error: err.message || 'Failed to create user' });
  }
});

// PUT /api/users/:id - Update user details or permissions
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, password, role, department, status, accessLevel, permissions } = req.body;

    const existing = queryAll('SELECT * FROM users WHERE id = ?', [id]);
    if (!existing || existing.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const curr = existing[0];
    const newName = name !== undefined ? name.trim() : curr.name;
    const newEmail = email !== undefined ? email.trim().toLowerCase() : curr.email;
    const newPhone = phone !== undefined ? phone.trim() : curr.phone;
    const newPassword = password !== undefined ? password.trim() : curr.password;
    const newRole = role !== undefined ? role : curr.role;
    const newDept = department !== undefined ? department : curr.department;
    const newStatus = status !== undefined ? status : curr.status;
    const newAccessLevel = accessLevel !== undefined ? accessLevel : (curr.access_level || 'Editor');

    let newPermissions = curr.permissions;
    if (permissions !== undefined) {
      newPermissions = JSON.stringify(Array.isArray(permissions) ? permissions : []);
    }

    runQuery(
      `UPDATE users
       SET name = ?, email = ?, phone = ?, password = ?, role = ?, department = ?, status = ?, access_level = ?, permissions = ?
       WHERE id = ?`,
      [newName, newEmail, newPhone, newPassword, newRole, newDept, newStatus, newAccessLevel, newPermissions, id]
    );

    const updated = queryAll('SELECT * FROM users WHERE id = ?', [id]);
    res.json(formatUserRow(updated[0]));
  } catch (err: any) {
    console.error('Error updating user:', err);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// DELETE /api/users/:id - Delete user
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    runQuery('DELETE FROM users WHERE id = ?', [id]);
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (err: any) {
    console.error('Error deleting user:', err);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

export default router;
