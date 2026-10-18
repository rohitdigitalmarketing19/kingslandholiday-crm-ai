import fs from 'fs';
import path from 'path';
import initSqlJs from 'sql.js';

async function main() {
  const SQL = await initSqlJs();
  const backupDir = 'backups';
  if (!fs.existsSync(backupDir)) {
    console.log('No backups folder');
    return;
  }
  const files = fs.readdirSync(backupDir).filter(f => f.endsWith('.db')).sort();
  for (const f of files) {
    try {
      const fullPath = path.join(backupDir, f);
      const buf = fs.readFileSync(fullPath);
      const db = new SQL.Database(buf);
      const res = db.exec("SELECT COUNT(*) FROM leads");
      const count = res[0].values[0][0];
      const hotelRes = db.exec("SELECT COUNT(*) FROM quote_hotels");
      const hotelCount = hotelRes[0].values[0][0];
      console.log(`${f} -> Leads: ${count}, Quote Hotels: ${hotelCount}`);
    } catch (e: any) {
      console.log(`${f} -> error: ${e.message}`);
    }
  }
}

main().catch(console.error);
