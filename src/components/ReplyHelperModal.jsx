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
    title: '🎁 贊助感謝 · 終身免單飼養員',
    badge: '贊助支持',
    color: 'from-amber-400 to-yellow-300',
    icon: '🎋',
    subject: '感謝您對 Daily Diet 的溫暖鼓勵與支持！🐼🎋（終身榮譽飼養員登記確認）',
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
    const greeting = `${recipientName || '您好'} 你好！\n\n`;
    let quoteBlock = '';
    if (userFeedbackQuote) {
      quoteBlock = `【您之前的留言】：\n「${userFeedbackQuote}」\n\n`;
    }
    const intro = customBody + '\n\n';

    let content = '';
    if (selectedTemplateId === 'sponsor') {
      content = `🎋 為什麼之前把轉帳資料藏起來？\n` +
        `先跟您坦白：我不希望這個工具給人一種「在隨意勸募」的感覺。我想先專注把核心功能（如語音記餐、雙向即時同步、16:8 斷食窗口與食物微調）做到最極致順手與穩定。\n\n` +
        `🎁 滴水之恩，熊貓終身免單 🎋✨：\n` +
        `因為有像您這樣一路陪伴、真心認同理念的老朋友，若您願意給予這份微薄心意，我十分感激並感動地收下！\n` +
        `我會直接將您的 Email（${recipientEmail || '您的信箱'}）登記在系統核心的【終身榮譽飼養員】名冊中。未來 Daily Diet 無論何時推出任何進階收費方案或全新 AI 增強功能，您皆享有「終身完整權限免費隨意使用，永不收費」！感謝您在草創期拉我們一把！❤️\n\n` +
        `💳 專案支持轉帳帳戶資訊：\n` +
        `• 銀行代碼：822 (中國信託商業銀行 CTBC)\n` +
        `• 銀行帳號：174533815287\n` +
        `• 戶名：林詩婷 (專案支持帳戶)\n` +
        `• 隨喜支持：☕ 隨喜咖啡 $50 / 🍱 伺服器補給 $150 / 🎋 終身飼養員 $500 (完全自由隨喜，零負擔)\n` +
        `• 轉帳後請告知「帳號末 5 碼」，我們將立即為您完成終身標記！`;
    } else if (selectedTemplateId === 'gist_tech') {
      content = `⚙️ 針對您詢問的 Gist 與 PAT 同步問題說明：\n\n` +
        `1. 為什麼提示需要 GitHub PAT？\n` +
        `系統原本設計為免 PAT 智慧雲端同步（透過後端安全中繼直連 Google Apps Script 與 Gist 雲端）。若手動觸發了前端直接寫入 GitHub 官方 REST API，才會觸發此安全提示。\n\n` +
        `2. PAT 在哪裡配置？\n` +
        `我們已經在最新版本的「設定 ⚙️ ➜ 備份同步」分頁中，新增了【⚙️ 進階設定：自訂個人 GitHub PAT】折疊面板。只要貼上具備 gist 權限的 Personal Access Token 即可直接同步！\n\n` +
        `3. 系統預期的備份檔名：\n` +
        `確實是 daily-diet-backup.json！格式為 UTF-8 編碼的 JSON 結構（包含 foods、categories、goals、weightRecords 等）。\n\n` +
        `若您在配置上有任何疑問，非常歡迎隨時回信，祝您使用順心！`;
    } else if (selectedTemplateId === 'feedback_general') {
      content = `💡 關於您的反饋與建議：\n\n` +
        `您的回饋我們已經詳細記錄在開發團隊的迭代清單中。我們非常重視每一位真實使用者的操作體驗，您的寶貴建議將直接影響未來的版本規劃！\n\n` +
        `若有後續優化更新發布，我們會持續努力讓 Daily Diet 變得更加順手好用。再次感謝您的支持！`;
    } else {
      content = `若有任何使用問題或想聊聊的想法，歡迎隨時回信！祝您度過美好的一天！✨`;
    }

    const signoff = `\n\n---\nDaily Diet 開發團隊 敬上 🐼\n官網：https://winnie-lin.space/daily-diet/`;
    return greeting + quoteBlock + intro + content + signoff;
  };

  // 生成 HTML 格式（用於複製到剪貼簿貼進 Gmail）
  const generateHtmlMarkup = () => {
    const greeting = `${recipientName || '您好'} 你好！`;
    let quoteHtml = '';
    if (userFeedbackQuote) {
      quoteHtml = `
        <div style="background-color: #F4F4F5; border-left: 4px solid #FDE047; padding: 12px 16px; margin: 16px 0; border-radius: 4px; font-style: italic; color: #18181B; font-size: 14px;">
          「${userFeedbackQuote.replace(/\n/g, '<br>')}」
        </div>
      `;
    }
    const introHtml = `<p style="font-size: 15px; color: #3F3F46; line-height: 1.7; margin: 0 0 16px 0;">${customBody.replace(/\n/g, '<br>')}</p>`;

    let bodyHtml = '';

    if (selectedTemplateId === 'sponsor') {
      bodyHtml = `
        <!-- 核心心意卡片 -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #FEF9C3; border: 2px solid #000000; border-radius: 14px; margin-bottom: 20px;">
          <tr>
            <td style="padding: 18px;">
              <div style="font-size: 16px; font-weight: bold; color: #713F12; margin-bottom: 8px;">
                🎋 為什麼之前把轉帳資料藏起來？
              </div>
              <p style="font-size: 14px; color: #854D0E; margin: 0 0 12px 0; line-height: 1.6;">
                先跟您坦白：我不希望這個工具給人一種「在隨意勸募」的感覺。我想先專注把核心功能（如語音記餐、雙向即時同步、16:8 斷食窗口與食物微調）做到最極致順手與穩定，等未來規劃出更完善的進階服務再來正式收費。
              </p>
              <div style="background-color: #FFFFFF; border: 1.5px solid #EAB308; border-radius: 10px; padding: 14px; font-size: 14px; color: #000000; line-height: 1.6;">
                🎁 <b>滴水之恩，熊貓終身免單 🎋✨</b><br>
                因為有像您這樣一路陪伴、真心認同理念的老朋友，若您願意給予這份微薄心意，我十分感激並感動地收下！<br>
                <b>我會直接將您的 Email（${recipientEmail || '您的信箱'}）登記在系統核心的【終身榮譽飼養員】名冊中。未來 Daily Diet 無論何時推出任何進階收費方案或全新 AI 增強功能，您皆享有「終身完整權限免費隨意使用，永不收費」！感謝您在草創期拉我們一把！❤️</b>
              </div>
            </td>
          </tr>
        </table>

        <!-- 轉帳資訊卡片 -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F0FDFA; border: 2px solid #000000; border-radius: 14px; margin-bottom: 20px;">
          <tr>
            <td style="padding: 18px;">
              <div style="font-size: 16px; font-weight: bold; color: #0F766E; margin-bottom: 12px;">
                💳 專案支持轉帳帳戶資訊
              </div>
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #FFFFFF; border: 1.5px solid #5EEAD4; border-radius: 10px; margin-bottom: 12px;">
                <tr>
                  <td style="padding: 10px 14px; border-bottom: 1px dashed #E2E8F0; font-size: 14px;">
                    <span style="color: #64748B;">銀行代碼：</span>
                    <b style="color: #0F172A;">822 (中國信託商業銀行 CTBC)</b>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 14px; border-bottom: 1px dashed #E2E8F0; font-size: 14px;">
                    <span style="color: #64748B;">銀行帳號：</span>
                    <b style="color: #0F766E; font-size: 16px; font-family: monospace;">174533815287</b>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 14px; font-size: 14px;">
                    <span style="color: #64748B;">戶名資訊：</span>
                    <b style="color: #0F172A;">林詩婷 (專案支持帳戶)</b>
                  </td>
                </tr>
              </table>

              <!-- QR Code 圖片與錨定 -->
              <div style="text-align: center; margin: 14px 0 10px 0;">
                <img src="https://winnie-lin.space/daily-diet/ctbc_qr.png" alt="CTBC QR Code" width="130" height="130" style="border: 2px solid #000000; border-radius: 12px; padding: 4px; background-color: #FFFFFF; display: inline-block;" />
                <div style="font-size: 11px; color: #64748B; margin-top: 5px; font-weight: bold;">
                  📲 支援中信 APP / 台灣 Pay / 各家網銀掃碼轉帳
                </div>
              </div>

              <!-- 隨喜錨定 -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 10px 0;">
                <tr>
                  <td width="33%" align="center" style="padding: 4px;">
                    <div style="background-color: #FEF9C3; border: 1px solid #FDE047; border-radius: 8px; padding: 6px;">
                      <span style="font-size: 11px; font-weight: bold; color: #854D0E;">☕ 隨喜咖啡</span><br>
                      <span style="font-size: 11px; color: #713F12;">$50</span>
                    </div>
                  </td>
                  <td width="33%" align="center" style="padding: 4px;">
                    <div style="background-color: #CCFBF1; border: 1px solid #5EEAD4; border-radius: 8px; padding: 6px;">
                      <span style="font-size: 11px; font-weight: bold; color: #0F766E;">🍱 伺服器補給</span><br>
                      <span style="font-size: 11px; color: #115E59;">$150</span>
                    </div>
                  </td>
                  <td width="33%" align="center" style="padding: 4px;">
                    <div style="background-color: #FFE4E6; border: 1px solid #FDA4AF; border-radius: 8px; padding: 6px;">
                      <span style="font-size: 11px; font-weight: bold; color: #9F1239;">🎋 終身飼養員</span><br>
                      <span style="font-size: 11px; color: #881337;">$500</span>
                    </div>
                  </td>
                </tr>
              </table>
              <div style="font-size: 11px; color: #0F766E; text-align: center; margin-top: 6px;">
                💡 轉帳後請回信告知「帳號末 5 碼」，我們將在後台立刻為您標記【終身榮譽飼養員】！
              </div>
            </td>
          </tr>
        </table>
      `;
    } else if (selectedTemplateId === 'gist_tech') {
      bodyHtml = `
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #EFF6FF; border: 2px solid #000000; border-radius: 14px; margin-bottom: 20px;">
          <tr>
            <td style="padding: 18px;">
              <div style="font-size: 16px; font-weight: bold; color: #1E40AF; margin-bottom: 12px;">
                🛠️ 針對 Gist 與 PAT 同步的解答說明
              </div>
              <div style="font-size: 14px; color: #1E3A8A; line-height: 1.6; space-y-3;">
                <p><b>1. 為什麼會提示需要 PAT？</b><br>
                系統原生設計為免 PAT 智慧雲端同步（透過專屬中繼安全存取）。若手動強制前端寫入 GitHub 官方 REST API，才會觸發此安全提示。</p>
                <p><b>2. PAT 在哪裡配置？</b><br>
                最新版本已在「設定 ⚙️ ➜ 備份同步」分頁最下方新增【⚙️ 進階設定：自訂個人 GitHub PAT】折疊面板。貼上具備 gist 權限的 token 即可直連個人的 GitHub！</p>
                <p><b>3. 系統預期檔名：</b><br>
                正是 <code style="background-color: #DBEAFE; padding: 2px 6px; border-radius: 4px; font-family: monospace;">daily-diet-backup.json</code>！包含餐點、分類、自訂目標與體重數據。</p>
              </div>
            </td>
          </tr>
        </table>
      `;
    } else {
      bodyHtml = `
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #ECFDF5; border: 2px solid #000000; border-radius: 14px; margin-bottom: 20px;">
          <tr>
            <td style="padding: 18px;">
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
      <div style="max-width: 640px; margin: 0 auto; background-color: #FFFFFF; border: 2px solid #000000; border-radius: 16px; overflow: hidden; font-family: 'Microsoft JhengHei', '微軟正黑體', sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #000000; padding: 20px 24px;">
          <tr>
            <td>
              <span style="display: inline-block; background-color: #FDE047; color: #000000; font-weight: 900; font-size: 12px; padding: 3px 8px; border-radius: 5px; letter-spacing: 0.5px;">
                🐼 DAILY DIET
              </span>
              <div style="color: #FFFFFF; font-size: 18px; font-weight: bold; margin-top: 6px;">
                ${customSubject}
              </div>
            </td>
          </tr>
        </table>

        <div style="padding: 24px 24px 20px 24px;">
          <p style="font-size: 16px; color: #18181B; margin: 0 0 14px 0;"><b>${greeting}</b></p>
          ${quoteHtml}
          ${introHtml}
          ${bodyHtml}
          <div style="margin-top: 24px; padding-top: 16px; border-top: 1px dashed #E4E4E7; font-size: 13px; color: #71717A; line-height: 1.6;">
            Daily Diet 開發團隊 敬上 🐼<br>
            官網體驗：<a href="https://winnie-lin.space/daily-diet/" style="color: #0F766E; text-decoration: none; font-weight: bold;">https://winnie-lin.space/daily-diet/</a>
          </div>
        </div>
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
