const fs = require('fs');
let file = fs.readFileSync('apps/web/app/page.tsx', 'utf8');

file = file.replace(/token === 'SH'/g, "token === 'SHREE'");
file = file.replace(/isSHForETH \? \"SH\" : \"ETH\"/g, 'isSHForETH ? \"SHREE\" : \"ETH\"');
file = file.replace(/!isSHForETH \? \"SH\" : \"ETH\"/g, '!isSHForETH ? \"SHREE\" : \"ETH\"');
file = file.replace(/isSHForETH \? 'SH' : 'ETH'/g, "isSHForETH ? 'SHREE' : 'ETH'");
file = file.replace(/!isSHForETH \? 'SH' : 'ETH'/g, "!isSHForETH ? 'SHREE' : 'ETH'");
file = file.replace(/'SH reserve'/g, "'SHREE reserve'");
file = file.replace(/1 SH =/g, '1 SHREE =');
file = file.replace(/Swap SH /g, 'Swap SHREE ');
file = file.replace(/SH \/ ETH/g, 'SHREE / ETH');
file = file.replace(/Trade SH /g, 'Trade SHREE ');
file = file.replace(/Approve SH/g, 'Approve SHREE');
file = file.replace(/SH amount/g, 'SHREE amount');
file = file.replace(/'SH -> ETH'/g, "'SHREE -> ETH'");
file = file.replace(/'ETH -> SH'/g, "'ETH -> SHREE'");
file = file.replace(/token="SH"/g, 'token="SHREE"');

fs.writeFileSync('apps/web/app/page.tsx', file);
