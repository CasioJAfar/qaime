const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// The replacement logic:
code = code.replace(
  'quantity = Math.round(total / price);',
  'quantity = Math.round((total / price) * 100) / 100;'
);

code = code.replace(
  'if (numMatches.length >= 2) {',
  `if (numMatches.length >= 4) {
                  price = parseFloat(numMatches[0].replace(',', '.'));
                  const cemiMebleg = parseFloat(numMatches[1].replace(',', '.'));
                  total = parseFloat(numMatches[numMatches.length - 1].replace(',', '.'));
                  if (price > 0 && cemiMebleg > 0) {
                    quantity = Math.round((cemiMebleg / price) * 100) / 100;
                  }
                } else if (numMatches.length >= 2) {`
);

code = code.replace(
  'let quantity = 1;',
  'let quantity = 1;\n                if (numMatches.length < 4) {'
);

code = code.replace(
  '// Avoid adding lines that are just sums',
  '} // End if numMatches < 4\n                // Avoid adding lines that are just sums'
);


fs.writeFileSync('server.ts', code);
console.log("Done");
