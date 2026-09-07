# Agent Guidelines & Workflow Rules

## Auto Push Workflow
- 每次完成用戶要求的程式碼修改並完成驗證後，**務必自動建置並推上 GitHub 遠端**（無需等待用戶催促）：
  1. 執行版本遞增與編譯：`node scripts/bump-version.js && npx vite build`
  2. 提交變更：`git add . && git commit -m "<語意化 commit 訊息>"`
  3. 推送至遠端：`git push origin main`（自動觸發 GitHub Pages 部署）
- 備註：Git 設有 `post-commit` hook 會自動嘗試調用 `npm run gas:deploy`。若環境顯示 `No credentials found`，代表本機需要先執行一次 `npx @google/clasp login` 完成 Google 授權方可直接同步 GAS。
