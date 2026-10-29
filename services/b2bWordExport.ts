import type { QuoteDataModel, HotelItemModel } from './quoteDesignRenderer';
import { DEFAULT_TERMS } from './quoteDesignRenderer';

/** Native, editable OOXML. No agency logo, advisor contacts or partner badges. */
export async function generateB2BWord(quote: QuoteDataModel): Promise<Blob> {
  const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, HeadingLevel, BorderStyle, ImageRun } = await import('docx');
  const navy = '172441', gold = 'F6EDCF';
  const para = (text: string, bold = false) => new Paragraph({ children: [new TextRun({ text, bold })], spacing: { after: 110 } });
  const heading = (text: string) => new Paragraph({ text, heading: HeadingLevel.HEADING_1, spacing: { before: 260, after: 140 }, keepNext: true });
  const money = (value: number) => '₹' + value.toLocaleString('en-IN');
  const number = (value: string) => Number(value.replace(/[^0-9.]/g, '')) || 0;
  const options: { hotels: HotelItemModel[]; price: string }[] = [{ hotels: quote.hotels?.length ? quote.hotels : [quote.hotel], price: quote.price }];
  if (quote.hotelAlternative) options.push(quote.hotelAlternative);
  const cell = (children: InstanceType<typeof Paragraph>[], fill = 'FFFFFF') => new TableCell({
    width: { size: 100 / options.length, type: WidthType.PERCENTAGE }, children,
    shading: { fill }, margins: { top: 160, bottom: 160, left: 180, right: 180 },
    borders: { top: { style: BorderStyle.SINGLE, size: 4, color: 'E5DBC5' }, bottom: { style: BorderStyle.SINGLE, size: 4, color: 'E5DBC5' }, left: { style: BorderStyle.SINGLE, size: 4, color: 'E5DBC5' }, right: { style: BorderStyle.SINGLE, size: 4, color: 'E5DBC5' } },
  });
  const children: (InstanceType<typeof Paragraph> | InstanceType<typeof Table>)[] = [
    new Paragraph({ text: quote.packageName || 'Travel quotation', heading: HeadingLevel.TITLE }),
    para(`Prepared for ${quote.client} | Reference ${quote.ref}`),
    para(`${quote.city} | ${quote.longDuration} | ${quote.travellers}`),
    para(quote.services),
    heading('Hotel Details'),
    new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [
      new TableRow({ tableHeader: true, children: options.map((option, i) => cell([new Paragraph({ children: [new TextRun({ text: `OPTION ${i + 1}`, bold: true, color: 'F4CA59' }), new TextRun({ text: `   ${option.hotels.reduce((n, h) => n + (parseInt(h.nights, 10) || 1), 0)} Nights`, color: 'FFFFFF' })] })], navy)) }),
      new TableRow({ children: options.map(option => cell(option.hotels.flatMap(h => [
        para(`${h.nights} · ${h.city || quote.city}`, true),
        new Paragraph({ children: [new TextRun({ text: h.name, bold: true, font: 'Georgia', size: 26 })], spacing: { after: 100 } }),
        para(`${h.room} · ${h.mealPlan || 'As per inclusions'}`),
        ...(h.notes ? [para(h.notes)] : []),
      ]))) }),
      new TableRow({ children: options.map(option => {
        const value = number(option.price), cut = Math.round(value * (1 + (quote.discountPercent || 0) / 100));
        return cell([para('TOTAL LAND PACKAGE COST', true), ...(cut > value ? [new Paragraph({ children: [new TextRun({ text: money(cut), strike: true, color: '786F57' })] })] : []), new Paragraph({ children: [new TextRun({ text: option.price, bold: true, size: 36, font: 'Georgia', color: navy })] })], gold);
      }) }),
    ] }),
    ...(quote.priceNote ? [para(quote.priceNote)] : []),
  ];
  if (quote.cabDetails || quote.flightDetails) { children.push(heading('Travel Details')); if (quote.cabDetails) children.push(para(quote.cabDetails)); if (quote.flightDetails) children.push(para(quote.flightDetails)); }
  for (const [title, items] of [['Inclusions', quote.included], ['Exclusions', quote.excluded]] as const) {
    if (items?.length) children.push(heading(title), ...items.map(item => para('• ' + item)));
  }
  if (quote.note) children.push(para(quote.note));
  children.push(heading('Day Wise Itinerary'));
  // Fetch optional itinerary photos concurrently with a bounded wait. All text
  // remains native Word content even when a remote photo is unavailable.
  const photos = await Promise.all(quote.days.map(async day => {
    if (!day.img || typeof window === 'undefined') return null;
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 4000);
    try {
      const response = await fetch(day.img, { signal: controller.signal });
      if (!response.ok) return null;
      const blob = await response.blob(); if (blob.size > 8 * 1024 * 1024) return null;
      const bitmap = await createImageBitmap(blob);
      try {
        const width = Math.min(bitmap.width, 1200), height = Math.round(bitmap.height * width / bitmap.width);
        const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
        canvas.getContext('2d')!.drawImage(bitmap, 0, 0, width, height);
        const data = Uint8Array.from(atob(canvas.toDataURL('image/png').split(',')[1]), c => c.charCodeAt(0));
        const displayWidth = Math.min(580, width), displayHeight = Math.min(290, height * displayWidth / width);
        return { data, width: displayHeight * width / height, height: displayHeight };
      } finally { bitmap.close(); }
    } catch { return null; } finally { clearTimeout(timer); }
  }));
  quote.days.forEach((day, i) => {
    children.push(new Paragraph({ text: `Day ${i + 1}  ${day.title}`, heading: HeadingLevel.HEADING_2, keepNext: true, spacing: { before: 200, after: 120 } }));
    const photo = photos[i];
    if (photo) children.push(new Paragraph({ children: [new ImageRun({ type: 'png', data: photo.data, transformation: { width: photo.width, height: photo.height } })] }));
    for (const line of day.text.split(/\r?\n/).filter(Boolean)) children.push(para(line));
  });
  children.push(heading('Terms and Cancellation Policy'));
  if (quote.termsText && quote.termsText.trim().length >= 20) children.push(...quote.termsText.split(/\r?\n/).filter(Boolean).map(line => para(line)));
  else {
    children.push(para('Cancellation charges', true), ...DEFAULT_TERMS.fees.map(row => para(`${row[0]}: ${row[1]}`)), ...DEFAULT_TERMS.feeNotes.map(line => para(line)));
    for (const [title, items] of [['Hotels and accommodation', DEFAULT_TERMS.hotels], ['Important information', DEFAULT_TERMS.important], ['Pure agent declaration', DEFAULT_TERMS.agent]] as const) children.push(para(title, true), ...items.map(line => para(line)));
  }
  const doc = new Document({ creator: 'Travel quotation', title: quote.packageName, styles: { default: { document: { run: { font: 'Calibri', size: 22, color: navy }, paragraph: { spacing: { after: 100 } } } }, paragraphStyles: [{ id: 'Title', name: 'Title', basedOn: 'Normal', run: { size: 40, bold: true, color: '000000' } }] }, sections: [{ properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 900, bottom: 900, left: 900, right: 900 } } }, children }] });
  return Packer.toBlob(doc);
}
