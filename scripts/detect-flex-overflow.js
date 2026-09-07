import fs from 'fs';
import path from 'path';

/**
 * LINE Flex Message Text Truncation & Ellipsis Detector
 * 自動掃描 gas/ 目錄下所有檔案中的 LINE Flex Message 佈局，偵測在手機螢幕上是否會發生吃字 / 省略號 (...)
 */

console.log('🔍 正在掃描 gas/ 目錄中的 LINE Flex Message 佈局...');

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

    // 檢查 button 的 label (例如: label: "...")
    const labelMatch = line.match(/label:\s*["'`]([^"'`]+)["'`]/);
    if (labelMatch) {
      const rawLabel = labelMatch[1];
      const cleanLabel = rawLabel.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '').trim();

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

    if (inHorizontalLayout && i - horizontalStartLine > 40) {
      inHorizontalLayout = false;
    }
  }

  if (issuesFound > 0) {
    totalIssues += issuesFound;
  }
}

if (totalIssues === 0) {
  console.log('✅ 掃描完成！未發現任何會導致手機吃字 (...) 的超長按鈕標籤！');
} else {
  console.log(`⚠️ 掃描完成，共檢測到 ${totalIssues} 處潛在吃字風險！`);
}
