import initSqlJs from 'sql.js';
import fs from 'fs';
import { renderPartnerBadgeHtml, deduplicatePartners, HOTEL_PARTNERS } from '../utils/partnerLogos';
import { renderTermsSheet } from '../services/quoteDesignRenderer';

async function main() {
  const SQL = await initSqlJs();
  const db = new SQL.Database(fs.readFileSync('kingsland.db'));
  const rows = db.exec("SELECT * FROM partner_brands WHERE is_active=1 AND category='hotel' ORDER BY sort_order ASC, created_at ASC");
  const cols = rows[0].columns;
  const items = rows[0].values.map(v => Object.fromEntries(cols.map((c, i) => [c, v[i]])));
  console.log('DB Hotel partners count:', items.length);
  for (const it of items) {
    console.log(it.id, it.name);
  }

  console.log('\nDefault HOTEL_PARTNERS count:', HOTEL_PARTNERS.length);
  for (const it of HOTEL_PARTNERS) {
    console.log(it.id, it.name);
  }

  const termsHtmlWithDb = renderTermsSheet({
    client: 'Test', ref: 'KL-1003', packageName: 'Test', longDuration: '', duration: '', city: '', services: '', travellers: '', priceNote: '', price: '100',
    hotel: { nights: '', name: '', type: '', room: '', rooms: '', city: '' },
    advisor: { name: '', role: '', phones: '', email: '' },
    stats: [], included: [], excluded: [], days: []
  }, 'royal', items as any);

  const termsHtmlDefault = renderTermsSheet({
    client: 'Test', ref: 'KL-1003', packageName: 'Test', longDuration: '', duration: '', city: '', services: '', travellers: '', priceNote: '', price: '100',
    hotel: { nights: '', name: '', type: '', room: '', rooms: '', city: '' },
    advisor: { name: '', role: '', phones: '', email: '' },
    stats: [], included: [], excluded: [], days: []
  }, 'royal');

  console.log('\nTerms HTML with DB items contains Hotel Working Partners:');
  const hotelSectionMatch = termsHtmlWithDb.match(/Hotel Working Partners<\/span>[\s\S]*?<\/div>\s*<\/div>/);
  if (hotelSectionMatch) {
    const badgeMatches = hotelSectionMatch[0].match(/<div title=/g);
    console.log('Badges count with DB items:', badgeMatches?.length);
  }

  console.log('\nTerms HTML default (no customPartners passed):');
  const defaultSectionMatch = termsHtmlDefault.match(/Hotel Working Partners<\/span>[\s\S]*?<\/div>\s*<\/div>/);
  if (defaultSectionMatch) {
    const badgeMatches = defaultSectionMatch[0].match(/<div title=/g);
    console.log('Badges count default:', badgeMatches?.length);
  }
}

main().catch(console.error);
