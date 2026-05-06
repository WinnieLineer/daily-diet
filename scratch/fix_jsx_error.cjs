const fs = require('fs');
const path = 'c:/Users/linw2/daily-diet/src/App.jsx';

try {
    let content = fs.readFileSync(path, 'utf8');
    
    // Remove the broken hidden div that caused "Adjacent JSX elements" error
    const brokenPart = '<div className="hidden" data-settings-btn onClick={() => {}} />\n          <GoalSettings';
    if (content.includes(brokenPart)) {
        content = content.replace(brokenPart, '<GoalSettings');
    }
    
    // Ensure GoalSettings itself has the attribute (I added it in GoalSettings.jsx already)
    // But for the search logic in App.jsx to work, let's make sure it's stable.

    fs.writeFileSync(path, content, 'utf8');
    console.log("App.jsx JSX error fixed.");
} catch (err) {
    console.error("Error:", err);
}
