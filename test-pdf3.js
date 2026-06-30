import { PDFParse } from "pdf-parse";

async function run() {
  try {
    const parser = new PDFParse({ data: Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>\nendobj\n4 0 obj\n<< /Length 21 >>\nstream\nBT\n/F1 24 Tf\n100 100 Td\n(Hello) Tj\nET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000214 00000 n \ntrailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n286\n%%EOF', 'utf8') });
    
    // Also try to read it
    const textData = await parser.getText();
    console.log("TEXT:", textData.text);
    
    await parser.destroy();
  } catch (err) {
    console.error("Error:", err);
  }
}
run();
