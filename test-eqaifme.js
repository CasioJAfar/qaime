const fs = require('fs');

const lines = [
"Elektron əmtəə-nəqliyyat qaiməsinin",
"seriyası: ________ nömrəsi: ________",
"tarixi: _________________",
"\"Elektron qaimələrin",
"tətbiqi Uçotu və",
"istifadə Qaydaları\"na",
"1 nömrəli əlavə",
"Malların, işlərin və xidmətlərin təqdim edilməsi barədə elektron qaimə-faktura",
"Seriya: MT2606 Nömrə: 11291865 Tarix: 15.06.2026 09:35:54",
"Növü: Cari",
"Göndərən: VÖEN 1 9 0 0 0 3 9 9 7 1 \"CƏFƏR\" MƏHDUD MƏSULİYYƏTLİ CƏMİYYƏTİ",
"(elektron qaimə-fakturanı göndərən vergi ödəyicisinin VÖEN-i, tam adı)",
"Qəbul edən: VÖEN 3 1 0 3 3 9 6 0 9 1 \"KRİSTAL BAKI\" AÇIQ SƏHMDAR CƏMİYYƏTİ",
"(elektron qaimə-fakturanı qəbul edən vergi ödəyicisinin VÖEN-i, tam adı)",
"Əsas \"27.03.2024-cü il № 22 saylı Satış Müqaviləsinə əsasən \"",
"(qəbzlər, çeklər və digər ödəniş sənədləri, müqavilələr, təhvil-təslim aktları, əvvəlcədən sifariş edilmədən təqdim edilən mallar üzrə malların təhvil-qəbul aktı, malların alınması üçün vəkalətnamə və s.)",
"Əlavə qeydlər Qapı Sexi Xırdalan",
"Sıra №-",
"si",
"Malın (işin, xidmətin)",
"adı",
"Malın (işin,",
"xidmətin)",
"kodu",
"Əmtəənin",
"Qlobal",
"İdentifikasiya",
"Nömrəsi (GTİN)",
"Ölçü",
"vahidi",
"Miqdarı,",
"həcmi",
"Vahidinin satış",
"qiyməti",
"(manatla)",
"Cəmi",
"məbləği",
"(manatla)",
"Aksiz Malın (işin, xidmətin)",
"dəyəri (ƏDV-siz, manatla)",
"ƏDV məbləği",
"(manatla)",
"Yol",
"vergisi",
"(manatla)",
"Yekun məbləğ",
"(manatla)",
"6*7 dərəcəsi məbləği",
"(manatla)",
"Cəmi o cümlədən",
"12 * 0,18 6 * 0.07 11+16+17",
"8+10",
"ƏDV-yə 18",
"faiz dərəcə ilə",
"cəlb edilən",
"əməliyyatların",
"dəyəri",
"ƏDV-yə \"0\"",
"faiz dərəcə ilə",
"cəlb edilən",
"əməliyyatların",
"dəyəri",
"ƏDV-dən",
"azad",
"olunan",
"əməliyyatların",
"dəyəri",
"ƏDV-yə cəlb",
"edilməyən",
"əməliyyatların",
"dəyəri",
"1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18",
"1",
"POLİÜRETAN TİNER 12",
"LT 3814009009 ədəd 3 70 210 0 0 210 210 0 0 0 37.8 0 247.8",
"Cəmi 210 0 210 210 0 0 0 37.8 0 247.8",
"Yekun məbləğ 247 (iki yüz qırx yeddi) manat 80 (səksən) qəpik.",
"(rəqəm və yazı ilə)",
"Qeyd. Yalnız vergi ödəyiciləri tərəfindən təqdim edilə bilər. Vergi ödəyicisi kimi uçota alınmamış şəxslərə təqdim edilə bilməz. \"Təhvil verdim\" və \"Təhvil aldım\" bölmələri yalnız çap edilən zaman doldurulur."
];

function parseEQaime(lines) {
  let result = {
    series: "",
    number: "",
    date: "",
    senderName: "",
    senderVOEN: "",
    receiverName: "",
    receiverVOEN: "",
    esas: "",
    elaveQeydler: "",
    items: [],
    totalAmountNumeric: 0,
    totalAmountText: ""
  };
  
  let inTable = false;
  let pendingItemName = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lowerLine = line.toLowerCase();
    
    // Seriya, Nömrə, Tarix
    if (lowerLine.includes("seriya:") && lowerLine.includes("nömrə:") && lowerLine.includes("tarix:")) {
      const serMatch = line.match(/Seriya:\s*([\w]+)/i);
      const numMatch = line.match(/Nömrə:\s*([\w]+)/i);
      const dateMatch = line.match(/Tarix:\s*([\d.]+)/i);
      if (serMatch) result.series = serMatch[1];
      if (numMatch) result.number = numMatch[1];
      if (dateMatch) result.date = dateMatch[1];
    }
    
    // Göndərən
    if (lowerLine.includes("göndərən:")) {
      const match = line.match(/Göndərən:\s*VÖEN\s+([\d\s]+)\s+(.+)/i);
      if (match) {
        result.senderVOEN = match[1].replace(/\s+/g, '');
        result.senderName = match[2].trim().replace(/^"|"$/g, '');
      }
    }
    
    // Qəbul edən
    if (lowerLine.includes("qəbul edən:")) {
      const match = line.match(/Qəbul edən:\s*VÖEN\s+([\d\s]+)\s+(.+)/i);
      if (match) {
        result.receiverVOEN = match[1].replace(/\s+/g, '');
        result.receiverName = match[2].trim().replace(/^"|"$/g, '');
      }
    }
    
    // Əsas
    if (lowerLine.startsWith("əsas ") || lowerLine.startsWith("əsas: ")) {
       result.esas = line.substring(4).replace(/^:/, '').trim().replace(/^"|"$/g, '');
    }
    
    // Əlavə qeydlər
    if (lowerLine.startsWith("əlavə qeydlər")) {
       result.elaveQeydler = line.substring(13).replace(/^:/, '').trim();
    }
    
    // Table detection and logic
    // Table starts roughly when we see "1 2 3 4 5 6"
    if (line.match(/^1\s+2\s+3\s+4\s+5/)) {
       inTable = true;
       continue;
    }
    
    if (inTable) {
       // end of table
       if (lowerLine.startsWith("yekun məbləğ")) {
          inTable = false;
          // extract total numeric and text
          const textMatch = line.match(/Yekun məbləğ\s+([\d.,]+)\s+\((.*?)\)\s+manat\s+([\d.,]+)\s+\((.*?)\)\s+qəpik/i);
          if (textMatch) {
             result.totalAmountNumeric = parseFloat(textMatch[1]) + (parseFloat(textMatch[3]) / 100);
             result.totalAmountText = `${textMatch[1]} (${textMatch[2]}) manat ${textMatch[3]} (${textMatch[4]}) qəpik`;
          } else {
             // Fallback
             const numMatch = line.match(/[\d.,]+/);
             if (numMatch) result.totalAmountNumeric = parseFloat(numMatch[0]);
             result.totalAmountText = line.replace(/yekun məbləğ/i, '').trim();
          }
          continue;
       }
       
       if (lowerLine.startsWith("cəmi") && !lowerLine.includes("o cümlədən")) {
          continue; // skip the summary row inside table
       }
       
       // Single row item matching
       const unitRegex = /(?:ədəd|ton|kq|qram|q|m|m2|m3|komplekt|lt|litr|əd)\s+(\d+(?:[.,]\d+)?)\s+(\d+(?:[.,]\d+)?)\s+(\d+(?:[.,]\d+)?)/i;
       const unitMatch = line.match(unitRegex);
       
       if (unitMatch) {
           const nums = line.substring(unitMatch.index).match(/\b\d+(?:[.,]\d+)?\b/g);
           
           if (nums && nums.length >= 10) {
              const qty = parseFloat(nums[0].replace(',', '.'));
              const price = parseFloat(nums[1].replace(',', '.'));
              const amountWithoutVat = parseFloat(nums[2].replace(',', '.'));
              const vatAmount = parseFloat(nums[nums.length - 3].replace(',', '.'));
              const totalAmount = parseFloat(nums[nums.length - 1].replace(',', '.'));
              
              let beforeUnit = line.substring(0, unitMatch.index).trim();
              
              // Code is right before unit usually
              const wordsBeforeUnit = beforeUnit.split(" ");
              const code = wordsBeforeUnit.length > 0 ? wordsBeforeUnit.pop() : "";
              beforeUnit = wordsBeforeUnit.join(" ");
              
              let name = pendingItemName;
              if (beforeUnit) name += (name ? " " : "") + beforeUnit;
              
              name = name.replace(/^\d+\s+/, '').trim();
              
              result.items.push({
                 sequence: result.items.length + 1,
                 name: name,
                 code: code,
                 unit: unitMatch[0].split(/\s+/)[0],
                 quantity: qty,
                 price: price,
                 totalWithoutVat: amountWithoutVat,
                 vatAmount: vatAmount,
                 totalAmount: totalAmount
              });
              pendingItemName = "";
           }
       } else if (line.trim().length > 0 && !line.match(/^[\d\s]+$/)) {
           pendingItemName += (pendingItemName ? " " : "") + line.trim();
       } else {
           pendingItemName = "";
       }
    }
  }

  return result;
}

console.log(JSON.stringify(parseEQaime(lines), null, 2));
