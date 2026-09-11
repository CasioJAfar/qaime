const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const startIdx = code.indexOf('    } else if (isPDF) {');
const endIdx = code.indexOf('    if (rows.length > 0) {');

if (startIdx === -1 || endIdx === -1) {
    console.error("Bounds not found");
    process.exit(1);
}

const newBlock = `    } else if (isPDF) {
      const buffer = Buffer.from(base64Data, "base64");
      const parser = new PDFParse({ data: buffer });
      const pdfData = await parser.getText();
      const text = pdfData.text;
      await parser.destroy();
      
      const lines = text.split(/\\r?\\n/).map((l: string) => l.trim()).filter((l: string) => l.length > 0);
      
      let customerName = "";
      let invoiceNumber = "";
      let invoiceDate = "";
      let totalAmount = 0;
      let items: any[] = [];
      let extraData: any = {
         senderName: "",
         senderVOEN: "",
         receiverVOEN: "",
         esas: "",
         elaveQeydler: ""
      };
      
      let inTable = false;
      let pendingItemName = "";

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lowerLine = line.toLowerCase();
        
        // Seriya, Nömrə, Tarix
        if (lowerLine.includes("seriya:") && lowerLine.includes("nömrə:") && lowerLine.includes("tarix:")) {
          const serMatch = line.match(/Seriya:\\s*([\\w]+)/i);
          const numMatch = line.match(/Nömrə:\\s*([\\w]+)/i);
          const dateMatch = line.match(/Tarix:\\s*([\\d.]+)/i);
          if (serMatch && numMatch) invoiceNumber = serMatch[1] + "-" + numMatch[1];
          else if (numMatch) invoiceNumber = numMatch[1];
          
          if (dateMatch) {
            const parts = dateMatch[1].split(/[./-]/);
            if (parts.length >= 3) invoiceDate = \`\${parts[2]}-\${parts[1]}-\${parts[0]}\`;
          }
        }
        
        // Göndərən
        if (lowerLine.includes("göndərən:")) {
          const match = line.match(/Göndərən:\\s*VÖEN\\s+([\\d\\s]+)\\s+(.+)/i);
          if (match) {
            extraData.senderVOEN = match[1].replace(/\\s+/g, '');
            extraData.senderName = match[2].trim().replace(/^"|"$/g, '');
          }
        }
        
        // Qəbul edən
        if (lowerLine.includes("qəbul edən:")) {
          const match = line.match(/Qəbul edən:\\s*VÖEN\\s+([\\d\\s]+)\\s+(.+)/i);
          if (match) {
            extraData.receiverVOEN = match[1].replace(/\\s+/g, '');
            customerName = match[2].trim().replace(/^"|"$/g, '');
          } else {
             const parts = line.split(/qəbul edən:/i);
             if (parts.length > 1 && parts[1].trim() && !parts[1].trim().match(/^_/)) {
               customerName = parts[1].trim().replace(/_+$/, "").trim();
             } else if (i + 1 < lines.length) {
               customerName = lines[i+1].trim().replace(/_+$/, "").trim();
             }
          }
        }
        
        // Əsas
        if (lowerLine.startsWith("əsas ") || lowerLine.startsWith("əsas: ")) {
           extraData.esas = line.substring(4).replace(/^:/, '').trim().replace(/^"|"$/g, '');
        }
        
        // Əlavə qeydlər
        if (lowerLine.startsWith("əlavə qeydlər")) {
           extraData.elaveQeydler = line.substring(13).replace(/^:/, '').trim();
        }
        
        if (line.match(/^1\\s+2\\s+3\\s+4\\s+5/)) {
           inTable = true;
           continue;
        }
        
        if (inTable) {
           if (lowerLine.startsWith("yekun məbləğ")) {
              inTable = false;
              const textMatch = line.match(/Yekun məbləğ\\s+([\\d.,]+)\\s+\\((.*?)\\)\\s+manat\\s+([\\d.,]+)\\s+\\((.*?)\\)\\s+qəpik/i);
              if (textMatch) {
                 totalAmount = parseFloat(textMatch[1]) + (parseFloat(textMatch[3]) / 100);
              } else {
                 const numMatch = line.match(/[\\d.,]+/);
                 if (numMatch) totalAmount = parseFloat(numMatch[0]);
              }
              continue;
           }
           
           if (lowerLine.startsWith("cəmi") && !lowerLine.includes("o cümlədən")) {
              continue;
           }
           
           const unitRegex = /(?:ədəd|ton|kq|qram|q|m|m2|m3|komplekt|lt|litr|əd)\\s+(\\d+(?:[.,]\\d+)?)\\s+(\\d+(?:[.,]\\d+)?)\\s+(\\d+(?:[.,]\\d+)?)/i;
           const unitMatch = line.match(unitRegex);
           
           if (unitMatch) {
               const nums = line.substring(unitMatch.index).match(/\\b\\d+(?:[.,]\\d+)?\\b/g);
               
               if (nums && nums.length >= 10) {
                  const qty = parseFloat(nums[0].replace(',', '.'));
                  const price = parseFloat(nums[1].replace(',', '.'));
                  const total = parseFloat(nums[nums.length - 1].replace(',', '.'));
                  
                  let beforeUnit = line.substring(0, unitMatch.index).trim();
                  const wordsBeforeUnit = beforeUnit.split(" ");
                  const code = wordsBeforeUnit.length > 0 ? wordsBeforeUnit.pop() : "";
                  beforeUnit = wordsBeforeUnit.join(" ");
                  
                  let name = pendingItemName;
                  if (beforeUnit) name += (name ? " " : "") + beforeUnit;
                  
                  name = name.replace(/^\\d+\\s+/, '').trim();
                  
                  items.push({
                     name: name,
                     code: code,
                     quantity: qty,
                     price: price,
                     total: total
                  });
                  pendingItemName = "";
               }
           } else if (line.trim().length > 0 && !line.match(/^[\\d\\s]+$/)) {
               pendingItemName += (pendingItemName ? " " : "") + line.trim();
           } else {
               pendingItemName = "";
           }
        }
      }
      
      // Fallback for simple PDFs if E-Qaime logic didn't catch anything
      if (!customerName || items.length === 0) {
        // Just let it return what it can, it's deterministic.
      }
      
      return {
        customerName: customerName || "Naməlum Müştəri",
        invoiceNumber: invoiceNumber || \`INV-\${Date.now()}\`,
        invoiceDate: invoiceDate || new Date().toISOString().split('T')[0],
        totalAmount: totalAmount || 0,
        items: items,
        extraData: extraData
      };
}

`;

code = code.substring(0, startIdx) + newBlock + code.substring(endIdx);
fs.writeFileSync('server.ts', code);
console.log("Replaced successfully!");
