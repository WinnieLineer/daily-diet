const fs = require('fs');
const path = 'c:/Users/linw2/daily-diet/src/App.jsx';

try {
    let content = fs.readFileSync(path, 'utf8');
    
    // 1. Correct getFastingStatus function
    const newFunc = `  const getFastingStatus = () => {
    if (!goals.fasting_enabled) return null;
    const now = new Date();
    const hourMin = now.getHours() * 60 + now.getMinutes();
    const [sH, sM] = goals.fasting_start.split(':').map(Number);
    const startMins = sH * 60 + sM;
    const [eH, eM] = goals.fasting_end.split(':').map(Number);
    const endMins = eH * 60 + eM;
    
    let isEating = false;
    if (startMins <= endMins) {
      isEating = hourMin >= startMins && hourMin <= endMins;
    } else {
      isEating = hourMin >= startMins || hourMin <= endMins;
    }
    
    return { 
      isEating, 
      start: isEating ? goals.fasting_start : goals.fasting_end, 
      end: isEating ? goals.fasting_end : goals.fasting_start 
    };
  };`;

    // Find the broken function start and the next function/const
    const startIdx = content.indexOf('const getFastingStatus = () => {');
    const endIdx = content.indexOf('const fasting = getFastingStatus();');
    
    if (startIdx !== -1 && endIdx !== -1) {
        content = content.substring(0, startIdx) + newFunc + "\n\n  " + content.substring(endIdx);
    }

    // 2. Simplify UI
    const searchUI = `<div className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{t('eating_window')} ({fasting.start} - {fasting.end})</div>`;
    const replaceUI = ""; // Remove the header
    content = content.replace(searchUI, replaceUI);
    
    const searchStatus = "{fasting.isEating ? '🔥 ' + t('eating_now') : '🌙 ' + t('fasting_now')}";
    const replaceStatus = "{fasting.isEating ? '🔥 ' + t('eating_now') : '🌙 ' + t('fasting_now')} ({fasting.start} - {fasting.end})";
    content = content.replace(searchStatus, replaceStatus);

    fs.writeFileSync(path, content, 'utf8');
    console.log("Fasting UI simplified and time inversion applied.");
} catch (err) {
    console.error("Error:", err);
}
