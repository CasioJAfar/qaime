import React, { useState, useRef } from "react";
import { 
  Upload, 
  Plus, 
  Search, 
  Trash2, 
  FileText, 
  X, 
  Calendar, 
  CheckCircle, 
  Eye, 
  AlertCircle,
  TrendingUp,
  FileSpreadsheet
} from "lucide-react";
import { Invoice, InvoiceItem, Customer } from "../types";

interface InvoicesViewProps {
  invoices: Invoice[];
  customers?: Customer[];
  loading: boolean;
  onInvoiceCreated: () => void;
  onSelectInvoice: (invoice: Invoice) => void;
  selectedInvoice: Invoice | null;
  setSelectedInvoice: (invoice: Invoice | null) => void;
  showToast?: (message: string, type?: "success" | "error" | "info") => void;
  currency?: string;
}

export default function InvoicesView({ 
  invoices, 
  customers = [],
  loading: parentLoading, 
  onInvoiceCreated, 
  onSelectInvoice,
  selectedInvoice,
  setSelectedInvoice,
  showToast,
  currency = "AZN"
}: InvoicesViewProps) {
  const [search, setSearch] = useState("");
  const savedUser = localStorage.getItem("erp_user");
  const isAdmin = savedUser ? JSON.parse(savedUser).role === "admin" : false;
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadSuccessMsg, setUploadSuccessMsg] = useState<string | null>(null);

  // Status Filter State (all / unpaid / paid)
  const [statusFilter, setStatusFilter] = useState<"all" | "unpaid" | "paid">("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Custom inline deletion confirmation state
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // PDF Review & Confirm-Before-Save workflow state
  const [pendingInvoiceConfirm, setPendingInvoiceConfirm] = useState<{
    invoiceNumber: string;
    customerName: string;
    customerCode?: string;
    invoiceDate: string;
    totalAmount: number;
    items: InvoiceItem[];
    isDemoFallback?: boolean;
    isDeterministic?: boolean;
    fileName?: string;
    sourceFile?: string;
    sourceFileType?: string;
  } | null>(null);
  const [confirmSaveChecked, setConfirmSaveChecked] = useState<boolean>(false);

  // Manual Creation State
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualCustomer, setManualCustomer] = useState("");
  const [manualCustomerCode, setManualCustomerCode] = useState("");
  const [manualInvoiceNo, setManualInvoiceNo] = useState("");
  const [manualDate, setManualDate] = useState(new Date().toISOString().split("T")[0]);
  const [manualItems, setManualItems] = useState<InvoiceItem[]>([
    { name: "", quantity: 1, price: 0, total: 0 }
  ]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter invoices based on search terms, tab selection and date range
  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = 
      inv.customerName.toLowerCase().includes(search.toLowerCase()) ||
      inv.invoiceNumber.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;

    if (statusFilter === "unpaid") {
      if (inv.status === "paid") return false;
    }
    if (statusFilter === "paid") {
      if (inv.status !== "paid") return false;
    }

    if (startDate && inv.invoiceDate && inv.invoiceDate < startDate) {
      return false;
    }
    if (endDate && inv.invoiceDate && inv.invoiceDate > endDate) {
      return false;
    }

    return true;
  });

  // Format currency
  const formatAZN = (val: number) => {
    return new Intl.NumberFormat("az-AZ", { style: "currency", currency }).format(val);
  };

  const [payingInvoiceId, setPayingInvoiceId] = useState<string | null>(null);

  const handlePayInvoice = async (invoice: Invoice) => {
    if (!invoice) return;
    setPayingInvoiceId(invoice.id);
    try {
      // Find customer whose name matches invoice.customerName
      const customer = customers.find(
        c => c.name.toLowerCase().trim() === invoice.customerName.toLowerCase().trim()
      );

      let customerId = customer?.id;

      // If customer doesn't exist, create customer first
      if (!customerId) {
        const custRes = await fetch("/api/customers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: invoice.customerName })
        });
        if (!custRes.ok) {
          throw new Error("Müştəri profili yaradıla bilmədi.");
        }
        const newCust = await custRes.json();
        customerId = newCust.id;
      }

      // Record payment
      const payRes = await fetch(`/api/customers/${customerId}/payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: invoice.totalAmount,
          paymentDate: new Date().toISOString().split("T")[0],
          note: `QM ${invoice.invoiceNumber} nömrəli qaimə üzrə ödəniş`,
          invoiceId: invoice.id
        })
      });

      if (!payRes.ok) {
        throw new Error("Ödəniş qeyd edilərkən xəta baş verdi.");
      }

      // Refresh data
      onInvoiceCreated();
      
      if (showToast) {
        showToast(`QM ${invoice.invoiceNumber} nömrəli qaimə üzrə ödəniş uğurla qeyd edildi!`, "success");
      }
      
      // Update locally selected invoice status so UI immediately updates
      setSelectedInvoice({
        ...invoice,
        status: "paid"
      });
      
    } catch (err: any) {
      alert(err.message || "Ödəniş qeydiyyatı uğursuz oldu.");
    } finally {
      setPayingInvoiceId(null);
    }
  };

  const handleOpenPDF = (invoice: Invoice) => {
    if (invoice.sourceFile) {
      const dataUri = invoice.sourceFile.startsWith("data:") 
        ? invoice.sourceFile 
        : `data:${invoice.sourceFileType || "application/pdf"};base64,${invoice.sourceFile}`;
      const newTab = window.open();
      if (newTab) {
        newTab.document.write(
          `<iframe src="${dataUri}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`
        );
      }
    } else {
      const newTab = window.open();
      if (newTab) {
        const itemsHtml = (invoice.items || []).map(item => `
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 13px;">${item.name || "Məhsul/Xidmət"}</td>
            <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 13px; text-align: right; font-family: monospace;">${item.quantity || 1}</td>
            <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 13px; text-align: right; font-family: monospace;">${formatAZN(item.price || 0)}</td>
            <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 13px; text-align: right; font-family: monospace; font-weight: bold;">${formatAZN(item.total || 0)}</td>
          </tr>
        `).join("");

        const formattedDate = invoice.invoiceDate;
        const totalTax = (invoice.totalAmount * 0.18) / 1.18;
        const baseAmount = invoice.totalAmount / 1.18;

        newTab.document.write(`
          <html>
            <head>
              <title>QM ${invoice.invoiceNumber} - Elektron Qaimə</title>
              <style>
                body { font-family: 'Inter', system-ui, sans-serif; color: #1e293b; padding: 40px; background: #f8fafc; margin: 0; }
                .card { max-width: 800px; margin: 0 auto; background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); }
                .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #f1f5f9; padding-bottom: 20px; }
                .logo-section h1 { margin: 0; font-size: 24px; color: #4f46e5; font-weight: 800; letter-spacing: -0.05em; }
                .logo-section p { margin: 4px 0 0 0; font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase; }
                .inv-meta { text-align: right; }
                .inv-meta h2 { margin: 0; font-size: 20px; color: #0f172a; font-weight: 700; }
                .inv-meta p { margin: 4px 0 0 0; font-size: 13px; color: #64748b; }
                .details { display: flex; justify-content: space-between; margin-top: 30px; }
                .details-col h3 { font-size: 11px; text-transform: uppercase; color: #94a3b8; margin: 0 0 8px 0; letter-spacing: 0.05em; font-weight: 700; }
                .details-col p { margin: 0; font-size: 14px; font-weight: 600; color: #334155; }
                .table-section { margin-top: 40px; }
                table { width: 100%; border-collapse: collapse; }
                th { background: #f8fafc; padding: 12px 10px; text-align: left; font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; border-bottom: 2px solid #e2e8f0; }
                .summary-section { display: flex; justify-content: flex-end; margin-top: 30px; }
                .summary-card { width: 300px; background: #f8fafc; border-radius: 8px; padding: 20px; border: 1px solid #f1f5f9; }
                .summary-row { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 8px; }
                .summary-row:last-child { margin-bottom: 0; padding-top: 8px; border-top: 1px solid #e2e8f0; font-weight: bold; font-size: 14px; color: #4f46e5; }
                .footer { text-align: center; margin-top: 50px; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 20px; }
                .badge { display: inline-block; padding: 3px 8px; font-size: 10px; font-weight: bold; text-transform: uppercase; border-radius: 4px; border: 1px solid; }
                .badge-paid { background: #ecfdf5; color: #047857; border-color: #a7f3d0; }
                .badge-unpaid { background: #fffbeb; color: #b45309; border-color: #fde68a; }
              </style>
            </head>
            <body>
              <div class="card">
                <div class="header">
                  <div class="logo-section">
                    <h1>Mədaxil ERP</h1>
                    <p>Elektron Qaimə Faktura</p>
                  </div>
                  <div class="inv-meta">
                    <h2>QM ${invoice.invoiceNumber}</h2>
                    <p>Tarix: ${formattedDate}</p>
                    <div style="margin-top: 10px;">
                      <span class="badge ${invoice.status === "paid" ? "badge-paid" : "badge-unpaid"}">
                        ${invoice.status === "paid" ? "ÖDƏNİLİB" : "GÖZLƏYİR"}
                      </span>
                    </div>
                  </div>
                </div>

                <div class="details">
                  <div class="details-col">
                    <h3>Qaiməni Göndərən</h3>
                    <p>Mədaxil ERP Sistemi</p>
                    <p style="font-weight: normal; font-size: 12px; color: #64748b; margin-top: 4px;">Bakı, Azərbaycan</p>
                  </div>
                  <div class="details-col" style="text-align: right;">
                    <h3>Qəbul Edən Müştəri</h3>
                    <p>${invoice.customerName}</p>
                  </div>
                </div>

                <div class="table-section">
                  <table>
                    <thead>
                      <tr>
                        <th>Məhsul / Xidmət Adı</th>
                        <th style="text-align: right;">Miqdar</th>
                        <th style="text-align: right;">Qiymət</th>
                        <th style="text-align: right;">Cəmi</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${itemsHtml}
                    </tbody>
                  </table>
                </div>

                <div class="summary-section">
                  <div class="summary-card">
                    <div class="summary-row">
                      <span>Əsas Məbləğ:</span>
                      <span style="font-family: monospace;">${formatAZN(baseAmount)}</span>
                    </div>
                    <div class="summary-row" style="color: #d97706;">
                      <span>ƏDV (18%):</span>
                      <span style="font-family: monospace;">${formatAZN(totalTax)}</span>
                    </div>
                    <div class="summary-row">
                      <span>Yekun Məbləğ:</span>
                      <span style="font-family: monospace;">${formatAZN(invoice.totalAmount)}</span>
                    </div>
                  </div>
                </div>

                <div class="footer">
                  Bu sənəd Mədaxil ERP sistemində avtomatik yaradılmışdır.
                </div>
              </div>
            </body>
          </html>
        `);
      }
    }
  };

  // Convert File to Base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = reader.result as string;
        // Strip out the metadata prefix to get raw base64 data
        const rawBase64 = base64String.split(",")[1];
        resolve(rawBase64);
      };
      reader.onerror = error => reject(error);
    });
  };

  // Handle File Upload & Gemini API trigger
  const handleFileUpload = async (file: File) => {
    if (!file) return;

    // Check if valid extension
    const allowedTypes = [
      "application/pdf", 
      "image/png", 
      "image/jpeg", 
      "image/jpg",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "text/csv"
    ];

    if (!allowedTypes.includes(file.type) && !file.name.endsWith(".xlsx") && !file.name.endsWith(".xls") && !file.name.endsWith(".csv")) {
      setUploadError("Yalnız PDF, Excel (.xlsx, .xls) və şəkil formatları qəbul edilir.");
      return;
    }

    setUploading(true);
    setUploadError(null);
    setUploadSuccessMsg(null);

    try {
      const base64Data = await fileToBase64(file);
      const mimeType = file.type || "application/octet-stream";

      const res = await fetch("/api/invoices/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          base64Data,
          fileName: file.name,
          mimeType
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Fayl oxunmasında xəta baş verdi.");
      }

      // Store parsed result for manual review and confirmation
      const { extractedData, isDemoFallback, isDeterministic } = data;
      
      setPendingInvoiceConfirm({
        invoiceNumber: extractedData.invoiceNumber || `QM-${Math.floor(100000 + Math.random() * 900000)}`,
        customerName: extractedData.customerName || "Naməlum Müştəri",
        customerCode: extractedData.receiverVOEN || extractedData.customerCode || "",
        invoiceDate: extractedData.invoiceDate || new Date().toISOString().split('T')[0],
        totalAmount: Number(extractedData.totalAmount) || 0,
        items: extractedData.items || [],
        isDemoFallback,
        isDeterministic,
        fileName: file.name,
        sourceFile: base64Data,
        sourceFileType: mimeType
      });
      setConfirmSaveChecked(false);
      
    } catch (err: any) {
      console.error(err);
      setUploadError(err.message || "Faylın analizi zamanı xəta baş verdi.");
    } finally {
      setUploading(false);
    }
  };

  const handleConfirmSaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingInvoiceConfirm) return;
    if (!confirmSaveChecked) {
      alert("Zəhmət olmasa məlumatların sistemə yazılmasını təsdiq etmək üçün quş qoyun (işarələyin).");
      return;
    }

    setUploading(true);
    setUploadError(null);
    setUploadSuccessMsg(null);

    try {
      const saveRes = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceNumber: pendingInvoiceConfirm.invoiceNumber,
          customerName: pendingInvoiceConfirm.customerName,
          customerCode: pendingInvoiceConfirm.customerCode,
          invoiceDate: pendingInvoiceConfirm.invoiceDate,
          totalAmount: pendingInvoiceConfirm.totalAmount,
          items: pendingInvoiceConfirm.items,
          sourceFile: pendingInvoiceConfirm.sourceFile,
          sourceFileType: pendingInvoiceConfirm.sourceFileType
        })
      });

      if (!saveRes.ok) {
        throw new Error("Məlumatlar yaddaşa verilərkən xəta baş verdi.");
      }

      const savedInvoice = await saveRes.json();
      
      setUploadSuccessMsg(
        pendingInvoiceConfirm.isDemoFallback 
          ? `Sənəd simulyasiya edildi və sistemə uğurla yazıldı: Müştəri - ${pendingInvoiceConfirm.customerName}, Məbləğ - ${formatAZN(pendingInvoiceConfirm.totalAmount)}`
          : `Məlumat uğurla təsdiqləndi və sistemə yazıldı: Müştəri - ${pendingInvoiceConfirm.customerName}, Məbləğ - ${formatAZN(pendingInvoiceConfirm.totalAmount)}`
      );
      
      setPendingInvoiceConfirm(null);
      onInvoiceCreated();
      onSelectInvoice(savedInvoice);

    } catch (err: any) {
      console.error(err);
      setUploadError(err.message || "Məlumatların qeydə alınmasında xəta baş verdi.");
    } finally {
      setUploading(false);
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const onDragLeave = () => {
    setIsDragOver(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleManualItemChange = (idx: number, field: keyof InvoiceItem, value: any) => {
    const updated = [...manualItems];
    updated[idx] = {
      ...updated[idx],
      [field]: value
    };
    
    // Auto calculate row total
    if (field === "quantity" || field === "price") {
      const q = field === "quantity" ? Number(value) : Number(updated[idx].quantity);
      const p = field === "price" ? Number(value) : Number(updated[idx].price);
      updated[idx].total = q * p;
    }
    setManualItems(updated);
  };

  const addManualItemRow = () => {
    setManualItems([...manualItems, { name: "", quantity: 1, price: 0, total: 0 }]);
  };

  const removeManualItemRow = (idx: number) => {
    if (manualItems.length === 1) return;
    setManualItems(manualItems.filter((_, i) => i !== idx));
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCustomer) {
      alert("Müştəri adı vacibdir.");
      return;
    }

    const totalAmount = manualItems.reduce((sum, item) => sum + item.total, 0);

    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceNumber: manualInvoiceNo || `QM-${Math.floor(100000 + Math.random() * 900000)}`,
          customerName: manualCustomer,
          customerCode: manualCustomerCode,
          invoiceDate: manualDate,
          totalAmount,
          items: manualItems
        })
      });

      if (!res.ok) throw new Error("Qaimə əlavə edilmədi.");
      
      setShowManualModal(false);
      // Reset form
      setManualCustomer("");
      setManualCustomerCode("");
      setManualInvoiceNo("");
      setManualDate(new Date().toISOString().split("T")[0]);
      setManualItems([{ name: "", quantity: 1, price: 0, total: 0 }]);
      
      onInvoiceCreated();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteInvoice = async (id: string) => {
    try {
      const res = await fetch(`/api/invoices/${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        if (selectedInvoice?.id === id) {
          setSelectedInvoice(null);
        }
        if (showToast) {
          showToast("Qaimə uğurla silindi!", "success");
        }
        onInvoiceCreated();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex-1 flex overflow-hidden bg-[#F8FAFC]">
      {/* Main List Section */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-8 flex flex-col space-y-6 w-full max-w-full">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 shrink-0">
          <div>
            <h2 className="text-xl font-semibold text-slate-800 tracking-tight">Qaimə Sənədləri</h2>
            <p className="text-xs text-slate-500">PDF, Excel və Şəkillərdən AI ilə avtomatik məlumat oxuyan sistem.</p>
          </div>
          <button 
            onClick={() => setShowManualModal(true)}
            className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition cursor-pointer self-start md:self-auto shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>Əl ilə Qaimə Yaz</span>
          </button>
        </div>

        {/* Upload Container */}
        <div 
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative border border-dashed rounded-xl p-4 md:p-6 flex flex-col items-center justify-center text-center transition duration-200 ${
            isDragOver 
              ? "border-indigo-500 bg-indigo-50/50 cursor-pointer" 
              : "border-slate-300 hover:border-slate-400 bg-white cursor-pointer"
          }`}
        >
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={(e) => e.target.files && handleFileUpload(e.target.files[0])}
            className="hidden" 
            accept=".pdf,.png,.jpg,.jpeg,.xlsx,.xls,.csv"
          />

          <div className="flex flex-col sm:flex-row items-center sm:space-x-4 space-y-3 sm:space-y-0 text-center sm:text-left justify-center w-full">
            <div className="p-2.5 rounded-full border shrink-0 bg-indigo-50 text-indigo-600 border-indigo-100">
              <Upload className="w-5 h-5 md:w-6 md:h-6" />
            </div>

            <div>
              <p className="text-slate-800 text-xs md:text-sm font-semibold mb-0.5">
                Qaimə sənədini bura sürükləyin və ya <span className="text-indigo-600 underline">cihazdan seçin</span>
              </p>
              <p className="text-slate-400 text-[10px]">
                PDF, PNG, JPEG, Excel (.xlsx, .xls) faylları qəbul edilir. Maksimum 50 MB.
              </p>
            </div>
          </div>

          {uploading && (
            <div className="absolute inset-0 bg-white/95 backdrop-blur-xs flex flex-col items-center justify-center rounded-xl space-y-2 z-10">
              <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-slate-800 font-bold text-sm">Sənəddən Məlumat Çıxarılır...</p>
              <p className="text-slate-500 text-[11px] px-6 leading-relaxed max-w-md">
                Gemini AI qaimə mətnini, müştəri adını, tarixi, məbləği və məhsul sətirlərini avtomatik təhlil edir.
              </p>
            </div>
          )}
        </div>

        {/* Alerts */}
        {uploadError && (
          <div className="bg-rose-50 border border-rose-100 p-3.5 rounded-lg flex items-start space-x-2.5 text-rose-700">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="text-xs">
              <strong className="font-bold uppercase tracking-wider">Fayl oxunmasında xəta:</strong> {uploadError}
            </div>
          </div>
        )}

        {uploadSuccessMsg && (
          <div className="bg-emerald-50 border border-emerald-100 p-3.5 rounded-lg flex items-start space-x-2.5 text-emerald-700">
            <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="text-xs">
              <strong className="font-bold uppercase tracking-wider">Mükəmməl!</strong> {uploadSuccessMsg}
            </div>
          </div>
        )}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 md:p-5 space-y-4 md:flex-1 md:flex md:flex-col md:overflow-hidden md:min-h-[350px]">
          {/* Filter Bar */}
          <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 shrink-0">
            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input 
                  type="text" 
                  placeholder="Müştəri adı və ya qaimə nömrəsi ilə axtar..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-4 py-2 text-xs text-slate-900 focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              {/* Tarix Aralığı Filtrləri */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 mr-1.5 shrink-0" />
                  <span className="text-slate-400 mr-1 text-[10px] font-bold uppercase whitespace-nowrap">Başlanğıc:</span>
                  <input 
                    type="date" 
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="bg-transparent border-none text-slate-750 focus:ring-0 focus:outline-hidden text-xs p-0 h-auto"
                  />
                </div>
                <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 mr-1.5 shrink-0" />
                  <span className="text-slate-400 mr-1 text-[10px] font-bold uppercase whitespace-nowrap">Son:</span>
                  <input 
                    type="date" 
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="bg-transparent border-none text-slate-750 focus:ring-0 focus:outline-hidden text-xs p-0 h-auto"
                  />
                </div>
                {(startDate || endDate) && (
                  <button 
                    onClick={() => { setStartDate(""); setEndDate(""); }}
                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 transition text-[10px] font-bold cursor-pointer flex items-center gap-1 shrink-0"
                    title="Filtrləri Təmizlə"
                  >
                    <X className="w-3 h-3" />
                    <span>Təmizlə</span>
                  </button>
                )}
              </div>
            </div>
            
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              Ümumi: <span className="font-bold text-slate-950">{filteredInvoices.length}</span> qaimə tapıldı
            </div>
          </div>

          {/* Status Tab Filters */}
          <div className="flex border-b border-slate-100 pb-1 shrink-0 gap-6">
            <button 
              onClick={() => setStatusFilter("all")}
              className={`pb-2 px-1 text-xs font-semibold border-b-2 transition cursor-pointer ${
                statusFilter === "all" 
                  ? "border-indigo-600 text-indigo-600 font-bold" 
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              Cəmi ({invoices.length})
            </button>
            <button 
              onClick={() => setStatusFilter("unpaid")}
              className={`pb-2 px-1 text-xs font-semibold border-b-2 transition cursor-pointer ${
                statusFilter === "unpaid" 
                  ? "border-amber-500 text-amber-600 font-bold" 
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              Ödənişi Gözləyənlər ({invoices.filter(i => i.status !== "paid").length})
            </button>
            <button 
              onClick={() => setStatusFilter("paid")}
              className={`pb-2 px-1 text-xs font-semibold border-b-2 transition cursor-pointer ${
                statusFilter === "paid" 
                  ? "border-emerald-500 text-emerald-600 font-bold" 
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              Ödənişi Olunmuşlar ({invoices.filter(i => i.status === "paid").length})
            </button>
          </div>

          {/* Table Container */}
          <div className="md:flex-1 md:overflow-y-auto">
            {/* Desktop Table View */}
            <div className="hidden md:block">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 text-[10px] text-slate-500 uppercase tracking-[0.1em] border-b border-slate-200">
                    <th className="px-6 py-4 font-semibold">Qaimə No</th>
                    <th className="px-6 py-4 font-semibold">Müştəri adı</th>
                    <th className="px-6 py-4 font-semibold">Tarix</th>
                    <th className="px-4 py-4 font-semibold text-right">Əsas Məbləğ</th>
                    <th className="px-4 py-4 font-semibold text-right">ƏDV (18%)</th>
                    <th className="px-4 py-4 font-semibold text-right">Yekun Məbləğ</th>
                    <th className="px-4 py-4 font-semibold text-center">Növ</th>
                    <th className="px-6 py-4 font-semibold text-right">Fəaliyyət</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredInvoices.map((inv) => (
                    <tr 
                      key={inv.id} 
                      onClick={() => onSelectInvoice(inv)}
                      className={`hover:bg-indigo-50/30 transition duration-150 cursor-pointer ${
                        selectedInvoice?.id === inv.id ? "bg-indigo-50/40" : ""
                      }`}
                    >
                      <td className="px-6 py-3.5 font-mono font-bold text-slate-900 text-sm">{inv.invoiceNumber}</td>
                      <td className="px-6 py-3.5">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-700 text-sm">{inv.customerName}</span>
                          {inv.customerCode && (
                            <span className="text-[10px] text-slate-500 font-mono mt-0.5">{inv.customerCode}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-3.5 text-xs text-slate-500">{inv.invoiceDate}</td>
                      <td className="px-4 py-3.5 text-right font-mono font-semibold text-slate-600 text-xs">{formatAZN(inv.totalAmount / 1.18)}</td>
                      <td className="px-4 py-3.5 text-right font-mono font-semibold text-amber-600 text-xs">{formatAZN((inv.totalAmount * 0.18) / 1.18)}</td>
                      <td className="px-4 py-3.5 text-right font-mono font-bold text-indigo-600 text-sm">{formatAZN(inv.totalAmount)}</td>
                      <td className="px-4 py-3.5 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          inv.sourceFile ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-blue-50 text-blue-700 border border-blue-100"
                        }`}>
                          {inv.sourceFile ? "Sənəd" : "Manual"}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          {deleteConfirmId === inv.id ? (
                            <div className="flex items-center space-x-1" onClick={(e) => e.stopPropagation()}>
                              <button 
                                onClick={() => {
                                  handleDeleteInvoice(inv.id);
                                  setDeleteConfirmId(null);
                                }}
                                className="px-2 py-1 text-[10px] font-bold uppercase rounded bg-rose-600 hover:bg-rose-700 text-white transition cursor-pointer"
                              >
                                Təsdiq
                              </button>
                              <button 
                                onClick={() => setDeleteConfirmId(null)}
                                className="px-2 py-1 text-[10px] font-bold uppercase rounded bg-slate-100 text-slate-600 hover:bg-slate-200 transition cursor-pointer"
                              >
                                Ləğv
                              </button>
                            </div>
                          ) : (
                            <>
                              <button 
                                onClick={(e) => { e.stopPropagation(); onSelectInvoice(inv); }}
                                className="p-1 rounded bg-slate-50 hover:bg-slate-150 border border-slate-200 text-slate-600 transition cursor-pointer"
                                title="Detallara Bax"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleOpenPDF(inv); }}
                                className="px-2 py-1 text-[10px] font-bold uppercase rounded bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 transition cursor-pointer flex items-center space-x-1"
                                title="PDF-i Aç"
                              >
                                <FileText className="w-3.5 h-3.5" />
                                <span>PDF-i Aç</span>
                              </button>
                              {isAdmin && (
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeleteConfirmId(inv.id);
                                  }}
                                  className="p-1 rounded bg-slate-50 hover:bg-rose-50 border border-slate-200 hover:border-rose-100 text-slate-600 hover:text-rose-600 transition cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredInvoices.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400 font-medium">
                        Heç bir qaimə tapılmadı. Yeni sənəd yükləyin və ya manual yaradın.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View (Fits perfectly, no horizontal scrolling) */}
            <div className="block md:hidden space-y-3">
              {filteredInvoices.map((inv) => (
                <div 
                  key={inv.id}
                  onClick={() => onSelectInvoice(inv)}
                  className={`bg-slate-50 p-4 rounded-xl border transition-all duration-150 cursor-pointer ${
                    selectedInvoice?.id === inv.id ? "border-indigo-500 bg-indigo-50/20 shadow-xs" : "border-slate-150 hover:border-slate-200"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono font-bold text-slate-900 text-sm">{inv.invoiceNumber}</span>
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                      inv.sourceFile ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-blue-50 text-blue-700 border border-blue-100"
                    }`}>
                      {inv.sourceFile ? "Sənəd" : "Manual"}
                    </span>
                  </div>

                  <div className="space-y-1 mb-3">
                    <div className="flex justify-between text-xs gap-2">
                      <span className="text-slate-400 font-medium shrink-0">Müştəri:</span>
                      <div className="flex flex-col text-right">
                        <span className="font-semibold text-slate-800 truncate" title={inv.customerName}>{inv.customerName}</span>
                        {inv.customerCode && (
                          <span className="text-[10px] text-slate-500 font-mono mt-0.5">{inv.customerCode}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400 font-medium">Tarix:</span>
                      <span className="text-slate-600">{inv.invoiceDate}</span>
                    </div>
                    <div className="flex justify-between text-xs pt-1 border-t border-dashed border-slate-250">
                      <span className="text-slate-500 font-bold">Yekun Məbləğ:</span>
                      <span className="font-mono font-bold text-indigo-650 text-sm">{formatAZN(inv.totalAmount)}</span>
                    </div>
                  </div>

                  {/* Actions for Mobile */}
                  <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-150" onClick={(e) => e.stopPropagation()}>
                    {deleteConfirmId === inv.id ? (
                      <div className="flex items-center space-x-1.5 w-full justify-between">
                        <span className="text-[10px] text-rose-600 font-bold uppercase">Silinsin?</span>
                        <div className="flex space-x-1">
                          <button 
                            onClick={() => {
                              handleDeleteInvoice(inv.id);
                              setDeleteConfirmId(null);
                            }}
                            className="px-2.5 py-1 text-[10px] font-bold uppercase rounded bg-rose-600 text-white transition cursor-pointer"
                          >
                            Bəli, Sil
                          </button>
                          <button 
                            onClick={() => setDeleteConfirmId(null)}
                            className="px-2.5 py-1 text-[10px] font-bold uppercase rounded bg-slate-200 text-slate-600 transition cursor-pointer"
                          >
                            X
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <button 
                          onClick={() => onSelectInvoice(inv)}
                          className="flex-1 py-1.5 px-3 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-bold transition cursor-pointer flex items-center justify-center space-x-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Bax</span>
                        </button>
                        <button 
                          onClick={() => handleOpenPDF(inv)}
                          className="flex-1 py-1.5 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold transition cursor-pointer flex items-center justify-center space-x-1"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>PDF</span>
                        </button>
                        {isAdmin && (
                          <button 
                            onClick={() => setDeleteConfirmId(inv.id)}
                            className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
              {filteredInvoices.length === 0 && (
                <div className="py-12 text-center text-slate-400 font-medium text-xs bg-slate-50 rounded-xl border border-slate-200">
                  Heç bir qaimə tapılmadı. Yeni sənəd yükləyin və ya manual yaradın.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Slide-out Panel: Invoice Detail (Azerbaijani style ERP) */}
      {selectedInvoice && (
        <>
          {/* Backdrop only on mobile */}
          <div 
            className="md:hidden fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-45"
            onClick={() => setSelectedInvoice(null)}
          ></div>

          <div className="w-full max-w-md md:w-96 bg-white border-l border-slate-200 shadow-2xl flex flex-col h-full shrink-0 fixed md:static right-0 top-0 bottom-0 z-50 animate-in slide-in-from-right duration-200">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <div>
              <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded uppercase tracking-wider">
                Qaimə Detalları
              </span>
              <h3 className="text-base font-bold font-display text-slate-900 mt-2">
                {selectedInvoice.invoiceNumber}
              </h3>
            </div>
            <button 
              onClick={() => setSelectedInvoice(null)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* Info rows */}
            <div className="space-y-3">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-0.5">Qəbul Edən Müştəri</span>
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-slate-800">{selectedInvoice.customerName}</span>
                  {selectedInvoice.customerCode && (
                    <span className="text-[10px] text-slate-500 font-mono mt-0.5">{selectedInvoice.customerCode}</span>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-0.5">Qaimə Tarixi</span>
                  <span className="text-xs font-semibold text-slate-600 flex items-center mt-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 mr-1.5 shrink-0" />
                    {selectedInvoice.invoiceDate}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-0.5">Mənbə Fayl</span>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-xs font-semibold text-slate-600 truncate max-w-[100px]">
                      {selectedInvoice.sourceFile ? "Sənəd" : "Manual"}
                    </span>
                    <button 
                      onClick={() => handleOpenPDF(selectedInvoice)}
                      className="px-2 py-0.5 text-[9px] font-bold uppercase rounded bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 transition cursor-pointer flex items-center space-x-0.5"
                    >
                      <FileText className="w-2.5 h-2.5" />
                      <span>Aç</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Invoice Line Items */}
            <div className="border-t border-slate-100 pt-4">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">
                Məhsul və Xidmətlər
              </h4>
              <div className="space-y-2">
                {selectedInvoice.items && selectedInvoice.items.length > 0 ? (
                  selectedInvoice.items.map((item, idx) => (
                    <div key={idx} className="bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-1">
                      <div className="font-semibold text-xs text-slate-800 leading-tight">
                        {item.name || "Naməlum Məhsul"}
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span>{item.quantity} x {formatAZN(item.price)}</span>
                        <span className="font-mono font-bold text-slate-900">{formatAZN(item.total)}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-xs text-slate-400 py-4">
                    Sətir detalları mövcud deyil.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="p-5 border-t border-slate-100 bg-slate-50 space-y-3.5">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-500">Əsas Məbləğ:</span>
                <span className="font-mono text-slate-700 font-semibold">
                  {formatAZN(selectedInvoice.totalAmount / 1.18)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-500">ƏDV Məbləği (18%):</span>
                <span className="font-mono text-amber-600 font-semibold">
                  {formatAZN((selectedInvoice.totalAmount * 0.18) / 1.18)}
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-slate-200 pt-2.5">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-850">Yekun Məbləğ:</span>
                <span className="text-base font-mono font-bold text-indigo-650">
                  {formatAZN(selectedInvoice.totalAmount)}
                </span>
              </div>
            </div>

            {selectedInvoice.status !== "paid" ? (
              <button
                type="button"
                onClick={() => handlePayInvoice(selectedInvoice)}
                disabled={payingInvoiceId === selectedInvoice.id}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2 px-4 rounded-lg text-xs font-bold transition shadow-sm flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
              >
                {payingInvoiceId === selectedInvoice.id ? (
                  <span>Ödənilir...</span>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>Ödəniş Et (Borcdan çıx)</span>
                  </>
                )}
              </button>
            ) : (
              <div className="w-full bg-emerald-50 border border-emerald-100 text-emerald-800 py-2 px-4 rounded-lg text-xs font-bold flex items-center justify-center space-x-1.5">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span>Ödənilmiş Qaimə</span>
              </div>
            )}
          </div>
        </div>
        </>
      )}

      {/* Manual Creation Modal */}
      {showManualModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl border border-slate-200 max-w-2xl w-full max-h-[90vh] flex flex-col shadow-xl">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-sm font-bold font-display text-slate-900">Əl ilə Qaimə Yaz</h3>
              <button 
                onClick={() => setShowManualModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleManualSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2">
                  <label className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase tracking-wider">Müştəri Adı</label>
                  <input 
                    type="text" 
                    placeholder="Müştəri və ya Şirkət adı"
                    value={manualCustomer}
                    onChange={(e) => setManualCustomer(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:outline-hidden focus:border-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase tracking-wider">Müştəri Kodu</label>
                  <input 
                    type="text" 
                    placeholder="Məs. 12345678"
                    value={manualCustomerCode}
                    onChange={(e) => setManualCustomerCode(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:outline-hidden focus:border-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase tracking-wider">Qaimə No</label>
                  <input 
                    type="text" 
                    placeholder="Məs. QM-1002"
                    value={manualInvoiceNo}
                    onChange={(e) => setManualInvoiceNo(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:outline-hidden focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase tracking-wider">Qaimə Tarixi</label>
                <input 
                  type="date" 
                  value={manualDate}
                  onChange={(e) => setManualDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:outline-hidden focus:border-indigo-500"
                  required
                />
              </div>

              {/* Line Items */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Qaimə Sətirləri (Məhsul/Xidmət)</span>
                  <button 
                    type="button"
                    onClick={addManualItemRow}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center space-x-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Sətir Əlavə Et</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {manualItems.map((item, idx) => (
                    <div key={idx} className="flex flex-col md:flex-row md:items-end gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                      {/* Name input */}
                      <div className="flex-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Məhsul Adı</label>
                        <input 
                          type="text"
                          placeholder="Məhsul adı"
                          value={item.name}
                          onChange={(e) => handleManualItemChange(idx, "name", e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-hidden focus:border-indigo-500"
                          required
                        />
                      </div>
                      
                      {/* Grid for Quantity, Price, and Total on mobile */}
                      <div className="grid grid-cols-3 gap-2 items-end md:flex md:items-end md:space-x-2">
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Miqdar</label>
                          <input 
                            type="number"
                            value={item.quantity}
                            onChange={(e) => handleManualItemChange(idx, "quantity", e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-hidden focus:border-indigo-500 font-mono"
                            required
                            min={1}
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Qiymət</label>
                          <input 
                            type="number"
                            step="0.01"
                            value={item.price}
                            onChange={(e) => handleManualItemChange(idx, "price", e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-hidden focus:border-indigo-500 font-mono font-bold"
                            required
                            min={0}
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1 text-right md:text-left">Cəmi</label>
                          <div className="w-full px-2.5 py-1.5 bg-slate-100 text-slate-700 text-xs text-right font-mono font-bold h-[34px] flex items-center justify-end rounded-lg border border-slate-200">
                            {formatAZN(item.total)}
                          </div>
                        </div>
                      </div>

                      {/* Trash Button */}
                      <div className="flex justify-end pt-1 md:pt-0">
                        <button 
                          type="button"
                          onClick={() => removeManualItemRow(idx)}
                          disabled={manualItems.length === 1}
                          className="w-full md:w-auto h-[34px] px-3 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg border border-rose-100 disabled:opacity-30 cursor-pointer text-xs font-bold md:font-normal flex items-center justify-center space-x-1"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span className="md:hidden">Sil</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total Summary */}
              <div className="border-t border-slate-100 pt-3 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cəmi Yekun:</span>
                <span className="text-lg font-mono font-bold text-indigo-600">
                  {formatAZN(manualItems.reduce((sum, item) => sum + item.total, 0))}
                </span>
              </div>

              {/* Footer */}
              <div className="pt-3 flex items-center justify-end space-x-2 border-t border-slate-100">
                <button 
                  type="button"
                  onClick={() => setShowManualModal(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Ləğv Et
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition cursor-pointer shadow-md"
                >
                  Yadda Saxla
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PDF Confirm-Before-Save Modal */}
      {pendingInvoiceConfirm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-xl border border-slate-200 max-w-2xl w-full max-h-[90vh] flex flex-col shadow-xl">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-emerald-50 text-emerald-900 rounded-t-xl">
              <div>
                <h3 className="text-sm font-bold font-display flex items-center space-x-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Sənəddən Çıxarılan Məlumatları Təsdiqləyin</span>
                </h3>
                <div className="flex flex-wrap gap-2 items-center mt-1">
                  <p className="text-[10px] text-emerald-700/80 font-mono">{pendingInvoiceConfirm.fileName}</p>
                  {pendingInvoiceConfirm.isDeterministic ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-extrabold uppercase bg-emerald-600 text-white shadow-xs">
                      Alqoritmik Analiz (AI-sız)
                    </span>
                  ) : pendingInvoiceConfirm.isDemoFallback ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-extrabold uppercase bg-amber-500 text-white">
                      Demo Simulyasiya
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-extrabold uppercase bg-indigo-600 text-white">
                      Süni İntellekt (Gemini AI)
                    </span>
                  )}
                </div>
              </div>
              <button 
                onClick={() => setPendingInvoiceConfirm(null)}
                className="p-1 rounded-lg text-emerald-800 hover:bg-emerald-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleConfirmSaveSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2">
                  <label className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase tracking-wider">Müştəri Adı</label>
                  <input 
                    type="text" 
                    value={pendingInvoiceConfirm.customerName}
                    onChange={(e) => setPendingInvoiceConfirm({
                      ...pendingInvoiceConfirm,
                      customerName: e.target.value
                    })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:outline-hidden focus:border-indigo-500 font-semibold"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase tracking-wider">Müştəri Kodu (VÖEN)</label>
                  <input 
                    type="text" 
                    value={pendingInvoiceConfirm.customerCode || ""}
                    onChange={(e) => setPendingInvoiceConfirm({
                      ...pendingInvoiceConfirm,
                      customerCode: e.target.value
                    })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:outline-hidden focus:border-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase tracking-wider">Qaimə No</label>
                  <input 
                    type="text" 
                    value={pendingInvoiceConfirm.invoiceNumber}
                    onChange={(e) => setPendingInvoiceConfirm({
                      ...pendingInvoiceConfirm,
                      invoiceNumber: e.target.value
                    })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:outline-hidden focus:border-indigo-500 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase tracking-wider">Qaimə Tarixi</label>
                  <input 
                    type="date" 
                    value={pendingInvoiceConfirm.invoiceDate}
                    onChange={(e) => setPendingInvoiceConfirm({
                      ...pendingInvoiceConfirm,
                      invoiceDate: e.target.value
                    })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:outline-hidden focus:border-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase tracking-wider">Yekun Məbləğ (AZN)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={pendingInvoiceConfirm.totalAmount}
                    onChange={(e) => setPendingInvoiceConfirm({
                      ...pendingInvoiceConfirm,
                      totalAmount: Number(e.target.value)
                    })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:outline-hidden focus:border-indigo-500 font-mono font-bold"
                    required
                  />
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Məhsul sətirləri</span>
                <div className="max-h-[150px] overflow-y-auto border border-slate-100 rounded-lg divide-y divide-slate-100">
                  {pendingInvoiceConfirm.items && pendingInvoiceConfirm.items.length > 0 ? (
                    pendingInvoiceConfirm.items.map((item, idx) => (
                      <div key={idx} className="p-2.5 bg-slate-50 flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs text-slate-700 gap-1.5 min-w-0">
                        <div className="font-semibold break-words min-w-0 flex-1">{item.name || "Naməlum məhsul"}</div>
                        <div className="font-mono text-slate-500 text-left sm:text-right shrink-0">
                          {item.quantity} x {formatAZN(item.price)} = <span className="text-slate-900 font-bold">{formatAZN(item.total)}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-xs text-slate-400 py-3">
                      Sətir məlumatı tapılmadı.
                    </div>
                  )}
                </div>
              </div>

              {/* Confirmation checklist */}
              <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-4 flex items-start space-x-3 mt-4">
                <input 
                  type="checkbox" 
                  id="confirmSaveChecked"
                  checked={confirmSaveChecked}
                  onChange={(e) => setConfirmSaveChecked(e.target.checked)}
                  className="w-4 h-4 mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
                />
                <label htmlFor="confirmSaveChecked" className="text-xs text-slate-700 leading-tight select-none cursor-pointer font-semibold">
                  Sənəddən çıxarılan qaimə məlumatlarının düzgün olduğunu və verilənlər bazasına yazılmasını təsdiqləyirəm.
                </label>
              </div>

              {/* Footer */}
              <div className="pt-3 flex items-center justify-end space-x-2 border-t border-slate-100">
                <button 
                  type="button"
                  onClick={() => setPendingInvoiceConfirm(null)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Ləğv Et
                </button>
                <button 
                  type="submit"
                  disabled={!confirmSaveChecked}
                  className={`px-5 py-2.5 rounded-lg text-xs font-bold transition shadow-md flex items-center space-x-1.5 ${
                    confirmSaveChecked 
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer" 
                      : "bg-slate-100 text-slate-400 cursor-not-allowed"
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Təsdiqlə və Sistemə Yaz</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
