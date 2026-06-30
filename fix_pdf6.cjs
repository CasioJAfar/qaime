const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const startIdx = code.indexOf('// ITEM PARSING HEURISTICS');
const endIdx = code.indexOf('if (possibleItems.length > 0) {');

if (startIdx === -1 || endIdx === -1) {
  console.log("Could not find bounds");
  process.exit(1);
}

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
         }
       }
       
       `;

code = code.substring(0, startIdx) + newLogic + code.substring(endIdx);

// Also add pendingName definition
const oldDefs = `      // Parse specific fields according to user instructions
      let inTable = false;
      let possibleItems: any[] = [];`;

const newDefs = `      // Parse specific fields according to user instructions
      let inTable = false;
      let possibleItems: any[] = [];
      let pendingName = "";`;
code = code.replace(oldDefs, newDefs);

// Also fix customer logic
const oldCust = `       return {
         customerName: customerName || "Naməlum Müştəri",`;
const newCust = `       // Cleanup customer name from VOEN
       if (customerName) {
         customerName = customerName.replace(/VÖEN\\s*\\d+\\s*/i, '').trim();
         if (customerName.startsWith('"')) {
            const match = customerName.match(/"([^"]+)"/);
            if (match) customerName = match[1];
         }
       }

       return {
         customerName: customerName || "Naməlum Müştəri",`;
code = code.replace(oldCust, newCust);

fs.writeFileSync('server.ts', code);
console.log("Done");
