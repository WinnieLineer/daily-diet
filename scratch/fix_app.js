const fs = require('fs');
const path = 'c:/Users/linw2/daily-diet/src/App.jsx';

try {
    let content = fs.readFileSync(path, 'utf8');
    const target = "const { getUserInfo, isLoggedIn, refreshLogin } = import('./lib/googleAuth')";
    if (content.includes(target)) {
        content = content.replace("const { getUserInfo, isLoggedIn, refreshLogin } = ", "");
        fs.writeFileSync(path, content, 'utf8');
        console.log("Fix applied successfully via Node.js.");
    } else {
        console.log("Target string not found.");
    }
} catch (err) {
    console.error("Error:", err);
}
