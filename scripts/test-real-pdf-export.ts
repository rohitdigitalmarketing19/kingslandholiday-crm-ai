import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer-core';
import {
  QuoteDataModel,
  renderCompleteProposalHtml,
} from '../services/quoteDesignRenderer';

const CHROME_PATH = fs.existsSync('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe')
  ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  : 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

const ARTIFACT_DIR = 'C:\\Users\\Rahul\\.gemini\\antigravity-ide\\brain\\4b383c65-eacb-401f-b1de-8a53f8c186ca';

const TEST_QUOTE: QuoteDataModel = {
  client: 'Aditya & Neha Sharma',
  ref: 'KL-PDF-999',
  packageName: 'Kashmir Luxury Explorer',
  longDuration: '5 Nights / 6 Days',
  duration: '5N / 6D',
  city: 'Srinagar, Gulmarg, Pahalgam',
  services: 'Innova Crysta, 4-Star Stays, Shikara Ride',
  travellers: '2 Adults, 1 Child',
  priceNote: 'Twin Sharing · All Taxes Included',
  price: '₹78,500',
  rawPrice: 78500,
  hotel: {
    nights: '2 Nights',
    name: 'Radisson Srinagar',
    type: 'Luxury Heritage',
    room: 'Deluxe Pine View',
    rooms: '1 Room with Breakfast & Dinner',
    city: 'Srinagar'
  },
  hotels: [
    {
      nights: '2 Nights',
      name: 'Radisson Srinagar',
      type: 'Luxury Heritage',
      room: 'Deluxe Pine View',
      rooms: '1 Room with Breakfast & Dinner',
      city: 'Srinagar'
    },
    {
      nights: '2 Nights',
      name: 'The Khyber Himalayan Resort',
      type: '5-Star Luxury Resort',
      room: 'Premier Mountain View Room',
      rooms: '1 Room with Breakfast & Dinner',
      city: 'Gulmarg'
    },
    {
      nights: '1 Night',
      name: 'Wangnoo Luxury Houseboats',
      type: 'Super Deluxe Houseboat',
      room: 'Carved Cedar Suite',
      rooms: '1 Houseboat with Meals',
      city: 'Nigeen Lake'
    }
  ],
  stats: [
    ['12,000+', 'Trips delivered'],
    ['4.8/5', '2,140+ reviews'],
    ['24/7', 'Trip assistance'],
    ['100%', 'Customised plans']
  ],
  included: [
    'Private Innova Crysta for all 6 days with experienced valley chauffeur',
    '2 Nights at Radisson Srinagar in Deluxe Pine View Room',
    '2 Nights at The Khyber Himalayan Resort Gulmarg',
    '1 Night at Luxury Houseboat on peaceful Nigeen Lake',
    'Daily breakfast and four-course chef dinners at all properties',
    '1-Hour private sunset Shikara ride on Dal Lake',
    'Full day scenic excursion to Betaab Valley & Aru Valley in Pahalgam',
    'Gondola Phase 1 & Phase 2 fast-track assistance at Gulmarg',
    'All toll taxes, parking fees, driver allowance, and green cess',
    '24/7 Kingsland dedicated valley concierge support'
  ],
  excluded: [
    'Airfare to and from Srinagar International Airport',
    'Gondola cable car ride tickets at Gulmarg (to be booked online via J&K tourism)',
    'Pony rides or local union sledges at Gulmarg/Sonamarg',
    'Personal expenses, laundry, telephone, and room service'
  ],
  note: 'Gondola tickets subject to slot availability. Shikara ride timing flexible.',
  days: [
    {
      title: 'Arrival in Srinagar & Sunset Shikara Ride on Nigeen Lake',
      text: 'Arrival at Srinagar Airport. Meet and greet by Kingsland representative and transfer to traditional carved cedar houseboat. Evening 1-hour relaxing Shikara ride across quiet lotus waters.'
    },
    {
      title: 'Mughal Heritage Gardens & Old Srinagar Artisan Quarters',
      text: 'Visit Nishat Bagh, Shalimar Bagh, and Cheshma Shahi gardens built by Mughal emperors. Explore old downtown copperware and cashmere shawl artisan workshops.'
    },
    {
      title: 'Scenic Meadow of Flowers Excursion & Alpine Gulmarg',
      text: 'Drive through weeping willow avenues to Gulmarg at 2,730 meters. Check in at The Khyber Himalayan Resort. Afternoon leisure walk through pine meadows and ski slopes.'
    },
    {
      title: 'High Altitude Gondola Experience to Apharwat Peak',
      text: 'Ascend to 13,780 feet via the world famous Gulmarg Gondola. Spectacular views of Nanga Parbat and Pir Panjal mountain ranges. Evening fireplace dining at the resort.'
    },
    {
      title: 'Pahalgam Valley of Shepherds & Lidder Riverbank',
      text: 'Scenic journey to Pahalgam through saffron fields of Pampore and walnut orchards. Visit Lidder riverside, Betaab Valley, and return to Srinagar luxury hotel.'
    },
    {
      title: 'Morning Saffron Bazaars & Seamless Airport Departure',
      text: 'Leisurely buffet breakfast. Visit local dry fruit and saffron markets. On-time private transfer to Srinagar International Airport for return journey.'
    }
  ]
};

async function testPdfExport() {
  console.log('Testing real PDF export...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    const html = renderCompleteProposalHtml(TEST_QUOTE, 'royal');

    const doc = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            @page { size: A4 portrait; margin: 0; }
            body { margin: 0; padding: 0; }
            .sheet { page-break-after: always; break-after: page; }
          </style>
        </head>
        <body>
          <div id="pdf-container">${html}</div>
        </body>
      </html>
    `;

    await page.setContent(doc, { waitUntil: 'load' });
    await new Promise(r => setTimeout(r, 200));

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: 0, bottom: 0, left: 0, right: 0 },
    });

    const pdfPath = path.join(ARTIFACT_DIR, 'sample_quote_export.pdf');
    fs.writeFileSync(pdfPath, pdfBuffer);
    console.log(`Real PDF saved to: ${pdfPath}`);
    console.log(`PDF size: ${pdfBuffer.length} bytes`);

    // Verify page count from sheets in DOM
    const sheetCount = await page.evaluate(() => document.querySelectorAll('.sheet').length);
    console.log(`Sheet count rendered in PDF: ${sheetCount} sheets`);

  } finally {
    await browser.close();
  }
}

testPdfExport().catch(err => {
  console.error('PDF export error:', err);
  process.exit(1);
});
