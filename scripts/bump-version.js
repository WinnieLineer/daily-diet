import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const packageJsonPath = path.resolve(__dirname, '../package.json');
const versionJsonPath = path.resolve(__dirname, '../public/version.json');
const constantsPath = path.resolve(__dirname, '../src/lib/constants.js');

try {
  // 1. Read package.json
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const oldVersion = packageJson.version;
  
  // 2. Increment patch version (e.g., 3.1.0 -> 3.1.1)
  const parts = oldVersion.split('.');
  if (parts.length >= 3) {
    parts[parts.length - 1] = parseInt(parts[parts.length - 1], 10) + 1;
  }
  const newVersion = parts.join('.');
  
  // 3. Update package.json
  packageJson.version = newVersion;
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
  
  // 4. Update public/version.json with version and build timestamp
  const versionData = { 
    version: newVersion, 
    buildTime: Date.now(),
    buildDate: new Date().toISOString()
  };
  fs.writeFileSync(versionJsonPath, JSON.stringify(versionData, null, 2) + '\n');
  
  // 5. Update src/lib/constants.js
  if (fs.existsSync(constantsPath)) {
    let constantsContent = fs.readFileSync(constantsPath, 'utf8');
    constantsContent = constantsContent.replace(
      /export const APP_VERSION = '.*?';/,
      `export const APP_VERSION = '${newVersion}';`
    );
    fs.writeFileSync(constantsPath, constantsContent);
  }

  console.log(`🚀 Version auto-bumped: ${oldVersion} -> ${newVersion}`);
  console.log(`✅ Synced to package.json, public/version.json, and src/lib/constants.js`);
} catch (error) {
  console.error('❌ Error bumping version:', error.message);
  process.exit(1);
}
