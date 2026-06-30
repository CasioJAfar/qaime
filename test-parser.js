const lines = [
  "1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18",
  "1",
  "POLİÜRETAN TİNER 12",
  "LT 3814009009 ədəd 3 70 210 0 0 210 210 0 0 0 37.8 0 247.8",
  "Cəmi 210 0 210 210 0 0 0 37.8 0 247.8",
  "2",
  "Armatur A500C",
  "ton 10 1200 12000 0 0 12000 12000 0 0 0 2160 0 14160",
  "Cəmi 12000 0 12000 12000 0 0 0 2160 0 14160",
  "Something else 1 2 3 4"
];

let possibleItems = [];
let pendingName = "";

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  if (line.match(/^[\d\s]+$/)) continue; // skip pure numbers like header
  
  // Try to find a sequence of at least 5 numbers at the end of the line
  // which indicates an e-qaime table row.
  const allNums = line.match(/\b\d+(?:[.,]\d+)?\b/g);
  
  // Often there's a unit like ədəd, ton, etc.
  const unitRegex = /(?:ədəd|ton|kq|qram|q|m|m2|m3|komplekt|lt|litr|əd)\s+(\d+(?:[.,]\d+)?)\s+(\d+(?:[.,]\d+)?)/i;
  const unitMatch = line.match(unitRegex);
  
  if (unitMatch && allNums && allNums.length >= 5) {
    const qty = parseFloat(unitMatch[1].replace(',', '.'));
    const price = parseFloat(unitMatch[2].replace(',', '.'));
    const total = parseFloat(allNums[allNums.length - 1].replace(',', '.'));
    
    let beforeUnit = line.substring(0, unitMatch.index).trim();
    // Usually the number right before unit is the code
    beforeUnit = beforeUnit.replace(/\b\d{5,}\b/g, '').trim(); // strip long numbers (codes)
    
    let name = pendingName;
    if (beforeUnit) {
      name += (name ? " " : "") + beforeUnit;
    }
    
    possibleItems.push({ name, quantity: qty, price, total });
    pendingName = "";
  } 
  // Another fallback for typical num matches
  else if (allNums && allNums.length >= 6) {
     // If we didn't find unit but have a lot of numbers
     // Let's assume the first few numbers are qty and price?
     // Actually, let's just let it be. But what if it's "Cəmi" row?
     if (line.toLowerCase().includes("cəmi")) {
        pendingName = "";
        continue;
     }
     
     // let's try to extract name
     const firstNumStr = allNums[0];
     const firstNumIndex = line.indexOf(firstNumStr);
     let namePart = line.substring(0, firstNumIndex).trim();
     namePart = namePart.replace(/\b\d{5,}\b/g, '').trim();
     
     let name = pendingName;
     if (namePart) name += (name ? " " : "") + namePart;
     if (!name) name = "Məhsul";
     
     // The numbers: if it's e-qaime, qty is usually the 2nd or 3rd number if code is present.
     // Better just use total/price if we can guess it.
     const total = parseFloat(allNums[allNums.length - 1].replace(',', '.'));
     const price = parseFloat(allNums[0].replace(',', '.')); // might be wrong
     
     possibleItems.push({ name, quantity: 1, price, total });
     pendingName = "";
  }
  else if (!line.toLowerCase().includes("cəmi")) {
    pendingName += (pendingName ? " " : "") + line.trim();
  } else {
    pendingName = "";
  }
}

console.log(possibleItems);
