import React, { useState } from "react";
import { 
  CreditCard, 
  Search, 
  Plus, 
  CheckCircle, 
  DollarSign, 
  ArrowRight, 
  Clock, 
  X,
  PlusCircle,
  TrendingDown,
  Info,
  AlertCircle,
  Trash2
} from "lucide-react";
import { Customer } from "../types";

interface DebtsViewProps {
  customers: Customer[];
  loading: boolean;
  onPaymentRecorded: () => void;
  currency?: string;
}

export default function DebtsView({ customers, loading, onPaymentRecorded, currency = "AZN" }: DebtsViewProps) {
  const savedUser = localStorage.getItem("erp_user");
  const isAdmin = savedUser ? JSON.parse(savedUser).role === "admin" : false;

  const [search, setSearch] = useState("");
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedCustId, setSelectedCustId] = useState("");
  const [selectedInvoiceId, setSelectedInvoiceId] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [paymentNote, setPaymentNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Filter only customers with active debt (> 0.01 AZN)
  const debtorCustomers = customers.filter(c => 
    c.debtAmount > 0.01 && 
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const formatAZN = (val: number) => {
    return new Intl.NumberFormat("az-AZ", { style: "currency", currency }).format(val);
  };

  const handleOpenPaymentModal = (cust: Customer) => {
    setSelectedCustId(cust.id);
    setSelectedInvoiceId("");
    setPaymentAmount(Math.round(cust.debtAmount).toString()); // prefill with full or rounded debt
    setPaymentDate(new Date().toISOString().split("T")[0]);
    setPaymentNote("Köçürmə ilə ödəniş qəbulu");
    setShowPaymentModal(true);
  };

  const handleCustomerChange = (custId: string) => {
    setSelectedCustId(custId);
    setSelectedInvoiceId("");
    const cust = customers.find(c => c.id === custId);
    if (cust) {
      setPaymentAmount(Math.round(cust.debtAmount).toString());
      setPaymentNote("Köçürmə ilə ödəniş qəbulu");
    } else {
      setPaymentAmount("");
      setPaymentNote("");
    }
  };

  const handleInvoiceChange = (invoiceId: string) => {
    setSelectedInvoiceId(invoiceId);
    if (invoiceId) {
      const cust = customers.find(c => c.id === selectedCustId);
      const inv = cust?.invoices?.find(i => i.id === invoiceId);
      if (inv) {
        setPaymentAmount(inv.totalAmount.toString());
        setPaymentNote(`QM ${inv.invoiceNumber} nömrəli qaimə üzrə ödəniş`);
      }
    } else {
      const cust = customers.find(c => c.id === selectedCustId);
      if (cust) {
        setPaymentAmount(Math.round(cust.debtAmount).toString());
        setPaymentNote("Köçürmə ilə ödəniş qəbulu");
      }
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustId || !paymentAmount || isNaN(Number(paymentAmount)) || Number(paymentAmount) <= 0) {
      alert("Zəhmət olmasa ödəniş məbləğini düzgün daxil edin.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/customers/${selectedCustId}/payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(paymentAmount),
          paymentDate,
          note: paymentNote,
          invoiceId: selectedInvoiceId || undefined
        })
      });

      if (!res.ok) {
        throw new Error("Ödəniş qeydə alına bilmədi.");
      }

      setShowPaymentModal(false);
      onPaymentRecorded();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const [deletePaymentConfirmId, setDeletePaymentConfirmId] = useState<string | null>(null);

  const handleDeletePayment = async (paymentId: string) => {
    try {
      const res = await fetch(`/api/payments/${paymentId}`, {
        method: "DELETE"
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Ödəniş silinərkən xəta baş verdi.");
      }

      onPaymentRecorded();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Extract all payments from all customers
  const allPayments = customers
    .flatMap(c => (c.payments || []).map(p => ({ ...p, customerName: c.name })))
    .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())
    .slice(0, 8); // top 8 recent payments

  // Calculations
  const totalInvoiced = customers.reduce((sum, c) => sum + c.totalAmount, 0);
  const totalCollected = customers.reduce((sum, c) => sum + c.paidAmount, 0);
  const totalOutstanding = customers.reduce((sum, c) => sum + c.debtAmount, 0);

  // Get all overdue invoices (unpaid and > 30 days old)
  const overdueInvoices = customers.flatMap(c => 
    (c.invoices || [])
      .filter(inv => inv.status !== "paid")
      .map(inv => {
        const invDate = new Date(inv.invoiceDate);
        const today = new Date();
        const diffTime = today.getTime() - invDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        return {
          ...inv,
          customerName: c.name,
          overdueDays: diffDays - 30,
          isOverdue: diffDays > 30
        };
      })
      .filter(inv => inv.isOverdue)
  );

  const hasOverdueInvoices = (cust: Customer) => {
    return (cust.invoices || []).some(inv => {
      if (inv.status === "paid") return false;
      const invDate = new Date(inv.invoiceDate);
      const today = new Date();
      const diffTime = today.getTime() - invDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      return diffDays > 30;
    });
  };

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-8 bg-[#F8FAFC] space-y-6 w-full max-w-full">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-slate-800 tracking-tight">Debitor Borclar (Məxaric və Mədaxil)</h2>
        <p className="text-xs text-slate-500">Müştəriləriniz üzrə ödəniş qəbulu, qalıq borcların hesablanması və mədaxil uçotu.</p>
      </div>

      {/* Gecikmiş Ödəniş Bildirişləri */}
      {overdueInvoices.length > 0 && (
        <div className="bg-rose-50 border border-rose-150 text-rose-800 p-4 rounded-xl flex items-start space-x-3 shadow-xs animate-fade-in">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5 animate-pulse" />
          <div className="text-xs space-y-1 flex-1">
            <h4 className="font-bold text-rose-900 text-xs uppercase tracking-wide flex items-center gap-1.5">
              <span>Gecikmiş Ödəniş Bildirişi ({overdueInvoices.length} qaimə gecikmədədir)</span>
              <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping"></span>
            </h4>
            <p className="text-slate-600 leading-relaxed text-[11px]">
              Aşağıdakı müştərilərin ödəniş müddəti (30 gün) keçmiş qaimələri mövcuddur. Zəhmət olmasa dərhal borcun ödənilməsini tələb edin:
            </p>
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {overdueInvoices.map(inv => (
                <div key={inv.id} className="bg-white border border-rose-100 p-2 rounded-lg flex items-center justify-between">
                  <div className="min-w-0 pr-2">
                    <span className="font-bold text-slate-800 block text-[11px] truncate">{inv.customerName}</span>
                    <span className="text-[10px] text-slate-500 block font-mono">
                      QM {inv.invoiceNumber} ({inv.invoiceDate})
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-mono font-bold text-rose-600 block text-xs">{formatAZN(inv.totalAmount)}</span>
                    <span className="text-[8px] bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded font-bold uppercase mt-0.5 inline-block">
                      {inv.overdueDays} gün gecikib
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Debt KPI Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Ümumi Faturalanan</span>
            <span className="text-2xl font-mono font-bold text-slate-800 mt-1 block">{formatAZN(totalInvoiced)}</span>
            <span className="text-[11px] text-slate-400 mt-1.5 block">Yazılmış bütün qaimələrin cəmi</span>
          </div>
          <div className="p-3 rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] text-emerald-700 font-bold block uppercase tracking-wider">Cəmi Mədaxil (Yığılan)</span>
            <span className="text-2xl font-mono font-bold text-emerald-600 mt-1 block">{formatAZN(totalCollected)}</span>
            <span className="text-[11px] text-slate-400 mt-1.5 block">Müştərilərdən qəbul edilmiş ödənişlər</span>
          </div>
          <div className="p-3 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
            <CheckCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] text-rose-700 font-bold block uppercase tracking-wider">Qalıq Borc (Yığılmalı)</span>
            <span className="text-2xl font-mono font-bold text-rose-600 mt-1 block">{formatAZN(totalOutstanding)}</span>
            <span className="text-[11px] text-slate-400 mt-1.5 block">Hələ ödənilməmiş debitor borclar</span>
          </div>
          <div className="p-3 rounded-lg bg-rose-50 text-rose-600 border border-rose-100">
            <CreditCard className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Lists Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start w-full max-w-full overflow-hidden">
        {/* Debtor Customers list (2 columns width) */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 md:p-5 space-y-4 lg:col-span-2 flex flex-col min-h-[400px] w-full max-w-full overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h4 className="font-bold text-slate-700 tracking-tight uppercase text-xs">Borclu Müştərilər Siyahısı</h4>
              <p className="text-[11px] text-slate-400">Yalnız qalıq borcu olan müştərilər göstərilir</p>
            </div>
            <div className="relative max-w-xs w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
              <input 
                type="text" 
                placeholder="Müştəri axtar..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-900 focus:outline-hidden focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Desktop Table View */}
          <div className="overflow-x-auto flex-1 hidden md:block">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-[10px] text-slate-500 uppercase tracking-[0.1em] border-b border-slate-200">
                  <th className="px-6 py-4 font-semibold">Müştəri adı</th>
                  <th className="px-6 py-4 text-right font-semibold">Dövriyyə</th>
                  <th className="px-6 py-4 text-right font-semibold">Ödənilmiş</th>
                  <th className="px-6 py-4 text-right font-semibold">Qalıq Borc</th>
                  <th className="px-6 py-4 text-right font-semibold">Ödəniş</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {debtorCustomers.map((cust) => {
                  const paidPercentage = Math.round((cust.paidAmount / cust.totalAmount) * 100);
                  const overdue = hasOverdueInvoices(cust);
                  return (
                    <tr key={cust.id} className={`transition duration-150 ${overdue ? "bg-rose-50/20 hover:bg-rose-50/45 border-l-2 border-l-rose-500" : "hover:bg-indigo-50/30"}`}>
                      <td className="px-6 py-3.5">
                        <div className="flex items-center space-x-2">
                          <div className="font-semibold text-slate-700 text-sm">{cust.name}</div>
                          {overdue && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-rose-100 text-rose-850 border border-rose-200">
                              Vaxtı Keçib
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-2 mt-1">
                          <div className="w-20 bg-slate-100 h-1 rounded-full overflow-hidden">
                            <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${paidPercentage}%` }}></div>
                          </div>
                          <span className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">{paidPercentage}% ödəndi</span>
                        </div>
                      </td>
                      <td className="px-6 py-3.5 text-right font-mono text-xs font-semibold text-slate-880">{formatAZN(cust.totalAmount)}</td>
                      <td className="px-6 py-3.5 text-right font-mono text-xs text-emerald-600 font-semibold">{formatAZN(cust.paidAmount)}</td>
                      <td className="px-6 py-3.5 text-right font-mono font-bold">
                        <div className="flex flex-col items-end">
                          <span className={overdue ? "text-rose-700 text-sm flex items-center gap-1 bg-rose-100/50 border border-rose-200 px-2.5 py-0.5 rounded-lg font-bold" : "text-rose-600 text-sm"}>
                            {overdue && <AlertCircle className="w-3.5 h-3.5 text-rose-600 animate-bounce" />}
                            {formatAZN(cust.debtAmount)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        <button 
                           onClick={() => handleOpenPaymentModal(cust)}
                          className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-semibold transition inline-flex items-center space-x-1 cursor-pointer"
                        >
                          <PlusCircle className="w-3.5 h-3.5" />
                          <span>Ödə</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {debtorCustomers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400 font-semibold">
                      Hazırda heç bir müştərinin aktiv borcu yoxdur. Əla nəticə!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards View */}
          <div className="block md:hidden overflow-y-auto flex-1 mt-2 space-y-3">
            {debtorCustomers.map((cust) => {
              const paidPercentage = Math.round((cust.paidAmount / cust.totalAmount) * 100);
              const overdue = hasOverdueInvoices(cust);
              return (
                <div 
                  key={cust.id}
                  className={`bg-slate-50 p-4 rounded-xl border transition-all duration-150 ${
                    overdue ? "border-rose-200 bg-rose-50/10 border-l-4 border-l-rose-500" : "border-slate-150"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-3 min-w-0">
                    <div className="flex items-center space-x-2 min-w-0 flex-1">
                      <div className="font-bold text-slate-800 text-sm truncate min-w-0 flex-1">{cust.name}</div>
                      {overdue && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-rose-100 text-rose-850 border border-rose-200 shrink-0">
                          Vaxtı Keçib
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold shrink-0">{paidPercentage}% ödəndi</span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-slate-200 h-1 rounded-full overflow-hidden mb-4">
                    <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${paidPercentage}%` }}></div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-xs mb-4 pb-4 border-b border-dashed border-slate-200">
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-400 font-medium">Cəmi Satış:</span>
                      <span className="font-semibold text-slate-700 font-mono truncate">{formatAZN(cust.totalAmount)}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-400 font-medium">Ödənilən:</span>
                      <span className="font-semibold text-emerald-600 font-mono truncate">{formatAZN(cust.paidAmount)}</span>
                    </div>
                    <div className="flex justify-between col-span-1 sm:col-span-2 pt-1 border-t border-slate-100 items-center gap-2">
                      <span className="text-slate-550 font-bold">Qalıq Borc:</span>
                      <span className={`font-mono font-black text-sm ${overdue ? "text-rose-700 bg-rose-100/60 px-2 py-0.5 rounded border border-rose-200 font-black" : "text-rose-600"}`}>
                        {formatAZN(cust.debtAmount)}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end">
                    <button 
                      onClick={() => handleOpenPaymentModal(cust)}
                      className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition flex items-center justify-center space-x-1.5 cursor-pointer shadow-xs"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>Ödəniş Qəbul Et</span>
                    </button>
                  </div>
                </div>
              );
            })}
            {debtorCustomers.length === 0 && (
              <div className="py-12 text-center text-slate-400 font-medium text-xs bg-slate-50 rounded-xl border border-slate-200">
                Hazırda heç bir müştərinin aktiv borcu yoxdur. Əla nəticə!
              </div>
            )}
          </div>
        </div>

        {/* Payments History Log (1 column width) */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 md:p-5 space-y-4 w-full max-w-full overflow-hidden">
          <div>
            <h4 className="font-bold text-slate-700 tracking-tight uppercase text-xs">Son Mədaxil Jurnalı</h4>
            <p className="text-[11px] text-slate-400">Son qəbul edilmiş ödəniş sənədləri</p>
          </div>

          <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
            {allPayments.map((pay, idx) => (
              <div key={pay.id || idx} className="bg-slate-50 p-3 rounded-lg border border-slate-150 space-y-2 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-1 bg-emerald-500 h-full"></div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700 text-xs truncate max-w-[140px]">{pay.customerName}</span>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold text-emerald-600 text-xs">+{formatAZN(pay.amount)}</span>
                    {isAdmin && (
                      deletePaymentConfirmId === pay.id ? (
                        <span className="flex items-center space-x-1">
                          <button
                            onClick={() => {
                              handleDeletePayment(pay.id);
                              setDeletePaymentConfirmId(null);
                            }}
                            className="px-2 py-0.5 text-[9px] font-bold uppercase rounded bg-rose-600 hover:bg-rose-700 text-white transition cursor-pointer animate-pulse animate-duration-1000"
                          >
                            Sil
                          </button>
                          <button
                            onClick={() => setDeletePaymentConfirmId(null)}
                            className="px-2 py-0.5 text-[9px] font-bold uppercase rounded bg-slate-200 text-slate-600 hover:bg-slate-300 transition cursor-pointer"
                          >
                            X
                          </button>
                        </span>
                      ) : (
                        <button 
                          onClick={() => setDeletePaymentConfirmId(pay.id)}
                          className="text-slate-450 hover:text-rose-600 p-1 rounded-md hover:bg-rose-50 hover:border-rose-100 border border-transparent transition cursor-pointer"
                          title="Ödənişi Sil / Geri Al"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span className="flex items-center">
                    <Clock className="w-3 h-3 mr-1" />
                    {pay.paymentDate}
                  </span>
                  <span className="italic truncate max-w-[150px] font-medium text-slate-500">
                    {pay.invoiceNumber ? `Qaimə: ${pay.invoiceNumber}` : `"${pay.note}"`}
                  </span>
                </div>
              </div>
            ))}
            {allPayments.length === 0 && (
              <div className="text-center py-12 text-slate-400 text-xs">
                Sistemdə hələ heç bir ödəniş mədaxil edilməyib.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Payment Entry Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl border border-slate-200 max-w-md w-full p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold font-display text-slate-900">Ödəniş Mədaxili (Borc Ödənməsi)</h3>
              <button 
                onClick={() => setShowPaymentModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handlePaymentSubmit} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase tracking-wider">Müştəri Seçimi</label>
                <select 
                  value={selectedCustId}
                  onChange={(e) => handleCustomerChange(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:border-indigo-500"
                  required
                >
                  <option value="">Seçin...</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} (Qalıq borc: {formatAZN(c.debtAmount)})
                    </option>
                  ))}
                </select>
              </div>

              {selectedCustId && (
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase tracking-wider">Ödəniləcək Qaimə (Könüllü)</label>
                  <select 
                    value={selectedInvoiceId}
                    onChange={(e) => handleInvoiceChange(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:border-indigo-500 font-mono"
                  >
                    <option value="">Ümumi Müştəri Balansı (Sərbəst Mədaxil)</option>
                    {customers
                      .find(c => c.id === selectedCustId)
                      ?.invoices?.filter(inv => inv.status !== "paid")
                      .map(inv => (
                        <option key={inv.id} value={inv.id}>
                          {inv.invoiceNumber} ({inv.invoiceDate}) - {formatAZN(inv.totalAmount)}
                        </option>
                      ))}
                  </select>
                  <p className="text-[9px] text-slate-400 mt-1">
                    Qaimə seçildikdə məbləğ və qeyd avtomatik doldurulur və təsdiqdən sonra həmin qaimə "Ödənilmiş qaimələr" siyahısına keçir.
                  </p>
                </div>
              )}

              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase tracking-wider">Ödənilən Məbləğ (AZN)</label>
                <input 
                  type="number" 
                  step="0.01"
                  placeholder="0.00"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:border-indigo-500 font-mono font-bold"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase tracking-wider">Ödəniş Tarixi</label>
                <input 
                  type="date" 
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase tracking-wider">Qeyd / Note</label>
                <input 
                  type="text" 
                  placeholder="Məs. Köçürmə ilə qalıq borc bağlandı"
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2 border-t border-slate-100">
                <button 
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                >
                  Ləğv Et
                </button>
                <button 
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition cursor-pointer shadow-md flex items-center space-x-1.5"
                >
                  {submitting ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : null}
                  <span>Mədaxil Et</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
