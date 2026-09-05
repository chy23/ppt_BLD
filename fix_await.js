const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');
code = code.replace('generatePPTX(presentationData.slides);', 'await generatePPTX(presentationData.slides);');
fs.writeFileSync('src/App.tsx', code, 'utf-8');
