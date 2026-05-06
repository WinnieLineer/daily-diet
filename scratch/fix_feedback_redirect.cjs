const fs = require('fs');
const path = 'c:/Users/linw2/daily-diet/src/App.jsx';

try {
    let content = fs.readFileSync(path, 'utf8');
    
    // 1. Add settingsTab state
    if (!content.includes('const [settingsTab, setSettingsTab]')) {
        content = content.replace(
            "const [selectedLogForDetail, setSelectedLogForDetail] = useState(null);",
            "const [selectedLogForDetail, setSelectedLogForDetail] = useState(null);\n  const [settingsTab, setSettingsTab] = useState('profile');"
        );
    }
    
    // 2. Add initialTab to GoalSettings
    if (!content.includes('initialTab={settingsTab}')) {
        content = content.replace(
            "<GoalSettings",
            "<GoalSettings \n            initialTab={settingsTab}"
        );
    }
    
    // 3. Update Feedback Banner Button
    const oldBannerBtn = `<a \n            href="https://github.com/WinnieLineer/daily-diet/issues" \n            target="_blank" \n            rel="noopener noreferrer"`;
    // Since the content might vary in formatting, let's use a simpler search for the banner section
    const bannerSearch = "{t('feedback_button')}";
    // We want to replace the <a> tag that wraps this button text
    // Let's find the <a> and </a> tags around it.
    
    // Simple way: replace the whole <a> block if we can find it
    const aStart = content.lastIndexOf('<a', content.indexOf(bannerSearch));
    const aEnd = content.indexOf('</a>', content.indexOf(bannerSearch)) + 4;
    
    if (aStart !== -1 && aEnd !== -1) {
        const newBtn = `<button \n            onClick={() => {\n              setSettingsTab('feedback');\n              setTimeout(() => document.querySelector('[data-settings-btn]')?.click(), 50);\n            }}\n            className="w-full bg-white text-black h-12 rounded-2xl flex items-center justify-center gap-2 font-black text-sm hover:bg-accent transition-all active:scale-95"\n          >\n            <MessageSquareQuote size={18} />\n            {t('feedback_button')}\n          </button>`;
        content = content.substring(0, aStart) + newBtn + content.substring(aEnd);
    }
    
    // 4. Add data-settings-btn to the settings button in Top Nav
    // Usually it's inside NeoButton in header
    if (!content.includes('data-settings-btn')) {
        content = content.replace(
            '<GoalSettings',
            '<div className="hidden" data-settings-btn onClick={() => {}} />\n          <GoalSettings'
        );
        // Wait, GoalSettings itself has the button. Let's look for where the Settings icon is used in App.jsx if any.
        // Actually, GoalSettings.jsx has its own button.
    }

    fs.writeFileSync(path, content, 'utf8');
    console.log("App.jsx feedback redirection logic applied.");
} catch (err) {
    console.error("Error:", err);
}
