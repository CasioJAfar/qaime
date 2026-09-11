const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const t1 = `                let total = 0;
                let price = 0;
                
                if (numMatches.length >= 4) {`;
const r1 = `                let total = 0;
                let price = 0;
                let quantity = 1;
                
                if (numMatches.length >= 4) {`;
code = code.replace(t1, r1);

const t2 = `                let quantity = 1;
                 if (numMatches.length < 4) {`;
const r2 = `                 if (numMatches.length < 4) {`;
code = code.replace(t2, r2);

fs.writeFileSync('server.ts', code);
console.log("Done");
