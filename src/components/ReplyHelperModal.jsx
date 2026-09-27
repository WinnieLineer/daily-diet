import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Copy, 
  Check, 
  ExternalLink, 
  Mail, 
  Sparkles, 
  Heart, 
  Code2, 
  MessageSquare, 
  HelpCircle,
  Send,
  Eye,
  Edit3
} from 'lucide-react';
import NeoButton from './NeoButton';

const TEMPLATES = [
  {
    id: 'sponsor',
    title: '🎁 贊助感謝 · 創始支持者',
    badge: '贊助支持',
    color: 'from-amber-400 to-yellow-300',
    icon: '🎋',
    subject: '感謝您對 Daily Diet 的溫暖鼓勵與支持！🐼🎋（創始支持者登記確認）',
    defaultIntro: '今天在後台收到您送出的贊助與支持留言，看到這則訊息時，我真的又驚又喜，內心滿滿的感動！身為獨立開發者，能收到使用者主動說好用、甚至還專程找轉帳資訊想給予支持，這絕對是開發旅程中最珍貴、最強大的強心針與肯定！❤️',
    type: 'sponsor'
  },
  {
    id: 'gist_tech',
    title: '⚙️ Gist / PAT 雲端同步技術指南',
    badge: '技術排查',
    color: 'from-blue-400 to-indigo-300',
    icon: '🛠️',
    subject: 'Daily Diet 雲端同步與 GitHub Gist / PAT 設定說明 🐼🛠️',
    defaultIntro: '非常感謝您詳細的回饋！看到您提到手動同步與 daily-diet-backup.json，直覺您一定是對技術非常有敏銳度的資深用戶或開發者朋友，非常開心能有您的使用與測試！',
    type: 'tech'
  },
  {
    id: 'feedback_general',
    title: '💡 意見反饋與建議感謝',
    badge: '產品反饋',
    color: 'from-emerald-400 to-teal-300',
    icon: '💡',
    subject: '非常感謝您對 Daily Diet 的寶貴建議！🐼✨',
    defaultIntro: '非常感謝您撥冗填寫意見回饋！每一則來自使用者的真實反饋，都是我們持續優化 Daily Diet 體驗的最重要指南針。',
    type: 'general'
  },
  {
    id: 'custom',
    title: '📝 自訂精美信件',
    badge: '自由編輯',
    color: 'from-purple-400 to-pink-300',
    icon: '✍️',
    subject: '來自 Daily Diet 團隊的問候 🐼',
    defaultIntro: '您好！感謝您一直以來對 Daily Diet 的關注與使用。',
    type: 'custom'
  }
];

export default function ReplyHelperModal({
  isOpen,
  onClose,
  initialEmail = '',
  initialName = '',
  initialType = 'sponsor',
  initialFeedback = ''
}) {
  const [selectedTemplateId, setSelectedTemplateId] = useState(initialType || 'sponsor');
  const [recipientEmail, setRecipientEmail] = useState(initialEmail);
  const [recipientName, setRecipientName] = useState(initialName || '夥伴');
  const [userFeedbackQuote, setUserFeedbackQuote] = useState(initialFeedback);
  const [customSubject, setCustomSubject] = useState('');
  const [customBody, setCustomBody] = useState('');
  const [copiedRich, setCopiedRich] = useState(false);
  const [copiedPlain, setCopiedPlain] = useState(false);
  const previewRef = useRef(null);

  // 當傳入的初始值變更時自動同步
  useEffect(() => {
    if (initialEmail) setRecipientEmail(initialEmail);
    if (initialName) setRecipientName(initialName);
    if (initialFeedback) setUserFeedbackQuote(initialFeedback);
    if (initialType) setSelectedTemplateId(initialType);
  }, [initialEmail, initialName, initialFeedback, initialType]);

  const activeTemplate = TEMPLATES.find(t => t.id === selectedTemplateId) || TEMPLATES[0];

  useEffect(() => {
    setCustomSubject(activeTemplate.subject);
    setCustomBody(activeTemplate.defaultIntro);
  }, [selectedTemplateId]);

  if (!isOpen) return null;

  // 產生純文字格式信件（用於 Gmail API URL 或純文字貼上）
  const generatePlainText = () => {
    const greeting = `${recipientName || '朋友'} 你好！\n\n`;
    let quoteBlock = '';
    if (userFeedbackQuote) {
      quoteBlock = `【您之前的留言】：\n「${userFeedbackQuote}」\n\n`;
    }
    const intro = customBody + '\n\n';

    let closingWish = '再次由衷感謝您的這份心意與鼓勵！有了您的支持，這隻熊貓教練一定會更有活力地繼續陪伴大家！\n祝您飲食紀錄順心、健康生活每一天！🔥🐼';
    if (selectedTemplateId === 'gist_tech') {
      closingWish = '若您在配置或資料同步上有任何疑問，非常歡迎隨時回信與我交流！\n祝您備份順暢、健康生活每一天！🛠️🐼';
    } else if (selectedTemplateId === 'feedback_general') {
      closingWish = '再次感謝您撥冗給予寶貴建議，我們會持續努力將體驗打磨得更順手！\n祝您飲食紀錄順心、健康生活每一天！✨🐼';
    } else if (selectedTemplateId === 'custom') {
      closingWish = '若有任何問題或想法，非常歡迎隨時回信！\n祝您飲食紀錄順心、健康生活每一天！✨🐼';
    }

    let content = '';
    if (selectedTemplateId === 'sponsor') {
      content = `🎋 為什麼之前把轉帳資料藏起來？\n` +
        `先跟您坦白之前隱藏的原因：我不希望這個工具給人一種「在急著商業變現」的感覺。Daily Diet 的初衷是打造一個乾淨無廣告、無干擾的健康陪伴工具。\n` +
        `不過，每位用戶每次拍照記餐、呼叫 Gemini AI 進行視覺營養分析，背後確實都有真實的雲端伺服器與 AI 算力 Token 成本。因此您的這份微薄心意，對我來說就是最及時、最珍貴的「AI 算力補給燃料」！\n\n` +
        `🎁 老朋友專屬【創始支持者】禮遇 🎋✨：\n` +
        `因為有像您這樣一路相伴、真心認同理念的老朋友，只要您透過官方管道完成支持與回報，我會直接將您的信箱（${recipientEmail || '您的信箱'}）登記在系統核心的【創始支持者 (Founder Supporter)】名冊中：\n` +
        `• 🎖️ 永久享有個人專屬「創始支持者金色徽章」\n` +
        `• 🚀 未來任何全新 AI 增強功能推出時，享有第一優先免費內測權與老友專屬禮遇\n` +
        `感謝您在草創期拉我一把，成為 Daily Diet 的堅實後盾！❤️\n\n` +
        `💳 匯款與贊助資訊取得方式（統一官方管道）：\n` +
        `為了維護資訊安全、確保帳號資訊即時更新，並讓系統能自動為您即時對帳與點亮特權徽章，我們統一透過官方網頁與 LINE 管道提供匯款帳號，不再於信件中直接附上：\n\n` +
        `1. 🌐 網頁版管道（推薦）：\n` +
        `   前往 Daily Diet 官方網頁（https://winnie-lin.space/daily-diet/），點擊【設定 ⚙️ ➔ 創辦人通行證 / 支持專案】（或意見回饋區下方支持連結），即可查閱最新帳號與隨喜方案，並可直接填寫「回報末 5 碼」一秒登記！\n\n` +
        `2. 💬 LINE 官方帳號管道：\n` +
        `   在 Daily Diet 的 LINE 聊天室中，直接傳送「贊助」或「支持」，熊貓教練會立即推播最新的轉帳卡片與 TWQR 碼，還有一鍵開啟鍵盤回報「末 5 碼」的功能！`;
    } else if (selectedTemplateId === 'gist_tech') {
      content = `⚙️ 針對您詢問的 Gist 與 PAT 同步問題說明：\n\n` +
        `1. 為什麼提示需要 GitHub PAT？\n` +
        `系統原本設計為免 PAT 智慧雲端同步。若手動觸發了前端直接寫入 GitHub 官方 REST API，才會觸發此安全提示。\n\n` +
        `2. PAT 在哪裡配置？\n` +
        `我們已經在最新版本的「設定 ⚙️ ➜ 備份同步」分頁中，新增了【⚙️ 進階設定：自訂個人 GitHub PAT】折疊面板。只要貼上具備 gist 權限的 Personal Access Token 即可直接同步！\n\n` +
        `3. 系統預期的備份檔名：\n` +
        `確實是 daily-diet-backup.json！包含餐點、分類、自訂目標與體重數據。`;
    } else if (selectedTemplateId === 'feedback_general') {
      content = `💡 關於您的反饋與建議：\n\n` +
        `您的回饋我們已經詳細記錄在開發迭代清單中。我們非常重視每一位真實使用者的操作體驗，您的寶貴建議將直接影響未來的版本規劃！\n\n` +
        `若有後續優化更新發布，我們會持續努力讓 Daily Diet 變得更加順手好用。再次感謝您的支持！`;
    } else {
      content = `若有任何使用問題或想聊聊的想法，歡迎隨時回信！祝您度過美好的一天！✨`;
    }

    const signoff = `\n\n---\nDaily Diet 獨立開發者 Winnie Lin 敬上\n🌐 官方網站：https://winnie-lin.space/daily-diet/`;
    return greeting + quoteBlock + intro + content + '\n\n' + closingWish + signoff;
  };

  // 生成 HTML 格式（用於複製到剪貼簿貼進 Gmail）
  const generateHtmlMarkup = () => {
    const greeting = `${recipientName || '朋友'} 你好！`;
    let quoteHtml = '';
    if (userFeedbackQuote) {
      quoteHtml = `
        <div style="background-color: #F4F4F5; border-left: 4px solid #FDE047; padding: 12px 16px; margin: 16px 0; border-radius: 4px; font-style: italic; color: #18181B; font-size: 14px;">
          「${userFeedbackQuote.replace(/\n/g, '<br>')}」
        </div>
      `;
    }
    const introHtml = `<p style="font-size: 15px; color: #3F3F46; line-height: 1.7; margin: 0 0 20px 0;">${customBody.replace(/\n/g, '<br>')}</p>`;

    let headerTitle = customSubject || '感謝您對 Daily Diet 的關注與支持 ✨';
    let closingWish = '再次由衷感謝您的這份心意與鼓勵！有了您的支持，這隻熊貓教練一定會更有活力地繼續陪伴大家！<br><b>祝您飲食紀錄順心、健康生活每一天！🔥🐼</b>';
    let bodyHtml = '';

    if (selectedTemplateId === 'sponsor') {
      headerTitle = '感謝您對 Daily Diet 的溫暖鼓勵與支持 ✨';
      closingWish = '再次由衷感謝您的這份心意與鼓勵！有了您的支持，這隻熊貓教練一定會更有活力地繼續陪伴大家！<br><b>祝您飲食紀錄順心、健康生活每一天！🔥🐼</b>';
      bodyHtml = `
        <!-- 區塊 1: 核心心意卡片 -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #FEF9C3; border: 2px solid #000000; border-radius: 14px; margin-bottom: 24px;">
          <tr>
            <td style="padding: 20px;">
              <div style="font-size: 16px; font-weight: bold; color: #713F12; margin-bottom: 8px;">
                🎋 為什麼之前把轉帳資料藏起來？
              </div>
              <p style="font-size: 14px; color: #854D0E; margin: 0 0 12px 0; line-height: 1.6;">
                先跟您坦白之前隱藏的原因：我不希望這個工具給人一種「在急著商業變現」的感覺。Daily Diet 的初衷是打造一個乾淨無廣告、無干擾的健康陪伴工具。<br>
                不過，每位用戶每次拍照記餐、呼叫 Gemini AI 進行視覺營養分析，背後確實都有真實的<b>雲端伺服器與 AI 算力 Token 成本</b>。因此您的這份微薄心意，對我來說就是最及時、最珍貴的<b>「AI 算力補給燃料」</b>！
              </p>
              <div style="background-color: #FFFFFF; border: 1.5px solid #EAB308; border-radius: 10px; padding: 14px; font-size: 14px; color: #000000; line-height: 1.6;">
                🎁 <b>老朋友專屬【創始支持者】禮遇 🎋✨：</b><br>
                因為有像您這樣一路相伴、真心認同理念的老朋友，只要您透過官方管道完成支持與回報，我會直接將您的信箱（<b>${recipientEmail || '您的信箱'}</b>）登記在系統核心的【創始支持者 (Founder Supporter)】名冊中：<br>
                • 🎖️ <b>永久享有個人專屬「創始支持者金色徽章」</b><br>
                • 🚀 <b>未來任何全新 AI 增強功能推出時，享有第一優先免費內測權與老友專屬禮遇</b><br>
                感謝您在草創期拉我一把，成為 Daily Diet 的堅實後盾！❤️
              </div>
            </td>
          </tr>
        </table>

        <!-- 區塊 2: 統一贊助與匯款資訊取得管道 -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F0FDFA; border: 2px solid #000000; border-radius: 14px; margin-bottom: 24px;">
          <tr>
            <td style="padding: 22px;">
              <div style="font-size: 16px; font-weight: bold; color: #0F766E; margin-bottom: 12px;">
                💳 匯款與贊助資訊取得方式（統一官方管道）
              </div>
              <p style="font-size: 14px; color: #134E4A; margin: 0 0 16px 0; line-height: 1.6;">
                為了保護資訊安全、確保資訊隨時保持最新，並能讓系統<b>自動為您的帳號即時對帳與點亮金色創始徽章</b>，我們統一將匯款資訊與末 5 碼登記整合在官方網頁與 LINE 官方帳號中，不再於信件中直接附上個人帳號。請您透過以下任一管道獲取：
              </p>

              <!-- 管道 1: 網頁版 -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #FFFFFF; border: 1.5px solid #5EEAD4; border-radius: 12px; margin-bottom: 14px;">
                <tr>
                  <td style="padding: 16px;">
                    <div style="font-size: 15px; font-weight: bold; color: #0F766E; margin-bottom: 6px;">
                      🌐 管道一：至 Daily Diet 官方網頁（推薦）
                    </div>
                    <div style="font-size: 13.5px; color: #334155; line-height: 1.6;">
                      直接前往 <a href="https://winnie-lin.space/daily-diet/" target="_blank" style="color: #2563EB; font-weight: bold; text-decoration: underline;">Daily Diet 官方網頁</a> ➔ 點擊【<b>設定 ⚙️ ➔ 創辦人通行證 / 支持專案</b>】（或意見回饋區下方的支持連結），即可查閱即時匯款帳號、TWQR 碼與隨喜建議方案，並能直接於網頁輸入「末 5 碼」一秒完成登記！
                    </div>
                  </td>
                </tr>
              </table>

              <!-- 管道 2: LINE 官方帳號 -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #FFFFFF; border: 1.5px solid #5EEAD4; border-radius: 12px; margin-bottom: 14px;">
                <tr>
                  <td style="padding: 16px;">
                    <div style="font-size: 15px; font-weight: bold; color: #0F766E; margin-bottom: 6px;">
                      💬 管道二：在 LINE 官方帳號回覆「贊助」
                    </div>
                    <div style="font-size: 13.5px; color: #334155; line-height: 1.6;">
                      如果您有加入 Daily Diet 的 LINE 官方帳號，只要在聊天室傳送「<b>贊助</b>」或「<b>支持</b>」，熊貓教練就會立即推播專屬匯款卡片與 QR Code，點擊按鈕還能直接呼叫鍵盤快速回報「末 5 碼」！
                    </div>
                  </td>
                </tr>
              </table>

              <div style="background-color: #CCFBF1; border: 1px solid #5EEAD4; border-radius: 10px; padding: 12px 14px; font-size: 13px; color: #0F766E; line-height: 1.6; font-weight: bold; text-align: center;">
                ✨ 完成轉帳並於網頁或 LINE 回報末 5 碼後，系統會自動將您的信箱登記為【創始支持者】，立即享有永久專屬特權！
              </div>
            </td>
          </tr>
        </table>
      `;
    } else if (selectedTemplateId === 'gist_tech') {
      headerTitle = 'Daily Diet 雲端同步與 GitHub Gist / PAT 設定說明 🛠️';
      closingWish = '若您在配置或資料同步上有任何疑問，非常歡迎隨時回信與我交流！<br><b>祝您備份順暢、健康生活每一天！🛠️🐼</b>';
      bodyHtml = `
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #EFF6FF; border: 2px solid #000000; border-radius: 14px; margin-bottom: 24px;">
          <tr>
            <td style="padding: 20px;">
              <div style="font-size: 16px; font-weight: bold; color: #1E40AF; margin-bottom: 12px;">
                🛠️ 針對 Gist 與 PAT 同步的解答說明
              </div>
              <div style="font-size: 14px; color: #1E3A8A; line-height: 1.6;">
                <p style="margin: 0 0 10px 0;"><b>1. 為什麼會提示需要 PAT？</b><br>
                系統原生設計為免 PAT 智慧雲端同步。若前端直連 GitHub 官方 REST API，才會觸發此安全提示。</p>
                <p style="margin: 0 0 10px 0;"><b>2. PAT 在哪裡配置？</b><br>
                最新版本已在「設定 ⚙️ ➜ 備份同步」分頁最下方新增【⚙️ 進階設定：自訂個人 GitHub PAT】折疊面板。貼上具備 gist 權限的 token 即可直連個人的 GitHub！</p>
                <p style="margin: 0;"><b>3. 系統預期檔名：</b><br>
                正是 <code style="background-color: #DBEAFE; padding: 2px 6px; border-radius: 4px; font-family: monospace;">daily-diet-backup.json</code>！包含餐點、分類、自訂目標與體重數據。</p>
              </div>
            </td>
          </tr>
        </table>
      `;
    } else {
      headerTitle = '非常感謝您對 Daily Diet 的寶貴建議與支持 ✨';
      closingWish = '再次感謝您撥冗給予寶貴建議，我們會持續努力將體驗打磨得更順手！<br><b>祝您飲食紀錄順心、健康生活每一天！✨🐼</b>';
      bodyHtml = `
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #ECFDF5; border: 2px solid #000000; border-radius: 14px; margin-bottom: 24px;">
          <tr>
            <td style="padding: 20px;">
              <div style="font-size: 16px; font-weight: bold; color: #065F46; margin-bottom: 8px;">
                🌱 持續迭代與進化
              </div>
              <p style="font-size: 14px; color: #047857; margin: 0; line-height: 1.6;">
                我們非常重視每一位真實使用者的反饋。您的建議已列入我們的開發迭代清單中，若有新功能推出，歡迎隨時體驗並給予我們更多寶貴指教！
              </p>
            </td>
          </tr>
        </table>
      `;
    }

    return `
      <div style="max-width: 640px; margin: 0 auto; background-color: #FFFFFF; border: 2px solid #000000; border-radius: 16px; overflow: hidden; box-shadow: 6px 6px 0px #000000; font-family: 'Microsoft JhengHei', '微軟正黑體', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <font face="Microsoft JhengHei, 微軟正黑體, PingFang TC, sans-serif">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #FFFFFF; color: #18181B; line-height: 1.6;">
          <tr>
            <td style="background-color: #000000; padding: 24px 30px; text-align: left;">
              <span style="display: inline-block; background-color: #FDE047; color: #000000; font-weight: 900; font-size: 13px; padding: 4px 10px; border-radius: 6px; letter-spacing: 0.5px;">
                🐼 DAILY DIET
              </span>
              <div style="color: #FFFFFF; font-size: 20px; font-weight: bold; margin-top: 8px;">
                ${headerTitle}
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px 30px 20px 30px;">
              <p style="font-size: 16px; color: #18181B; margin: 0 0 16px 0;">
                <b>${greeting}</b>
              </p>
              ${quoteHtml}
              ${introHtml}
              ${bodyHtml}
              <p style="font-size: 15px; color: #3F3F46; line-height: 1.7; margin: 24px 0 20px 0;">
                ${closingWish}
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #F8FAFC; border-top: 1.5px solid #E2E8F0; padding: 24px 30px; text-align: left;">
              <div style="font-size: 15px; font-weight: bold; color: #0F172A;">
                Winnie Lin
              </div>
              <div style="font-size: 13px; color: #64748B; margin-top: 2px;">
                Daily Diet 獨立開發者
              </div>
              <div style="font-size: 12px; color: #94A3B8; margin-top: 8px;">
                🌐 官方網站：<a href="https://winnie-lin.space/daily-diet/" target="_blank" style="color: #2563EB; text-decoration: none; font-weight: 500;">https://winnie-lin.space/daily-diet/</a>
              </div>
            </td>
          </tr>
        </table>
        </font>
      </div>
    `;
  };

  // 複製 Rich HTML 到剪貼簿
  const handleCopyRichHtml = async () => {
    try {
      const htmlString = generateHtmlMarkup();
      const plainString = generatePlainText();

      const blobHtml = new Blob([htmlString], { type: 'text/html' });
      const blobPlain = new Blob([plainString], { type: 'text/plain' });

      if (navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/html': blobHtml,
            'text/plain': blobPlain
          })
        ]);
      } else {
        await navigator.clipboard.writeText(plainString);
      }

      setCopiedRich(true);
      setTimeout(() => setCopiedRich(false), 3000);
    } catch (err) {
      console.error('Failed to copy rich HTML:', err);
      // Fallback
      navigator.clipboard.writeText(generatePlainText());
      setCopiedPlain(true);
      setTimeout(() => setCopiedPlain(false), 3000);
    }
  };

  // 複製純文字
  const handleCopyPlainText = () => {
    navigator.clipboard.writeText(generatePlainText());
    setCopiedPlain(true);
    setTimeout(() => setCopiedPlain(false), 2500);
  };

  // 開啟 Gmail 撰寫頁面
  const handleOpenGmail = () => {
    const to = encodeURIComponent(recipientEmail || '');
    const su = encodeURIComponent(customSubject);
    const body = encodeURIComponent(generatePlainText());
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${to}&su=${su}&body=${body}`;
    window.open(gmailUrl, '_blank');
  };

  // 開啟系統 Mailto
  const handleOpenMailto = () => {
    const to = encodeURIComponent(recipientEmail || '');
    const su = encodeURIComponent(customSubject);
    const body = encodeURIComponent(generatePlainText());
    window.location.href = `mailto:${to}?subject=${su}&body=${body}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-white border-4 border-black rounded-[2.5rem] shadow-neo-xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden my-auto"
      >
        {/* Header */}
        <div className="p-5 sm:p-6 bg-amber-300 border-b-4 border-black flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-black text-white rounded-2xl flex items-center justify-center text-2xl shadow-neo-xs">
              💌
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest bg-black text-amber-300 px-2 py-0.5 rounded-full inline-block">
                VIP Reply Assistant
              </span>
              <h3 className="text-xl sm:text-2xl font-black italic tracking-tight text-black mt-0.5">
                精美模板回信小助手
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 bg-white hover:bg-zinc-100 border-2 border-black rounded-2xl flex items-center justify-center text-black font-black shadow-neo-xs active:translate-x-0.5 active:translate-y-0.5 transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* 模板選擇按鈕組 */}
          <div>
            <label className="text-xs font-black uppercase tracking-wider text-zinc-500 mb-2 block">
              選擇回覆情境模板
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
              {TEMPLATES.map((tmpl) => {
                const isSelected = tmpl.id === selectedTemplateId;
                return (
                  <button
                    key={tmpl.id}
                    onClick={() => setSelectedTemplateId(tmpl.id)}
                    className={`p-3 text-left border-3 rounded-2xl transition-all duration-200 flex flex-col justify-between ${
                      isSelected
                        ? 'bg-black text-white border-black shadow-neo-sm translate-x-0.5 translate-y-0.5'
                        : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-800 border-black shadow-neo-xs'
                    }`}
                  >
                    <div className="text-xl mb-1">{tmpl.icon}</div>
                    <div className="font-black text-xs leading-tight">{tmpl.title}</div>
                    <div className={`text-[9px] font-bold mt-1.5 px-1.5 py-0.5 rounded inline-block self-start ${
                      isSelected ? 'bg-amber-300 text-black' : 'bg-zinc-200 text-zinc-700'
                    }`}>
                      {tmpl.badge}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 表單編輯區 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-zinc-50 border-3 border-black p-4 rounded-3xl">
            {/* 收件者 Email */}
            <div>
              <label className="text-xs font-black text-zinc-700 flex items-center gap-1 mb-1">
                <span>📧 收件者信箱</span>
                <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="例如：user@example.com"
                className="w-full px-3 py-2 bg-white border-2 border-black rounded-xl text-xs font-bold font-mono focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>

            {/* 收件者稱謂 */}
            <div>
              <label className="text-xs font-black text-zinc-700 mb-1 block">
                👤 用戶稱謂 / 暱稱
              </label>
              <input
                type="text"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="例如：Jon、Yixian"
                className="w-full px-3 py-2 bg-white border-2 border-black rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>

            {/* 信件主旨 */}
            <div className="md:col-span-2">
              <label className="text-xs font-black text-zinc-700 mb-1 block">
                📌 信件主旨
              </label>
              <input
                type="text"
                value={customSubject}
                onChange={(e) => setCustomSubject(e.target.value)}
                className="w-full px-3 py-2 bg-white border-2 border-black rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>

            {/* 用戶原始留言引用（選填） */}
            <div className="md:col-span-2">
              <label className="text-xs font-black text-zinc-700 mb-1 block flex items-center justify-between">
                <span>💬 引用用戶留言（將置於引號卡片中）</span>
                <span className="text-[10px] text-zinc-400 font-bold">選填</span>
              </label>
              <textarea
                rows={2}
                value={userFeedbackQuote}
                onChange={(e) => setUserFeedbackQuote(e.target.value)}
                placeholder="可貼入用戶的原始問題或讚美留言..."
                className="w-full px-3 py-2 bg-white border-2 border-black rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>

            {/* 引言 / 前言說明 */}
            <div className="md:col-span-2">
              <label className="text-xs font-black text-zinc-700 mb-1 block">
                ✍️ 開頭引言與客製化問候
              </label>
              <textarea
                rows={2}
                value={customBody}
                onChange={(e) => setCustomBody(e.target.value)}
                className="w-full px-3 py-2 bg-white border-2 border-black rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
          </div>

          {/* 即時排版預覽區 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-black uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                <Eye size={14} />
                <span>即時信件外觀預覽 (仿 Gmail 貼上效果)</span>
              </label>
              <span className="text-[11px] font-bold text-amber-700 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full">
                ✨ 完整保留圖片與中信卡片
              </span>
            </div>

            <div 
              ref={previewRef}
              className="border-3 border-black rounded-3xl p-4 sm:p-6 bg-zinc-100 shadow-inner max-h-[360px] overflow-y-auto"
              dangerouslySetInnerHTML={{ __html: generateHtmlMarkup() }}
            />
          </div>
        </div>

        {/* Footer Action Bar */}
        <div className="p-4 sm:p-6 bg-zinc-50 border-t-4 border-black flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyPlainText}
              className="px-3 py-2 bg-white hover:bg-zinc-100 border-2 border-black rounded-xl text-xs font-black text-zinc-700 shadow-neo-xs flex items-center gap-1 active:translate-x-0.5 active:translate-y-0.5"
            >
              {copiedPlain ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
              <span>{copiedPlain ? '已複製純文字！' : '複製純文字'}</span>
            </button>
            <button
              onClick={handleOpenMailto}
              className="px-3 py-2 bg-white hover:bg-zinc-100 border-2 border-black rounded-xl text-xs font-black text-zinc-700 shadow-neo-xs flex items-center gap-1 active:translate-x-0.5 active:translate-y-0.5 hidden sm:flex"
            >
              <Mail size={14} />
              <span>系統 Mailto</span>
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleCopyRichHtml}
              className="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-black border-2 border-black rounded-xl text-xs font-black shadow-neo-xs active:translate-x-0.5 active:translate-y-0.5 flex items-center gap-1.5 transition-all"
            >
              {copiedRich ? <Check size={16} className="text-black font-black" /> : <Sparkles size={16} />}
              <span>{copiedRich ? '🎉 已複製圖文信！請到 Gmail 貼上' : '📋 一鍵複製精美圖文信'}</span>
            </button>

            <button
              onClick={handleOpenGmail}
              className="px-4 py-2.5 bg-[#EA4335] hover:bg-[#d9382b] text-white border-2 border-black rounded-xl text-xs font-black shadow-neo-xs active:translate-x-0.5 active:translate-y-0.5 flex items-center gap-1.5 transition-all"
            >
              <Send size={15} />
              <span>📮 開啟 Gmail 撰寫</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
