import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const packageJsonPath = path.resolve(__dirname, '../package.json');
const versionJsonPath = path.resolve(__dirname, '../public/version.json');

try {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const version = packageJson.version;

  const versionData = { version };

  fs.writeFileSync(versionJsonPath, JSON.stringify(versionData, null, 2) + '\n');
  console.log(`✅ Successfully synced version ${version} to public/version.json`);
} catch (error) {
  console.error('❌ Error syncing version:', error.message);
  process.exit(1);
}
