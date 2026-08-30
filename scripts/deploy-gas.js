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
} catch (err) {
  console.error('❌ 部署失敗:', err.message);
  process.exit(1);
}
