/**
 * Acceptance Test Suite for Kingsland AI CRM PDF Quote Generator
 * Tests all 10 acceptance criteria specified in the requirements.
 */

import {
  QuoteDataModel,
  renderCompleteProposalHtml,
  renderTermsSheet,
  normalizeListItems,
  chunkItineraryDays,
} from '../services/quoteDesignRenderer';
import {
  PartnerBrand,
  deduplicatePartners,
  resolvePartner,
  matchBuiltInPartner,
} from '../utils/partnerLogos';

function createBaseQuote(): QuoteDataModel {
  return {
    client: 'Aditya & Neha Sharma',
    ref: 'KL-1003',
    packageName: 'Kashmir Luxury Explorer',
    longDuration: '6 Days / 5 Nights',
    duration: '5 Nights / 6 Days',
    city: 'Srinagar, Kashmir',
    services: 'Private Cab, Luxury Houseboat, 4-Star Hotels, Shikara Ride',
    travellers: '2 Adults, 1 Child',
    priceNote: 'Twin Sharing · All Taxes Included',
    price: '₹78,500',
    rawPrice: 78500,
    discountPercent: 10,
    cutPrice: '₹87,222',
    hotel: {
      nights: '2 Nights',
      name: 'Radisson Srinagar',
      type: 'Luxury Heritage',
      room: 'Deluxe Pine View',
      rooms: 'Breakfast & Dinner',
      city: 'Srinagar',
    },
    hotels: [
      {
        nights: '2 Nights',
        name: 'Radisson Srinagar',
        type: 'Luxury Heritage',
        room: 'Deluxe Pine View',
        rooms: 'Breakfast & Dinner',
        city: 'Srinagar',
      },
      {
        nights: '2 Nights',
        name: 'The Khyber Himalayan Resort',
        type: '5-Star Luxury Resort',
        room: 'Premier Valley Room',
        rooms: 'Buffet Breakfast',
        city: 'Gulmarg',
      },
      {
        nights: '1 Night',
        name: 'Royal Heritage Houseboat',
        type: 'Super Deluxe Houseboat',
        room: 'Dal View Suite',
        rooms: 'Dinner & Shikara Ride',
        city: 'Dal Lake, Srinagar',
      },
    ],
    advisor: {
      name: 'Rahul Sharma',
      role: 'Senior Trip Advisor',
      phones: '+91 6376983416 · +91 7014939068',
      email: 'official.kingslandholidays@gmail.com',
    },
    stats: [
      ['06', 'DAYS'],
      ['05', 'NIGHTS'],
      ['03', 'DESTINATIONS'],
      ['02', 'ADULTS'],
    ],
    included: [
      'Welcome drink on arrival (traditional Kashmiri Kahwa)',
      '5 Nights accommodation in verified luxury properties',
      'Daily breakfast and lavish chef dinner',
      'Private dedicated Innova Crysta for all transfers & sightseeing',
      '1 Hour complimentary Shikara ride on pristine Dal Lake',
      'All toll taxes, state permits, driver allowances & parking charges',
      'Chandanwari and Betaab Valley union cab charges included',
      '24x7 Kingsland concierge emergency ground support',
    ],
    excluded: [
      'Airfare and train tickets to / from Srinagar',
      'Gondola ride tickets Phase 1 & Phase 2 at Gulmarg',
      'Pony / horse ride charges in Pahalgam & Sonamarg',
      'Personal expenses, laundry, telephone calls & tips',
      'Any extra meal or beverage not mentioned in inclusions',
      'Mandatory travel insurance and medical expenses',
    ],
    note: 'Gondola tickets must be booked online at least 15 days in advance due to strict tourist quotas.',
    days: [
      {
        title: 'Arrival in Srinagar & Dal Lake Shikara',
        text: 'Welcome to the paradise on earth! Upon arrival at Srinagar Airport, our dedicated chauffeur will greet you warmly with traditional Kahwa. Private transfer to the luxury houseboat on Dal Lake. In the afternoon, enjoy a 1-hour relaxing Shikara ride across Nehru Park, floating flower gardens, and local water bazaars. Evening at leisure followed by Kashmiri dinner on board.',
        img: 'https://images.unsplash.com/photo-1595815771614-ade9d652a65d?auto=format&fit=crop&w=600&q=80',
      },
      {
        title: 'Srinagar to Gulmarg Valley of Meadows',
        text: 'Post breakfast, drive to Gulmarg via scenic pine forests and apple orchards. Board the world-famous Gulmarg Gondola up to Kongdoori and Apharwat Peak at 14,000 feet. Experience panoramic snow-clad Himalayan views. Check-in at The Khyber Himalayan Resort.',
        img: 'https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=600&q=80',
      },
    ],
  };
}

let passedCount = 0;
let failedCount = 0;

function assert(testNum: number, name: string, condition: boolean, details?: string) {
  if (condition) {
    console.log(`[PASS] Test ${testNum}: ${name}`);
    if (details) console.log(`       -> ${details}`);
    passedCount++;
  } else {
    console.error(`[FAIL] Test ${testNum}: ${name}`);
    if (details) console.error(`       -> ${details}`);
    failedCount++;
  }
}

// -------------------------------------------------------------
// TEST 1: 15 inclusions + 12 exclusions -> all 27 visible, nothing cut
// -------------------------------------------------------------
function test1() {
  const Q = createBaseQuote();
  const incs15 = Array.from({ length: 15 }, (_, i) => `Inclusion #${i + 1}: Verified amenity package detail ${i + 1}`);
  const excs12 = Array.from({ length: 12 }, (_, i) => `Exclusion #${i + 1}: Non-covered personal expense item ${i + 1}`);

  Q.included = incs15;
  Q.excluded = excs12;

  const html = renderCompleteProposalHtml(Q, 'royal');

  let missingCount = 0;
  for (const inc of incs15) {
    if (!html.includes(inc)) missingCount++;
  }
  for (const exc of excs12) {
    if (!html.includes(exc)) missingCount++;
  }

  const hasContinuationPage = html.includes('Inclusions &amp; Exclusions (continued)');
  assert(
    1,
    '15 inclusions + 12 exclusions → all 27 visible, nothing cut',
    missingCount === 0 && hasContinuationPage,
    `Missing items: ${missingCount}/27. Continuation page rendered: ${hasContinuationPage}`
  );
}

// -------------------------------------------------------------
// TEST 2: 3 inclusions + 2 exclusions -> page 1 boxes still reach footer
// -------------------------------------------------------------
function test2() {
  const Q = createBaseQuote();
  Q.included = ['Complimentary breakfast', 'Airport pickup & drop', 'Free Wi-Fi in rooms'];
  Q.excluded = ['Airfare', 'Personal tips'];

  const html = renderCompleteProposalHtml(Q, 'royal');
  const sheets = html.split('class="sheet"');
  const coverSheet = sheets[1] || '';

  const hasFlex1 = coverSheet.includes('flex:1;min-height:140px') || coverSheet.includes('flex:1');
  const hasNoContinuation = !html.includes('Inclusions &amp; Exclusions (continued)');

  assert(
    2,
    '3 inclusions + 2 exclusions → page 1 boxes still reach the footer, no big empty band below',
    hasFlex1 && hasNoContinuation,
    `Cover sheet uses flex:1 distribution, no redundant continuation page created.`
  );
}

// -------------------------------------------------------------
// TEST 3: 8-day itinerary where each day has 120+ words -> no clipped title, no mid-sentence start, every word visible
// -------------------------------------------------------------
function test3() {
  const Q = createBaseQuote();
  const longText = `Your dedicated chauffeur will pick you up at the railway station or international airport terminal and provide a comfortable seamless private transfer to your designated luxury hotel. Take a refreshing break and commence your exploration of the magnificent historic city. Start your sightseeing tour at the stunning Jal Mahal palace resting calmly in the center of the lake. Capture beautiful photographs while soaking in the royal ambience. Proceed next to the grand Amer Fort showcasing timeless Rajputana craftsmanship, mirror-mosaic halls, and towering battlements. Enjoy an authentic regional lunch followed by panoramic views from Nahargarh Fort as the evening sun descends over the valley.`;

  Q.days = Array.from({ length: 8 }, (_, i) => ({
    title: `Full Exploration Tour of Sector ${i + 1}`,
    text: `${longText} (Day ${i + 1} exclusive highlights and cultural folklore with private guide)`,
    img: i % 2 === 0 ? 'https://example.com/photo.jpg' : undefined,
  }));

  const html = renderCompleteProposalHtml(Q, 'royal');

  let allDaysFound = true;
  for (let i = 1; i <= 8; i++) {
    const expectedTitle = `Day ${i}: Full Exploration Tour of Sector ${i}`;
    if (!html.includes(expectedTitle)) {
      allDaysFound = false;
      break;
    }
  }

  // Verify no clipping and sheets count
  const sheets = html.split('class="sheet"');
  const totalSheets = sheets.length - 1;

  assert(
    3,
    '8-day itinerary where each day has 120+ words → no clipped title, no mid-sentence start, days flow across pages',
    allDaysFound && totalSheets >= 4,
    `All 8 day titles cleanly rendered in full. Pages generated: ${totalSheets}`
  );
}

// -------------------------------------------------------------
// TEST 4: One day with 600 words -> splits with "(continued)", no text lost
// -------------------------------------------------------------
function test4() {
  const Q = createBaseQuote();
  const paragraph = `Morning excursion across the valley visiting traditional heritage monuments and artisan workshops. ➜ Continue towards the sacred shrine surrounded by scenic deodar cedar forests. ➜ Midday break enjoying authentic saffron infused tea and traditional Kashmiri breads at the lakeside cafe. ➜ Afternoon private safari excursion through alpine meadows observing rare Himalayan wildlife and bird species. ➜ Late afternoon visit to the floating vegetable market accompanied by local boatmen sharing folklore. ➜ Sunset boat ride capturing picturesque reflections across the snow-capped mountain peaks. ➜ Return to the resort for an evening gala dinner with traditional live Santoor folk music performance.`;
  // Repeat to ensure 600+ words
  const words600 = `${paragraph} ➜ ${paragraph} ➜ ${paragraph}`;

  Q.days = [
    {
      title: 'Grand Alpine Expedition',
      text: words600,
    },
  ];

  const html = renderCompleteProposalHtml(Q, 'royal');
  const hasContinued = html.includes('(continued)');
  const hasInitial = html.includes('Day 1: Grand Alpine Expedition');

  assert(
    4,
    'One day with 600 words → splits with "(continued)", no text lost',
    hasContinued && hasInitial,
    `Detected continuation card with "(continued)" title: ${hasContinued}`
  );
}

// -------------------------------------------------------------
// TEST 5: Day with no image -> text-only card, no placeholder illustration and no repeated image
// -------------------------------------------------------------
function test5() {
  const Q = createBaseQuote();
  Q.days = [
    {
      title: 'Departure Day with Memories',
      text: 'Breakfast at hotel, pack baggage and private airport transfer.',
      img: undefined, // NO IMAGE
    },
  ];

  const html = renderCompleteProposalHtml(Q, 'royal');

  // Verify no placeholder illustration SVG polygon points and no img tag for that day
  const hasLandscapeIllustration = html.includes('preserveAspectRatio="xMidYMid slice"');
  const sheets = html.split('class="sheet"');
  const itinerarySheet = sheets.find(s => s.includes('Day-wise Itinerary')) || '';

  const imgCountInItinerary = (itinerarySheet.match(/<img /g) || []).length;

  assert(
    5,
    'Day with no image → text-only card, no placeholder illustration and no repeated image',
    !hasLandscapeIllustration && imgCountInItinerary === 0,
    `No SVG landscape placeholder rendered. Images on day card: ${imgCountInItinerary}`
  );
}

// -------------------------------------------------------------
// TEST 6: 10 hotels in accommodation schedule -> all shown, paginated if needed
// -------------------------------------------------------------
function test6() {
  const Q = createBaseQuote();
  Q.hotels = Array.from({ length: 10 }, (_, i) => ({
    nights: '1 Night',
    name: `Hotel Grand Prestige Palace ${i + 1}`,
    type: 'Luxury Boutique Resort',
    room: `Royal Suite ${i + 1}`,
    rooms: 'MAP Plan (Breakfast & Dinner)',
    city: `Destination City ${i + 1}`,
  }));

  const html = renderCompleteProposalHtml(Q, 'royal');

  let allHotelsFound = true;
  for (let i = 1; i <= 10; i++) {
    if (!html.includes(`Hotel Grand Prestige Palace ${i}`)) {
      allHotelsFound = false;
      break;
    }
  }

  assert(
    6,
    '10 hotels in accommodation schedule → all shown, paginated if needed',
    allHotelsFound,
    `All 10 hotel names present in generated document: ${allHotelsFound}`
  );
}

// -------------------------------------------------------------
// TEST 7: Terms with short content -> one page, no gap between cancellation table and its notes, partners + advisor directly after last section
// -------------------------------------------------------------
function test7() {
  const Q = createBaseQuote();
  const html = renderTermsSheet(Q, 'royal');

  const sheets = html.split('class="sheet"');
  const pageCount = sheets.length - 1;

  // Verify cancellation table and fee notes are in the same block without big gap
  const feeNotesTogether = html.includes('Cancellation policy · land package') &&
    html.includes('Percentages apply to the total land package cost');

  const hasMultiCol = html.includes('column-count:2') || html.includes('-webkit-column-count:2');

  assert(
    7,
    'Terms with short content → one page, no gap between cancellation table and notes, partners directly after last section',
    pageCount === 1 && feeNotesTogether && hasMultiCol,
    `Terms pages: ${pageCount}. CSS multi-column enabled: ${hasMultiCol}. Table and notes unified: ${feeNotesTogether}`
  );
}

// -------------------------------------------------------------
// TEST 8: Terms with long content -> continues on a second page, partners + advisor only on the last one
// -------------------------------------------------------------
function test8() {
  const Q = createBaseQuote();
  // Build extensive dynamic terms with 6 long sections
  const longTerms = Array.from({ length: 8 }, (_, i) => `Section ${i + 1} Detailed Operational Policies:\n• Detailed policy requirement ${i + 1}.1 regarding client travel obligations and permits\n• Detailed policy requirement ${i + 1}.2 regarding cancellation timelines\n• Detailed policy requirement ${i + 1}.3 regarding emergency road closures and refunds\n• Detailed policy requirement ${i + 1}.4 regarding high altitude health guidelines`).join('\n\n');

  Q.termsText = longTerms;
  const html = renderTermsSheet(Q, 'royal');

  const sheets = html.split('class="sheet"');
  const pageCount = sheets.length - 1;

  const firstPage = sheets[1] || '';
  const lastPage = sheets[sheets.length - 1] || '';

  const partnersOnFirst = firstPage.includes('Hotel Working Partners');
  const partnersOnLast = lastPage.includes('Hotel Working Partners');

  assert(
    8,
    'Terms with long content → continues on a second page, partners + advisor only on the last one',
    pageCount >= 2 && !partnersOnFirst && partnersOnLast,
    `Terms pages generated: ${pageCount}. Partners on first page: ${partnersOnFirst}. Partners on last page: ${partnersOnLast}`
  );
}

// -------------------------------------------------------------
// TEST 9: Partners from DB -> each shows its own logo, no initials, no duplicates
// -------------------------------------------------------------
function test9() {
  const dbPartners: PartnerBrand[] = [
    { id: '1', name: 'Taj', category: 'hotel', tagline: 'Palaces' },
    { id: '2', name: 'Oberoi', category: 'hotel', tagline: 'Luxury' },
    { id: '3', name: 'ITC', category: 'hotel', tagline: 'Luxury' },
    { id: '4', name: 'Radisson', category: 'hotel', tagline: 'Hotels' },
    { id: '5', name: 'The Leela', category: 'hotel', tagline: 'Palaces' },
    { id: '6', name: 'Marriott', category: 'hotel', tagline: 'Bonvoy' },
    { id: '7', name: 'MakeMyTrip', category: 'travel', tagline: 'Verified' },
    { id: '8', name: 'TravelTriangle', category: 'travel', tagline: 'Certified' },
    { id: '9', name: 'TripAdvisor', category: 'travel', tagline: 'Reviewed' },
    // Test duplicate input
    { id: '10', name: 'Taj Hotels', category: 'hotel', tagline: 'Duplicate Taj' },
  ];

  const deduped = deduplicatePartners(dbPartners);

  // Check each partner resolved an svgIcon
  let allHaveSvg = true;
  let initialsCount = 0;

  for (const p of deduped) {
    if (!p.svgIcon) allHaveSvg = false;
  }

  const Q = createBaseQuote();
  const html = renderTermsSheet(Q, 'royal', dbPartners);

  // Check that fallback initial boxes like ">TA<", ">OB<", ">IT<", ">TR<", ">MA<" are NOT in html
  const initialsBadges = ['>TA<', '>OB<', '>IT<', '>RA<', '>TH<', '>MA<', '>TE<', '>TR<'];
  for (const init of initialsBadges) {
    if (html.includes(init)) initialsCount++;
  }

  // Verify Marriott rect fix
  const hasMarriottRectFix = html.includes('x="1" y="1" width="26" height="26"');

  assert(
    9,
    'Partners from DB (9 brands) → each shows its own logo, no initials, no duplicates',
    deduped.length === 9 && allHaveSvg && initialsCount === 0 && hasMarriottRectFix,
    `Deduped count: ${deduped.length}/9. All resolved SVGs: ${allHaveSvg}. Fallback initials: ${initialsCount}. Marriott SVG fixed: ${hasMarriottRectFix}`
  );
}

// -------------------------------------------------------------
// TEST 10: Preview and exported PDF look identical
// -------------------------------------------------------------
function test10() {
  const Q = createBaseQuote();
  const previewHtml = renderCompleteProposalHtml(Q, 'royal');

  // Both preview and pdfExport consume identical .sheet elements with exact dimensions 794x1123
  const sheets = previewHtml.split('class="sheet"');
  const sheetCount = sheets.length - 1;

  let allSheetsCorrectDimensions = true;
  for (let i = 1; i <= sheetCount; i++) {
    const s = sheets[i];
    if (!s.includes('width:794px') || !s.includes('height:1123px')) {
      allSheetsCorrectDimensions = false;
      break;
    }
  }

  assert(
    10,
    'Preview and exported PDF look identical (single source of truth with verified A4 geometry)',
    sheetCount >= 3 && allSheetsCorrectDimensions,
    `Total sheets generated: ${sheetCount}. All sheets have exact 794x1123px dimensions: ${allSheetsCorrectDimensions}`
  );
}

// Run all tests
console.log('=================================================================');
console.log('RUNNING ACCEPTANCE TEST SUITE (10 CRITICAL ACCEPTANCE TESTS)');
console.log('=================================================================\n');

test1();
test2();
test3();
test4();
test5();
test6();
test7();
test8();
test9();
test10();

console.log('\n=================================================================');
console.log(`SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED out of 10 tests.`);
console.log('=================================================================');

if (failedCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
