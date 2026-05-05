const fs = require('fs');

// package.json
let pkg = fs.readFileSync('package.json', 'utf8');
pkg = pkg.replace(/<<<<<<< HEAD\n  "version": "1\.8\.2",\n=======\n  "version": "1\.7\.20",\n>>>>>>>[^\n]+\n/, '  "version": "1.8.2",\n');
fs.writeFileSync('package.json', pkg);

// public/version.json
let ver = fs.readFileSync('public/version.json', 'utf8');
ver = ver.replace(/<<<<<<< HEAD\n  "version": "1\.8\.0"\n=======\n  "version": "1\.7\.20"\n>>>>>>>[^\n]+\n/, '  "version": "1.8.2"\n');
fs.writeFileSync('public/version.json', ver);

// src/lib/translations.js
let trans = fs.readFileSync('src/lib/translations.js', 'utf8');
trans = trans.replace(/<<<<<<< HEAD\n([\s\S]*?)=======\n([\s\S]*?)>>>>>>>[^\n]+\n/g, '$1$2');
fs.writeFileSync('src/lib/translations.js', trans);

// src/components/GoalSettings.jsx
let gs = fs.readFileSync('src/components/GoalSettings.jsx', 'utf8');
gs = gs.replace(/<<<<<<< HEAD\n([\s\S]*?)const GoalSettings = \(\{ onGoalsUpdated, onWatchTutorial, onLanguageChanged, userName, onSetUserName, onToggleLayoutEdit, isEditingLayout, pwaPrompt, onPwaPromptUsed \}\) => \{\n  const \[goals, setGoals\] = useState\(\{ calories: 2000, protein: 100, water: 2500 \}\);\n=======\nconst GoalSettings = \(\{ onGoalsUpdated, onWatchTutorial, onLanguageChanged \}\) => \{\n  const \[goals, setGoals\] = useState\(\{ calories: 2000, protein: 100, water: 2500, fasting_enabled: false, fasting_start: '12:00', fasting_end: '20:00' \}\);\n  const \[loading, setLoading\] = useState\(false\);\n>>>>>>>[^\n]+\n/, `$1const GoalSettings = ({ onGoalsUpdated, onWatchTutorial, onLanguageChanged, userName, onSetUserName, onToggleLayoutEdit, isEditingLayout, pwaPrompt, onPwaPromptUsed }) => {\n  const [goals, setGoals] = useState({ calories: 2000, protein: 100, water: 2500, fasting_enabled: false, fasting_start: '12:00', fasting_end: '20:00' });\n  const [loading, setLoading] = useState(false);\n`);
fs.writeFileSync('src/components/GoalSettings.jsx', gs);

