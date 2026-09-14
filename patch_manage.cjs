const fs = require('fs');
const path = require('path');

const gasFile = path.join(__dirname, 'gas', '06_FlexMessages.js');
const patchFile = 'C:\\Users\\linw2\\.gemini\\antigravity-ide\\brain\\a5fa79d8-0d9c-45d6-b63b-d04e0625d9da\\scratch\\manage_meals_patch.js';

let content = fs.readFileSync(gasFile, 'utf8');
const patch = fs.readFileSync(patchFile, 'utf8');

// Find the old function start and end
const funcStart = content.indexOf('function generateManageMealsFlex(userId, targetDateStr, liffId, userGistId, props, lang) {');
const sectionAfter = '// ========================================================\n// ⭐ 6. 常用餐點輪播卡片 (Favorites Carousel)';
const sectionAfterCRLF = '// ========================================================\r\n// ⭐ 6. 常用餐點輪播卡片 (Favorites Carousel)';

let funcEnd = content.indexOf(sectionAfter);
if (funcEnd === -1) funcEnd = content.indexOf(sectionAfterCRLF);

console.log('funcStart =', funcStart, 'funcEnd =', funcEnd);

if (funcStart === -1 || funcEnd === -1) {
  console.error('Could not find function boundaries!');
  // dump nearby lines to debug
  const lines = content.split('\n');
  lines.forEach((l, i) => {
    if (l.includes('generateManageMealsFlex') || l.includes('⭐ 6.')) {
      console.log(`Line ${i + 1}: ${l.substring(0, 100)}`);
    }
  });
  process.exit(1);
}

// Keep everything before the function + patch + everything from section 6 onwards
const before = content.substring(0, funcStart);
const after = content.substring(funcEnd);

const newContent = before + patch.trim() + '\n\n' + after;
fs.writeFileSync(gasFile, newContent, 'utf8');
console.log('✅ Patched successfully!');
console.log('New file length:', newContent.length, 'bytes');
console.log('Old file length:', content.length, 'bytes');
