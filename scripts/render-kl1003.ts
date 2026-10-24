import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer-core';
import initSqlJs from 'sql.js';
import {
  QuoteDataModel,
  renderCompleteProposalHtml,
} from '../services/quoteDesignRenderer';

const CHROME_PATH = fs.existsSync('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe')
  ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  : 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

const ARTIFACT_DIR = 'C:\\Users\\Rahul\\.gemini\\antigravity-ide\\brain\\e09334a9-8292-473d-a3c5-fb4d65aef402';

async function main() {
  const SQL = await initSqlJs();
  const db = new SQL.Database(fs.readFileSync('kingsland.db'));

  // Load KL-1003 lead
  const leadRows = db.exec("SELECT * FROM leads WHERE trip_id = 'KL-1003'")[0];
  const lead: any = Object.fromEntries(leadRows.columns.map((c, i) => [c, leadRows.values[0][i]]));

  const quoteRows = db.exec("SELECT * FROM quotes WHERE lead_id = '" + lead.id + "'")[0];
  const quote: any = Object.fromEntries(quoteRows.columns.map((c, i) => [c, quoteRows.values[0][i]]));

  const dayRows = db.exec("SELECT * FROM quote_itinerary_days WHERE quote_id = '" + quote.id + "' ORDER BY day_number ASC")[0];
  const days = dayRows ? dayRows.values.map(v => ({
    title: v[3] as string,
    text: v[4] as string,
    img: v[5] as string,
  })) : [];

  const hotelRows = db.exec("SELECT * FROM quote_hotels WHERE quote_id = '" + quote.id + "'")[0];
  const hotels = hotelRows ? hotelRows.values.map(v => ({
    nights: `${v[3]} Night`,
    name: v[4] as string,
    type: v[5] as string,
    room: v[6] as string,
    rooms: '1 Room with Breakfast',
    city: v[7] as string,
  })) : [];

  const partnerRows = db.exec("SELECT * FROM partner_brands WHERE is_active=1 ORDER BY sort_order ASC, created_at ASC")[0];
  const partners = partnerRows ? partnerRows.values.map(v => Object.fromEntries(partnerRows.columns.map((c, i) => [c, v[i]]))) : [];

  const agencyRows = db.exec("SELECT * FROM agency_settings")[0];
  const agency: any = Object.fromEntries(agencyRows.columns.map((c, i) => [c, agencyRows.values[0][i]]));

  const Q: QuoteDataModel = {
    client: lead.name,
    ref: lead.trip_id,
    logoUrl: agency.logo_url || '',
    companyName: agency.company_name || 'Kingsland Holidays',
    packageName: quote.package_title || 'Kashmir Tour',
    longDuration: '7 Nights / 8 Days',
    duration: '7N / 8D',
    city: lead.destination || 'Kashmir',
    services: 'Private Cab, Luxury Hotels, Houseboat, Shikara Ride',
    travellers: '2 Adults',
    priceNote: 'Twin Sharing · All Taxes Included',
    price: '₹' + Number(quote.final_price || 65000).toLocaleString('en-IN'),
    rawPrice: Number(quote.final_price || 65000),
    discountPercent: 10,
    hotel: hotels[0] || { nights: '3 Nights', name: 'Hotel', type: 'Luxury', room: 'Deluxe', rooms: '1 Room', city: 'Srinagar' },
    hotels: hotels.length > 0 ? hotels : undefined,
    included: [
      'Welcome drink on arrival (traditional Kashmiri Kahwa)',
      '7 Nights accommodation in verified luxury properties',
      'Daily breakfast and lavish chef dinner at all hotels',
      'Private dedicated Innova Crysta for all transfers & sightseeing',
      '1 Hour complimentary Shikara ride on pristine Dal Lake',
      'All toll taxes, state permits, driver allowances & parking charges',
    ],
    excluded: [
      'Airfare to and from destination',
      'Personal expenses, laundry, telephone calls & tips',
      'Any extra meal or beverage not mentioned in inclusions',
      'Mandatory travel insurance and medical expenses',
    ],
    days,
    advisor: {
      name: 'Mohit Ahlawat',
      role: 'Senior Trip Advisor',
      phones: '+91 6376983416 · +91 7014939068',
      email: 'official.kingslandholidays@gmail.com',
    },
    stats: [
      ['12,000+', 'Trips delivered'],
      ['4.8/5', '2,140+ reviews'],
      ['24/7', 'Trip assistance'],
      ['100%', 'Customised plans'],
    ]
  };

  const html = renderCompleteProposalHtml(Q, 'royal', partners as any);

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    const doc = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <link href="https://fonts.googleapis.com/css2?family=Cabinet+Grotesk:wght@700;800;900&family=DM+Sans:ital,wght@0,400;0,500;0,700;1,400&family=DM+Serif+Display:ital@0;1&family=Manrope:wght@400;500;600;700;800&family=Outfit:wght@400;500;600;700;800&family=Playfair+Display:ital,wght@0,600;0,700;0,800;1,600;1,700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
          <style>
            @page { size: A4 portrait; margin: 0; }
            * { box-sizing: border-box; }
            body {
              margin: 0;
              padding: 0;
              background: #fff;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .sheet {
              page-break-after: always;
              break-after: page;
              width: 794px;
              height: 1123px;
              box-sizing: border-box;
              position: relative;
              overflow: hidden;
            }
            .itinerary-continuous, .itinerary-container {
              width: 794px;
              margin: 0 auto;
              break-before: page;
              page-break-before: always;
              break-after: page;
              page-break-after: always;
            }
            table.itinerary-table {
              width: 100%;
              border-collapse: collapse;
            }
            thead.itin-thead {
              display: table-header-group;
            }
            tfoot.itin-tfoot {
              display: table-footer-group;
            }
            tbody.itin-tbody {
              display: table-row-group;
            }
            .day-card-header, .day-image-wrap, .day-title-wrap {
              break-inside: avoid !important;
              page-break-inside: avoid !important;
            }
            .day-card, .day-text-wrap {
              break-inside: auto !important;
              page-break-inside: auto !important;
            }
            .day-text-wrap {
              orphans: 3 !important;
              widows: 3 !important;
            }
          </style>
        </head>
        <body>
          <div id="pdf-container">${html}</div>
        </body>
      </html>
    `;

    await page.setContent(doc, { waitUntil: 'networkidle0' as any });
    await new Promise(r => setTimeout(r, 600));

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: 0, bottom: 0, left: 0, right: 0 },
    });

    const outPdf = path.join(ARTIFACT_DIR, 'current_kl1003_raw.pdf');
    fs.writeFileSync(outPdf, pdfBuffer);
    console.log('Saved current KL-1003 PDF to:', outPdf);
    console.log('PDF bytes:', pdfBuffer.length);

    const sheetCount = await page.evaluate(() => document.querySelectorAll('.sheet').length);
    console.log('Sheet count in DOM:', sheetCount);

    const { convertPdfToPngs } = await import('./pdf-to-png');
    await convertPdfToPngs(outPdf, 'current_kl1003');

  } finally {
    await browser.close();
  }
}

main().catch(console.error);
