const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const oldDefs = `      // Parse specific fields according to user instructions
      let inTable = false;
      let possibleItems: any[] = [];`;

const newDefs = `      // Parse specific fields according to user instructions
      let inTable = false;
      let possibleItems: any[] = [];
      let pendingName = "";`;

code = code.replace(oldDefs, newDefs);


const oldLogic = `         // ITEM PARSING HEURISTICS
         if (lowerLine.includes("malın") || lowerLine.includes("xidmətin") || lowerLine.includes("adı") || lowerLine.includes("vahidinin satış")) {
            inTable = true;
            continue;
         }
         
         if (inTable) {
            if (lowerLine.includes("yekun məbləğ") || lowerLine.includes("cəmi məbləğ") || lowerLine.match(/^yekun/)) {
              inTable = false;
            } else {
              // We are looking for lines that have a name and numbers. e.g. "Armatur 10 ton 1200.00 12000.00 ..."
              // Some lines might just be text, some might just be numbers.
              const numMatches = line.match(/\\b\\d+[.,]\\d{2}\\b/g);
              
              // If there's at least one price-like number
              if (numMatches && numMatches.length >= 1) {
                // The name is usually before the first number
                const firstNumIndex = line.indexOf(numMatches[0]);
                let name = line.substring(0, firstNumIndex).trim();
                // Clean up name
                name = name.replace(/^[0-9.]+\\s*/, '').trim(); // remove leading sequence numbers
                
                if (!name || name.length < 2) name = "Məhsul/Xidmət";
                
                let total = 0;
                let price = 0;
                let quantity = 1;
                
                if (numMatches.length >= 4) {
                   price = parseFloat(numMatches[0].replace(',', '.'));
                   const cemiMebleg = parseFloat(numMatches[1].replace(',', '.'));
                   total = parseFloat(numMatches[numMatches.length - 1].replace(',', '.'));
                   if (price > 0 && cemiMebleg > 0) {
                     quantity = Math.round((cemiMebleg / price) * 100) / 100;
                   }
                 } else if (numMatches.length >= 2) {
                  // Usually Price is the first or second, and Total/Yekun is at the end.
                  // Let's take the first as price, and the last as total
                  price = parseFloat(numMatches[0].replace(',', '.'));
                  total = parseFloat(numMatches[numMatches.length - 1].replace(',', '.'));
                } else if (numMatches.length === 1) {
                  total = parseFloat(numMatches[0].replace(',', '.'));
                  price = total;
                }
                
                 if (numMatches.length < 4) {
                // Try to find quantity (an integer or decimal before the price)
                const beforePrice = line.substring(0, firstNumIndex);
                const qtyMatch = beforePrice.match(/\\b(\\d+(?:[.,]\\d+)?)\\s*(?:ədəd|ton|kq|m|m2|m3|komplekt|lt|əd)?\\s*$/i);
                if (qtyMatch) {
                  quantity = parseFloat(qtyMatch[1].replace(',', '.'));
                  name = beforePrice.substring(0, qtyMatch.index).trim().replace(/^[0-9.]+\\s*/, '').trim();
                  if (!name || name.length < 2) name = "Məhsul/Xidmət";
                } else if (total > 0 && price > 0 && total !== price) {
                  quantity = Math.round((total / price) * 100) / 100;
                }
                
                } // End if numMatches < 4
                 // Avoid adding lines that are just sums
                if (name.toLowerCase() !== "cəmi" && !name.toLowerCase().includes("yekun") && !name.toLowerCase().includes("ədv")) {
                  possibleItems.push({ name, quantity, price, total });
                }
              }
            }
         }`;

const newLogic = `         // ITEM PARSING HEURISTICS
         if (line.match(/^[\\d\\s.,]+$/)) continue; // skip pure numbers like header rows
         
         const allNums = line.match(/\\b\\d+(?:[.,]\\d+)?\\b/g);
         const unitRegex = /(?:ədəd|ton|kq|qram|q|m|m2|m3|komplekt|lt|litr|əd)\\s+(\\d+(?:[.,]\\d+)?)\\s+(\\d+(?:[.,]\\d+)?)/i;
         const unitMatch = line.match(unitRegex);
         
         if (unitMatch && allNums && allNums.length >= 5) {
            const qty = parseFloat(unitMatch[1].replace(',', '.'));
            const price = parseFloat(unitMatch[2].replace(',', '.'));
            const total = parseFloat(allNums[allNums.length - 1].replace(',', '.'));
            
            let beforeUnit = line.substring(0, unitMatch.index).trim();
            beforeUnit = beforeUnit.replace(/\\b\\d{5,}\\b/g, '').trim(); // strip long numbers (like GTIN)
            beforeUnit = beforeUnit.replace(/^\\d+\\s+/, '').trim(); // strip leading sequence number
            
            let name = pendingName;
            if (beforeUnit) {
               name += (name ? " " : "") + beforeUnit;
            }
            if (!name) name = "Məhsul/Xidmət";
            
            if (name.toLowerCase() !== "cəmi" && !name.toLowerCase().includes("yekun")) {
               possibleItems.push({ name, quantity: qty, price, total });
            }
            pendingName = "";
         } else if (allNums && allNums.length >= 6) {
            if (lowerLine.includes("cəmi") || lowerLine.includes("yekun")) {
               pendingName = "";
               continue;
            }
            
            const firstNumStr = allNums[0];
            const firstNumIndex = line.indexOf(firstNumStr);
            let namePart = line.substring(0, firstNumIndex).trim();
            namePart = namePart.replace(/\\b\\d{5,}\\b/g, '').trim();
            namePart = namePart.replace(/^\\d+\\s+/, '').trim();
            
            let name = pendingName;
            if (namePart) name += (name ? " " : "") + namePart;
            if (!name) name = "Məhsul/Xidmət";
            
            const total = parseFloat(allNums[allNums.length - 1].replace(',', '.'));
            const price = parseFloat(allNums[0].replace(',', '.'));
            
            possibleItems.push({ name, quantity: 1, price, total });
            pendingName = "";
         } else if (!lowerLine.includes("cəmi") && !lowerLine.includes("yekun") && !lowerLine.includes("ədv") && !lowerLine.includes("tarix") && !lowerLine.includes("nömrə") && !lowerLine.includes("qəbul edən") && !lowerLine.includes("göndərən") && !lowerLine.includes("imza") && !lowerLine.includes("vöen") && !lowerLine.includes("ədəd")) {
            // It might be a product name spanning multiple lines
            pendingName += (pendingName ? " " : "") + line.trim();
         } else {
            pendingName = "";
         }`;

code = code.replace(oldLogic, newLogic);


const oldCustomerLogic = `       return {
         customerName: customerName || "Naməlum Müştəri",`;
const newCustomerLogic = `       // Cleanup customer name from VOEN
       if (customerName) {
         customerName = customerName.replace(/VÖEN\\s*\\d+\\s*/i, '').trim();
         if (customerName.startsWith('"')) {
            const match = customerName.match(/"([^"]+)"/);
            if (match) customerName = match[1];
         }
       }

       return {
         customerName: customerName || "Naməlum Müştəri",`;

code = code.replace(oldCustomerLogic, newCustomerLogic);

fs.writeFileSync('server.ts', code);
console.log("Done");
