import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer-core';

const CHROME_PATH = fs.existsSync('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe')
  ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  : 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

export async function convertPdfToPngs(pdfPath: string, outputPrefix: string): Promise<string[]> {
  const artifactDir = path.dirname(pdfPath);
  const pdfData = fs.readFileSync(pdfPath);
  const pdfBase64 = pdfData.toString('base64');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const generatedImages: string[] = [];

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 1600, deviceScaleFactor: 1 });

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
        </head>
        <body style="margin:0; background:#eee;">
          <div id="pages-container"></div>
        </body>
      </html>
    `;

    await page.setContent(html, { waitUntil: 'load' });

    const numPages = await page.evaluate(async (base64Str: string) => {
      (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      
      const raw = atob(base64Str);
      const uint8 = new Uint8Array(raw.length);
      for (let i = 0; i < raw.length; i++) {
        uint8[i] = raw.charCodeAt(i);
      }

      const pdf = await (window as any).pdfjsLib.getDocument({ data: uint8 }).promise;
      const container = document.getElementById('pages-container')!;

      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const pdfPage = await pdf.getPage(pageNum);
        const scale = 2.0;
        const viewport = pdfPage.getViewport({ scale });

        const canvas = document.createElement('canvas');
        canvas.id = 'page-canvas-' + pageNum;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.style.display = 'block';
        canvas.style.margin = '20px auto';
        container.appendChild(canvas);

        const ctx = canvas.getContext('2d')!;
        await pdfPage.render({ canvasContext: ctx, viewport }).promise;
      }
      return pdf.numPages;
    }, pdfBase64);

    console.log(`PDF has ${numPages} pages. Capturing PNGs...`);

    for (let p = 1; p <= numPages; p++) {
      const canvasEl = await page.$(`#page-canvas-${p}`);
      if (canvasEl) {
        const outPath = path.isAbsolute(outputPrefix)
          ? `${outputPrefix}_page_${p}.png`
          : path.join(artifactDir, `${outputPrefix}_page_${p}.png`);
        await canvasEl.screenshot({ path: outPath, type: 'png' });
        generatedImages.push(outPath);
        console.log(`Saved page ${p} to ${outPath}`);
      }
    }

  } finally {
    await browser.close();
  }

  return generatedImages;
}
