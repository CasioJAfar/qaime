import React, { useState } from "react";
import { 
  Users, 
  Search, 
  Plus, 
  ChevronRight, 
  FileText, 
  CheckCircle, 
  TrendingUp, 
  AlertCircle,
  X,
  CreditCard,
  Calendar,
  DollarSign,
  Trash2
} from "lucide-react";
import { Customer, Invoice, Payment } from "../types";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from "recharts";

interface CustomersViewProps {
  customers: Customer[];
  loading: boolean;
  onCustomerAdded: () => void;
  selectedCustomer: Customer | null;
  setSelectedCustomer: (customer: Customer | null) => void;
  showToast?: (message: string, type?: "success" | "error" | "info") => void;
  currency?: string;
}

export default function CustomersView({ 
  customers, 
  loading, 
  onCustomerAdded,
  selectedCustomer,
  setSelectedCustomer,
  showToast,
  currency = "AZN"
}: CustomersViewProps) {
  const [search, setSearch] = useState("");
  const savedUser = localStorage.getItem("erp_user");
  const isAdmin = savedUser ? JSON.parse(savedUser).role === "admin" : false;
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerCode, setNewCustomerCode] = useState("");
  
  // Custom inline deletion confirmation state
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  
  // Search within selected customer's invoice ledger
  const [ledgerSearch, setLedgerSearch] = useState("");

  const formatAZN = (val: number) => {
    return new Intl.NumberFormat("az-AZ", { style: "currency", currency }).format(val);
  };

  // Dynamic payment history chart data
  const paymentChartData = React.useMemo(() => {
    if (!selectedCustomer || !selectedCustomer.payments || selectedCustomer.payments.length === 0) {
      return [];
    }
    
    const dateMap: Record<string, number> = {};
    selectedCustomer.payments.forEach(p => {
      const dateStr = p.paymentDate || new Date(p.createdAt || Date.now()).toISOString().split("T")[0];
      dateMap[dateStr] = (dateMap[dateStr] || 0) + p.amount;
    });

    const sortedDates = Object.keys(dateMap).sort();
    
    let runningTotal = 0;
    return sortedDates.map(date => {
      runningTotal += dateMap[date];
      return {
        date,
        amount: dateMap[date],
        totalPaid: runningTotal
      };
    });
  }, [selectedCustomer]);

  const handleDeleteCustomer = async (id: string) => {
    try {
      const res = await fetch(`/api/customers/${id}`, {
        method: "DELETE"
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Müştəri silinərkən xəta baş verdi.");
      }

      if (showToast) {
        showToast("Müştəri uğurla silindi!", "success");
      }
      onCustomerAdded();
      if (selectedCustomer?.id === id) {
        setSelectedCustomer(null);
      }
    } catch (err: any) {
      alert(err.message);
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

      if (showToast) {
        showToast("Ödəniş uğurla silindi/geri alındı!", "success");
      }
      onCustomerAdded();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerName.trim()) return;

    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCustomerName, code: newCustomerCode })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Müştəri əlavə edilmədi.");
      }

      if (showToast) {
        showToast("Müştəri uğurla əlavə edildi!", "success");
      }
      setNewCustomerName("");
      setNewCustomerCode("");
      setShowAddModal(false);
      onCustomerAdded();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 flex overflow-hidden bg-[#F8FAFC]">
      {/* Main Customers List */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 shrink-0">
          <div>
            <h2 className="text-xl font-semibold text-slate-800 tracking-tight">Müştəri Portfeli</h2>
            <p className="text-xs text-slate-500">Müştərilərin siyahısı, dövriyyəsi, ödənişləri və qalıq borcları.</p>
          </div>
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition cursor-pointer shadow-md shadow-indigo-600/10 self-start md:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Müştəri Əlavə Et</span>
          </button>
        </div>

        {/* Filter and Table Card */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 md:p-5 space-y-4 md:flex-1 md:flex md:flex-col md:overflow-hidden md:min-h-[400px]">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shrink-0">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input 
                type="text" 
                placeholder="Müştəri adı ilə axtar..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-4 py-2 text-xs text-slate-900 focus:outline-hidden focus:border-indigo-500"
              />
            </div>
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              Cəmi: <span className="font-bold text-slate-950">{filteredCustomers.length}</span> müştəri tapıldı
            </div>
          </div>

          <div className="md:flex-1 md:overflow-y-auto">
            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center space-y-3">
                <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-slate-500 text-xs">Müştərilər yüklənir...</p>
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden md:block">
                  <table className="w-full text-left">
                    <thead className="sticky top-0 bg-white z-10 shadow-xs">
                      <tr className="bg-slate-50 text-[10px] text-slate-500 uppercase tracking-[0.1em] border-b border-slate-200">
                        <th className="px-6 py-4 font-semibold">Müştəri adı</th>
                        <th className="px-6 py-4 font-semibold text-center">Qaimə Sayı</th>
                        <th className="px-6 py-4 font-semibold text-right">Cəmi Satış</th>
                        <th className="px-6 py-4 font-semibold text-right">Ödənilmiş</th>
                        <th className="px-6 py-4 font-semibold text-right">Qalıq Borc</th>
                        <th className="px-6 py-4 font-semibold text-right">Fəaliyyət</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {filteredCustomers.map((cust) => {
                        const hasDebt = cust.debtAmount > 0.01;
                        return (
                          <tr 
                            key={cust.id} 
                            onClick={() => setSelectedCustomer(cust)}
                            className={`hover:bg-indigo-50/30 transition duration-150 cursor-pointer ${
                              selectedCustomer?.id === cust.id ? "bg-indigo-50/40" : ""
                            }`}
                          >
                            <td className="px-6 py-3.5">
                              <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 rounded bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs font-display shrink-0">
                                  {cust.name.substring(0, 2).toUpperCase()}
                                </div>
                                <div className="flex flex-col">
                                  <span className="font-semibold text-slate-700 text-sm">{cust.name}</span>
                                  {cust.code && (
                                    <span className="text-[10px] text-slate-500 font-mono mt-0.5">{cust.code}</span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-3.5 text-center text-sm font-mono text-slate-500">
                              {cust.invoices ? cust.invoices.length : 0}
                            </td>
                            <td className="px-6 py-3.5 text-right font-mono text-sm font-bold text-slate-800">
                              {formatAZN(cust.totalAmount)}
                            </td>
                            <td className="px-6 py-3.5 text-right font-mono text-sm font-bold text-emerald-600">
                              {formatAZN(cust.paidAmount)}
                            </td>
                            <td className="px-6 py-3.5 text-right font-mono text-sm">
                              <span className={`font-bold ${hasDebt ? "text-rose-600" : "text-slate-400"}`}>
                                {formatAZN(cust.debtAmount)}
                              </span>
                            </td>
                            <td className="px-6 py-3.5 text-right">
                              <div className="flex items-center justify-end space-x-2">
                                <button 
                                  onClick={(e) => { e.stopPropagation(); setSelectedCustomer(cust); }}
                                  className="px-3 py-1 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded text-xs font-medium text-slate-600 transition cursor-pointer"
                                >
                                  Bax
                                </button>
                                {isAdmin && (
                                  deleteConfirmId === cust.id ? (
                                    <div className="flex items-center space-x-1" onClick={(e) => e.stopPropagation()}>
                                      <button 
                                        onClick={() => {
                                          handleDeleteCustomer(cust.id);
                                          setDeleteConfirmId(null);
                                        }}
                                        className="px-2 py-1 text-[10px] font-bold uppercase rounded bg-rose-600 hover:bg-rose-700 text-white transition cursor-pointer animate-pulse"
                                      >
                                        Bəli
                                      </button>
                                      <button 
                                        onClick={() => setDeleteConfirmId(null)}
                                        className="px-2 py-1 text-[10px] font-bold uppercase rounded bg-slate-200 text-slate-600 hover:bg-slate-300 transition cursor-pointer"
                                      >
                                        Xeyr
                                      </button>
                                    </div>
                                  ) : (
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setDeleteConfirmId(cust.id);
                                      }}
                                      className="p-1 rounded bg-slate-50 hover:bg-rose-50 border border-slate-200 hover:border-rose-100 text-slate-600 hover:text-rose-600 transition cursor-pointer"
                                      title="Sil"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {filteredCustomers.length === 0 && (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-slate-400">
                            Axtarışa uyğun heç bir müştəri tapılmadı.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards View */}
                <div className="block md:hidden space-y-3">
                  {filteredCustomers.map((cust) => {
                    const hasDebt = cust.debtAmount > 0.01;
                    return (
                      <div 
                        key={cust.id}
                        onClick={() => setSelectedCustomer(cust)}
                        className={`bg-slate-50 p-4 rounded-xl border transition-all duration-150 cursor-pointer ${
                          selectedCustomer?.id === cust.id ? "border-indigo-500 bg-indigo-50/20 shadow-xs" : "border-slate-150 hover:border-slate-200"
                        }`}
                      >
                        <div className="flex items-center space-x-3 mb-3">
                          <div className="w-8 h-8 rounded bg-indigo-500/10 text-indigo-700 flex items-center justify-center font-bold text-xs font-display shrink-0">
                            {cust.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div className="flex flex-col min-w-0 flex-1">
                            <span className="font-bold text-slate-800 text-sm truncate">{cust.name}</span>
                            {cust.code && (
                              <span className="text-[10px] text-slate-500 font-mono mt-0.5 truncate">{cust.code}</span>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs mb-3 pb-3 border-b border-dashed border-slate-200">
                          <div className="flex justify-between">
                            <span className="text-slate-400 font-medium">Qaimə Sayı:</span>
                            <span className="font-semibold text-slate-700 font-mono">{cust.invoices ? cust.invoices.length : 0}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400 font-medium">Satış:</span>
                            <span className="font-semibold text-slate-700 font-mono">{formatAZN(cust.totalAmount)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400 font-medium">Ödənilən:</span>
                            <span className="font-semibold text-emerald-600 font-mono">{formatAZN(cust.paidAmount)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400 font-medium">Borc:</span>
                            <span className={`font-mono font-bold ${hasDebt ? "text-rose-600" : "text-slate-500"}`}>{formatAZN(cust.debtAmount)}</span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-end space-x-2" onClick={(e) => e.stopPropagation()}>
                          {deleteConfirmId === cust.id ? (
                            <div className="flex items-center space-x-1.5 w-full justify-between">
                              <span className="text-[10px] text-rose-600 font-bold uppercase">Silinsin?</span>
                              <div className="flex space-x-1">
                                <button 
                                  onClick={() => {
                                    handleDeleteCustomer(cust.id);
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
                                onClick={() => setSelectedCustomer(cust)}
                                className="flex-1 py-1.5 px-3 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-bold transition cursor-pointer flex items-center justify-center space-x-1"
                              >
                                <span>Detallara Bax</span>
                              </button>
                              {isAdmin && (
                                <button 
                                  onClick={() => setDeleteConfirmId(cust.id)}
                                  className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {filteredCustomers.length === 0 && (
                    <div className="py-12 text-center text-slate-400 font-medium text-xs bg-slate-50 rounded-xl border border-slate-200">
                      Axtarışa uyğun heç bir müştəri tapılmadı.
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Slide-out Panel: Detailed customer ledger cards */}
      {selectedCustomer && (
        <>
          {/* Backdrop only on mobile */}
          <div 
            className="md:hidden fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-45"
            onClick={() => setSelectedCustomer(null)}
          ></div>

          <div className="w-full max-w-md md:w-[450px] bg-white border-l border-slate-200 shadow-2xl flex flex-col h-full shrink-0 fixed md:static right-0 top-0 bottom-0 z-50 animate-in slide-in-from-right duration-200">
          {/* Header */}
          <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded bg-indigo-600 text-white flex items-center justify-center font-bold font-display shadow-md shadow-indigo-600/10">
                {selectedCustomer.name.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <h3 className="text-sm font-bold font-display text-slate-900 leading-tight">
                  {selectedCustomer.name}
                </h3>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block mt-0.5">Müştəri Hesab Kartı</span>
              </div>
            </div>
            <button 
              onClick={() => setSelectedCustomer(null)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* Quick Financial Overview inside panel */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-center">
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Cəmi Satış</span>
                <span className="block font-mono font-bold text-slate-800 text-xs mt-1">
                  {formatAZN(selectedCustomer.totalAmount)}
                </span>
              </div>
              <div className="bg-emerald-50/50 p-3 rounded-lg border border-emerald-100 text-center">
                <span className="text-[10px] text-emerald-700 uppercase font-bold tracking-wider">Ödənilən</span>
                <span className="block font-mono font-bold text-emerald-600 text-xs mt-1">
                  {formatAZN(selectedCustomer.paidAmount)}
                </span>
              </div>
              <div className={`p-3 rounded-lg text-center border ${
                selectedCustomer.debtAmount > 0.01 
                  ? "bg-rose-50 border-rose-100 text-rose-800" 
                  : "bg-slate-50 border-slate-100 text-slate-500"
              }`}>
                <span className="text-[10px] uppercase font-bold tracking-wider">Qalıq Borc</span>
                <span className="block font-mono font-bold text-xs mt-1">
                  {formatAZN(selectedCustomer.debtAmount)}
                </span>
              </div>
            </div>

            {/* Ödəniş Dinamikası Line Chart */}
            <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 space-y-2">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block flex items-center">
                <TrendingUp className="w-3.5 h-3.5 mr-1 text-slate-400" />
                Ödəniş Dinamikası (Kumulyativ)
              </span>
              {paymentChartData.length > 0 ? (
                <div className="h-32 w-full pt-1.5">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={paymentChartData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis 
                        dataKey="date" 
                        tickLine={false} 
                        axisLine={false} 
                        tickFormatter={(val) => {
                          const parts = val.split("-");
                          return parts.length === 3 ? `${parts[2]}/${parts[1]}` : val;
                        }}
                        tick={{ fontSize: 9, fill: "#94a3b8" }}
                      />
                      <YAxis 
                        tickLine={false} 
                        axisLine={false}
                        tick={{ fontSize: 9, fill: "#94a3b8" }}
                      />
                      <Tooltip 
                        formatter={(value) => [`${formatAZN(Number(value))}`, "Cəmi Ödəniş"]}
                        contentStyle={{ backgroundColor: "#1e293b", borderRadius: "6px", border: "none", color: "#fff", fontSize: "10px" }}
                      />
                      <Line type="monotone" dataKey="totalPaid" stroke="#4f46e5" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="text-center text-xs text-slate-400 py-4 font-medium italic">
                  Ödəniş qeydə alınmayıb.
                </div>
              )}
            </div>

            {/* Invoices List for Customer */}
            <div className="space-y-3">
              <div className="flex flex-col space-y-2">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center">
                  <FileText className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                  Müştərinin Qaimələri ({selectedCustomer.invoices ? selectedCustomer.invoices.length : 0})
                </h4>
                
                {/* Search Bar inside detailed ledger */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 w-3 h-3" />
                  <input 
                    type="text" 
                    placeholder="Qaimə no, tarix və ya məhsul adı ilə axtar..."
                    value={ledgerSearch}
                    onChange={(e) => setLedgerSearch(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-7 py-1 text-[11px] text-slate-900 focus:outline-hidden focus:border-indigo-500 font-medium"
                  />
                  {ledgerSearch && (
                    <button 
                      type="button"
                      onClick={() => setLedgerSearch("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {selectedCustomer.invoices && selectedCustomer.invoices.length > 0 ? (() => {
                  const filteredLedgerInvoices = selectedCustomer.invoices.filter(inv => {
                    if (!ledgerSearch.trim()) return true;
                    const s = ledgerSearch.toLowerCase().trim();
                    const matchesNumber = inv.invoiceNumber.toLowerCase().includes(s);
                    const matchesDate = inv.invoiceDate.toLowerCase().includes(s);
                    const matchesItem = inv.items && inv.items.some(item => 
                      item.name && item.name.toLowerCase().includes(s)
                    );
                    return matchesNumber || matchesDate || matchesItem;
                  });

                  if (filteredLedgerInvoices.length === 0) {
                    return (
                      <div className="text-center text-xs text-slate-400 py-6 border border-dashed border-slate-200 rounded-lg">
                        Axtarışa uyğun qaimə tapılmadı.
                      </div>
                    );
                  }

                  return filteredLedgerInvoices.map((inv) => (
                    <div key={inv.id} className="bg-white p-3 rounded-lg border border-slate-100 hover:border-slate-200 transition flex flex-col space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-mono font-bold text-xs text-slate-900">{inv.invoiceNumber}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">{inv.invoiceDate}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-mono font-bold text-xs text-indigo-600">{formatAZN(inv.totalAmount)}</div>
                          <div className="text-[10px] text-slate-400 mt-1">
                            {inv.status === "paid" ? (
                              <span className="text-emerald-600 font-bold bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider">Ödənilib</span>
                            ) : (
                              <span className="text-amber-600 font-bold bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider">Gözləyir</span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Items previews */}
                      {inv.items && inv.items.length > 0 && (
                        <div className="bg-slate-50/50 p-1.5 rounded text-[10px] text-slate-500 font-medium space-y-0.5 border border-slate-100/50">
                          {inv.items.map((item, index) => (
                            <div key={index} className="flex justify-between items-center">
                              <span className="truncate max-w-[200px] text-slate-600">{item.name || "Naməlum məhsul"}</span>
                              <span className="font-mono text-slate-400 text-[9px] shrink-0">{item.quantity} ədəd</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ));
                })() : (
                  <div className="text-center text-xs text-slate-400 py-6 border border-dashed border-slate-200 rounded-lg">
                    Hələ qaimə yazılmayıb.
                  </div>
                )}
              </div>
            </div>

            {/* Payments List for Customer */}
            <div className="space-y-2 border-t border-slate-100 pt-4">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center">
                <CreditCard className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                Ödəniş Tarixçəsi ({selectedCustomer.payments ? selectedCustomer.payments.length : 0})
              </h4>

              <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                {selectedCustomer.payments && selectedCustomer.payments.length > 0 ? (
                  selectedCustomer.payments.map((pay) => (
                    <div key={pay.id} className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="font-semibold text-xs text-emerald-700 flex items-center">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          <span>Mədaxil</span>
                        </div>
                        <div className="text-[10px] text-slate-400">{pay.paymentDate}</div>
                        <div className="text-[10px] text-slate-500 font-medium italic">"{pay.note}"</div>
                      </div>
                      <div className="flex flex-col items-end justify-between self-stretch">
                        <div className="text-right font-mono font-bold text-emerald-600 text-xs mt-0.5">
                          +{formatAZN(pay.amount)}
                        </div>
                        {isAdmin && (
                          deletePaymentConfirmId === pay.id ? (
                            <div className="flex items-center space-x-1 mt-2">
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
                            </div>
                          ) : (
                            <button 
                              onClick={() => setDeletePaymentConfirmId(pay.id)}
                              className="mt-2 text-slate-400 hover:text-rose-650 p-1 rounded-md hover:bg-rose-50 hover:border-rose-100 border border-transparent transition cursor-pointer"
                              title="Ödənişi Sil / Geri Al"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-xs text-slate-400 py-6 border border-dashed border-slate-200 rounded-lg">
                    Ödəniş tarixi yoxdur.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        </>
      )}

      {/* Add Customer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl border border-slate-200 max-w-md w-full p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold font-display text-slate-900">Müştəri Kartı Yarat</h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddCustomer} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase tracking-wider">Müştəri/Şirkət Adı</label>
                <input 
                  type="text" 
                  placeholder="Məs. Abşeron Tikinti MMC"
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase tracking-wider">Müştəri Kodu (VÖEN) (İstəyə bağlı)</label>
                <input 
                  type="text" 
                  placeholder="Məs. 3103396091"
                  value={newCustomerCode}
                  onChange={(e) => setNewCustomerCode(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:border-indigo-500 font-mono"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2 border-t border-slate-100">
                <button 
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                >
                  Ləğv Et
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition cursor-pointer shadow-md"
                >
                  Yarat
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
