import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer-core';
import initSqlJs from 'sql.js';
import { convertPdfToPngs } from './pdf-to-png';

const CHROME_PATH = fs.existsSync('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe')
  ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  : 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

const ARTIFACT_DIR = 'C:\\Users\\Rahul\\.gemini\\antigravity-ide\\brain\\e09334a9-8292-473d-a3c5-fb4d65aef402';

async function testContinuousItin() {
  const SQL = await initSqlJs();
  const db = new SQL.Database(fs.readFileSync('kingsland.db'));

  // Load KL-1003
  const leadRows = db.exec("SELECT * FROM leads WHERE trip_id = 'KL-1003'")[0];
  const lead = Object.fromEntries(leadRows.columns.map((c, i) => [c, leadRows.values[0][i]]));

  const quoteRows = db.exec("SELECT * FROM quotes WHERE lead_id = '" + lead.id + "'")[0];
  const quote = Object.fromEntries(quoteRows.columns.map((c, i) => [c, quoteRows.values[0][i]]));

  const dayRows = db.exec("SELECT * FROM quote_itinerary_days WHERE quote_id = '" + quote.id + "' ORDER BY day_number ASC")[0];
  const longParagraph = 'Start your morning with a refreshing breakfast at the luxury retreat overlooking the panoramic valley. We then embark on an unforgettable journey across high mountain passes, visiting historic shrines and breathtaking viewpoints along the highway. Enjoy scenic photo opportunities by pine forests, tranquil lakeside walks, traditional local culinary tastings, and guided exploration of century-old heritage monuments. In the afternoon, explore local artisan markets showcasing exquisite Kashmiri Pashmina shawls, handcrafted walnut woodwork, and world-renowned saffron. As the evening sets in, enjoy tranquil boat rides or relax by the illuminated fountains under the starlit sky with authentic saffron Kahwa tea.';
  const days = dayRows ? dayRows.values.map((v, idx) => ({
    title: v[3] as string,
    text: idx === 1 ? (longParagraph + '\n\n' + longParagraph + '\n\n' + longParagraph) : (v[4] as string),
    img: v[5] as string,
  })) : [];

  const agencyRows = db.exec("SELECT * FROM agency_settings")[0];
  const agency = Object.fromEntries(agencyRows.columns.map((c, i) => [c, agencyRows.values[0][i]]));
  const logoUrl = agency.logo_url;

  // Build Day cards HTML as ONE continuous flow
  const rF = "'Manrope',sans-serif", rH = "'Playfair Display',serif";

  const allDaysHtml = days.map((d, i) => {
    const dayNum = i + 1;

    // Day Image with blurred backdrop
    const imgHtml = d.img ? `
      <div class="day-image-wrap" style="position:relative;width:100%;height:210px;border-radius:12px;overflow:hidden;background:#141414;break-inside:avoid;page-break-inside:avoid;display:flex;align-items:center;justify-content:center;margin-bottom:12px">
        <img src="${d.img}" alt="" crossOrigin="anonymous" aria-hidden="true" style="position:absolute;left:-5%;top:-5%;width:110%;height:110%;object-fit:cover;filter:blur(20px) brightness(0.7);pointer-events:none;display:block;" />
        <img src="${d.img}" alt="${d.title}" crossOrigin="anonymous" style="position:relative;z-index:2;max-width:100%;max-height:100%;width:auto;height:auto;object-fit:contain;display:block;margin:auto;box-shadow:0 4px 14px rgba(0,0,0,0.35);" />
      </div>` : '';

    return `
      <div class="day-card" style="margin-left:52px;position:relative;background:#fff;border:1px solid #e8e1cf;border-radius:14px;padding:14px 16px;box-shadow:0 3px 10px rgba(18,33,63,.05);margin-bottom:14px;box-sizing:border-box;break-inside:auto;page-break-inside:auto">
        <!-- Day Card Header (number + image + title) kept together so day never leaves orphaned number or title -->
        <div class="day-card-header" style="break-inside:avoid !important;page-break-inside:avoid !important;position:relative">
          <div style="position:absolute;left:-52px;top:0;width:38px;height:38px;border-radius:19px;background:#12213f;color:#d4af37;font-family:${rH};font-weight:700;font-size:15px;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,0.15);z-index:2">
            ${String(dayNum).padStart(2, '0')}
          </div>
          ${imgHtml}
          <div class="day-title-wrap" style="font-family:${rH};font-size:16px;font-weight:700;line-height:1.25;color:#1b2540;break-inside:avoid;page-break-inside:avoid;margin-bottom:8px">
            Day ${dayNum}: ${d.title}
          </div>
        </div>
        <!-- Day Text can split naturally across pages -->
        <div class="day-text-wrap" style="font-size:12px;line-height:1.5;color:#3b455f;word-break:break-word;white-space:pre-wrap;break-inside:auto;page-break-inside:auto;orphans:3;widows:3">
          ${d.text}
        </div>
      </div>
    `;
  }).join('');

  // Repeating header
  const repeatingHeader = `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:24px 46px 12px;border-bottom:1.5px solid #d4af37;background:#fdfbf6">
      <div style="display:flex;align-items:center;gap:10px">
        <div style="background:#ffffff;padding:3px 10px;border-radius:8px;border:1.5px solid #d4af37;box-shadow:0 2px 8px rgba(212,175,55,0.15);display:flex;align-items:center">
          <img src="${logoUrl}" alt="Kingsland Holidays" crossOrigin="anonymous" style="max-height:30px;max-width:120px;width:auto;height:auto;object-fit:contain;display:block" />
        </div>
        <div style="font-family:${rH};font-size:18px;font-weight:700;color:#12213f">Kingsland Holidays</div>
      </div>
      <div style="font-size:11.5px;color:#5f6985;font-weight:600">${quote.package_title || 'Kashmir Tour'} · Ref. No. KL-1003</div>
    </div>
  `;

  // Repeating footer
  const repeatingFooter = `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 46px 20px;border-top:1.5px solid #d9cfae;background:#fdfbf6;font-size:11px;color:#5f6985">
      <div style="display:flex;align-items:center;gap:8px">
        <span>Itinerary is indicative and may change with weather, road conditions or local permits.</span>
      </div>
      <div style="font-weight:700;color:#12213f">Kingsland Verified Itinerary</div>
    </div>
  `;

  const fullDoc = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800&family=Playfair+Display:ital,wght@0,600;0,700;0,800&display=swap" rel="stylesheet">
        <style>
          @page {
            size: A4 portrait;
            margin: 0;
          }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            padding: 0;
            background: #fff;
            font-family: ${rF};
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
          .itinerary-container {
            width: 794px;
            margin: 0 auto;
            background: #fdfbf6;
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
          .day-image-wrap {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          .day-title-wrap {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          .day-text-wrap {
            break-inside: auto !important;
            page-break-inside: auto !important;
            orphans: 3;
            widows: 3;
          }
          .day-card {
            break-inside: auto !important;
            page-break-inside: auto !important;
          }
          .day-row {
            break-inside: auto !important;
            page-break-inside: auto !important;
          }
        </style>
      </head>
      <body>
        <!-- Page 1: Cover Placeholder -->
        <div class="sheet" style="background:#12213f;color:#fff;display:flex;flex-direction:column;justify-content:center;align-items:center">
          <img src="${logoUrl}" style="max-height:60px;margin-bottom:20px;" />
          <h1 style="font-family:${rH};font-size:36px;margin:0">KL-1003 Cover Page</h1>
        </div>

        <!-- Continuous Itinerary Flow -->
        <div class="itinerary-container">
          <table class="itinerary-table">
            <thead class="itin-thead">
              <tr>
                <td style="padding:0">
                  ${repeatingHeader}
                </td>
              </tr>
            </thead>
            <tfoot class="itin-tfoot">
              <tr>
                <td style="padding:0">
                  ${repeatingFooter}
                </td>
              </tr>
            </tfoot>
            <tbody class="itin-tbody">
              <tr>
                <td style="padding:16px 46px 16px">
                  <!-- Main Heading ONCE above Day 1 -->
                  <div style="display:flex;align-items:center;gap:12px;margin-bottom:18px">
                    <div style="color:#d4af37">📍</div>
                    <div style="font-family:${rH};font-size:24px;font-weight:700;color:#12213f">Day-wise Itinerary</div>
                    <div style="flex:1;height:2px;background:#d4af37"></div>
                  </div>

                  <!-- All Days Flow with continuous vertical timeline track -->
                  <div style="position:relative;width:100%">
                    <div style="position:absolute;left:18px;top:19px;bottom:30px;width:2px;background:#d4af37;z-index:1"></div>
                    ${allDaysHtml}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Page Last: Terms Placeholder -->
        <div class="sheet" style="background:#fdfbf6;display:flex;flex-direction:column;justify-content:center;align-items:center">
          <h1 style="font-family:${rH};font-size:36px;margin:0">Terms &amp; Cancellation Policy</h1>
        </div>
      </body>
    </html>
  `;

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setContent(fullDoc, { waitUntil: 'networkidle0' as any });
    await new Promise(r => setTimeout(r, 600));

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: 0, bottom: 0, left: 0, right: 0 },
    });

    const testPdfPath = path.join(ARTIFACT_DIR, 'test_continuous_itin.pdf');
    fs.writeFileSync(testPdfPath, pdfBuffer);
    console.log('Saved test continuous itinerary PDF to:', testPdfPath);

    await convertPdfToPngs(testPdfPath, 'test_continuous');

  } finally {
    await browser.close();
  }
}

testContinuousItin().catch(console.error);
