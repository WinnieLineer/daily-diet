const fs = require('fs');
try {
  new Function(fs.readFileSync('gas/06_FlexMessages.js', 'utf8'));
  console.log('OK - no syntax errors');
} catch(e) {
  console.error('SYNTAX ERROR:', e.message);
}
