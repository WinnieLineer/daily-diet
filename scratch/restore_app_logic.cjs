const fs = require('fs');
const path = 'c:/Users/linw2/daily-diet/src/App.jsx';

try {
    let content = fs.readFileSync(path, 'utf8');
    
    const correctBlock = `  const getFastingStatus = () => {
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
  };

  const fasting = getFastingStatus();
  return (
    <div className="min-h-screen p-4 pb-28 max-w-lg mx-auto space-y-6">
      <AnimatePresence>`;

    // Find from the start of the function to the first AnimatePresence
    const startIdx = content.indexOf('const getFastingStatus = () => {');
    const targetIdx = content.indexOf('<AnimatePresence>');
    
    if (startIdx !== -1 && targetIdx !== -1) {
        // Replace from startIdx up to targetIdx
        content = content.substring(0, startIdx) + correctBlock + content.substring(targetIdx + 17);
    }

    fs.writeFileSync(path, content, 'utf8');
    console.log("App.jsx critical syntax error fixed.");
} catch (err) {
    console.error("Error:", err);
}
