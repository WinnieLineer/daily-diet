import fs from 'fs';
import path from 'path';

/**
 * LINE Flex Message Text Truncation & API Limit Linter
 * 自動掃描 gas/ 目錄下所有檔案中的 LINE Flex Message 佈局：
 * 1. 偵測手機螢幕按鈕是否吃字 / 出現省略號 (...)
 * 2. 驗證 LINE API 限制：altText <= 400 字元、label <= 40 字元、displayText <= 300 字元
 */

console.log('🔍 正在掃描 gas/ 目錄中的 LINE Flex Message 佈局與 API 限制...');

const gasDir = './gas';
const files = fs.readdirSync(gasDir).filter(f => f.endsWith('.js') && !f.includes('.legacy'));

let totalIssues = 0;

for (const file of files) {
  const filePath = path.join(gasDir, file);
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  let issuesFound = 0;
  let inHorizontalLayout = false;
  let horizontalStartLine = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    if (line.includes('layout: "horizontal"') || line.includes("layout: 'horizontal'")) {
      inHorizontalLayout = true;
      horizontalStartLine = lineNum;
    }

    // 1. 檢查 altText 長度限制 (LINE 規範上限: 400 字元)
    const altMatch = line.match(/altText:\s*["'`]([^"'`]+)["'`]/);
    if (altMatch) {
      const rawAlt = altMatch[1];
      if (rawAlt.length > 400) {
        console.warn(`🚨 [LINE API 違規 - altText 超長] ${file}:${lineNum} 長度 ${rawAlt.length} > 400 字元限制`);
        issuesFound++;
      }
    }

    // 2. 檢查 button 的 label (LINE 規範上限: 40 字元，多欄按鈕建議 8 字以內避免吃字)
    const labelMatch = line.match(/label:\s*["'`]([^"'`]+)["'`]/);
    if (labelMatch) {
      const rawLabel = labelMatch[1];
      if (rawLabel.length > 40) {
        console.warn(`🚨 [LINE API 違規 - label 超長] ${file}:${lineNum} "${rawLabel}" (長度 ${rawLabel.length} > 40 字元限制)`);
        issuesFound++;
      }

      // 現代化 Unicode Emoji 過濾
      const cleanLabel = rawLabel.replace(/[\u{1F300}-\u{1FAFF}]|[\u{2600}-\u{27BF}]|[\uD800-\uDBFF][\uDC00-\uDFFF]|\uFE0F/gu, '').trim();

      if (inHorizontalLayout) {
        if (cleanLabel.length > 8 && !cleanLabel.includes('${')) {
          console.warn(`⚠️ [可能吃字 - 多欄按鈕] ${file}:${lineNum} "${rawLabel}" (純文字長度 ${cleanLabel.length} 字，超過 8 字建議縮短以免手機出現 ...)`);
          issuesFound++;
        }
      } else {
        if (cleanLabel.length > 20 && !cleanLabel.includes('${')) {
          console.warn(`⚠️ [可能吃字 - 全寬按鈕] ${file}:${lineNum} "${rawLabel}" (純文字長度 ${cleanLabel.length} 字，超過 20 字建議縮短以免手機出現 ...)`);
          issuesFound++;
        }
      }
    }

    // 3. 檢查 displayText 長度限制 (LINE 規範上限: 300 字元)
    const displayMatch = line.match(/displayText:\s*["'`]([^"'`]+)["'`]/);
    if (displayMatch) {
      const rawDisplay = displayMatch[1];
      if (rawDisplay.length > 300) {
        console.warn(`🚨 [LINE API 違規 - displayText 超長] ${file}:${lineNum} 長度 ${rawDisplay.length} > 300 字元限制`);
        issuesFound++;
      }
    }

    if (inHorizontalLayout && i - horizontalStartLine > 40) {
      inHorizontalLayout = false;
    }
  }

  if (issuesFound > 0) {
    totalIssues += issuesFound;
  }
}

if (totalIssues === 0) {
  console.log('✅ 掃描完成！所有 LINE Flex Message 標籤、altText 與 API 限制均 100% 合規！');
} else {
  console.log(`⚠️ 掃描完成，共檢測到 ${totalIssues} 處潛在吃字或規格問題！`);
}
