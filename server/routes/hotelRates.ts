import { Router } from 'express';
import { randomUUID } from 'crypto';
import { PDFDocument } from 'pdf-lib';
import { getDb, queryAll, queryOne, saveDb } from '../db/connection';
import { toPaise, validateBlackoutDates, validateSeasonStart, validateHotelContact } from '../../utils/hotelRates';

const router = Router();
// Follow the CRM's active-user identity contract; enforce Admin on every endpoint.
router.use((req, res, next) => {
  const actor = queryOne('SELECT id, role, status, access_level FROM users WHERE id = ?', [req.header('x-user-id') || '']);
  if (!actor || actor.status !== 'Active') return res.status(401).json({ error: 'An active user is required.' });
  if (actor.role !== 'Admin' || (req.method !== 'GET' && actor.access_level === 'ViewOnly')) return res.status(403).json({ error: 'Only an administrator with edit access can manage hotel rates.' });
  res.locals.actor = actor.id;
  next();
});
const columns = 'id, name, city, category, seasonal_paise, blackout_paise, blackout_dates, pdf_name, updated_at, off_season_paise, off_season_start_date, season_start_date, contact_number';
function present(row: any) {
  return { offSeasonRate: row.off_season_paise == null ? '' : (row.off_season_paise / 100).toFixed(2), offSeasonStartDate: row.off_season_start_date || '', seasonStartDate: row.season_start_date || '', contactNumber: row.contact_number || '', id: row.id, name: row.name, city: row.city, category: row.category, seasonalRate: (row.seasonal_paise / 100).toFixed(2), blackoutRate: (row.blackout_paise / 100).toFixed(2), blackoutDates: JSON.parse(row.blackout_dates), pdfName: row.pdf_name, updatedAt: row.updated_at };
}
router.get('/', (_req, res) => res.json(queryAll(`SELECT ${columns} FROM hotel_rates WHERE deleted_at = '' ORDER BY name COLLATE NOCASE`).map(present)));
router.get('/:id/pdf', (req, res) => {
  const row = queryOne("SELECT pdf_name, pdf_data FROM hotel_rates WHERE id = ? AND deleted_at = ''", [req.params.id]);
  if (!row?.pdf_data) return res.status(404).json({ error: 'Rate sheet not found.' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="rate-sheet.pdf"; filename*=UTF-8''${encodeURIComponent(row.pdf_name)}`);
  res.setHeader('Cache-Control', 'no-store');
  res.send(Buffer.from(row.pdf_data, 'base64'));
});
router.delete('/:id', (req, res, next) => {
  const previous = queryOne(`SELECT ${columns} FROM hotel_rates WHERE id = ? AND deleted_at = ''`, [req.params.id]);
  if (!previous) return res.status(404).json({ error: 'Hotel not found.' });
  const db = getDb();
  const now = new Date().toISOString();
  try {
    db.run('BEGIN');
    db.run('UPDATE hotel_rates SET deleted_at=?, updated_at=?, updated_by=? WHERE id=?', [now, now, res.locals.actor, req.params.id]);
    db.run('INSERT INTO hotel_rate_history (id,hotel_id,actor,created_at,before_data,after_data) VALUES (?,?,?,?,?,?)', [randomUUID(),req.params.id,res.locals.actor,now,JSON.stringify(present(previous)),JSON.stringify({ deleted: true, deletedAt: now })]);
    db.run('COMMIT');
    saveDb();
    res.json({ success: true, id: req.params.id });
  } catch (error) {
    db.run('ROLLBACK');
    next(error);
  }
});
router.post('/', save);
router.put('/:id', save);
async function save(req: any, res: any, next: any) {
  try {
    const data = req.body;
    const text = (key: string) => {
      if (typeof data[key] !== 'string' || !data[key].trim() || data[key].trim().length > 160) throw new Error(`${key}: enter between 1 and 160 characters.`);
      return data[key].trim();
    };
    const name = text('name'), city = text('city'), category = text('category');
    const seasonal = toPaise(data.seasonalRate), blackout = toPaise(data.blackoutRate);
    const dates = validateBlackoutDates(data.blackoutDates);
    let pdf: { name: string; data: string } | undefined;
    if (data.pdf != null) {
      if (typeof data.pdf.name !== 'string' || !/\.pdf$/i.test(data.pdf.name) || data.pdf.name.length > 180 || /[\\/\r\n]/.test(data.pdf.name)) throw new Error('Choose a PDF with a valid filename (up to 180 characters).');
      if (typeof data.pdf.data !== 'string' || data.pdf.data.length > 13981016 || !/^[A-Za-z0-9+/]+={0,2}$/.test(data.pdf.data)) throw new Error('Choose a PDF up to 10 MB.');
      const buffer = Buffer.from(data.pdf.data, 'base64');
      if (buffer.length > 10 * 1024 * 1024 || buffer.subarray(0, 5).toString() !== '%PDF-') throw new Error('Choose a valid PDF up to 10 MB.');
      try { const document = await PDFDocument.load(buffer); if (!document.getPageCount()) throw new Error(); } catch { throw new Error('This PDF cannot be opened. Choose an unencrypted, valid PDF.'); }
      pdf = data.pdf;
    }
    const previous = req.params.id ? queryOne(`SELECT ${columns} FROM hotel_rates WHERE id = ? AND deleted_at = ''`, [req.params.id]) : null;
    if (req.params.id && !previous) return res.status(404).json({ error: 'Hotel not found.' });
    const offSeasonValue = data.offSeasonRate === undefined ? (previous?.off_season_paise == null ? '' : (previous.off_season_paise / 100).toFixed(2)) : data.offSeasonRate;
    const offSeason = offSeasonValue === '' || offSeasonValue == null ? null : toPaise(offSeasonValue);
    const offSeasonStart = validateSeasonStart(data.offSeasonStartDate === undefined ? previous?.off_season_start_date : data.offSeasonStartDate, 'Off-season start date');
    const seasonStart = validateSeasonStart(data.seasonStartDate === undefined ? previous?.season_start_date : data.seasonStartDate, 'Season start date');
    const contact = validateHotelContact(data.contactNumber === undefined ? previous?.contact_number : data.contactNumber);
    const enabledCategories = queryAll("SELECT name FROM masters_data WHERE category = 'Hotel Categories' AND is_enabled = 1");
    if (category !== previous?.category && !enabledCategories.some(item => item.name === category)) throw new Error('Choose an active hotel category from Masters.');
    const id = previous?.id || randomUUID();
    const now = new Date().toISOString();
    const db = getDb();
    db.run('BEGIN');
    try {
      if (previous) {
        db.run('UPDATE hotel_rates SET name=?, city=?, category=?, seasonal_paise=?, blackout_paise=?, blackout_dates=?, updated_at=?, updated_by=? WHERE id=?', [name, city, category, seasonal, blackout, JSON.stringify(dates), now, res.locals.actor, id]);
      } else {
        db.run('INSERT INTO hotel_rates (id,name,city,category,seasonal_paise,blackout_paise,blackout_dates,updated_at,updated_by) VALUES (?,?,?,?,?,?,?,?,?)', [id,name,city,category,seasonal,blackout,JSON.stringify(dates),now,res.locals.actor]);
      }
      db.run('UPDATE hotel_rates SET off_season_paise=?, off_season_start_date=?, season_start_date=?, contact_number=? WHERE id=?', [offSeason, offSeasonStart, seasonStart, contact, id]);
      if (pdf || data.removePdf === true) db.run('UPDATE hotel_rates SET pdf_name=?, pdf_data=? WHERE id=?', [pdf?.name || '', pdf?.data || '', id]);
      const current = queryOne(`SELECT ${columns} FROM hotel_rates WHERE id=?`, [id]);
      db.run('INSERT INTO hotel_rate_history (id,hotel_id,actor,created_at,before_data,after_data) VALUES (?,?,?,?,?,?)', [randomUUID(),id,res.locals.actor,now,JSON.stringify(previous && present(previous)),JSON.stringify(present(current))]);
      db.run('COMMIT');
      saveDb();
      res.status(previous ? 200 : 201).json(present(current));
    } catch (error) { db.run('ROLLBACK'); throw error; }
  } catch (error) {
    if (error instanceof Error && !/SQL|database|table|column/i.test(error.message)) return res.status(400).json({ error: error.message });
    next(error);
  }
}
export default router;
