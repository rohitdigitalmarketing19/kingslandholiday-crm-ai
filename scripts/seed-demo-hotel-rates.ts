import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { initDb, getDb, queryAll, queryOne, saveDb, createBackupSnapshot } from '../server/db/connection';
import { initializeDatabase } from '../server/db/schema';
import { toPaise, matchesRateBand, RATE_BANDS } from '../utils/hotelRates';

// Explicit, repeatable demo seed. Never runs during normal server startup.
if (!process.argv.includes('--apply')) throw new Error('Run with --apply to add 20 clearly labelled demo hotels.');
await initDb();
createBackupSnapshot('before-demo-hotel-rates');
initializeDatabase();
const categories = queryAll("SELECT name FROM masters_data WHERE category='Hotel Categories' AND is_enabled=1 ORDER BY name").map(row => row.name);
if (!categories.length) throw new Error('Add at least one active hotel category in Masters before seeding.');
const samples: [string, string, string][] = [
  ['City Nest', 'Jaipur', '750'], ['Pink City Inn', 'Jaipur', '1000'],
  ['Lake View Stay', 'Udaipur', '1100'], ['Garden Courtyard', 'Udaipur', '1500'],
  ['Desert Pearl', 'Jaisalmer', '2000'], ['Golden Dunes', 'Jaisalmer', '2250'],
  ['Mountain Nest', 'Manali', '2750'], ['Pine Valley', 'Manali', '3000'],
  ['Snowline Retreat', 'Shimla', '3250'], ['Cedar Heights', 'Shimla', '3500'],
  ['Riverstone Lodge', 'Rishikesh', '4000'], ['Ganga Courtyard', 'Rishikesh', '4500'],
  ['Palm Grove', 'Goa', '5000'], ['Seabreeze Resort', 'Goa', '5500'],
  ['Harbour View', 'Kochi', '6500'], ['Backwater Haven', 'Kochi', '8000'],
  ['Royal Orchard', 'Srinagar', '8500'], ['Valley Palace', 'Srinagar', '10000'],
  ['Coral Bay', 'Port Blair', '12000'], ['Island Crown', 'Port Blair', '15000'],
];
const pending: any[][] = [];
const now = new Date().toISOString();
for (const [index, [label, city, seasonalRate]] of samples.entries()) {
  const id = `demo-hotel-rate-${String(index + 1).padStart(2, '0')}`;
  if (queryOne('SELECT id FROM hotel_rates WHERE id=?', [id])) continue;
  const name = `[DEMO] ${label}`;
  const category = categories[index % categories.length];
  const seasonal = toPaise(seasonalRate), blackout = seasonal + 150000;
  const dates = [{ start: '2026-11-01', end: '2026-11-05' }, { start: '2026-12-24', end: '2027-01-02' }];
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const lines = [
    'DEMO HOTEL RATE SHEET', name.replace('[DEMO] ', ''),
    `City: ${city}`, `Category: ${category}`,
    `Seasonal rate: INR ${seasonalRate} per room per night`,
    `Blackout rate: INR ${(blackout / 100).toFixed(2)} per room per night`,
    'Blackout dates (inclusive):', '01 Nov 2026 - 05 Nov 2026', '24 Dec 2026 - 02 Jan 2027',
    'Sample data for CRM testing only.', 'This is not a real hotel quotation or confirmed supplier rate.',
    'Use this document to test PDF preview and download.',
  ];
  lines.forEach((line, i) => page.drawText(line, { x: 48, y: 780 - i * 34, size: i === 0 ? 20 : 12, font: i < 2 ? bold : font, color: rgb(0.1, 0.16, 0.28) }));
  pending.push([id,name,city,category,seasonal,blackout,JSON.stringify(dates),`Demo-${label.replaceAll(' ', '-')}-Rates.pdf`,Buffer.from(await pdf.save()).toString('base64'),now,'demo-seed']);
}
const db = getDb();
db.run('BEGIN');
try {
  for (const values of pending) {
    db.run('INSERT INTO hotel_rates (id,name,city,category,seasonal_paise,blackout_paise,blackout_dates,pdf_name,pdf_data,updated_at,updated_by) VALUES (?,?,?,?,?,?,?,?,?,?,?)', values);
    db.run('INSERT INTO hotel_rate_history (id,hotel_id,actor,created_at,before_data,after_data) VALUES (?,?,?,?,?,?)', [`${values[0]}-created`,values[0],'demo-seed',now,'null',JSON.stringify({ name: values[1], source: 'Explicit demo seed', city: values[2], seasonalPaise: values[4] })]);
  }
  db.run('COMMIT'); saveDb();
} catch (error) { db.run('ROLLBACK'); throw error; }
const rows = queryAll("SELECT id,seasonal_paise,pdf_data,blackout_dates FROM hotel_rates WHERE id LIKE 'demo-hotel-rate-%'");
if (rows.length !== 20 || rows.some(row => !row.pdf_data || JSON.parse(row.blackout_dates).length !== 2)) throw new Error('Demo hotel verification failed.');
console.log(`Added ${pending.length} demo hotels; verified ${rows.length} total with PDFs and two blackout periods each.`);
for (const band of RATE_BANDS.slice(1)) console.log(`${band.label}: ${rows.filter(row => matchesRateBand((row.seasonal_paise / 100).toFixed(2),band.value)).length} hotels`);
