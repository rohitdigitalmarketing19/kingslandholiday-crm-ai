import type { Page } from 'puppeteer-core';
import { PDFDocument, rgb } from 'pdf-lib';

/** Preserve native continuous table pagination; fill only the last itinerary page. */
export async function renderProposalPdfPages(page: Page, fullHtml: string, contentHtml: string): Promise<Uint8Array> {
  const sections = await page.evaluate(() => Array.from(document.querySelectorAll('.sheet, table.itinerary-table'))
    .map(el => ({
      html: el.outerHTML,
      itinerary: el.matches('table.itinerary-table'),
      background: getComputedStyle(el).backgroundColor,
    })));
  if (!sections.length) throw new Error('Proposal has no printable sections');
  const merged = await PDFDocument.create();
  for (const section of sections) {
    await page.setContent(fullHtml.replace(contentHtml, section.html), { waitUntil: 'load', timeout: 20000 });
    await page.evaluate(async () => { await document.fonts.ready; });
    if (section.itinerary) {
      // Keep image/title headers intact, but let the description continue onto
      // the next page. Keeping a whole day together creates large empty gaps.
      await page.addStyleTag({ content: `
        html, body { background: transparent !important; }
        table.itinerary-table { break-before: auto !important; }
        .day-card-wrapper, .day-card { break-inside: auto !important; page-break-inside: auto !important; }
      ` });
    }
    const bytes = await page.pdf({
      format: 'A4', printBackground: true, displayHeaderFooter: false,
      margin: { top: 0, bottom: 0, left: 0, right: 0 },
    });
    const source = await PDFDocument.load(bytes);
    for (const index of source.getPageIndices()) {
      if (section.itinerary && index === source.getPageCount() - 1) {
        const original = source.getPage(index);
        const { width, height } = original.getSize();
        const embedded = await merged.embedPage(original);
        const last = merged.addPage([width, height]);
        const channels = section.background.match(/[\d.]+/g)?.slice(0, 3).map(Number) || [255, 255, 255];
        last.drawRectangle({ x: 0, y: 0, width, height, color: rgb(channels[0] / 255, channels[1] / 255, channels[2] / 255) });
        last.drawPage(embedded, { x: 0, y: 0, width, height });
      } else {
        const [copy] = await merged.copyPages(source, [index]);
        merged.addPage(copy);
      }
    }
  }
  return merged.save();
}
