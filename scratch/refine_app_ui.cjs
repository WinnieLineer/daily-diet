const fs = require('fs');
const path = 'c:/Users/linw2/daily-diet/src/App.jsx';

try {
    let content = fs.readFileSync(path, 'utf8');
    
    // 1. Fix Misleading Fasting UI (Final Version)
    const oldFastingUI = `{fasting.isEating ? '🔥 ' + t('eating_now') : '🌙 ' + t('fasting_now')} ({fasting.start} - {fasting.end})`;
    const newFastingUI = `{fasting.isEating ? '🔥 ' + t('eating_now') : '🌙 ' + t('fasting_now')}`;
    content = content.replace(oldFastingUI, newFastingUI);

    // Update the header part to include the times
    const oldFastingHeader = `<div className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{t('eating_window')}</div>`;
    const newFastingHeader = `<div className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{t('eating_window')} ({fasting.start} - {fasting.end})</div>`;
    content = content.replace(oldFastingHeader, newFastingHeader);

    // 2. Fix Feedback Redirection (using Custom Event for stability)
    const oldClickLogic = "setTimeout(() => document.querySelector('[data-settings-btn]')?.click(), 50);";
    const newClickLogic = "window.dispatchEvent(new CustomEvent('open-settings', { detail: { tab: 'feedback' } }));";
    content = content.replace(oldClickLogic, newClickLogic);

    fs.writeFileSync(path, content, 'utf8');
    console.log("Fasting UI and Feedback logic fixed.");
} catch (err) {
    console.error("Error:", err);
}
