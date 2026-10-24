import fs from 'fs';

const logo = fs.readFileSync('scripts/kingsland-logo.txt', 'utf8').trim();
const code = `/**
 * Real Kingsland Holidays base64 WebP logo from agency_settings
 */
export const DEFAULT_KINGSLAND_LOGO = ${JSON.stringify(logo)};
`;

fs.writeFileSync('services/kingslandLogo.ts', code);
console.log('Wrote services/kingslandLogo.ts, file length:', code.length);
