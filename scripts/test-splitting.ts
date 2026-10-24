import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer-core';
import { convertPdfToPngs } from './pdf-to-png';

const CHROME_PATH = fs.existsSync('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe')
  ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  : 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

const ARTIFACT_DIR = 'C:\\Users\\Rahul\\.gemini\\antigravity-ide\\brain\\10f6a607-5bf3-4559-8d92-e10f3577f82d';

async function testSplitting() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    const longP = 'This is a very long text paragraph designed to span across a page boundary. '.repeat(15);

    const testHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            @page { size: A4 portrait; margin: 0; }
            * { box-sizing: border-box; }
            body { margin: 0; padding: 0; background: #fff; font-family: sans-serif; -webkit-print-color-adjust: exact !important; }
            table { width: 794px; margin: 0 auto; border-collapse: collapse; }
            thead { display: table-header-group; }
            tfoot { display: table-footer-group; }
            th, td { padding: 0; }
            .header-bar { padding: 20px 46px 12px; background: #fdfbf6; border-bottom: 2px solid #d4af37; font-weight: bold; }
            .footer-bar { padding: 16px 46px 20px; background: #fdfbf6; border-top: 1px solid #d9cfae; font-size: 11px; }
            .content { padding: 20px 46px; background: #fdfbf6; }

            /* Timeline approach: Container has a continuous line on left border / pseudo-line */
            .timeline-stream {
              position: relative;
              padding-left: 52px;
            }
            .timeline-stream::before {
              content: '';
              position: absolute;
              left: 19px;
              top: 19px;
              bottom: 24px;
              width: 2px;
              background: #d4af37;
            }
            .day-row {
              position: relative;
              margin-bottom: 16px;
              break-inside: auto;
              page-break-inside: auto;
            }
            .day-badge {
              position: absolute;
              left: -52px;
              top: 0;
              width: 38px;
              height: 38px;
              border-radius: 19px;
              background: #12213f;
              color: #d4af37;
              border: 1px solid #d4af37;
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: bold;
              z-index: 2;
            }
            .day-card {
              background: #fff;
              border: 1px solid #e0d5b5;
              border-radius: 12px;
              padding: 14px 16px;
              break-inside: auto;
              page-break-inside: auto;
              box-decoration-break: clone;
              -webkit-box-decoration-break: clone;
            }
            .day-head {
              break-inside: avoid !important;
              page-break-inside: avoid !important;
              break-after: avoid !important;
              page-break-after: avoid !important;
            }
            .day-body {
              break-inside: auto;
              page-break-inside: auto;
              orphans: 3;
              widows: 3;
              font-size: 12px;
              line-height: 1.5;
              margin-top: 8px;
            }
          </style>
        </head>
        <body>
          <table>
            <thead>
              <tr>
                <th><div class="header-bar">TEST REPEATING HEADER</div></th>
              </tr>
            </thead>
            <tfoot>
              <tr>
                <td><div class="footer-bar">TEST REPEATING FOOTER (20px clear margin)</div></td>
              </tr>
            </tfoot>
            <tbody>
              <tr>
                <td class="content">
                  <div class="timeline-stream">
                    <div class="day-row">
                      <div class="day-badge">01</div>
                      <div class="day-card">
                        <div class="day-head">
                          <div style="height: 100px; background: #ddd; border-radius: 8px; margin-bottom: 8px;">IMG</div>
                          <h3 style="margin: 0;">Day 1: First Day</h3>
                        </div>
                        <div class="day-body">Short description for day 1. Beautiful sunset and arrival.</div>
                      </div>
                    </div>

                    <div class="day-row">
                      <div class="day-badge">02</div>
                      <div class="day-card">
                        <div class="day-head">
                          <div style="height: 100px; background: #ddd; border-radius: 8px; margin-bottom: 8px;">IMG</div>
                          <h3 style="margin: 0;">Day 2: Long Splitting Day</h3>
                        </div>
                        <div class="day-body">${longP}</div>
                      </div>
                    </div>

                    <div class="day-row">
                      <div class="day-badge">03</div>
                      <div class="day-card">
                        <div class="day-head">
                          <div style="height: 100px; background: #ddd; border-radius: 8px; margin-bottom: 8px;">IMG</div>
                          <h3 style="margin: 0;">Day 3: Third Day</h3>
                        </div>
                        <div class="day-body">Short description for day 3. Peaceful lake and mountains.</div>
                      </div>
                    </div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </body>
      </html>
    `;

    await page.setContent(testHtml, { waitUntil: 'networkidle0' as any });
    const outPdf = path.join(ARTIFACT_DIR, 'test_split.pdf');
    await page.pdf({
      path: outPdf,
      format: 'A4',
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    });
    console.log('Generated test_split.pdf');
    await convertPdfToPngs(outPdf, 'test_split');
  } finally {
    await browser.close();
  }
}

testSplitting().catch(console.error);
