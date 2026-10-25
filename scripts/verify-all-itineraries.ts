import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer-core';
import initSqlJs from 'sql.js';
import {
  QuoteDataModel,
  renderCompleteProposalHtml,
} from '../services/quoteDesignRenderer';
import { convertPdfToPngs } from './pdf-to-png';

const CHROME_PATH = fs.existsSync('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe')
  ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  : 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

const ARTIFACT_DIR = 'C:\\Users\\Rahul\\.gemini\\antigravity-ide\\brain\\9ee385c8-3910-41b1-a5c5-9d2be2c59c9e';

function buildDoc(bodyHtml: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;700;800&family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700;12..96,800&family=DM+Sans:ital,opsz,wght@0,9..40,400..700;1,9..40,400..700&family=DM+Serif+Display&family=Hanken+Grotesk:wght@400;500;600;700&family=Manrope:wght@400;500;600;700;800&family=Nunito+Sans:opsz,wght@6..12,400;6..12,600;6..12,700&family=Nunito:wght@400;600;700;800&family=Outfit:wght@400;600;700;800&family=Playfair+Display:ital,wght@0,600;0,700;0,800;0,900;1,600&display=swap" rel="stylesheet">
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
          table.itinerary-table {
            width: 794px;
            margin: 0 auto;
            border-collapse: separate;
            border-spacing: 0;
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
        </style>
      </head>
      <body>
        ${bodyHtml}
      </body>
    </html>
  `;
}

async function renderPdf(browser: any, html: string, outputPath: string) {
  const page = await browser.newPage();
  try {
    await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 2 });
    await page.setContent(buildDoc(html), { waitUntil: ['load', 'networkidle0' as any], timeout: 45000 });
    
    // Ensure fonts and images are loaded
    await page.evaluate(async () => {
      if ((document as any).fonts && (document as any).fonts.ready) {
        await (document as any).fonts.ready;
      }
      const imgs = Array.from(document.querySelectorAll('img'));
      await Promise.all(
        imgs.map(img => {
          if (img.complete) return Promise.resolve();
          return new Promise(resolve => {
            img.onload = resolve;
            img.onerror = resolve;
          });
        })
      );
    });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      preferCSSPageSize: true,
    });
    fs.writeFileSync(outputPath, pdfBuffer);
    console.log(`Saved PDF to: ${outputPath} (${pdfBuffer.length} bytes)`);
  } finally {
    await page.close();
  }
}

async function run() {
  const SQL = await initSqlJs();
  const db = new SQL.Database(fs.readFileSync('kingsland.db'));

  // Get agency settings & partners
  const agencyRows = db.exec("SELECT * FROM agency_settings")[0];
  const agency: any = Object.fromEntries(agencyRows.columns.map((c, i) => [c, agencyRows.values[0][i]]));

  const partnerRows = db.exec("SELECT * FROM partner_brands WHERE is_active=1 ORDER BY sort_order ASC, created_at ASC")[0];
  const partners = partnerRows ? partnerRows.values.map(v => Object.fromEntries(partnerRows.columns.map((c, i) => [c, v[i]]))) : [];

  // Diverse Image test set
  const panoramaImg = 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1600&h=600&q=80'; // Wide panorama (16:6)
  const portraitImg = 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=600&h=1200&q=80'; // Tall portrait (1:2)
  const squareImg = 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=800&h=800&q=80'; // Square (1:1)
  const tinyLowResImg = 'https://images.unsplash.com/photo-1595815771614-ade9d652a65d?auto=format&fit=crop&w=120&h=80&q=50'; // Tiny low-res (120x80)
  const brokenImg = 'https://invalid-nonexistent-domain-404.xyz/broken_image.jpg'; // Broken URL

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    // =========================================================================
    // TEST 1: KL-1003 with DIWALI Theme (7-Day Festive Itinerary)
    // Primary User Case: Kashmir Tour with Taj, Radisson, Khyber hotel badges
    // =========================================================================
    console.log('\n--- Rendering Test 1: KL-1003 Festive Diwali Theme ---');
    const leadRows = db.exec("SELECT * FROM leads WHERE trip_id = 'KL-1003'")[0];
    const lead: any = Object.fromEntries(leadRows.columns.map((c, i) => [c, leadRows.values[0][i]]));
    const quoteRows = db.exec("SELECT * FROM quotes WHERE lead_id = '" + lead.id + "'")[0];
    const quote: any = Object.fromEntries(quoteRows.columns.map((c, i) => [c, quoteRows.values[0][i]]));
    const dayRows = db.exec("SELECT * FROM quote_itinerary_days WHERE quote_id = '" + quote.id + "' ORDER BY day_number ASC")[0];
    const daysDiwali = dayRows ? dayRows.values.map(v => ({
      title: v[3] as string,
      text: v[4] as string,
      img: v[5] as string,
    })) : [];
    const hotelRows = db.exec("SELECT * FROM quote_hotels WHERE quote_id = '" + quote.id + "'")[0];
    const hotelsDiwali = hotelRows ? hotelRows.values.map(v => ({
      nights: `${v[3]} Night`,
      name: v[4] as string,
      type: v[5] as string,
      room: v[6] as string,
      rooms: '1 Room with Breakfast',
      city: v[7] as string,
    })) : [];

    const qDiwali: QuoteDataModel = {
      client: lead.name,
      ref: lead.trip_id,
      logoUrl: agency.logo_url || '',
      companyName: agency.company_name || 'Kingsland Holidays',
      packageName: quote.package_title || 'Festive Kashmir Tour',
      longDuration: '7 Nights / 8 Days',
      duration: '7N / 8D',
      city: lead.destination || 'Kashmir',
      services: 'Private Innova Crysta, 5-Star Luxury Resorts, Houseboat Stay, Shikara Ride',
      travellers: '2 Adults',
      priceNote: 'Twin Sharing · Festive Rates All Taxes Included',
      price: '₹' + Number(quote.final_price || 65000).toLocaleString('en-IN'),
      rawPrice: Number(quote.final_price || 65000),
      discountPercent: 10,
      cutPrice: '₹72,000',
      flightDetails: 'AI-825 (DEL 08:30 → SXR 10:15) · AI-826 (SXR 14:40 → DEL 16:25)',
      cabDetails: 'Dedicated AC Innova Crysta for all transfers, sightseeing, and day excursions',
      hotel: hotelsDiwali[0] || { nights: '3 Nights', name: 'The Lalit Grand Palace', type: 'Luxury Palace', room: 'Deluxe Palace Room', rooms: '1 Room', city: 'Srinagar' },
      hotels: hotelsDiwali.length > 0 ? hotelsDiwali : undefined,
      included: [
        'Traditional festive welcome with saffron Kahwa & dry fruits on arrival',
        '7 Nights accommodation in certified luxury properties & premium houseboat',
        'Daily lavish buffet breakfast and 4-course chef dinner at all resorts',
        'Private dedicated Innova Crysta throughout the journey with commercial permit',
        '1 Hour romantic sunset Shikara ride on Dal Lake with flower presentation',
        'Gondola cable car phase 1 tickets pre-booked for Gulmarg snow excursion',
        'All toll taxes, state permits, driver night allowances, and parking fees',
      ],
      excluded: [
        'Airfare to and from Srinagar International Airport',
        'Personal laundry, telephone calls, room service, and personal tips',
        'Pony rides, sledge charges, and union cab in Pahalgam (Aru/Betaab Valley)',
        'Travel and medical insurance',
      ],
      days: daysDiwali,
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

    const htmlDiwali = renderCompleteProposalHtml(qDiwali, 'diwali', partners as any);
    const pdfDiwaliPath = path.join(ARTIFACT_DIR, 'verify_kl1003_diwali.pdf');
    await renderPdf(browser, htmlDiwali, pdfDiwaliPath);
    await convertPdfToPngs(pdfDiwaliPath, 'verify_kl1003_diwali');

    // =========================================================================
    // TEST 2: 3-Day Short Itinerary (Alpine Theme)
    // Testing compact itineraries, quick layout
    // =========================================================================
    console.log('\n--- Rendering Test 2: 3-Day Itinerary (Alpine Theme) ---');
    const q3Day: QuoteDataModel = {
      client: 'Dr. Amit & Sneha Roy',
      ref: 'KL-301',
      logoUrl: agency.logo_url || '',
      companyName: agency.company_name || 'Kingsland Holidays',
      packageName: 'Short Alpine Escape - Manali & Rohtang Pass',
      longDuration: '2 Nights / 3 Days',
      duration: '2N / 3D',
      city: 'Manali, Himachal Pradesh',
      services: 'Private 4x4 SUV, 5-Star Resort, Rohtang Snow Permit, Candlelight Dinner',
      travellers: '2 Adults',
      priceNote: 'Twin Sharing · All Taxes & Forest Permits Included',
      price: '₹38,500',
      rawPrice: 38500,
      hotel: { nights: '2 Nights', name: 'The Himalayan Luxury Resort', type: '5-Star Mountain Resort', room: 'Premier Valley View', rooms: '1 Room with Breakfast & Dinner', city: 'Manali' },
      included: [
        'Welcome drink & traditional Himachali shawl on arrival',
        '2 Nights luxury accommodation with panoramic valley balcony',
        'Buffet breakfast and 4-course dinner at mountain terrace',
        'Private heated SUV for all transfers and sightseeing',
        'Rohtang Pass high altitude permit and snow jacket gear',
      ],
      excluded: [
        'Airfare / Train tickets to Chandigarh',
        'Personal adventure sports (paragliding, river rafting)',
        'Personal laundry and telephone charges',
      ],
      days: [
        {
          title: 'Arrival in Manali & Old Manali Walk',
          text: 'Arrive in Manali and check in at The Himalayan Resort. Unwind with fresh apple cider while taking in panoramic views of snow-dusted peaks. In the afternoon, take a leisurely walking tour of Old Manali cafes, Hidimba Devi Temple nestled among giant deodars, and Vashisht hot water springs.',
          img: panoramaImg,
        },
        {
          title: 'Rohtang Pass Snow Valley & Solang Adventure',
          text: 'Early morning excursion through the breathtaking Atal Tunnel towards Rohtang Pass (subject to weather). Marvel at glistening snow slopes and dramatic Pir Panjal mountain panoramas. Later visit Solang Valley for scenic cable car rides, followed by evening hot tea and live acoustic music by the resort bonfire.',
          img: squareImg,
        },
        {
          title: 'Naggar Castle Heritage & Departure',
          text: 'Enjoy breakfast with serene mountain mist. Visit the historical Naggar Castle and Nicholas Roerich Art Gallery overlooking the Beas River valley. Pick up authentic handloom shawls and organic forest honey before your transfer to Chandigarh for departure with unforgettable Himalayan memories.',
          img: portraitImg,
        },
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
        ['24/7', 'Trip assistance'],
        ['100%', 'Customised plans'],
      ]
    };

    const html3Day = renderCompleteProposalHtml(q3Day, 'alpine', partners as any);
    const pdf3DayPath = path.join(ARTIFACT_DIR, 'verify_3day_alpine.pdf');
    await renderPdf(browser, html3Day, pdf3DayPath);
    await convertPdfToPngs(pdf3DayPath, 'verify_3day_alpine');

    // =========================================================================
    // TEST 3: 7-Day Royal Gold Itinerary with MIXED IMAGES
    // Panorama, portrait, square, tiny low-res, broken URL, missing image
    // =========================================================================
    console.log('\n--- Rendering Test 3: 7-Day Royal Gold with Mixed Images ---');
    const q7Mixed: QuoteDataModel = {
      client: 'Sunil & Kavita Sharma',
      ref: 'KL-705',
      logoUrl: agency.logo_url || '',
      companyName: agency.company_name || 'Kingsland Holidays',
      packageName: 'Royal Kashmir Paradise - 7 Days',
      longDuration: '6 Nights / 7 Days',
      duration: '6N / 7D',
      city: 'Srinagar, Gulmarg, Pahalgam',
      services: 'Private Innova Crysta, Taj Vivanta, The Khyber, Luxury Houseboat',
      travellers: '2 Adults',
      priceNote: 'Twin Sharing · All Taxes Included',
      price: '₹78,000',
      rawPrice: 78000,
      hotel: { nights: '3 Nights', name: 'Vivanta Dal View by Taj', type: '5-Star Luxury Resort', room: 'Deluxe Valley View', rooms: '1 Room', city: 'Srinagar' },
      included: [
        'Traditional welcome with saffron Kahwa on arrival',
        '6 Nights accommodation in certified luxury properties & houseboat',
        'Daily breakfast and dinner at all luxury resorts',
        'Private dedicated Innova Crysta throughout the journey',
        '1 Hour complimentary Shikara ride on Dal Lake',
        'All toll taxes, state permits, and driver charges',
      ],
      excluded: [
        'Airfare to and from destination',
        'Personal laundry, telephone calls, and discretionary tips',
      ],
      days: [
        { title: 'Srinagar Arrival & Dal Lake Panorama', text: 'Arrive at Srinagar airport with warm traditional greetings. Private transfer to Vivanta Dal View. Evening Shikara ride gliding past lotus ponds and floating gardens.', img: panoramaImg }, // Wide panorama
        { title: 'Mughal Gardens & Heritage Walk', text: 'Visit Nishat Bagh and Shalimar Bagh terrace gardens built by Emperor Jahangir. Explore old city artisans crafting handmade Pashmina shawls and walnut woodcarvings.', img: portraitImg }, // Tall portrait
        { title: 'Gulmarg Meadow of Flowers & Gondola Ride', text: 'Ascend to Gulmarg at 2,730 meters. Ride the famous Gondola cable car up to Kongdoori and Apharwat Peak for breathtaking views of Nanga Parbat and snowfields.', img: squareImg }, // Square
        { title: 'Pahalgam Valley of Shepherds', text: 'Scenic drive along saffron fields of Pampore and pine-clad banks of the Lidder River. Check in at riverside luxury cottage and enjoy quiet nature trails.', img: tinyLowResImg }, // Tiny low-res
        { title: 'Aru & Betaab Valley Exploration', text: 'Morning pony ride to Baisaran meadow surrounded by dense cedar forests. Visit Betaab Valley where crystal streams flow through lush emerald alpine pastures.', img: brokenImg }, // Broken URL: verifies clean hiding
        { title: 'Return to Srinagar & Houseboat Stay', text: 'Transfer to Dal Lake for an unforgettable stay on an authentic carved cedar-wood luxury houseboat. Enjoy candlelit dinner prepared by the onboard master chef.', img: '' }, // Missing image: verifies text-only card
        { title: 'Heritage Souvenirs & Airport Departure', text: 'Savor morning Kahwa on the sun-deck watching shikaras glide past. Transfer to Srinagar International Airport for departure with cherished memories of paradise.', img: panoramaImg },
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
        ['24/7', 'Trip assistance'],
        ['100%', 'Customised plans'],
      ]
    };

    const html7Mixed = renderCompleteProposalHtml(q7Mixed, 'royal', partners as any);
    const pdf7MixedPath = path.join(ARTIFACT_DIR, 'verify_7day_mixed_images.pdf');
    await renderPdf(browser, html7Mixed, pdf7MixedPath);
    await convertPdfToPngs(pdf7MixedPath, 'verify_7day_mixed');

    // =========================================================================
    // TEST 4: 12-Day Grand Rajasthan Odyssey (Sunset Theme)
    // Testing very long day text paragraphs, card splitting with orphans/widows
    // =========================================================================
    console.log('\n--- Rendering Test 4: 12-Day Itinerary (Sunset Theme, Long Text Splitting) ---');
    const longSplitParagraph = 'Morning begins with an extensive guided heritage exploration through the ancient labyrinthine alleys of the fort city. Marvel at carved sandstone balconies (jharokhas), subterranean stepwells with intricate mathematical arches, and vibrant spice bazaars that have traded for over eight centuries. We visit the Maharajah\'s private collection of armory and palanquins, followed by an authentic culinary demonstration of royal Rajasthani delicacies.\n\nIn the afternoon, we venture into the desert dunes via private camel caravan and vintage open-top jeeps. Experience folk music and Kalbelia fire dancers under the brilliant canopy of desert stars. The night concludes with an exclusive candlelit feast set amidst the golden sands, featuring traditional slow-cooked desert cuisine, royal desserts, and fragrant saffron kahwa.';

    const days12 = [
      { title: 'Arrival in Pink City Jaipur', text: 'Traditional royal welcome with rose petals and dhol beats. Check in at Rambagh Palace and enjoy evening high tea at the Verandah overlooking manicured lawns and dancing peacocks.', img: panoramaImg },
      { title: 'Jaipur Forts & Palaces Exploration', text: 'Full day excursion visiting the majestic Amber Fort with elephant passage, Jaigarh Fort housing the world\'s largest cannon on wheels, and the breezy facade of Hawa Mahal.', img: squareImg },
      { title: 'Pushkar Sacred Lake & Brahma Temple', text: 'Drive to the sacred holy town of Pushkar. Visit the rare 14th-century Lord Brahma Temple and take a spiritual walk along the 52 bathing ghats as evening Aarti bells reverberate across the holy lake.', img: portraitImg },
      { title: 'Blue City Jodhpur & Mehrangarh Bastions', text: longSplitParagraph, img: squareImg }, // Long day to test natural card splitting
      { title: 'Bishnoi Village Safari & Wildlife', text: 'Experience sustainable desert ecology and rural handicrafts with the Bishnoi community. Spot blackbucks, chinkara gazelles, and migratory birds in their natural habitat.', img: '' }, // Text-only card
      { title: 'Ranakpur Marble Jain Temples', text: 'En route to Udaipur, visit the world-renowned 15th-century Ranakpur temple complex with 1,444 individually hand-carved marble pillars, where no two carvings are alike.', img: panoramaImg },
      { title: 'City of Lakes Udaipur & Lake Pichola', text: 'Arrive in Udaipur, the Venice of the East. Sunset boat cruise on Lake Pichola gliding past Jag Mandir Island and the shimmering white walls of Lake Palace.', img: portraitImg },
      { title: 'City Palace & Saheliyon ki Bari', text: 'Tour the grand City Palace complex, vintage car museum, and royal gardens of Saheliyon ki Bari with marble fountains fed by the serene waters of Fateh Sagar Lake.', img: squareImg },
      { title: 'Chittorgarh Fort Legend of Padmini', text: 'Day excursion to Chittorgarh, India\'s largest fort standing atop a 180-meter high hill, recounting valorous tales of Rajput royalty and Vijay Stambha (Tower of Victory).', img: panoramaImg },
      { title: 'Kumbhalgarh Fortress & Great Wall of India', text: 'Explore the UNESCO World Heritage fortress of Kumbhalgarh, boasting the second-longest continuous wall in the world after the Great Wall of China.', img: squareImg },
      { title: 'Mount Abu Oasis & Dilwara Temples', text: 'Ascend Rajasthan\'s only hill station. Marvel at the translucent, lace-like marble craftsmanship of the Dilwara Temples and enjoy boating on Nakki Lake.', img: portraitImg },
      { title: 'Sunset Point & Royal Departure', text: 'Catch the golden morning light over Toad Rock before a leisurely drive to Udaipur Airport for your homeward journey carrying memories of royal Rajasthan.', img: '' }, // Text-only card
    ];

    const q12Day: QuoteDataModel = {
      client: 'Rajesh & Meera Singhania',
      ref: 'KL-1205',
      logoUrl: agency.logo_url || '',
      companyName: agency.company_name || 'Kingsland Holidays',
      packageName: 'Grand Royal Rajasthan Odyssey - 12 Days',
      longDuration: '11 Nights / 12 Days',
      duration: '11N / 12D',
      city: 'Jaipur, Jodhpur, Udaipur, Mount Abu',
      services: 'Chauffeur Driven Mercedes Van, Taj & Oberoi Heritage Palaces, Desert Camp, Private Guides',
      travellers: '4 Adults',
      priceNote: 'Royal Suites · All Meals, Monument Entrances & Taxes Included',
      price: '₹2,85,000',
      rawPrice: 285000,
      hotel: { nights: '3 Nights', name: 'Taj Lake Palace', type: 'Heritage Palace', room: 'Grand Royal Suite', rooms: '2 Suites', city: 'Udaipur' },
      hotels: [
        { nights: '3 Nights', name: 'Rambagh Palace', type: 'Luxury Palace', room: 'Palace Room', rooms: '2 Rooms', city: 'Jaipur' },
        { nights: '2 Nights', name: 'Umaid Bhawan Palace', type: 'Heritage Palace', room: 'Historical Suite', rooms: '2 Rooms', city: 'Jodhpur' },
        { nights: '4 Nights', name: 'Taj Lake Palace', type: 'Luxury Palace', room: 'Lake View Suite', rooms: '2 Rooms', city: 'Udaipur' },
        { nights: '2 Nights', name: 'Cama Rajputana Club Resort', type: 'Heritage Resort', room: 'Club Suite', rooms: '2 Rooms', city: 'Mount Abu' },
      ],
      included: [
        'Traditional Aarti & Tikka welcome with royal garlands at each heritage property',
        '11 Nights stay in certified Palace & Heritage 5-star category properties',
        'Daily lavish breakfast & multi-cuisine dinners curated by royal master chefs',
        'Chauffeur-driven luxury Mercedes Sprinter throughout the journey',
        'Private heritage historians & government approved tour guides at all monuments',
        'VIP entrance tickets to all forts, palaces, museums, and national sanctuaries',
        'Exclusive sunset royal boat cruise on Lake Pichola with champagne & canapes',
        'Private dunes desert safari with luxury Swiss tents and cultural fire show',
      ],
      excluded: [
        'Commercial airline tickets to Jaipur and from Udaipur',
        'Discretionary tips for palace staff, chauffeurs, and private guides',
        'Personal insurance, shopping expenses, and alcoholic beverages not specified',
      ],
      days: days12,
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

    const html12Day = renderCompleteProposalHtml(q12Day, 'sunset', partners as any);
    const pdf12DayPath = path.join(ARTIFACT_DIR, 'verify_12day_sunset.pdf');
    await renderPdf(browser, html12Day, pdf12DayPath);
    await convertPdfToPngs(pdf12DayPath, 'verify_12day_sunset');

    console.log('\n======================================================');
    console.log('ALL 4 TEST ITINERARIES GENERATED AND CONVERTED TO PNG!');
    console.log('======================================================');
  } finally {
    await browser.close();
  }
}

run().catch(console.error);
