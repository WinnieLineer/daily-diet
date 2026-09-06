import fs from 'fs';

/**
 * LINE Flex Message Text Truncation & Ellipsis Detector
 * 自動掃描 gas/Code.js 中所有按鈕與文字，偵測在手機螢幕上是否會發生吃字 / 省略號 (...)
 */

console.log('🔍 正在掃描 gas/Code.js 中的 LINE Flex Message 佈局...');

const content = fs.readFileSync('./gas/Code.js', 'utf8');
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

  // 檢查 button 的 label
  const labelMatch = line.match(/label:\s*["'`]([^"'`]+)["'`]/);
  if (labelMatch) {
    const rawLabel = labelMatch[1];
    // 去除 emoji 計算純文字字元長度
    const cleanLabel = rawLabel.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '').trim();

    // 如果在多欄佈局中 (通常 2 欄寬度約 120px~140px)
    if (inHorizontalLayout) {
      if (cleanLabel.length > 6) {
        console.warn(`⚠️ [可能吃字 - 多欄按鈕] 行 ${lineNum}: "${rawLabel}" (純文字長度 ${cleanLabel.length} 字，超過 6 字建議縮短以免手機出現 ...)`);
        issuesFound++;
      }
    } else {
      // 全寬按鈕 (寬度約 280px)
      if (cleanLabel.length > 15) {
        console.warn(`⚠️ [可能吃字 - 全寬按鈕] 行 ${lineNum}: "${rawLabel}" (純文字長度 ${cleanLabel.length} 字，超過 15 字建議縮短以免手機出現 ...)`);
        issuesFound++;
      }
    }
  }

  // 如果離開了 horizontal 區塊 (簡單以縮排或 box 結束推斷)
  if (inHorizontalLayout && i - horizontalStartLine > 40) {
    inHorizontalLayout = false;
  }
}

if (issuesFound === 0) {
  console.log('✅ 掃描完成！未發現任何會導致手機吃字 (...) 的超長按鈕標籤！');
} else {
  console.log(`⚠️ 掃描完成，共檢測到 ${issuesFound} 處潛在吃字風險！`);
}
