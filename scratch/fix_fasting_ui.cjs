const fs = require('fs');
const path = 'c:/Users/linw2/daily-diet/src/App.jsx';

try {
    let content = fs.readFileSync(path, 'utf8');
    const oldBlock = `{t('fasting_mode')}</div>\n              <div className="text-sm font-black italic">\n                {fasting.isEating ? t('eating_window') : t('fasting_window')} ({fasting.start} - {fasting.end})`;
    
    // Using a more robust regex-like replacement
    const searchStr = "{t('fasting_mode')}</div>";
    const replaceStr = "{t('eating_window')}</div>";
    content = content.replace(searchStr, replaceStr);
    
    const searchStr2 = "{fasting.isEating ? t('eating_window') : t('fasting_window')} ({fasting.start} - {fasting.end})";
    const replaceStr2 = "{fasting.isEating ? '🔥 ' + t('eating_now') : '🌙 ' + t('fasting_now')} ({fasting.start} - {fasting.end})";
    content = content.replace(searchStr2, replaceStr2);
    
    fs.writeFileSync(path, content, 'utf8');
    console.log("Fasting UI fix applied via Node.js.");
} catch (err) {
    console.error("Error:", err);
}
