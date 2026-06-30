import React, { useState } from "react";
import { 
  FileSpreadsheet, 
  Printer, 
  Download, 
  FileText, 
  Calendar, 
  TrendingUp, 
  CheckCircle, 
  AlertCircle,
  Clock,
  ExternalLink,
  Search
} from "lucide-react";
import { Customer, Invoice } from "../types";

interface ReportsViewProps {
  customers: Customer[];
  invoices: Invoice[];
  loading: boolean;
  onInvoiceUpdated?: () => void;
  showToast?: (message: string, type?: "success" | "error" | "info") => void;
  currency?: string;
}

export default function ReportsView({ customers, invoices, loading, onInvoiceUpdated, showToast, currency = "AZN" }: ReportsViewProps) {
  const [reportType, setReportType] = useState<"summary" | "debtors" | "invoices">("summary");
  const [dateRange, setDateRange] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const handleDateRangeChange = (val: string) => {
    setDateRange(val);
    if (val === "all") {
      setStartDate("");
      setEndDate("");
    } else {
      const now = new Date();
      const endStr = now.toISOString().split("T")[0];
      let startStr = "";
      if (val === "month") {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(now.getDate() - 30);
        startStr = thirtyDaysAgo.toISOString().split("T")[0];
      } else if (val === "quarter") {
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(now.getDate() - 90);
        startStr = ninetyDaysAgo.toISOString().split("T")[0];
      }
      setStartDate(startStr);
      setEndDate(endStr);
    }
  };

  const [activeSubTab, setActiveSubTab] = useState<"paid" | "unpaid">("paid");
  const [confirmingInvoiceId, setConfirmingInvoiceId] = useState<string | null>(null);

  const formatAZN = (val: number) => {
    return new Intl.NumberFormat("az-AZ", { style: "currency", currency }).format(val);
  };

  const paidInvoices = invoices.filter(i => i.status === "paid");
  const unpaidInvoices = invoices.filter(i => i.status !== "paid");

  const handleConfirmPaymentFromReports = async (invoice: Invoice) => {
    if (!invoice) return;
    setConfirmingInvoiceId(invoice.id);
    try {
      const customer = customers.find(
        c => c.name.toLowerCase().trim() === invoice.customerName.toLowerCase().trim()
      );

      let customerId = customer?.id;

      if (!customerId) {
        // Create customer profile if doesn't exist
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

      const payRes = await fetch(`/api/customers/${customerId}/payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: invoice.totalAmount,
          paymentDate: new Date().toISOString().split("T")[0],
          note: `QM ${invoice.invoiceNumber} nömrəli qaimə üzrə ödəniş (Hesabatlar panelindən təsdiqləndi)`,
          invoiceId: invoice.id
        })
      });

      if (!payRes.ok) {
        throw new Error("Ödəniş qeyd edilərkən xəta baş verdi.");
      }

      if (showToast) {
        showToast(`QM ${invoice.invoiceNumber} nömrəli qaimə üzrə ödəniş uğurla təsdiqləndi!`, "success");
      }

      if (onInvoiceUpdated) {
        onInvoiceUpdated();
      }
    } catch (err: any) {
      alert(err.message || "Ödəniş təsdiqi uğursuz oldu.");
    } finally {
      setConfirmingInvoiceId(null);
    }
  };

  // Filter invoices based on date range and search query
  const filteredInvoices = invoices.filter(inv => {
    // 1. Search Query
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchesNum = inv.invoiceNumber.toLowerCase().includes(q);
      const matchesCust = inv.customerName.toLowerCase().includes(q);
      if (!matchesNum && !matchesCust) return false;
    }
    // 2. Custom Date Range
    if (startDate && inv.invoiceDate < startDate) return false;
    if (endDate && inv.invoiceDate > endDate) return false;
    return true;
  });

  // Filter and calculate Customer metrics dynamically based on active filters
  const filteredCustomers = customers.map(c => {
    const custInvoices = (c.invoices || []).filter(inv => {
      if (startDate && inv.invoiceDate < startDate) return false;
      if (endDate && inv.invoiceDate > endDate) return false;
      return true;
    });

    const custPayments = (c.payments || []).filter(pay => {
      if (startDate && pay.paymentDate < startDate) return false;
      if (endDate && pay.paymentDate > endDate) return false;
      return true;
    });

    const calculatedTotal = custInvoices.reduce((sum, i) => sum + i.totalAmount, 0);
    const calculatedPaid = custPayments.reduce((sum, p) => sum + p.amount, 0);
    const calculatedDebt = Math.max(0, calculatedTotal - calculatedPaid);

    return {
      ...c,
      invoices: custInvoices,
      payments: custPayments,
      totalAmount: calculatedTotal,
      paidAmount: calculatedPaid,
      debtAmount: calculatedDebt,
    };
  }).filter(c => {
    if (searchQuery) {
      return c.name.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  // Aggregations based on filtered data
  const totalSales = filteredInvoices.reduce((sum, i) => sum + i.totalAmount, 0);
  const totalCollected = filteredCustomers.reduce((sum, c) => sum + c.paidAmount, 0);
  const totalOutstanding = filteredCustomers.reduce((sum, c) => sum + c.debtAmount, 0);

  // Filter and format reports list
  const getFilteredData = () => {
    if (reportType === "debtors") {
      return filteredCustomers.filter(c => c.debtAmount > 0.01);
    }
    if (reportType === "invoices") {
      return filteredInvoices;
    }
    return filteredCustomers; // default
  };

  const handleExportCSV = () => {
    // Excel-compatible CSV with UTF-8 BOM
    let csvContent = "\uFEFF";
    
    if (reportType === "debtors") {
      csvContent += "Müştəri Adı;Ümumi Satış (AZN);Ödənilmiş Məbləğ (AZN);Qalıq Borc (AZN);Qaimə Sayı\n";
      filteredCustomers.filter(c => c.debtAmount > 0.01).forEach(c => {
        csvContent += `"${c.name}";${c.totalAmount};${c.paidAmount};${c.debtAmount};${c.invoices?.length || 0}\n`;
      });
    } else if (reportType === "invoices") {
      csvContent += "Qaimə Nömrəsi;Müştəri Adı;Qaimə Tarixi;Yekun Məbləğ (AZN);Sətir Sayı\n";
      filteredInvoices.forEach(i => {
        csvContent += `"${i.invoiceNumber}";"${i.customerName}";"${i.invoiceDate}";${i.totalAmount};${i.items?.length || 0}\n`;
      });
    } else {
      csvContent += "Müştəri Adı;Ümumi Satış (AZN);Ödənilmiş Məbləğ (AZN);Qalıq Borc (AZN);Qaimə Sayı\n";
      filteredCustomers.forEach(c => {
        csvContent += `"${c.name}";${c.totalAmount};${c.paidAmount};${c.debtAmount};${c.invoices?.length || 0}\n`;
      });
    }

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `ERP_${reportType}_hesabat_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-8 bg-[#F8FAFC] space-y-6 print:bg-white print:p-0 w-full max-w-full">
      {/* Header (Hide when printing) */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 print:hidden shrink-0">
        <div>
          <h2 className="text-xl font-semibold text-slate-800 tracking-tight">Analitik Hesabatlar</h2>
          <p className="text-xs text-slate-500">Mühasibat və maliyyə hesabatlarının Excel və PDF formatında ixracı.</p>
        </div>
        <div className="flex items-center space-x-2">
          <button 
            onClick={handleExportCSV}
            className="flex items-center space-x-1.5 bg-white border border-slate-200 text-slate-700 px-3 py-2 rounded-lg text-xs font-semibold hover:bg-slate-50 transition cursor-pointer shadow-xs"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Excel (CSV) İxrac et</span>
          </button>
          <button 
            onClick={handlePrint}
            className="flex items-center space-x-1.5 bg-indigo-600 text-white px-3.5 py-2 rounded-lg text-xs font-semibold hover:bg-indigo-700 transition cursor-pointer shadow-md"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>PDF / Çap Et</span>
          </button>
        </div>
      </div>

      {/* Report Customizer Controls (Hide when printing) */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4 print:hidden">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase tracking-wider">Hesabat Tipi</label>
            <div className="flex rounded-lg bg-slate-50 p-1 border border-slate-200">
              <button 
                onClick={() => setReportType("summary")}
                className={`flex-1 py-1.5 text-[11px] font-bold rounded transition cursor-pointer ${
                  reportType === "summary" ? "bg-white text-slate-900 shadow-xs border border-slate-100" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Ümumi Hesabat
              </button>
              <button 
                onClick={() => setReportType("debtors")}
                className={`flex-1 py-1.5 text-[11px] font-bold rounded transition cursor-pointer ${
                  reportType === "debtors" ? "bg-white text-slate-900 shadow-xs border border-slate-100" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Yalnız Borclar
              </button>
              <button 
                onClick={() => setReportType("invoices")}
                className={`flex-1 py-1.5 text-[11px] font-bold rounded transition cursor-pointer ${
                  reportType === "invoices" ? "bg-white text-slate-900 shadow-xs border border-slate-100" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Qaimə Siyahısı
              </button>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase tracking-wider">Axtarış (Müştəri və ya Qaimə №)</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
              <input 
                type="text" 
                placeholder="Axtarış..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-700 focus:outline-hidden focus:border-indigo-500 h-[34px]"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase tracking-wider">Dövr Aralığı (Sürətli Seçim)</label>
            <select 
              value={dateRange}
              onChange={(e) => handleDateRangeChange(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700 focus:outline-hidden focus:border-indigo-500 h-[34px]"
            >
              <option value="all">Bütün dövr (Tam tarix)</option>
              <option value="month">Cari Ay (Son 30 gün)</option>
              <option value="quarter">Cari Rüb</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-slate-100 items-end">
          <div>
            <label className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase tracking-wider">Başlanğıc Tarixi</label>
            <input 
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setDateRange("all");
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700 focus:outline-hidden focus:border-indigo-500 h-[34px]"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase tracking-wider">Son Tarix</label>
            <input 
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setDateRange("all");
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700 focus:outline-hidden focus:border-indigo-500 h-[34px]"
            />
          </div>

          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-150 text-slate-500 text-[10px] leading-relaxed flex items-start space-x-2 h-[34px] items-center">
            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">"PDF / Çap Et" düyməsi ilə hesabatı PDF kimi saxlaya bilərsiniz.</span>
          </div>
        </div>
      </div>

      {/* Main Printable Area */}
      <div className="bg-white p-6 md:p-8 rounded-xl border border-slate-200 shadow-sm print:border-none print:shadow-none print:p-0 space-y-6 font-sans">
        
        {/* Printable Header Details */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between sm:items-start border-b border-slate-150 pb-6">
          <div>
            <h1 className="text-xl font-semibold text-slate-900 tracking-tight">QAİMƏ</h1>
            <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider font-bold">Ağıllı Maliyyə və Qaimə Uçotu</p>
            <p className="text-xs text-slate-500 mt-3 leading-relaxed">
              Azərbaycan Respublikası, Bakı şəhəri<br />
              Dövlət Vergi Xidməti Reystrinə uyğundur
            </p>
          </div>
          <div className="text-left sm:text-right flex flex-col items-start sm:items-end">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">HESABAT TARİXİ</div>
            <div className="text-xs font-semibold text-slate-700 mt-1 flex items-center justify-start sm:justify-end">
              <Calendar className="w-3.5 h-3.5 text-slate-400 mr-1.5 shrink-0" />
              {new Date().toISOString().split("T")[0]}
            </div>
            <div className="text-xs text-slate-500 mt-3">
              Status: <span className="text-emerald-600 font-bold uppercase tracking-wider text-[10px] border border-emerald-100 bg-emerald-50 px-1.5 py-0.5 rounded">Təsdiqlənib</span>
            </div>
          </div>
        </div>

        {/* Aggregate Financial Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 bg-slate-50 p-4 rounded-xl border border-slate-150 print:bg-slate-50">
          <div>
            <span className="text-[9px] text-slate-400 font-bold uppercase block tracking-wider">Ümumi Satış Həcmi</span>
            <span className="text-lg font-mono font-bold text-indigo-600 mt-0.5 block">{formatAZN(totalSales)}</span>
          </div>
          <div className="border-t sm:border-t-0 sm:border-l border-slate-200 pt-3 sm:pt-0 sm:pl-6">
            <span className="text-[9px] text-emerald-700 font-bold uppercase block tracking-wider">Cəmi Yığılmış (Mədaxil)</span>
            <span className="text-lg font-mono font-bold text-emerald-600 mt-0.5 block">{formatAZN(totalCollected)}</span>
          </div>
          <div className="border-t sm:border-t-0 sm:border-l border-slate-200 pt-3 sm:pt-0 sm:pl-6">
            <span className="text-[9px] text-rose-700 font-bold uppercase block tracking-wider">Qalıq Debitor Borc</span>
            <span className="text-lg font-mono font-bold text-rose-600 mt-0.5 block">{formatAZN(totalOutstanding)}</span>
          </div>
        </div>

        {/* Tab-Specific Printable Content */}
        <div className="space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100">
            <h3 className="text-[11px] font-bold text-slate-700 uppercase tracking-widest">
              {reportType === "summary" && "Ümumi Dövriyyə və Müştəri Balansları"}
              {reportType === "debtors" && "Aktiv Debitor Borcu olan Müştərilər"}
              {reportType === "invoices" && "Son Qeydiyyata Alınmış Qaimə Reyestri"}
            </h3>
            <span className="text-[11px] text-slate-400 italic">Cari sətirlər</span>
          </div>

          {/* Desktop Table View */}
          <div className="overflow-x-auto hidden md:block print:block">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 text-[10px] text-slate-500 uppercase tracking-[0.1em] border-b border-slate-200">
                  {reportType === "invoices" ? (
                    <>
                      <th className="px-6 py-4 font-semibold">Qaimə No</th>
                      <th className="px-6 py-4 font-semibold">Müştəri adı</th>
                      <th className="px-6 py-4 font-semibold">Qaimə Tarixi</th>
                      <th className="px-6 py-4 font-semibold text-right">Yekun Məbləğ</th>
                    </>
                  ) : (
                    <>
                      <th className="px-6 py-4 font-semibold">Müştəri adı</th>
                      <th className="px-6 py-4 font-semibold text-center">Qaimə Sayı</th>
                      <th className="px-6 py-4 font-semibold text-right">Ümumi Satış</th>
                      <th className="px-6 py-4 font-semibold text-right">Mədaxil (Ödənilən)</th>
                      <th className="px-6 py-4 font-semibold text-right">Qalıq Borc</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {reportType === "invoices" ? (
                  filteredInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-indigo-50/10">
                      <td className="px-6 py-3.5 font-mono font-bold text-slate-900 text-sm">{inv.invoiceNumber}</td>
                      <td className="px-6 py-3.5 font-semibold text-slate-700 text-sm">{inv.customerName}</td>
                      <td className="px-6 py-3.5 text-slate-500">{inv.invoiceDate}</td>
                      <td className="px-6 py-3.5 text-right font-mono font-bold text-indigo-600">{formatAZN(inv.totalAmount)}</td>
                    </tr>
                  ))
                ) : (
                  filteredCustomers
                    .filter(c => reportType !== "debtors" || c.debtAmount > 0.01)
                    .map((cust) => (
                      <tr key={cust.id} className="hover:bg-indigo-50/10">
                        <td className="px-6 py-3.5 font-semibold text-slate-700 text-sm">{cust.name}</td>
                        <td className="px-6 py-3.5 text-center text-slate-500 font-mono text-xs">{cust.invoices ? cust.invoices.length : 0} qaimə</td>
                        <td className="px-6 py-3.5 text-right font-mono font-semibold text-slate-700">{formatAZN(cust.totalAmount)}</td>
                        <td className="px-6 py-3.5 text-right font-mono text-emerald-600 font-semibold">{formatAZN(cust.paidAmount)}</td>
                        <td className={`px-6 py-3.5 text-right font-mono font-bold ${cust.debtAmount > 0.01 ? "text-rose-600" : "text-slate-400"}`}>
                          {formatAZN(cust.debtAmount)}
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards View */}
          <div className="block md:hidden print:hidden space-y-3">
            {reportType === "invoices" ? (
              filteredInvoices.map((inv) => (
                <div key={inv.id} className="bg-slate-50 p-4 rounded-xl border border-slate-150 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-mono font-bold text-slate-900 text-xs bg-slate-100 px-2 py-0.5 rounded border border-slate-200">{inv.invoiceNumber}</span>
                    <span className="text-[10px] text-slate-500">{inv.invoiceDate}</span>
                  </div>
                  <div className="font-bold text-slate-850 text-sm truncate">{inv.customerName}</div>
                  <div className="flex justify-between items-center pt-2 border-t border-dashed border-slate-200">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Yekun Məbləğ</span>
                    <span className="font-mono font-bold text-indigo-600 text-sm">{formatAZN(inv.totalAmount)}</span>
                  </div>
                </div>
              ))
            ) : (
              filteredCustomers
                .filter(c => reportType !== "debtors" || c.debtAmount > 0.01)
                .map((cust) => (
                  <div key={cust.id} className="bg-slate-50 p-4 rounded-xl border border-slate-150 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-850 text-sm truncate">{cust.name}</span>
                      <span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">{cust.invoices ? cust.invoices.length : 0} qaimə</span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs pt-2 border-t border-dashed border-slate-200">
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-medium">Satış:</span>
                        <span className="font-semibold text-slate-700 font-mono">{formatAZN(cust.totalAmount)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-medium">Mədaxil:</span>
                        <span className="font-semibold text-emerald-600 font-mono">{formatAZN(cust.paidAmount)}</span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-slate-150">
                      <span className="text-[10px] text-slate-500 font-bold uppercase">Qalıq Borc:</span>
                      <span className={`font-mono font-bold ${cust.debtAmount > 0.01 ? "text-rose-600 text-sm" : "text-slate-400"}`}>
                        {formatAZN(cust.debtAmount)}
                      </span>
                    </div>
                  </div>
                ))
            )}
            {((reportType === "invoices" && filteredInvoices.length === 0) || (reportType !== "invoices" && filteredCustomers.filter(c => reportType !== "debtors" || c.debtAmount > 0.01).length === 0)) && (
              <div className="py-8 text-center text-slate-400 text-xs bg-slate-50 border border-slate-150 rounded-xl">
                Axtarışa və ya seçilmiş tarixə uyğun məlumat tapılmadı.
              </div>
            )}
          </div>
        </div>

        {/* Signatures Panel (Great for official PDF reports look!) */}
        <div className="grid grid-cols-2 gap-8 pt-12 border-t border-slate-100 print:hidden">
          <div className="space-y-4">
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest block">Hazırladı (Mühasibatlıq)</span>
            <div className="border-b border-slate-200 h-8 w-44"></div>
            <span className="text-xs text-slate-500 block font-medium">İmza / Soyad, Ad</span>
          </div>
          <div className="space-y-4 text-right flex flex-col items-end">
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest block">Təsdiq Etdi (Direktor)</span>
            <div className="border-b border-slate-200 h-8 w-44"></div>
            <span className="text-xs text-slate-500 block font-medium">M.Y. / İmza</span>
          </div>
        </div>

      </div>

      {/* Ödənilmiş Qaimələr və Ödəniş Təsdiqi Bölməsi */}
      <div className="bg-white p-6 md:p-8 rounded-xl border border-slate-200 shadow-sm space-y-5 print:hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Ödənilmiş Qaimələr & Ödəniş Təsdiqi
            </h3>
            <p className="text-xs text-slate-400 mt-1">Ödənişi tamamlanmış qaimələr və yeni ödənişlərin dərhal təsdiqlənməsi.</p>
          </div>
          <div className="flex bg-slate-50 p-1 border border-slate-100 rounded-lg shrink-0">
            <button 
              onClick={() => setActiveSubTab("paid")}
              className={`px-3 py-1.5 text-[11px] font-bold rounded transition cursor-pointer ${
                activeSubTab === "paid" ? "bg-white text-emerald-700 shadow-xs border border-slate-100/50" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Ödənilənlər ({paidInvoices.length})
            </button>
            <button 
              onClick={() => setActiveSubTab("unpaid")}
              className={`px-3 py-1.5 text-[11px] font-bold rounded transition cursor-pointer ${
                activeSubTab === "unpaid" ? "bg-white text-amber-700 shadow-xs border border-slate-100/50" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Təsdiq Gözləyənlər ({unpaidInvoices.length})
            </button>
          </div>
        </div>

        {activeSubTab === "paid" ? (
          paidInvoices.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">
              Hələ ki ödənilmiş qaimə yoxdur.
            </div>
          ) : (
            <>
              {/* Desktop view */}
              <div className="overflow-x-auto hidden md:block">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-[10px] text-slate-500 uppercase tracking-[0.1em] border-b border-slate-200">
                      <th className="px-4 py-3 font-semibold">Qaimə No</th>
                      <th className="px-4 py-3 font-semibold">Müştəri adı</th>
                      <th className="px-4 py-3 font-semibold">Tarix</th>
                      <th className="px-4 py-3 font-semibold text-right">Əsas Məbləğ</th>
                      <th className="px-4 py-3 font-semibold text-right">ƏDV (18%)</th>
                      <th className="px-4 py-3 font-semibold text-right">Yekun Məbləğ</th>
                      <th className="px-4 py-3 font-semibold text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {paidInvoices.map(inv => (
                      <tr key={inv.id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3 font-mono font-bold text-slate-900">{inv.invoiceNumber}</td>
                        <td className="px-4 py-3 font-semibold">{inv.customerName}</td>
                        <td className="px-4 py-3 text-slate-500">{inv.invoiceDate}</td>
                        <td className="px-4 py-3 text-right font-mono text-slate-500">{formatAZN(inv.totalAmount / 1.18)}</td>
                        <td className="px-4 py-3 text-right font-mono text-amber-600">{formatAZN((inv.totalAmount * 0.18) / 1.18)}</td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-indigo-600">{formatAZN(inv.totalAmount)}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-150">
                            Ödənilib
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile view */}
              <div className="block md:hidden space-y-3">
                {paidInvoices.map(inv => (
                  <div key={inv.id} className="bg-slate-50 p-4 rounded-xl border border-slate-150 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="font-mono font-bold text-slate-900 text-xs bg-slate-100 px-2 py-0.5 rounded border border-slate-200">{inv.invoiceNumber}</span>
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-100">
                        Ödənilib
                      </span>
                    </div>
                    
                    <div className="font-bold text-slate-850 text-sm truncate">{inv.customerName}</div>
                    
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs pt-2 border-t border-dashed border-slate-200">
                      <div className="flex justify-between col-span-2">
                        <span className="text-slate-400">Tarix:</span>
                        <span className="text-slate-600 font-medium">{inv.invoiceDate}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Əsas Məbləğ:</span>
                        <span className="font-semibold text-slate-600 font-mono">{formatAZN(inv.totalAmount / 1.18)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">ƏDV (18%):</span>
                        <span className="font-semibold text-amber-600 font-mono">{formatAZN((inv.totalAmount * 0.18) / 1.18)}</span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-slate-150">
                      <span className="text-[10px] text-slate-500 font-bold uppercase">Yekun Məbləğ:</span>
                      <span className="font-mono font-black text-indigo-600 text-sm">{formatAZN(inv.totalAmount)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )
        ) : (
          unpaidInvoices.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">
              Bütün qaimələr ödənilmişdir!
            </div>
          ) : (
            <>
              {/* Desktop view */}
              <div className="overflow-x-auto hidden md:block">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-[10px] text-slate-500 uppercase tracking-[0.1em] border-b border-slate-200">
                      <th className="px-4 py-3 font-semibold">Qaimə No</th>
                      <th className="px-4 py-3 font-semibold">Müştəri adı</th>
                      <th className="px-4 py-3 font-semibold">Tarix</th>
                      <th className="px-4 py-3 font-semibold text-right">Əsas Məbləğ</th>
                      <th className="px-4 py-3 font-semibold text-right">ƏDV (18%)</th>
                      <th className="px-4 py-3 font-semibold text-right">Yekun Məbləğ</th>
                      <th className="px-4 py-3 font-semibold text-right">Əməliyyat</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {unpaidInvoices.map(inv => (
                      <tr key={inv.id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3 font-mono font-bold text-slate-900">{inv.invoiceNumber}</td>
                        <td className="px-4 py-3 font-semibold">{inv.customerName}</td>
                        <td className="px-4 py-3 text-slate-500">{inv.invoiceDate}</td>
                        <td className="px-4 py-3 text-right font-mono text-slate-500">{formatAZN(inv.totalAmount / 1.18)}</td>
                        <td className="px-4 py-3 text-right font-mono text-amber-600">{formatAZN((inv.totalAmount * 0.18) / 1.18)}</td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-slate-850">{formatAZN(inv.totalAmount)}</td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => handleConfirmPaymentFromReports(inv)}
                            disabled={confirmingInvoiceId === inv.id}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold uppercase transition cursor-pointer disabled:opacity-50 inline-flex items-center space-x-1"
                          >
                            <CheckCircle className="w-3 h-3" />
                            <span>{confirmingInvoiceId === inv.id ? "Təsdiqlənir..." : "Təsdiqlə"}</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile view */}
              <div className="block md:hidden space-y-3">
                {unpaidInvoices.map(inv => (
                  <div key={inv.id} className="bg-slate-50 p-4 rounded-xl border border-slate-150 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="font-mono font-bold text-slate-900 text-xs bg-slate-100 px-2 py-0.5 rounded border border-slate-200">{inv.invoiceNumber}</span>
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-100">
                        Gözləyir
                      </span>
                    </div>
                    
                    <div className="font-bold text-slate-850 text-sm truncate">{inv.customerName}</div>
                    
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs pt-2 border-t border-dashed border-slate-200">
                      <div className="flex justify-between col-span-2">
                        <span className="text-slate-400">Tarix:</span>
                        <span className="text-slate-600 font-medium">{inv.invoiceDate}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Əsas Məbləğ:</span>
                        <span className="font-semibold text-slate-600 font-mono">{formatAZN(inv.totalAmount / 1.18)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">ƏDV (18%):</span>
                        <span className="font-semibold text-amber-600 font-mono">{formatAZN((inv.totalAmount * 0.18) / 1.18)}</span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-slate-150 pb-3 border-b border-dashed border-slate-200">
                      <span className="text-[10px] text-slate-500 font-bold uppercase">Yekun Məbləğ:</span>
                      <span className="font-mono font-black text-slate-850 text-sm">{formatAZN(inv.totalAmount)}</span>
                    </div>

                    <div className="flex justify-end">
                      <button
                        onClick={() => handleConfirmPaymentFromReports(inv)}
                        disabled={confirmingInvoiceId === inv.id}
                        className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold uppercase transition cursor-pointer disabled:opacity-50 flex items-center justify-center space-x-1.5 shadow-xs"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>{confirmingInvoiceId === inv.id ? "Təsdiqlənir..." : "Ödənişi Təsdiqlə"}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )
        )}
      </div>
    </div>
  );
}
