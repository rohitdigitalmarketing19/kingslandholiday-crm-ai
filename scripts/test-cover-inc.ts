import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer-core';
import {
  QuoteDataModel,
  renderCompleteProposalHtml,
  estimateBlockHeight
} from '../services/quoteDesignRenderer';

const CHROME_PATH = fs.existsSync('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe')
  ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  : 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

const ARTIFACT_DIR = 'C:\\Users\\Rahul\\.gemini\\antigravity-ide\\brain\\7abe8271-87f7-4f62-9cba-a44dd34d8757';

async function main() {
  // Quote 1: 1 Hotel (like user's screenshot KL-1002) - should fit on cover!
  const q1Hotel: QuoteDataModel = {
    client: 'Rahul Sharma',
    ref: 'KL-1002',
    packageName: 'Rajasthan Royal Heritage Retreat',
    longDuration: '3 Nights / 4 Days',
    duration: '3N / 4D',
    city: 'Jaipur, Rajasthan',
    services: 'Private AC Sedan, Heritage Hotel, Sightseeing Tours',
    travellers: '2 Adults',
    priceNote: 'Twin Sharing · All Taxes Included',
    price: '₹28,500',
    discountPercent: 10,
    hotel: {
      nights: 'Night 1',
      name: 'Grand resort and spa',
      type: '4/3 Star',
      room: 'Standard Room',
      rooms: '2 Adults with breakfast & dinner',
      city: 'rajasthan'
    },
    hotels: [
      {
        nights: 'Night 1',
        name: 'Grand resort and spa',
        type: '4/3 Star',
        room: 'Standard Room',
        rooms: '2 Adults with breakfast & dinner',
        city: 'rajasthan'
      }
    ],
    included: [
      'Welcome drinks on arrival (non-alcoholic)',
      '1 Night accommodation at Grand Resort and Spa',
      'Daily lavish buffet breakfast and chef-curated dinner',
      'Private dedicated AC cab for all transfers & sightseeing',
      'All toll taxes, state permits, parking & driver allowances',
      '24/7 dedicated trip assistance throughout the journey'
    ],
    excluded: [
      'Airfare or train fare to/from Rajasthan',
      'Monument entry fees, camera charges & safari permits',
      'Personal expenses, laundry, telephone calls & tips',
      'Anything not explicitly mentioned in inclusions'
    ],
    days: [
      { title: 'Arrival in Jaipur & Transfer to Resort', text: 'Arrive at Jaipur airport or railway station. Meet our chauffeur and transfer to Grand Resort and Spa. Evening free to explore local bazaars and enjoy welcome dinner.' },
      { title: 'Jaipur Heritage & Fort Excursion', text: 'After breakfast, embark on a full day sightseeing tour of Amber Fort, Hawa Mahal, City Palace, and Jantar Mantar. Return to resort for dinner.' },
      { title: 'Departure with Cherished Memories', text: 'Enjoy a relaxed breakfast at the resort. Check out and transfer to airport or railway station for onward journey.' }
    ],
    advisor: {
      name: 'Mohit Ahlawat',
      role: 'Senior Trip Advisor',
      phones: '+91 6376983416 · +91 7014939068',
      email: 'official.kingslandholidays@gmail.com',
    },
    stats: [
      ['12,000+', 'Trips delivered'],
      ['4.8/5', '2,140+ reviews'],
      ['98%', 'Super reviews'],
      ['11 Yrs', 'In operation'],
    ]
  };

  const est1 = estimateBlockHeight(q1Hotel, 'royal');
  console.log('1 Hotel Estimation:', est1);

  // Quote 2: 5 Hotels + Long list (should NOT fit on cover!)
  const q5Hotels: QuoteDataModel = {
    ...q1Hotel,
    ref: 'KL-1005',
    hotels: [
      { nights: 'Night 1-2', name: 'Grand Resort & Spa', type: '5 Star', room: 'Deluxe', rooms: '2 Adults with Breakfast', city: 'Jaipur' },
      { nights: 'Night 3', name: 'Pushkar Palace', type: 'Heritage', room: 'Lake View', rooms: '2 Adults with Breakfast', city: 'Pushkar' },
      { nights: 'Night 4-5', name: 'Umaid Bhawan Heritage', type: '4 Star', room: 'Royal Suite', rooms: '2 Adults with Breakfast', city: 'Jodhpur' },
      { nights: 'Night 6-7', name: 'Fateh Garh Palace', type: '5 Star', room: 'Palace Room', rooms: '2 Adults with Breakfast', city: 'Udaipur' },
      { nights: 'Night 8', name: 'Mount Abu Wilderness Resort', type: 'Resort', room: 'Cottage', rooms: '2 Adults with Breakfast', city: 'Mount Abu' },
    ],
    included: [
      ...q1Hotel.included,
      'Desert camel safari with sunset tea at Pushkar dunes',
      'Boat ride on Lake Pichola overlooking Jag Mandir',
      'Sound & Light show at Amber Fort with reserved seating',
      'Complimentary royal Rajasthani Thali dinner at Chokhi Dhani'
    ]
  };

  const est2 = estimateBlockHeight(q5Hotels, 'royal');
  console.log('5 Hotels Estimation:', est2);

  const html1 = renderCompleteProposalHtml(q1Hotel, 'royal');
  const html2 = renderCompleteProposalHtml(q5Hotels, 'royal');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 1600, deviceScaleFactor: 2 });

    const renderDoc = (html: string) => `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            @page { size: A4 portrait; margin: 0; }
            body { margin: 0; padding: 0; background: #e2e8f0; font-family: sans-serif; }
            * { box-sizing: border-box; }
          </style>
        </head>
        <body>
          <div class="live-proposal-sheets-container">
            ${html}
          </div>
        </body>
      </html>
    `;

    // 1 Hotel rendering
    await page.setContent(renderDoc(html1), { waitUntil: 'domcontentloaded' });
    const pdf1Path = path.join(ARTIFACT_DIR, 'kl1002_1hotel_test.pdf');
    await page.pdf({
      path: pdf1Path,
      format: 'A4',
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 }
    });

    // Take screenshot of Page 1 and Page 2 for 1-hotel
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'kl1002_page_1.png'),
      clip: { x: (1200 - 794) / 2, y: 0, width: 794, height: 1123 }
    });
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'kl1002_page_2.png'),
      clip: { x: (1200 - 794) / 2, y: 1123, width: 794, height: 1123 }
    });

    // 5 Hotels rendering
    await page.setContent(renderDoc(html2), { waitUntil: 'domcontentloaded' });
    const pdf2Path = path.join(ARTIFACT_DIR, 'kl1005_5hotels_test.pdf');
    await page.pdf({
      path: pdf2Path,
      format: 'A4',
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 }
    });

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'kl1005_page_1.png'),
      clip: { x: (1200 - 794) / 2, y: 0, width: 794, height: 1123 }
    });
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'kl1005_page_2.png'),
      clip: { x: (1200 - 794) / 2, y: 1123, width: 794, height: 1123 }
    });

    console.log('Successfully generated PDFs and screenshots!');
  } finally {
    await browser.close();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
