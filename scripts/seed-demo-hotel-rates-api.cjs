const { PDFDocument, StandardFonts } = require('pdf-lib');
(async () => {
  const base = 'http://localhost:5000/api';
  const usersResponse = await fetch(base + '/users');
  if (!usersResponse.ok) throw new Error('Unable to read CRM users');
  const users = await usersResponse.json();
  const admin = users.find(user => user.role === 'Admin' && user.status === 'Active' && user.accessLevel !== 'ViewOnly');
  if (!admin) throw new Error('An active administrator with edit access is required');
  const headers = { 'Content-Type': 'application/json', 'x-user-id': admin.id };
  const get = async route => { const res = await fetch(base + route, { headers }); if (!res.ok) throw new Error(`${route}: ${res.status}`); return res.json(); };
  const existing = await get('/hotel-rates');
  const categories = (await get('/masters?category=Hotel%20Categories')).filter(item => item.is_enabled === 1).map(item => item.name);
  if (!categories.length) throw new Error('No active hotel categories');
  const cities = ['Jaipur','Udaipur','Jaisalmer','Manali','Shimla','Rishikesh','Goa','Kochi','Srinagar','Port Blair'];
  const labels = ['City Nest','Pink City Inn','Lake View Stay','Garden Courtyard','Desert Pearl','Golden Dunes','Mountain Nest','Pine Valley','Snowline Retreat','Cedar Heights','Riverstone Lodge','Ganga Courtyard','Palm Grove','Seabreeze Resort','Harbour View','Backwater Haven','Royal Orchard','Valley Palace','Coral Bay','Island Crown'];
  const rates = [750,1000,1100,1500,2000,2250,2750,3000,3250,3500,4000,4500,5000,5500,6500,8000,8500,10000,12000,15000];
  let added = 0;
  for (let i = 0; i < 20; i++) {
    const name = '[DEMO] ' + labels[i];
    if (existing.some(hotel => hotel.name === name)) continue;
    const city = cities[Math.floor(i / 2)], category = categories[i % categories.length];
    const pdf = await PDFDocument.create(); const page = pdf.addPage(); const font = await pdf.embedFont(StandardFonts.Helvetica);
    const lines = ['DEMO HOTEL RATE SHEET', labels[i], 'City: ' + city, 'Category: ' + category, `Seasonal: INR ${rates[i]} per room per night`, `Blackout: INR ${rates[i]+1500} per room per night`, 'Blackout dates: 01 Nov - 05 Nov 2026', '24 Dec 2026 - 02 Jan 2027', 'Sample data for CRM testing only.', 'Not a real supplier quote or confirmed hotel rate.'];
    lines.forEach((line, index) => page.drawText(line, { x: 45, y: 780 - index * 35, size: index === 0 ? 18 : 12, font }));
    const payload = { name, city, category, seasonalRate: String(rates[i]), blackoutRate: String(rates[i]+1500), blackoutDates: [{start:'2026-11-01',end:'2026-11-05'},{start:'2026-12-24',end:'2027-01-02'}], pdf: {name: `Demo-Hotel-${i+1}-Rates.pdf`, data: Buffer.from(await pdf.save()).toString('base64')} };
    const res = await fetch(base + '/hotel-rates', { method: 'POST', headers, body: JSON.stringify(payload) });
    if (!res.ok) throw new Error(`Hotel ${i+1}: ${res.status} ${await res.text()}`);
    added++;
  }
  const saved = (await get('/hotel-rates')).filter(hotel => labels.some(label => hotel.name === '[DEMO] ' + label));
  if (saved.length !== 20 || saved.some(hotel => !hotel.pdfName || hotel.blackoutDates.length !== 2)) throw new Error('Demo data verification failed');
  console.log(`Added ${added}; verified all 20 demo hotels through the running CRM API, with PDFs and two date ranges each.`);
})().catch(error => { console.error(error.message); process.exitCode = 1; });