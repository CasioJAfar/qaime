const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const target = `                if (numMatches.length >= 2) {
                  // Usually Price is the first or second, and Total/Yekun is at the end.
                  // Let's take the first as price, and the last as total
                  price = parseFloat(numMatches[0].replace(',', '.'));
                  total = parseFloat(numMatches[numMatches.length - 1].replace(',', '.'));
                } else if (numMatches.length === 1) {
                  total = parseFloat(numMatches[0].replace(',', '.'));
                  price = total;
                }
                
                let quantity = 1;
                // Try to find quantity (an integer or decimal before the price)
                const beforePrice = line.substring(0, firstNumIndex);
                const qtyMatch = beforePrice.match(/\\b(\\d+(?:[.,]\\d+)?)\\s*(?:ədəd|ton|kq|m|m2|m3|komplekt|lt|əd)?\\s*$/i);
                if (qtyMatch) {
                  quantity = parseFloat(qtyMatch[1].replace(',', '.'));
                  name = beforePrice.substring(0, qtyMatch.index).trim().replace(/^[0-9.]+\\s*/, '').trim();
                  if (!name || name.length < 2) name = "Məhsul/Xidmət";
                } else if (total > 0 && price > 0 && total !== price) {
                  quantity = Math.round(total / price);
                }`;

const replace = `                let quantity = 1;
                if (numMatches.length >= 4) {
                  price = parseFloat(numMatches[0].replace(',', '.'));
                  const cemiMebleg = parseFloat(numMatches[1].replace(',', '.'));
                  total = parseFloat(numMatches[numMatches.length - 1].replace(',', '.'));
                  if (price > 0 && cemiMebleg > 0) {
                    quantity = Math.round((cemiMebleg / price) * 100) / 100;
                  }
                } else if (numMatches.length >= 2) {
                  price = parseFloat(numMatches[0].replace(',', '.'));
                  total = parseFloat(numMatches[numMatches.length - 1].replace(',', '.'));
                } else if (numMatches.length === 1) {
                  total = parseFloat(numMatches[0].replace(',', '.'));
                  price = total;
                }
                
                if (numMatches.length < 4) {
                  const beforePrice = line.substring(0, firstNumIndex);
                  const qtyMatch = beforePrice.match(/\\b(\\d+(?:[.,]\\d+)?)\\s*(?:ədəd|ton|kq|m|m2|m3|komplekt|lt|əd)?\\s*$/i);
                  if (qtyMatch) {
                    quantity = parseFloat(qtyMatch[1].replace(',', '.'));
                    name = beforePrice.substring(0, qtyMatch.index).trim().replace(/^[0-9.]+\\s*/, '').trim();
                    if (!name || name.length < 2) name = "Məhsul/Xidmət";
                  } else if (total > 0 && price > 0 && total !== price) {
                    quantity = Math.round((total / price) * 100) / 100;
                  }
                }`;

if (code.includes(target)) {
  console.log("Found target!");
  code = code.replace(target, replace);
  fs.writeFileSync('server.ts', code);
} else {
  console.log("Could not find target!");
}
