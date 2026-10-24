import initSqlJs from 'sql.js';
import fs from 'fs';

async function main() {
  const SQL = await initSqlJs();
  const db = new SQL.Database(fs.readFileSync('kingsland.db'));
  const quotes = db.exec("SELECT * FROM quotes WHERE lead_id = 'lead-1787130701515'");
  const qCols = quotes[0].columns;
  const quoteRow = Object.fromEntries(qCols.map((c, i) => [c, quotes[0].values[0][i]]));
  console.log('Quote:', quoteRow);

  const days = db.exec("SELECT * FROM quote_itinerary_days WHERE quote_id = '" + quoteRow.id + "' ORDER BY day_number ASC");
  if (days.length > 0) {
    console.log('Columns:', days[0].columns);
    console.log('Day 2 full text:');
    console.log(days[0].values[1][4]);
  }
}

main().catch(console.error);
