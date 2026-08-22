const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('📦 Starting Kingsland AI CRM Production Package Creation...\n');

const rootDir = path.resolve(__dirname, '..');
const zipFileName = 'kingsland-ai-crm-server-ready.zip';
const zipFilePath = path.join(rootDir, zipFileName);

// Remove existing zip if any
if (fs.existsSync(zipFilePath)) {
  fs.unlinkSync(zipFilePath);
  console.log(`🗑️ Removed existing ${zipFileName}`);
}

// Ensure builds exist
console.log('🔨 Verifying builds...');
if (!fs.existsSync(path.join(rootDir, 'dist'))) {
  console.log('Building root CRM...');
  execSync('npm run build', { cwd: rootDir, stdio: 'inherit' });
}

if (!fs.existsSync(path.join(rootDir, 'operations-team-portal', 'dist'))) {
  console.log('Building Operations Portal...');
  execSync('npm run build', { cwd: path.join(rootDir, 'operations-team-portal'), stdio: 'inherit' });
}

// Files & directories to include in deploy package
// ⚠️  kingsland.db is intentionally EXCLUDED — the server keeps its own live
//     production database. Including it would wipe all server data on every deploy.
const includeItems = [
  'dist',
  'server',
  'server.js',
  'components',
  'services',
  'utils',
  'operations-team-portal',
  'App.tsx',
  'index.html',
  'index.tsx',
  'types.ts',
  'constants.ts',
  'package.json',
  'package-lock.json',
  'tsconfig.json',
  'vite.config.ts',
  '.env.example',
  'README.md'
];

console.log('\n📁 Creating clean temporary staging folder for packaging...');
const stagingDir = path.join(rootDir, '.deploy_staging');
if (fs.existsSync(stagingDir)) {
  fs.rmSync(stagingDir, { recursive: true, force: true });
}
fs.mkdirSync(stagingDir, { recursive: true });

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    // Exclude node_modules, .git, .idea
    const basename = path.basename(src);
    if (basename === 'node_modules' || basename === '.git' || basename === '.idea' || basename === '.deploy_staging') {
      return;
    }
    fs.mkdirSync(dest, { recursive: true });
    for (const file of fs.readdirSync(src)) {
      copyRecursive(path.join(src, file), path.join(dest, file));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

for (const item of includeItems) {
  const srcPath = path.join(rootDir, item);
  const destPath = path.join(stagingDir, item);
  if (fs.existsSync(srcPath)) {
    console.log(`  ➕ Adding: ${item}`);
    copyRecursive(srcPath, destPath);
  }
}

// Add a deployment guide in the package
const deployGuideContent = `# Kingsland AI CRM — Server Deployment Guide

## 🚀 Quick Start on Server (Linux / Ubuntu / VPS / cPanel / Docker)

### 1. Prerequisites
- Node.js >= 18.x (Node 20+ LTS recommended)
- npm >= 9.x

### 2. Extract Archive
\`\`\`bash
unzip kingsland-ai-crm-server-ready.zip -d kingsland-crm
cd kingsland-crm
\`\`\`

### 3. Setup Environment Variables
\`\`\`bash
cp .env.example .env
# Edit .env to set PORT, DATABASE_PATH, etc.
\`\`\`

### 4. Install Dependencies
\`\`\`bash
npm install --omit=dev
\`\`\`

### 5. Start Production Server
\`\`\`bash
npm start
\`\`\`
*(Or using PM2 for 24/7 background process management)*
\`\`\`bash
npm install -g pm2
pm2 start server.js --name "kingsland-crm"
pm2 save
pm2 startup
\`\`\`

---
## ⚠️  DATABASE SAFETY — IMPORTANT

The deploy zip does **NOT** include \`kingsland.db\`.
This is intentional — your server already has its own live production database.

- On **first deploy**: The server will automatically create a fresh \`kingsland.db\`
  (in the folder set by \`DATABASE_PATH\` in your .env, or next to server.js).
- On **every subsequent deploy**: Simply extract and restart. The existing
  \`kingsland.db\` on the server is left completely untouched.
- **Never manually copy your local \`kingsland.db\` to the server** unless you
  intend to fully replace production data.

To backup the server database before deploying:
\`\`\`bash
cp kingsland.db kingsland.db.backup-$(date +%Y%m%d)
\`\`\`

---
## 🌐 Accessing the CRM
- **CRM Dashboard & Sales Pipeline**: \`http://your-server-ip:5000/\`
- **Operations Desk Portal**: \`http://your-server-ip:5000/ops\`
- **Health Check**: \`http://your-server-ip:5000/api/health\`
`;

fs.writeFileSync(path.join(stagingDir, 'DEPLOY_GUIDE.md'), deployGuideContent);

console.log('\n🗜️ Compressing staging directory into ZIP archive...');
try {
  // Use PowerShell Compress-Archive on Windows
  const psCommand = `powershell -Command "Compress-Archive -Path '${stagingDir}\\*' -DestinationPath '${zipFilePath}' -Force"`;
  execSync(psCommand, { stdio: 'inherit' });
  
  const stats = fs.statSync(zipFilePath);
  const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
  
  console.log(`\n🎉 SUCCESS! Created ready-to-deploy archive:`);
  console.log(`📦 File: ${zipFileName}`);
  console.log(`📏 Size: ${sizeMB} MB`);
  console.log(`📍 Path: ${zipFilePath}\n`);
} catch (zipErr) {
  console.error('Failed to create zip:', zipErr);
} finally {
  // Clean up staging folder
  if (fs.existsSync(stagingDir)) {
    fs.rmSync(stagingDir, { recursive: true, force: true });
  }
}
