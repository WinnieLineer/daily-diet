import { execSync } from 'child_process';
import fs from 'fs';

try {
  // 1. 讀取 .clasp.json
  const claspConfig = JSON.parse(fs.readFileSync('./.clasp.json', 'utf8'));

  // 2. 推送最新程式碼
  console.log('🚀 正在推送最新程式碼至 Google Apps Script...');
  execSync('npx @google/clasp push --force', { stdio: 'inherit' });

  // 3. 取得要鎖定更新的 Deployment ID
  let deploymentId = claspConfig.deploymentId;

  if (!deploymentId) {
    const output = execSync('npx @google/clasp deployments', { encoding: 'utf8' });
    const lines = output.split('\n').filter(l => l.includes('- AKfyc') && !l.includes('@HEAD'));
    if (lines.length > 0) {
      // 預設鎖定最早建立的原始 Webhook 部署或已設定的部署
      const match = lines[lines.length - 1].match(/AKfyc[a-zA-Z0-9_-]+/);
      if (match) {
        deploymentId = match[0];
        claspConfig.deploymentId = deploymentId;
        fs.writeFileSync('./.clasp.json', JSON.stringify(claspConfig, null, 2));
        console.log(`🔒 已自動將固定 Deployment ID 鎖定在 .clasp.json: ${deploymentId}`);
      }
    }
  }

  // 4. 覆蓋更新同一個 Deployment (保證 URL 永不改變)
  if (deploymentId) {
    console.log(`🔄 正在更新現有部署 (URL 永不改變): ${deploymentId}`);
    execSync(`npx @google/clasp deploy -i ${deploymentId} -d "Auto-updated on ${new Date().toLocaleString('zh-TW')}"`, { stdio: 'inherit' });
    console.log(`\n✅ 部署完成！您的 Webhook URL 永遠固定為：\n👉 https://script.google.com/macros/s/${deploymentId}/exec\n`);
  } else {
    execSync('npx @google/clasp deploy', { stdio: 'inherit' });
  }

  // 5. 查詢當前版本總數並即時反饋
  try {
    const verOutput = execSync('npx @google/clasp versions', { encoding: 'utf8' });
    const verMatch = verOutput.match(/Found (\d+) versions/);
    if (verMatch) {
      const count = parseInt(verMatch[1], 10);
      console.log(`📊 目前專案版本數：${count} / 200 (剩餘 ${200 - count} 次可用)`);
      if (count >= 160) {
        console.warn(`\n⚠️  【提醒：版本數已達 ${count} 個，接近 200 上限】`);
        console.warn(`👉 建議隨時至 https://script.google.com/home/projects/${claspConfig.scriptId}/history 進行批次刪除。`);
      }
    }
  } catch (e) {}
} catch (err) {
  if (err.message && err.message.includes('limit of 200 versions')) {
    const claspConfig = JSON.parse(fs.readFileSync('./.clasp.json', 'utf8'));
    console.error('\n⚠️  【Google Apps Script 達到 200 個版本上限】');
    console.error('👉 請點擊以下連結開啟專案歷程記錄：');
    console.error(`   https://script.google.com/home/projects/${claspConfig.scriptId}/history`);
    console.error('👉 在頁面右上角點擊「批次刪除版本 (Bulk delete versions)」清空歷史版本。');
    console.error('👉 清空後執行 npm run deploy:gas 即可完成部署！\n');
  } else {
    console.error('❌ 部署失敗:', err.message);
  }
  process.exit(1);
}
