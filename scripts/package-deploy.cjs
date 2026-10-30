const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execSync } = require('node:child_process');
const AdmZip = require('adm-zip');
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'kingsland-ai-crm-professional.zip');
if (!process.argv.includes('--skip-build')) {
  execSync('npm run build', { cwd: root, stdio: 'inherit' });
  execSync('npm run build', { cwd: path.join(root, 'operations-team-portal'), stdio: 'inherit' });
}
for (const required of ['dist/index.html', 'server.js', 'server/db/connection.ts', 'server/db/schema.ts', 'operations-team-portal/dist/index.html', 'styles/theme.css']) {
  if (!fs.existsSync(path.join(root, required))) throw new Error('Missing required build/source: ' + required);
}
const zip = new AdmZip();
const manifest = [];
const excluded = new Set(['node_modules', '.git', '.idea', '.agents', '.codex', 'tmp', 'backups', '.deploy_staging']);
function add(relative) {
  const full = path.join(root, relative);
  const name = path.basename(full);
  if (!fs.existsSync(full) || excluded.has(name) || name === '.env' || /\.(db|sqlite|sqlite3|pem|key)(?:-|$)/i.test(name)) return;
  const stat = fs.lstatSync(full);
  if (stat.isSymbolicLink()) return;
  if (stat.isDirectory()) {
    for (const item of fs.readdirSync(full).sort()) add(path.join(relative, item));
  } else {
    const entry = relative.replaceAll('\\', '/');
    if (entry.includes('client-documents/') || entry.endsWith('migrate-theme.cjs')) return;
    const bytes = fs.readFileSync(full);
    zip.addFile(entry, bytes);
    manifest.push({ path: entry, sha256: crypto.createHash('sha256').update(bytes).digest('hex') });
  }
}
for (const item of ['dist', 'server', 'server.js', 'components', 'services', 'utils', 'styles', 'operations-team-portal', 'storage/pdf-themes', 'scripts', 'docs', 'App.tsx', 'index.html', 'index.tsx', 'types.ts', 'constants.ts', 'package.json', 'package-lock.json', 'tsconfig.json', 'vite.config.ts', '.env.example', '.gitignore', 'AGENTS.md', 'README.md', 'PDF_THEMES_GUIDE.md', 'THEME-UPDATE.md']) add(item);
zip.addFile('BUILD-MANIFEST.json', Buffer.from(JSON.stringify({ files: manifest, excludes: ['Live database', '.env credentials', 'Customer documents', 'Backups', 'node_modules'] }, null, 2)));
zip.addFile('DEPLOY_GUIDE.md', Buffer.from(`# Kingsland CRM — Hostinger lead-save and security update\n\nThis archive contains the complete application source, server bundle, both frontend builds, and PDF theme assets.\n\n1. Back up the existing deployment and database through your normal procedure.\n2. Apply the application files while preserving the server's .env, database, backups, and customer uploads.\n3. Run npm ci --omit=dev on the server. For a source rebuild use npm ci, npm --prefix operations-team-portal ci, then npm run build and npm --prefix operations-team-portal run build.\n4. On Hostinger select Node 24, set PORT=3000 and NODE_ENV=production, use start command npm start, and add APP_ORIGIN=https://crm.kingslandholiday.com in the website environment variables, apply changes, and upload this updated archive as new source files during redeployment. Follow docs/hostinger-lead-save-fix.md. Restart the existing Node/PM2 process and check login, theme toggle, lead workflow, proposal download, invoice, and hotel voucher.\n\nThe archive intentionally contains no live database, credentials, backups, or customer documents. No deployment is performed by packaging. Chrome/Chromium is required for server PDF rendering; configure CHROME_BIN for the deployment host.\n`));
zip.writeZip(output);
const verify = new AdmZip(output).getEntries().map(e => e.entryName);
if (verify.some(name => /(^|\/)\.env$|\.(db|sqlite|sqlite3)$|(^|\/)(node_modules|backups|client-documents)\//i.test(name))) throw new Error('Unexpected private data in package');
for (const file of manifest) {
  const entry = zip.getEntry(file.path);
  if (crypto.createHash('sha256').update(entry.getData()).digest('hex') !== file.sha256) throw new Error('Package checksum mismatch: ' + file.path);
}
console.log(`Created and verified ${output}: ${manifest.length} files, ${(fs.statSync(output).size / 1048576).toFixed(2)} MB. No database or credentials included.`);
