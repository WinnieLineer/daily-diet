import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const packageJsonPath = path.resolve(__dirname, '../package.json');
const versionJsonPath = path.resolve(__dirname, '../public/version.json');

try {
  // 1. Read package.json
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const oldVersion = packageJson.version;
  
  // 2. Increment patch version (e.g., 1.2.6 -> 1.2.7)
  const parts = oldVersion.split('.');
  if (parts.length === 3) {
    parts[2] = parseInt(parts[2], 10) + 1;
  }
  const newVersion = parts.join('.');
  
  // 3. Update package.json
  packageJson.version = newVersion;
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
  
  // 4. Update public/version.json (Sync)
  fs.writeFileSync(versionJsonPath, JSON.stringify({ version: newVersion }, null, 2) + '\n');
  
  console.log(`🚀 Version bumped: ${oldVersion} -> ${newVersion}`);
} catch (error) {
  console.error('❌ Error bumping version:', error.message);
  process.exit(1);
}
