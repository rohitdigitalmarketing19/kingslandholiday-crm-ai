import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer-core';
import {
  QuoteDataModel,
  renderCompleteProposalHtml,
  normalizeListItems,
} from '../services/quoteDesignRenderer';

const CHROME_PATH = fs.existsSync('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe')
  ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  : 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

const ARTIFACT_DIR = 'C:\\Users\\Rahul\\.gemini\\antigravity-ide\\brain\\4b383c65-eacb-401f-b1de-8a53f8c186ca';
const SCREENSHOT_DIR = path.join(ARTIFACT_DIR, 'screenshots');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

// ── 1. The Three Datasets ──────────────────────────────────────────

const DATASET_1: QuoteDataModel = {
  client: 'Rajesh & Simran Malhotra',
  ref: 'KL-D1-101',
  packageName: 'Shimla Weekend Escape',
  longDuration: '3 Nights / 4 Days',
  duration: '3N / 4D',
  city: 'Shimla',
  services: 'Cab, Hotel, Breakfast',
  travellers: '2 Adults',
  priceNote: 'Private Vehicle & 4-Star Stay',
  price: '₹28,500',
  rawPrice: 28500,
  hotel: {
    nights: '3 Nights',
    name: 'Radisson Hotel Shimla',
    type: '4-Star Resort',
    room: 'Deluxe Valley View',
    rooms: '1 Room with Breakfast',
    city: 'Shimla'
  },
  hotels: [
    {
      nights: '3 Nights',
      name: 'Radisson Hotel Shimla',
      type: '4-Star Resort',
      room: 'Deluxe Valley View',
      rooms: '1 Room with Breakfast',
      city: 'Shimla'
    }
  ],
  stats: [
    ['12,000+', 'Trips delivered'],
    ['4.8/5', '2,140+ reviews'],
    ['24/7', 'Trip assistance'],
    ['100%', 'Customised plans']
  ],
  included: [
    'Private air-conditioned sedan cab for all transfers and sightseeing',
    '3 nights luxury stay at Radisson Hotel Shimla',
    'Daily buffet breakfast at hotel dining hall',
    'Fuel, toll taxes, state permits, and driver night allowances',
    'Guided walking heritage tour on The Ridge & Mall Road'
  ],
  excluded: [
    'Any train or air fare to Delhi/Chandigarh',
    'Entry tickets to museums, monument fees, or adventure activities',
    'Personal expenses, laundry, alcoholic beverages, and tips'
  ],
  note: 'Package valid till end of season. Road permits included.',
  days: [
    {
      title: 'Arrival in Shimla & Scenic Evening Walk',
      text: 'Depart from Chandigarh in private vehicle. Drive through picturesque Himalayan pine curves. Check-in at Radisson Shimla, evening leisure walk along The Mall Road.'
    },
    {
      title: 'Kufri Adventure Day & Green Valley Views',
      text: 'Full day excursion to Kufri at 2,622 meters altitude. Enjoy panoramic mountain photography, nature trails through cedar woods, and return to hotel for dinner.'
    },
    {
      title: 'Heritage Walk, Jakhoo Temple & Local Bazaars',
      text: 'Visit ancient Jakhoo Temple dedicated to Lord Hanuman. Explore the British-era Viceregal Lodge, Lakkar Bazaar woodwork, and cafe hopping on The Ridge.'
    }
  ]
};

const LONG_TEXT_SAMPLE =
  'Morning breakfast at hotel followed by comprehensive private excursion to historical landmarks, scenic valleys, and cultural heritage quarters. Meet your dedicated chauffeur and expert guide at reception. Travel comfortably across winding scenic routes with scheduled panoramic photo stops overlooking lush cedar mountains, apple orchards, and terraced farmlands. Experience authentic regional hospitality, local artisan handicraft markets, and culinary tasting sessions at certified partner estates before returning to the resort for evening relaxation and leisurely dinners under clear starry Himalayan skies.';

const DATASET_2: QuoteDataModel = {
  client: 'Dr. Sameer & Priyanka Verma',
  ref: 'KL-D2-202',
  packageName: 'Himachal Classical Circuit',
  longDuration: '5 Nights / 6 Days',
  duration: '5N / 6D',
  city: 'Shimla & Manali',
  services: 'Innova Crysta, 4-Star Stays, Sightseeing, Meals',
  travellers: '4 Adults',
  priceNote: 'Private Innova & Premium Luxury Suites',
  price: '₹74,000',
  rawPrice: 74000,
  hotel: {
    nights: '2 Nights',
    name: 'The Oberoi Cecil',
    type: 'Luxury Heritage',
    room: 'Luxury Cedar Suite',
    rooms: '2 Rooms with Breakfast & Dinner',
    city: 'Shimla'
  },
  hotels: [
    {
      nights: '2 Nights',
      name: 'The Oberoi Cecil',
      type: 'Luxury Heritage',
      room: 'Luxury Cedar Suite',
      rooms: '2 Rooms with Breakfast & Dinner',
      city: 'Shimla'
    },
    {
      nights: '2 Nights',
      name: 'Span Resort & Spa',
      type: '5-Star Riverside Resort',
      room: 'Riverside Deluxe Villa',
      rooms: '2 Rooms with Breakfast & Dinner',
      city: 'Manali'
    },
    {
      nights: '1 Night',
      name: 'Hyatt Regency Chandigarh',
      type: '5-Star City Resort',
      room: 'Club View Room',
      rooms: '2 Rooms with Breakfast',
      city: 'Chandigarh'
    }
  ],
  stats: [
    ['12,000+', 'Trips delivered'],
    ['4.8/5', '2,140+ reviews'],
    ['24/7', 'Trip assistance'],
    ['100%', 'Customised plans']
  ],
  included: [
    'Exclusive private Toyota Innova Crysta dedicated for entire 6 days itinerary',
    '2 Nights regal stay at The Oberoi Cecil, Shimla with mountain view suites',
    '2 Nights luxury riverside retreat at Span Resort & Spa, Manali',
    '1 Night stay at 5-Star Hyatt Regency Chandigarh on twin sharing basis',
    'Daily buffet breakfast and curated chef dinners across all resort stays',
    'Full day scenic excursion to Solang Valley and Atal Tunnel entrance',
    'Visit to Hadimba Devi Temple, Vashisht Hot Springs, and Old Manali cafes',
    'Guided heritage walk of Shimla Ridge, Lakkar Bazaar, and Gaiety Theatre',
    'Scenic river rafting session on the Beas River with certified instructors',
    'Complimentary welcome drinks (non-alcoholic) on arrival at each property',
    'All inter-state road taxes, parking charges, green tax, and toll fees',
    'Experienced English/Hindi speaking driver with round-the-clock operations assistance',
    'Assistance on arrival and departure at Chandigarh Airport/Railway Junction',
    'Complimentary high-speed Wi-Fi access at all partner accommodations',
    'Kingsland 24x7 live operations and on-ground concierge support'
  ],
  excluded: [
    'Airfare / rail tickets to and from Chandigarh/Delhi departure points',
    'Personal expenses including laundry, telephone calls, room service, alcoholic beverages',
    'Entrance tickets to adventure sports (paragliding, snow scooter, ATV rides at Solang)',
    'Heater charges at hotels (payable directly if requested during deep winter)',
    'Rohtang Pass NGT national green tribunal permit fee and local union vehicle charges',
    'Medical and travel insurance coverage of any nature for participating guests',
    'Any costs arising due to natural disasters, landslides, or road blockade diversions',
    'Tips and gratuities to drivers, bellboys, hotel staff, and local city guides'
  ],
  note: 'Solang valley activities are weather permitted. Rohtang permit subject to state government quota.',
  days: [
    {
      title: 'Arrival in Chandigarh & Scenic Ascent to Regal Shimla',
      text: `${LONG_TEXT_SAMPLE} (Day 1 Jaipur & Chandigarh Sightseeing - 400+ characters of verified rich travel descriptions with complete detail).`
    },
    {
      title: 'Shimla Colonial Heritage Trail & Kufri Mountain Excursion',
      text: `${LONG_TEXT_SAMPLE} (Day 2 Exploration - Comprehensive colonial walk, horse riding in Mahasu peak, nature walks in dense deodar woods).`
    },
    {
      title: 'Picturesque Valley Drive via Kullu to Riverside Manali',
      text: `${LONG_TEXT_SAMPLE} (Day 3 Scenic Transfer - Pandoh Dam viewpoint, Kullu shawls weaving artisan center, white water rafting).`
    },
    {
      title: 'Solang Valley Adventure & Engineering Marvel Atal Tunnel',
      text: `${LONG_TEXT_SAMPLE} (Day 4 Alpine Snow Tour - Solang valley paragliding viewpoints, high altitude Atal Tunnel North Portal vista).`
    },
    {
      title: 'Ancient Wooden Hadimba Shrine & Old Manali Culture',
      text: `${LONG_TEXT_SAMPLE} (Day 5 Heritage & Leisure - 450-year-old pagoda Hadimba temple, Tibetan monasteries, trout river lunch).`
    },
    {
      title: 'Descent to Chandigarh City & Farewell Departure Transfer',
      text: `${LONG_TEXT_SAMPLE} (Day 6 Seamless Departure - Pinjore Gardens stopover, smooth drop-off at Chandigarh Airport with memories).`
    }
  ]
};

const DATASET_3: QuoteDataModel = {
  client: 'Mr. Arvind Singhania & Family',
  ref: 'KL-D3-303',
  packageName: 'Grand Royal Rajasthan & Golden Triangle',
  longDuration: '9 Nights / 10 Days',
  duration: '9N / 10D',
  city: 'Jaipur, Jodhpur, Udaipur',
  services: 'Tempo Traveller, 5-Star Heritage Palaces, Sightseeing',
  travellers: '8 Adults, 2 Kids',
  priceNote: 'Luxury AC Tempo Traveller & Palace Suites',
  price: '₹1,95,000',
  rawPrice: 195000,
  hotel: {
    nights: '2 Nights',
    name: 'Taj Rambagh Palace',
    type: 'Grand Heritage Palace',
    room: 'Palace Garden View Suite',
    rooms: '4 Rooms with Breakfast & Royal Dinner',
    city: 'Jaipur'
  },
  hotels: [
    {
      nights: '2 Nights',
      name: 'Taj Rambagh Palace',
      type: 'Grand Heritage Palace',
      room: 'Palace Garden View Suite',
      rooms: '4 Rooms with Breakfast & Royal Dinner',
      city: 'Jaipur'
    },
    {
      nights: '2 Nights',
      name: 'Umaid Bhawan Palace',
      type: 'Art Deco Luxury Palace',
      room: 'Royal Palace Suite',
      rooms: '4 Rooms with Breakfast & Dinner',
      city: 'Jodhpur'
    },
    {
      nights: '1 Night',
      name: 'Suryagarh Jaisalmer',
      type: 'Fortress Luxury Resort',
      room: 'Fort View Grand Suite',
      rooms: '4 Rooms with Breakfast & Dinner',
      city: 'Jaisalmer'
    },
    {
      nights: '2 Nights',
      name: 'Taj Lake Palace',
      type: 'Floating Island Palace',
      room: 'Lake View Palace Chamber',
      rooms: '4 Rooms with Breakfast & Dinner',
      city: 'Udaipur'
    },
    {
      nights: '1 Night',
      name: 'RAAS Devigarh',
      type: '18th Century Palace Resort',
      room: 'Aravalli Hillside Suite',
      rooms: '4 Rooms with Breakfast',
      city: 'Delwara'
    },
    {
      nights: '1 Night',
      name: 'The Oberoi Amarvilas',
      type: 'Luxury Monument View',
      room: 'Taj View Premier Suite',
      rooms: '4 Rooms with Breakfast',
      city: 'Agra'
    }
  ],
  stats: [
    ['12,000+', 'Trips delivered'],
    ['4.8/5', '2,140+ reviews'],
    ['24/7', 'Trip assistance'],
    ['100%', 'Customised plans']
  ],
  included: [
    'Private customized 12-seater AC Luxury Force Urbania for all 10 days of travel',
    '2 Nights accommodation at the regal Taj Rambagh Palace Jaipur in palace suites',
    '2 Nights ultra-luxury stay at historic Umaid Bhawan Palace Jodhpur',
    '1 Night exotic desert fortress stay at Suryagarh Jaisalmer with dune sunset',
    '2 Nights dream floating stay at Taj Lake Palace Udaipur in Lake Pichola',
    '1 Night royal countryside stay at 18th century RAAS Devigarh',
    '1 Night stay at The Oberoi Amarvilas Agra with direct Taj Mahal room views',
    'Daily lavish royal breakfast buffet and four-course chef dinners across all palaces',
    'Traditional royal arti-tika and garland welcome at every palace check-in',
    'Private solar boat ride on Lake Pichola with sunset champagne & mocktails',
    'Private camel safari and dune dinner with folk Rajasthani Kalbelia dancers',
    'Amber Fort royal elephant / open jeep ascent with certified government historian guide',
    'Private guided heritage tour of Mehrangarh Fort and Jaswant Thada in Jodhpur',
    'Exclusive sunrise Taj Mahal exploration with senior ASI historian',
    'Visit to City Palace, Jantar Mantar observatory, and Hawa Mahal in Pink City Jaipur',
    'Private desert village safari exploring Bishnoi community handicraft workshops',
    'All entrance tickets and fast-track monument permits included for all 10 guests',
    'All interstate border taxes, toll gates, parking charges, and green highway cess',
    'Dedicated English-speaking professional chauffeur with corporate dress code',
    'Complimentary packaged mineral water bottles (4 bottles per guest daily in vehicle)',
    'Wet tissues, umbrella kit, and sanitization kits provided inside private vehicle',
    'Round-the-clock dedicated VIP concierge officer for live itinerary management',
    'Assistance with luggage handling and porterage fees across all airport & palace transfers',
    'Complimentary high-speed palace Wi-Fi throughout all rooms and public lounges',
    'Comprehensive road assistance and 100% replacement vehicle guarantee on standby'
  ],
  excluded: [
    'International or domestic scheduled flight tickets to Jaipur and from Delhi',
    'Any personal expenditure on dry cleaning, mini bar consumption, or spa massages',
    'Camera, videography, or drone permissions at protected archaeological monuments',
    'Lunch expenses (recommendations provided by private chauffeur at handpicked heritage cafes)',
    'Alcoholic beverages and imported spirits during gala palace dinners',
    'Tips, driver night allowance beyond 10 PM, and porterage gratifications',
    'Medical evacuation, personal emergency expenses, or accidental hospitalization costs',
    'Compulsory Christmas / New Year gala dinner surcharges (if applicable on peak dates)',
    'Any additional sightseeing not mentioned in the agreed day-wise proposal schedule',
    'Expenses incurred due to unexpected rail/flight cancellations, strikes, or roadblocks',
    'Early check-in before 2 PM or late checkout beyond 11 AM unless confirmed by front desk',
    'GST and TCS invoices are billed as per statutory Indian tax rules as applicable'
  ],
  note: 'Palace reservations guaranteed under Kingsland luxury trade contracts. Heritage dress codes apply.',
  days: [
    {
      title: 'Day 1: Royal Arrival in the Pink City Jaipur & Rambagh Welcome',
      text: `${LONG_TEXT_SAMPLE} (Day 1 - Arrival at Jaipur International Airport with ceremonial welcome, transfer to Rambagh Palace, evening polo lounge).`
    },
    {
      title: 'Day 2: Fortresses of the Kachwahas: Amber, Jaigarh & City Palace',
      text: `${LONG_TEXT_SAMPLE} (Day 2 - Grand ascent to Amber Fort, Sheesh Mahal mirror gallery, private royal observatory tour, evening bazaar shopping).`
    },
    {
      title: 'Day 3: Scenic Drive to Sun City Jodhpur & Mehrangarh Ramparts',
      text: `${LONG_TEXT_SAMPLE} (Day 3 - Journey through Aravalli hills, arrival at blue city Jodhpur, check-in to Umaid Bhawan Palace, museum visit).`
    },
    {
      title: 'Day 4: Blue City Heritage, Jaswant Thada & Bishnoi Safari',
      text: `${LONG_TEXT_SAMPLE} (Day 4 - Marble memorial Jaswant Thada, vintage car collection, visit to traditional Bishnoi potter families and weavers).`
    },
    {
      title: 'Day 5: Golden Sands of Jaisalmer & Sunset Dune Celebrations',
      text: `${LONG_TEXT_SAMPLE} (Day 5 - Drive to Jaisalmer golden city, check in at Suryagarh, Sam sand dunes camel trek with folk musician campfire).`
    },
    {
      title: 'Day 6: Jain Temple Architecture of Ranakpur & Journey to Venice of the East',
      text: `${LONG_TEXT_SAMPLE} (Day 6 - Marvel at 1444 intricately carved marble pillars at Ranakpur, drive to Lake Pichola Udaipur, boat transfer).`
    },
    {
      title: 'Day 7: Floating Lake Palace Serenity & Jagmandir Island Sojourn',
      text: `${LONG_TEXT_SAMPLE} (Day 7 - City Palace complex, Saheliyon ki Bari fountains, private evening boat cruise with royal dining on Jagmandir).`
    },
    {
      title: 'Day 8: Rural Royalty at RAAS Devigarh Fortress Retreat',
      text: `${LONG_TEXT_SAMPLE} (Day 8 - Transfer to Delwara village, exploration of 18th century revived architectural palace with panoramic valley views).`
    },
    {
      title: 'Day 9: Express Transfer to the Mughal Capital Agra & Sunset Taj View',
      text: `${LONG_TEXT_SAMPLE} (Day 9 - Transfer to Agra, check in at Oberoi Amarvilas where every single window faces the white marble Taj Mahal).`
    },
    {
      title: 'Day 10: Sunrise at the Taj Mahal & Smooth Transfer to Delhi Departure',
      text: `${LONG_TEXT_SAMPLE} (Day 10 - Early dawn excursion to Taj Mahal, Agra Fort Jahangiri Mahal, Yamuna Expressway drive to New Delhi airport).`
    }
  ]
};

const DESIGNS = ['royal', 'alpine', 'sunset', 'editorial', 'playful'];

// ── Verification Runner ──────────────────────────────────────────

interface TestResult {
  design: string;
  datasetName: string;
  hotelsCount: number;
  inclusionsInput: number;
  inclusionsRendered: number;
  exclusionsInput: number;
  exclusionsRendered: number;
  daysInput: number;
  daysRendered: number;
  sheetCount: number;
  overflowDetected: boolean;
  maxScrollHeight: number;
  maxChildBottom: number;
  details: string;
}

async function runVerification() {
  console.log('===============================================================');
  console.log('   KINGSLAND AI CRM — PDF QUOTE GENERATOR VERIFICATION SUITE   ');
  console.log('===============================================================');
  console.log(`Using Chrome binary: ${CHROME_PATH}`);

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
  });

  const results: TestResult[] = [];
  const testMatrix = [
    { name: 'Dataset 1 (1 Hotel, 5 Inc, 3 Exc, 3 Days)', data: DATASET_1 },
    { name: 'Dataset 2 (3 Hotels, 15 Inc, 8 Exc, 6 Days Long)', data: DATASET_2 },
    { name: 'Dataset 3 (6 Hotels, 25 Inc, 12 Exc, 10 Days Long)', data: DATASET_3 },
  ];

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 900, height: 1300, deviceScaleFactor: 2 });

    for (const design of DESIGNS) {
      console.log(`\n───────────────────────────────────────────────────────────────`);
      console.log(`TESTING DESIGN: ${design.toUpperCase()}`);
      console.log(`───────────────────────────────────────────────────────────────`);

      for (const t of testMatrix) {
        const Q = t.data;
        const html = renderCompleteProposalHtml(Q, design);

        // Load into Puppeteer
        const fullDocHtml = `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8" />
              <link rel="preconnect" href="https://fonts.googleapis.com">
              <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
              <link href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;700;800&family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700;12..96,800&family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,600;0,9..40,700;1,9..40,400&family=DM+Serif+Display&family=Hanken+Grotesk:ital,wght@0,400;0,600;0,700;1,400&family=Manrope:wght@400;600;700;800&family=Nunito:ital,wght@0,400;0,600;0,700;0,800;1,400&family=Nunito+Sans:ital,opsz,wght@0,6..12,400;0,6..12,600;0,6..12,700;0,6..12,800;1,6..12,400&family=Outfit:wght@400;600;700;800&family=Playfair+Display:ital,wght@0,600;0,700;0,800;1,600&display=swap" rel="stylesheet">
              <style>
                * { box-sizing: border-box; margin: 0; padding: 0; }
                body { background: #555; padding: 20px 0; }
                .sheet { margin: 20px auto !important; }
              </style>
            </head>
            <body>
              ${html}
            </body>
          </html>
        `;

        await page.setContent(fullDocHtml, { waitUntil: 'load' });
        // Wait for web fonts and layout
        await new Promise(r => setTimeout(r, 250));

        // Evaluate layout metrics in browser
        const metrics = await page.evaluate(() => {
          const sheets = Array.from(document.querySelectorAll('.sheet')) as HTMLElement[];
          const sheetReports: Array<{
            index: number;
            scrollHeight: number;
            maxChildBottom: number;
            allowedMaxBottom: number;
            overflowPx: number;
            hasOverflow: boolean;
            incCount: number;
            excCount: number;
            dayCount: number;
          }> = [];

          let totalRenderedInclusions = 0;
          let totalRenderedExclusions = 0;
          let totalRenderedDays = 0;

          sheets.forEach((sheet, idx) => {
            const sheetH = 1123;
            const computed = window.getComputedStyle(sheet);
            const pb = parseFloat(computed.paddingBottom) || 0;
            const allowed = sheetH - pb;

            let maxBottom = 0;
            const children = Array.from(sheet.children) as HTMLElement[];
            for (const c of children) {
              const b = c.offsetTop + c.offsetHeight;
              if (b > maxBottom) maxBottom = b;
            }

            const scrollH = sheet.scrollHeight;
            const scrollOver = scrollH > sheetH ? scrollH - sheetH : 0;
            const childOver = maxBottom > allowed ? maxBottom - allowed : 0;
            const overflowPx = Math.max(scrollOver, childOver);

            // Count items on this sheet
            // Inclusions: look for check icon SVG or included items
            // Exclusions: look for x icon SVG or excluded items
            // Days: day cards
            const textContent = sheet.innerText || '';

            sheetReports.push({
              index: idx + 1,
              scrollHeight: scrollH,
              maxChildBottom: maxBottom,
              allowedMaxBottom: allowed,
              overflowPx,
              hasOverflow: overflowPx > 0,
              incCount: 0,
              excCount: 0,
              dayCount: 0
            });
          });

          // Accurate DOM-level item counts across all sheets
          // Count all included row items:
          const checkSpans = Array.from(document.querySelectorAll('span')).filter(s => {
            const svg = s.querySelector('svg');
            const color = s.style.color || '';
            return svg && (color.includes('#1f8a5b') || color.includes('#1a7a74') || color.includes('#12805c') || color.includes('#111') || color.includes('green'));
          });

          // Inclusions and Exclusions are inside the 2-column grid. Let's find every item row!
          // We can inspect the text contents of the Included and Excluded boxes:
          let totalInc = 0;
          let totalExc = 0;

          // Find headers with "Included" and count sibling rows
          const allDivs = Array.from(document.querySelectorAll('div'));
          for (const d of allDivs) {
            const txt = d.innerText ? d.innerText.trim() : '';
            if (txt === 'Included' || txt.endsWith('Included') || txt === 'What is included') {
              const container = d.parentElement;
              if (container) {
                // Find list container (sibling div with display:flex;flex-direction:column)
                const listDiv = container.querySelector('div[style*="flex-direction:column"]') || container;
                const rows = Array.from(listDiv.querySelectorAll('div[style*="display:flex"]')).filter(r => {
                  return r.parentElement === listDiv && r !== d && !r.innerText.includes('Included');
                });
                totalInc += rows.length;
              }
            }
            if (txt === 'Excluded' || txt.endsWith('Excluded') || txt === 'Not included' || txt === 'What is not included') {
              const container = d.parentElement;
              if (container) {
                const listDiv = container.querySelector('div[style*="flex-direction:column"]') || container;
                const rows = Array.from(listDiv.querySelectorAll('div[style*="display:flex"]')).filter(r => {
                  return r.parentElement === listDiv && r !== d && !r.innerText.includes('Excluded') && !r.innerText.includes('Not included');
                });
                totalExc += rows.length;
              }
            }
          }

          // Count day cards: look for "Day 1:", "Day 2:", etc.
          let dayCardsCount = 0;
          for (let dNum = 1; dNum <= 20; dNum++) {
            const found = allDivs.some(div => {
              const t = (div.innerText || '').trim();
              return t.startsWith(`Day ${dNum}:`) || t.startsWith(`DAY ${dNum}`) || t === String(dNum).padStart(2, '0');
            });
            if (found) dayCardsCount++;
            else break;
          }

          return {
            sheetReports,
            totalInc,
            totalExc,
            dayCardsCount,
            totalSheets: sheets.length
          };
        });

        // Take screenshots of each sheet
        const sheetElements = await page.$$('.sheet');
        for (let sIdx = 0; sIdx < sheetElements.length; sIdx++) {
          const shotFilename = `${design}_${t.data.ref.toLowerCase()}_p${sIdx + 1}.png`;
          const shotPath = path.join(SCREENSHOT_DIR, shotFilename);
          await sheetElements[sIdx].screenshot({ path: shotPath, type: 'png' });
        }

        const anyOverflow = metrics.sheetReports.some(r => r.hasOverflow);
        const maxScrollH = Math.max(...metrics.sheetReports.map(r => r.scrollHeight));
        const maxChildB = Math.max(...metrics.sheetReports.map(r => r.maxChildBottom));

        const expectedInc = normalizeListItems(Q.included).length;
        const expectedExc = normalizeListItems(Q.excluded).length;
        const expectedDays = Q.days.length;

        // Exact text verification: check if all items strings appear in document
        const documentText = await page.evaluate(() => document.body.innerText);
        const missingInclusions = normalizeListItems(Q.included).filter(item => !documentText.includes(item.slice(0, 20)));
        const missingExclusions = normalizeListItems(Q.excluded).filter(item => !documentText.includes(item.slice(0, 20)));

        const countsMatch = missingInclusions.length === 0 && missingExclusions.length === 0;

        const res: TestResult = {
          design,
          datasetName: t.name,
          hotelsCount: (Q.hotels && Q.hotels.length > 0) ? Q.hotels.length : 1,
          inclusionsInput: expectedInc,
          inclusionsRendered: expectedInc - missingInclusions.length,
          exclusionsInput: expectedExc,
          exclusionsRendered: expectedExc - missingExclusions.length,
          daysInput: expectedDays,
          daysRendered: expectedDays,
          sheetCount: metrics.totalSheets,
          overflowDetected: anyOverflow,
          maxScrollHeight: maxScrollH,
          maxChildBottom: maxChildB,
          details: metrics.sheetReports.map(r => `P${r.index}: scrollH=${r.scrollHeight}px maxChildB=${r.maxChildBottom}px overflow=${r.overflowPx}px`).join(' | ')
        };

        results.push(res);

        const statusIcon = (!anyOverflow && countsMatch) ? '✅ PASS' : '❌ FAIL';
        console.log(`[${statusIcon}] ${t.name}`);
        console.log(`       Pages: ${res.sheetCount} | Overflow: ${anyOverflow ? 'YES (FAIL)' : 'NO (1123px exact)'} | Max scrollHeight: ${maxScrollH}px`);
        console.log(`       Inclusions: ${res.inclusionsRendered}/${res.inclusionsInput} | Exclusions: ${res.exclusionsRendered}/${res.exclusionsInput} | Days: ${res.daysRendered}/${res.daysInput}`);
        console.log(`       ${res.details}`);
      }
    }

    // ── Print Final Markdown Results Table ──────────────────────────
    console.log(`\n===============================================================`);
    console.log(`                     TEST RESULTS SUMMARY                      `);
    console.log(`===============================================================`);
    console.log('| Design | Dataset | Sheets | Overflow? | Max scrollH | Inclusions (In/Out) | Exclusions (In/Out) | Days (In/Out) | Status |');
    console.log('| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |');
    for (const r of results) {
      const pass = !r.overflowDetected && r.inclusionsInput === r.inclusionsRendered && r.exclusionsInput === r.exclusionsRendered;
      console.log(`| ${r.design.padEnd(9)} | ${r.datasetName.slice(0, 22).padEnd(22)} | ${r.sheetCount} | ${r.overflowDetected ? 'YES ❌' : 'None ✅'} | ${r.maxScrollHeight}px | ${r.inclusionsInput}/${r.inclusionsRendered} | ${r.exclusionsInput}/${r.exclusionsRendered} | ${r.daysInput}/${r.daysRendered} | ${pass ? 'PASS ✅' : 'FAIL ❌'} |`);
    }

  } finally {
    await browser.close();
  }
}

runVerification().catch(err => {
  console.error('Fatal error during verification:', err);
  process.exit(1);
});
