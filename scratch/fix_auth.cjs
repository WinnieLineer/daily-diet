const fs = require('fs');
const path = 'c:/Users/linw2/daily-diet/src/App.jsx';

try {
    let content = fs.readFileSync(path, 'utf8');
    const oldCheck = "!!localStorage.getItem('google_access_token')";
    const newCheck = "(() => { const token = localStorage.getItem('google_access_token'); const expiry = localStorage.getItem('google_token_expiry'); return !!token && !!expiry && Date.now() < Number(expiry); })()";
    
    // Replace all occurrences to be safe
    content = content.split(oldCheck).join(newCheck);
    
    fs.writeFileSync(path, content, 'utf8');
    console.log("Auth state fix applied via Node.js.");
} catch (err) {
    console.error("Error:", err);
}
