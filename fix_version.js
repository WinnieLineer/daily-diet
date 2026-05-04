const fs = require('fs');
let pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
pkg.version = '1.8.4';
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));

let v = JSON.parse(fs.readFileSync('public/version.json', 'utf8'));
v.version = '1.8.4';
fs.writeFileSync('public/version.json', JSON.stringify(v, null, 2));
