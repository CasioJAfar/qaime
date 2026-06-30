import pdfplumber
import re
import json
import os

# Qaimələri yadda saxlamaq üçün mock-database (lokal JSON faylı)
DB_FILE = 'saved_invoices.json'

def load_db():
    if os.path.exists(DB_FILE):
        with open(DB_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return []

def save_db(data):
    with open(DB_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=4)

def extract_invoice_data(pdf_path):
    data = {
        "invoice_series": "",
        "invoice_number": "",
        "date": "",
        "esas": "",
        "elave_qeydler": "",
        "gonderen_voen": "",
        "gonderen_ad": "",
        "qabul_edan_voen": "",
        "qabul_edan_ad": "",
        "items": [],
        "total_amount": ""
    }

    try:
        with pdfplumber.open(pdf_path) as pdf:
            text = ""
            for page in pdf.pages:
                text += page.extract_text() + "\n"
            
            lines = text.split('\n')
            
            for i, line in enumerate(lines):
                # 1. Qaimə Seriyası və Nömrəsi
                # Məsələn: Seriya: MT2606 Nömrə: 11291865
                if "Seriya" in line and "Nömrə" in line:
                    match = re.search(r"Seriya[\s:]*([A-Za-z0-9-]+).*?N[öo]mr[əe][\s:]*([A-Za-z0-9-]+)", line, re.IGNORECASE)
                    if match:
                        data["invoice_series"] = match.group(1)
                        data["invoice_number"] = match.group(2)
                elif "Nömrə" in line and not data["invoice_number"]:
                    match = re.search(r"N[öo]mr[əe][\s:]*([A-Za-z0-9-]+)", line, re.IGNORECASE)
                    if match:
                        data["invoice_number"] = match.group(1)

                # Tarix
                date_match = re.search(r"Tarix(?:i|)[\s:]*([\d.]+)", line, re.IGNORECASE)
                if date_match and not data["date"]:
                    data["date"] = date_match.group(1)

                # Əsas
                if line.lower().startswith("əsas"):
                    data["esas"] = line[4:].strip(": ").strip()

                # Əlavə qeydlər
                if line.lower().startswith("əlavə qeydlər"):
                    data["elave_qeydler"] = line[13:].strip(": ").strip()

                # 2. Göndərən VÖEN və Ad
                if "göndərən" in line.lower() or "gönderen" in line.lower():
                    # Format: Göndərən: VÖEN 1900039971 "CƏFƏR" MMC
                    match = re.search(r"(?:Göndərən|Gönderen)[\s:]*(?:V[ÖO]EN[\s:]*)?(\d{5,15})[\s-]+(.+)", line, re.IGNORECASE)
                    if match:
                        data["gonderen_voen"] = match.group(1).strip()
                        raw_name = match.group(2).strip().strip('"')
                        data["gonderen_ad"] = re.sub(r'\d+', '', raw_name).strip()

                # Qəbul edən VÖEN və Ad
                if "qəbul edən" in line.lower() or "alıcı" in line.lower():
                    match = re.search(r"(?:Qəbul edən|Alıcı)[\s:]*(?:V[ÖO]EN[\s:]*)?(\d{5,15})[\s-]+(.+)", line, re.IGNORECASE)
                    if match:
                        data["qabul_edan_voen"] = match.group(1).strip()
                        raw_name = match.group(2).strip().strip('"')
                        data["qabul_edan_ad"] = re.sub(r'\d+', '', raw_name).strip()

            # 3. Cədvəl Məlumatları (pdfplumber's extract_tables)
            tables = pdf.pages[0].extract_tables()
            if tables:
                for table in tables:
                    for row in table:
                        # Boş sətirləri keçirik
                        if not row or not any(row): continue
                        
                        # Cəmi Yekun Məbləğ yoxlanışı (Cədvəlin ən alt hissəsi)
                        row_text = " ".join([str(cell) for cell in row if cell]).lower()
                        if "yekun" in row_text or "cəmi" in row_text:
                            # Sonuncu sütunlarda adətən məbləğ olur
                            for cell in reversed(row):
                                if cell and re.search(r'\d', str(cell)):
                                    data["total_amount"] = str(cell).strip()
                                    break
                            continue

                        # Başlıq sətirlərini keçirik
                        if "Malın adı" in str(row[1]) or "Sıra" in str(row[0]):
                            continue

                        # Məlumat sətri olduğunu yoxlayırıq (Sıra nömrəsi rəqəmdirsə)
                        if row[0] and str(row[0]).strip().isdigit():
                            item = {
                                "sira_nomresi": row[0],
                                "malin_adi": row[1] if len(row) > 1 else "",
                                "malin_kodu": row[2] if len(row) > 2 else "",
                                "olcu_vahidi": row[3] if len(row) > 3 else "",
                                "miqdari": row[4] if len(row) > 4 else "",
                                "satis_qiymeti": row[5] if len(row) > 5 else "",
                                "cemi_mebleg_edvsiz": row[6] if len(row) > 6 else "",
                                "edv_meblegi": row[7] if len(row) > 7 else "",
                                "yekun_mebleg": row[8] if len(row) > 8 else ""
                            }
                            data["items"].append(item)

    except Exception as e:
         print(f"Xəta baş verdi: {e}")
         return None

    return data

def main():
    # Nümunə olaraq fayl adı
    pdf_path = input("PDF faylının yolunu daxil edin (məs: qaime.pdf): ")
    
    if not os.path.exists(pdf_path):
        print("Fayl tapılmadı!")
        return

    extracted_data = extract_invoice_data(pdf_path)
    
    if not extracted_data:
        print("Məlumat oxuna bilmədi.")
        return

    print("\n--- Çıxarılan Məlumatlar ---")
    print(json.dumps(extracted_data, ensure_ascii=False, indent=4))
    print("----------------------------\n")

    # 4. Təkrar Qaimə Yoxlanışı (Duplicate Check)
    saved_invoices = load_db()
    invoice_number = extracted_data.get("invoice_number")
    
    if invoice_number:
        is_duplicate = any(inv.get("invoice_number") == invoice_number for inv in saved_invoices)
        
        if is_duplicate:
            print(f"Bu qaimə (Nömrə: {invoice_number}) artıq sistemdə var.")
            choice = input("Yenə də əlavə etmək istəyirsiniz? (Hə/Yox): ").strip().lower()
            if choice not in ['hə', 'he', 'h', 'y', 'yes']:
                print("Əməliyyat ləğv edildi.")
                return
        
        saved_invoices.append(extracted_data)
        save_db(saved_invoices)
        print("Qaimə uğurla yadda saxlanıldı (saved_invoices.json).")
    else:
        print("Qaimə nömrəsi tapılmadı, yadda saxlanılmadı.")

if __name__ == "__main__":
    main()
