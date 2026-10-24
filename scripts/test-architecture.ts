import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer-core';
import initSqlJs from 'sql.js';
import { convertPdfToPngs } from './pdf-to-png';

const CHROME_PATH = fs.existsSync('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe')
  ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  : 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

const ARTIFACT_DIR = 'C:\\Users\\Rahul\\.gemini\\antigravity-ide\\brain\\10f6a607-5bf3-4559-8d92-e10f3577f82d';

async function testArch() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    const testHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            @page {
              size: A4 portrait;
              margin: 0;
            }
            * { box-sizing: border-box; }
            body {
              margin: 0;
              padding: 0;
              background: #fdfbf6;
              font-family: sans-serif;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .page-cover {
              width: 794px;
              height: 1123px;
              padding: 40px;
              background: #12213f;
              color: #fff;
              page-break-after: always;
              break-after: page;
            }
            .itinerary-table {
              width: 794px;
              margin: 0 auto;
              border-collapse: collapse;
              page-break-before: always;
              break-before: page;
              page-break-after: always;
              break-after: page;
            }
            thead.itin-header {
              display: table-header-group;
            }
            tfoot.itin-footer {
              display: table-footer-group;
            }
            tbody.itin-body {
              display: table-row-group;
            }
            .header-cell {
              padding: 24px 46px 12px;
              background: #fdfbf6;
              border-bottom: 2px solid #d4af37;
            }
            .footer-cell {
              padding: 20px 46px 24px;
              background: #fdfbf6;
              border-top: 1px solid #d9cfae;
            }
            .content-cell {
              padding: 20px 46px;
            }
            .day-card {
              background: #fff;
              border: 1px solid #e0d5b5;
              border-radius: 12px;
              padding: 16px;
              margin-bottom: 16px;
              break-inside: auto;
              box-decoration-break: clone;
              -webkit-box-decoration-break: clone;
            }
            .day-header {
              break-inside: avoid;
              break-after: avoid;
              margin-bottom: 8px;
            }
            .day-text {
              orphans: 3;
              widows: 3;
              line-height: 1.5;
            }
            .page-terms {
              width: 794px;
              height: 1123px;
              padding: 40px;
              background: #fff;
              page-break-before: always;
              break-before: page;
            }
          </style>
        </head>
        <body>
          <div class="page-cover">
            <h1>Cover Page (Page 1)</h1>
            <p>Summary details here...</p>
          </div>

          <table class="itinerary-table">
            <thead class="itin-header">
              <tr>
                <th class="header-cell">
                  <div style="display:flex;justify-content:space-between;align-items:center;">
                    <div>HEADER: LOGO & BRAND</div>
                    <div>Ref: KL-1003</div>
                  </div>
                </th>
              </tr>
            </thead>
            <tfoot class="itin-footer">
              <tr>
                <td class="footer-cell">
                  <div style="display:flex;justify-content:space-between;align-items:center;font-size:12px;">
                    <div>FOOTER: Terms note</div>
                    <div>Verified Itinerary</div>
                  </div>
                </td>
              </tr>
            </tfoot>
            <tbody class="itin-body">
              <tr>
                <td class="content-cell">
                  <div style="margin-bottom: 24px; background: #eef7f1; padding: 16px; border-radius: 12px;">
                    <h3>Inclusions & Exclusions</h3>
                    <p>Included items and excluded items here...</p>
                  </div>
                  <h2 style="break-after: avoid; margin-bottom: 16px;">Day-wise Itinerary</h2>
                  ${Array.from({ length: 8 }).map((_, i) => `
                    <div class="day-card">
                      <div class="day-header">
                        <h3>Day ${i + 1}: Scenic Destination Experience</h3>
                        <div style="width: 100%; height: 120px; background: #ccc; border-radius: 8px; display:flex; align-items:center; justify-content:center;">Image Placeholder</div>
                      </div>
                      <div class="day-text">
                        <p>Explore breathtaking natural sights and heritage monuments. Enjoy local cuisine, private scenic tours with verified chauffeurs, and relaxation at boutique resorts. Experience peaceful serenity across pristine mountain trails and crystal-clear lake shores.</p>
                        ${i === 1 ? `<p>${'Detailed afternoon tour visiting historic temples, gardens, and handicraft artisan shops. '.repeat(10)}</p>` : ''}
                      </div>
                    </div>
                  `).join('')}
                </td>
              </tr>
            </tbody>
          </table>

          <div class="page-terms">
            <h1>Terms & Cancellation (Final Page)</h1>
            <p>Terms content here...</p>
          </div>
        </body>
      </html>
    `;

    await page.setContent(testHtml, { waitUntil: 'networkidle0' as any });
    const outPdf = path.join(ARTIFACT_DIR, 'test_arch.pdf');
    await page.pdf({
      path: outPdf,
      format: 'A4',
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      preferCSSPageSize: true,
    });
    console.log('Generated test_arch.pdf');
    const images = await convertPdfToPngs(outPdf, 'test_arch');
    console.log('Generated PNGs:', images.length);
  } finally {
    await browser.close();
  }
}

testArch().catch(console.error);
