import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer-core';
import initSqlJs from 'sql.js';
import { convertPdfToPngs } from './pdf-to-png';
import { renderTermsSheet, QuoteDataModel } from '../services/quoteDesignRenderer';

const CHROME_PATH = fs.existsSync('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe')
  ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  : 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

const ARTIFACT_DIR = 'C:\\Users\\Rahul\\.gemini\\antigravity-ide\\brain\\10f6a607-5bf3-4559-8d92-e10f3577f82d';

async function testTerms() {
  const SQL = await initSqlJs();
  const db = new SQL.Database(fs.readFileSync('kingsland.db'));

  const leadRows = db.exec("SELECT * FROM leads WHERE trip_id = 'KL-1003'")[0];
  const lead: any = Object.fromEntries(leadRows.columns.map((c, i) => [c, leadRows.values[0][i]]));

  const agencyRows = db.exec("SELECT * FROM agency_settings")[0];
  const agency: any = Object.fromEntries(agencyRows.columns.map((c, i) => [c, agencyRows.values[0][i]]));

  const partnerRows = db.exec("SELECT * FROM partner_brands WHERE is_active=1 ORDER BY sort_order ASC, created_at ASC")[0];
  const partners = partnerRows ? partnerRows.values.map(v => Object.fromEntries(partnerRows.columns.map((c, i) => [c, v[i]]))) : [];

  const Q: QuoteDataModel = {
    client: lead.name,
    ref: lead.trip_id,
    logoUrl: agency.logo_url || '',
    companyName: agency.company_name || 'Kingsland Holidays',
    packageName: '7 Days Magical Kashmir Holiday Tour',
    longDuration: '6 Nights / 7 Days',
    duration: '6N / 7D',
    city: 'Kashmir',
    services: 'Private Cab, Luxury Hotels, Houseboat, Shikara Ride',
    travellers: '2 Adults',
    priceNote: 'Twin Sharing · All Taxes Included',
    price: '₹65,000',
    hotel: { nights: '3 Nights', name: 'The Lalit Grand Palace', type: '5-Star Luxury', room: 'Deluxe Palace Room', rooms: '1 Room', city: 'Srinagar' },
    included: [],
    excluded: [],
    days: []
  };

  const termsHtml = renderTermsSheet(Q, 'diwali', partners as any);

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    const fullDoc = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800&family=Playfair+Display:ital,wght@0,600;0,700;0,800&display=swap" rel="stylesheet">
          <style>
            @page { size: A4 portrait; margin: 0; }
            * { box-sizing: border-box; }
            body { margin: 0; padding: 0; background: #fff; -webkit-print-color-adjust: exact !important; }
            .sheet { width: 794px; height: 1123px; margin: 0 auto; overflow: hidden; position: relative; }
          </style>
        </head>
        <body>
          ${termsHtml}
        </body>
      </html>
    `;

    await page.setContent(fullDoc, { waitUntil: 'networkidle0' as any });
    const outPdf = path.join(ARTIFACT_DIR, 'test_terms.pdf');
    await page.pdf({
      path: outPdf,
      format: 'A4',
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 }
    });
    console.log('Saved test_terms.pdf');
    await convertPdfToPngs(outPdf, 'test_terms');
  } finally {
    await browser.close();
  }
}

testTerms().catch(console.error);
