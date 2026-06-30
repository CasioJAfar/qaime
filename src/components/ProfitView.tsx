import React, { useState, useEffect } from "react";
import { TrendingUp, Save, Search, CheckCircle2 } from "lucide-react";
import { Invoice } from "../types";

interface ProfitViewProps {
  invoices: Invoice[];
  currency?: string;
  showToast?: (message: string, type?: "success" | "error" | "info") => void;
}

export default function ProfitView({ invoices, currency = "AZN", showToast }: ProfitViewProps) {
  const formatAZN = (val: number) => {
    return new Intl.NumberFormat("az-AZ", { style: "currency", currency }).format(val);
  };

  const [activeTab, setActiveTab] = useState<"products" | "invoices">("products");
  
  // Profit paid invoices store: string[] (invoice IDs)
  const [profitPaidInvoices, setProfitPaidInvoices] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("profitPaidInvoices");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem("profitPaidInvoices", JSON.stringify(profitPaidInvoices));
  }, [profitPaidInvoices]);

  // Global products cost store: { "Product Name": { payee, serviceFee, costPrice } }
  const [productCosts, setProductCosts] = useState<Record<string, { payee: string; serviceFee: number; costPrice: number }>>(() => {
    try {
      const saved = localStorage.getItem("globalProductCosts");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    localStorage.setItem("globalProductCosts", JSON.stringify(productCosts));
  }, [productCosts]);

  // Extract unique products from all invoices
  const [searchQuery, setSearchQuery] = useState("");
  
  const allProducts = Array.from(
    new Map(
      invoices.flatMap(inv => inv.items.map(item => [item.name, item]))
    ).values()
  ).filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const [localProductInputs, setLocalProductInputs] = useState<Record<string, { payee: string; serviceFee: number; costPrice: number }>>({});

  // Initialize local inputs when changing products
  useEffect(() => {
    const init: Record<string, { payee: string; serviceFee: number; costPrice: number }> = {};
    allProducts.forEach(p => {
      init[p.name] = productCosts[p.name] || { payee: "", serviceFee: 0, costPrice: 0 };
    });
    setLocalProductInputs(init);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productCosts, invoices]); // Don't add allProducts to avoid infinite loop on typing search

  const handleUpdateLocalInput = (productName: string, field: string, value: any) => {
    setLocalProductInputs(prev => ({
      ...prev,
      [productName]: {
        ...(prev[productName] || { payee: "", serviceFee: 0, costPrice: 0 }),
        [field]: value
      }
    }));
  };

  const handleSaveProduct = (productName: string) => {
    setProductCosts(prev => ({
      ...prev,
      [productName]: localProductInputs[productName]
    }));
    if (showToast) showToast(`${productName} üçün məlumatlar yadda saxlanıldı`, "success");
  };

  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<string[]>([]);

  const handleToggleInvoice = (id: string) => {
    setSelectedInvoiceIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedInvoiceIds.length === invoices.length) {
      setSelectedInvoiceIds([]);
    } else {
      setSelectedInvoiceIds(invoices.map(i => i.id));
    }
  };

  const handleMarkAsPaid = () => {
    // Add all currently selected invoices to profitPaidInvoices if they are not already there
    setProfitPaidInvoices(prev => {
      const newPaid = new Set(prev);
      selectedInvoiceIds.forEach(id => newPaid.add(id));
      return Array.from(newPaid);
    });
    if (showToast) showToast("Seçilmiş qaimələr ödənildi kimi qeyd edildi", "success");
  };

  const selectedInvoices = invoices.filter(inv => selectedInvoiceIds.includes(inv.id));

  return (
    <div className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto bg-slate-50">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <TrendingUp className="w-8 h-8 text-indigo-600" />
              Xərc və Mənfəət Hesablama
            </h1>
            <p className="text-slate-500 mt-1 text-sm">
              Məhsullar üzrə maya dəyərini daxil edin və qaimələr üzrə mənfəəti hesablayın.
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200">
          <button
            className={`px-4 py-2 font-medium text-sm transition-colors ${activeTab === "products" ? "text-indigo-600 border-b-2 border-indigo-600" : "text-slate-500 hover:text-slate-700"}`}
            onClick={() => setActiveTab("products")}
          >
            Məhsullar (Maya Dəyəri)
          </button>
          <button
            className={`px-4 py-2 font-medium text-sm transition-colors ${activeTab === "invoices" ? "text-indigo-600 border-b-2 border-indigo-600" : "text-slate-500 hover:text-slate-700"}`}
            onClick={() => setActiveTab("invoices")}
          >
            Qaimələr üzrə Xeyir
          </button>
        </div>

        {/* Products Tab */}
        {activeTab === "products" && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
              <div className="relative w-full max-w-sm">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Məhsul axtar..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                />
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-50 text-[10px] text-slate-500 uppercase tracking-wider border-b border-slate-200">
                    <th className="px-4 py-3 font-semibold">Məhsulun Adı</th>
                    <th className="px-4 py-3 font-semibold text-right">Satış (1 əd)</th>
                    <th className="px-4 py-3 font-semibold">Ödəniş ediləcək şəxs</th>
                    <th className="px-4 py-3 font-semibold text-right">Xidmət haqqı (1 əd)</th>
                    <th className="px-4 py-3 font-semibold text-right">Maya dəyəri (1 əd)</th>
                    <th className="px-4 py-3 font-semibold text-center">Əməliyyat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {allProducts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                        {searchQuery ? "Axtarışa uyğun məhsul tapılmadı." : "Sistemdə məhsul yoxdur."}
                      </td>
                    </tr>
                  ) : (
                    allProducts.map((p, idx) => {
                      const data = localProductInputs[p.name] || { payee: "", serviceFee: 0, costPrice: 0 };
                      const isSaved = productCosts[p.name]?.payee === data.payee && 
                                      productCosts[p.name]?.serviceFee === data.serviceFee && 
                                      productCosts[p.name]?.costPrice === data.costPrice;

                      return (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3 font-medium text-slate-800">{p.name}</td>
                          <td className="px-4 py-3 text-right font-mono text-slate-600">{formatAZN(p.price)}</td>
                          <td className="px-4 py-3">
                            <input 
                              type="text" 
                              placeholder="Ad/Soyad"
                              value={data.payee}
                              onChange={(e) => handleUpdateLocalInput(p.name, "payee", e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-xs focus:outline-hidden focus:border-indigo-500"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input 
                              type="number" 
                              min="0" step="0.01"
                              value={data.serviceFee || ""}
                              onChange={(e) => handleUpdateLocalInput(p.name, "serviceFee", parseFloat(e.target.value) || 0)}
                              className="w-24 ml-auto block bg-white border border-slate-200 rounded px-2 py-1.5 text-xs text-right focus:outline-hidden focus:border-indigo-500"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input 
                              type="number" 
                              min="0" step="0.01"
                              value={data.costPrice || ""}
                              onChange={(e) => handleUpdateLocalInput(p.name, "costPrice", parseFloat(e.target.value) || 0)}
                              className="w-24 ml-auto block bg-white border border-slate-200 rounded px-2 py-1.5 text-xs text-right focus:outline-hidden focus:border-indigo-500"
                            />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => handleSaveProduct(p.name)}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                                isSaved 
                                ? "bg-emerald-50 text-emerald-600 border border-emerald-200" 
                                : "bg-indigo-600 text-white hover:bg-indigo-700"
                              }`}
                            >
                              {isSaved ? (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  Yaddaşdadır
                                </>
                              ) : (
                                <>
                                  <Save className="w-3.5 h-3.5" />
                                  Təsdiqlə
                                </>
                              )}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Invoices Profit Tab */}
        {activeTab === "invoices" && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-6">
            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Qaimələri Seçin</label>
                <button 
                  onClick={handleSelectAll}
                  className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  {selectedInvoiceIds.length === invoices.length ? "Bütün seçimləri ləğv et" : "Hamısını seç"}
                </button>
              </div>
              <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
                {invoices.length === 0 ? (
                  <div className="p-4 text-center text-sm text-slate-500">Qaimə tapılmadı.</div>
                ) : (
                  invoices.map(inv => (
                    <label key={inv.id} className={`flex items-center gap-3 p-3 cursor-pointer transition-colors ${profitPaidInvoices.includes(inv.id) ? "bg-emerald-50/70 hover:bg-emerald-50" : "hover:bg-slate-50"}`}>
                      <input 
                        type="checkbox"
                        checked={selectedInvoiceIds.includes(inv.id)}
                        onChange={() => handleToggleInvoice(inv.id)}
                        className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                      />
                      <div className="flex flex-col flex-1">
                        <span className="text-sm font-medium text-slate-800">{inv.invoiceNumber} - {inv.customerName}</span>
                        <span className="text-xs text-slate-500">{inv.invoiceDate} • {formatAZN(inv.totalAmount)}</span>
                      </div>
                      {profitPaidInvoices.includes(inv.id) && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold uppercase bg-emerald-50 text-emerald-600 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" />
                          Ödənilib
                        </span>
                      )}
                    </label>
                  ))
                )}
              </div>
            </div>

            {selectedInvoices.length > 0 && (
              <div className="space-y-6">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-[10px] text-slate-500 uppercase tracking-wider border-b border-slate-200">
                        <th className="px-4 py-3 font-semibold">Qaimə / Malın adı</th>
                        <th className="px-4 py-3 font-semibold text-center">Miqdar</th>
                        <th className="px-4 py-3 font-semibold text-right">Satış (1 əd)</th>
                        <th className="px-4 py-3 font-semibold">Ödəniş ediləcək şəxs</th>
                        <th className="px-4 py-3 font-semibold text-right">Xidmət haqqı (1 əd)</th>
                        <th className="px-4 py-3 font-semibold text-right">Maya dəyəri (1 əd)</th>
                        <th className="px-4 py-3 font-semibold text-right bg-indigo-50">Xalis Xeyir</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {selectedInvoices.map((invoice, invIdx) => (
                        <React.Fragment key={invoice.id}>
                          {/* Qaimə başlığı sətri */}
                          <tr className={profitPaidInvoices.includes(invoice.id) ? "bg-emerald-50/50" : "bg-slate-100/50"}>
                            <td colSpan={7} className={`px-4 py-2 text-xs font-bold border-t border-slate-200 flex justify-between items-center ${profitPaidInvoices.includes(invoice.id) ? "text-emerald-700" : "text-slate-600"}`}>
                              <span>{invoice.invoiceNumber} - {invoice.customerName}</span>
                              {profitPaidInvoices.includes(invoice.id) && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-emerald-100 text-emerald-700">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Ödənilib
                                </span>
                              )}
                            </td>
                          </tr>
                          {invoice.items.map((item, idx) => {
                            const globalData = productCosts[item.name] || { payee: "-", serviceFee: 0, costPrice: 0 };
                            
                            const totalServiceFee = globalData.serviceFee * item.quantity;
                            const totalCostPrice = globalData.costPrice * item.quantity;
                            const revenue = item.price * item.quantity;
                            const netProfit = revenue - totalCostPrice - totalServiceFee;

                            return (
                              <tr key={`${invoice.id}-${idx}`} className="hover:bg-slate-50/50">
                                <td className="px-4 py-3 font-medium text-slate-800 pl-8">{item.name}</td>
                                <td className="px-4 py-3 text-center font-mono text-slate-600">{item.quantity}</td>
                                <td className="px-4 py-3 text-right font-mono font-semibold text-slate-700">{formatAZN(item.price)}</td>
                                <td className="px-4 py-3 text-slate-600">{globalData.payee || "-"}</td>
                                <td className="px-4 py-3 text-right font-mono text-amber-600">{globalData.serviceFee > 0 ? formatAZN(globalData.serviceFee) : "-"}</td>
                                <td className="px-4 py-3 text-right font-mono text-rose-600">{globalData.costPrice > 0 ? formatAZN(globalData.costPrice) : "-"}</td>
                                <td className={`px-4 py-3 text-right font-mono font-bold bg-indigo-50/30 ${netProfit >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                                  {formatAZN(netProfit)}
                                </td>
                              </tr>
                            );
                          })}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>

                {(() => {
                  let overallTotalServiceFee = 0;
                  let overallTotalCostPrice = 0;
                  let overallRevenue = 0;

                  selectedInvoices.forEach(invoice => {
                    invoice.items.forEach((item) => {
                      const globalData = productCosts[item.name] || { serviceFee: 0, costPrice: 0 };
                      overallTotalServiceFee += globalData.serviceFee * item.quantity;
                      overallTotalCostPrice += globalData.costPrice * item.quantity;
                      overallRevenue += item.price * item.quantity;
                    });
                  });

                  const overallNetProfit = overallRevenue - overallTotalCostPrice - overallTotalServiceFee;

                  const selectedPaidCount = selectedInvoices.filter(inv => profitPaidInvoices.includes(inv.id)).length;
                  const allSelectedPaid = selectedInvoices.length > 0 && selectedPaidCount === selectedInvoices.length;

                  return (
                    <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider mb-1">Ümumi Satış (Seçilmiş)</span>
                          <span className="text-xl font-mono font-bold text-slate-800">{formatAZN(overallRevenue)}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider mb-1">Cəmi Maya Dəyəri</span>
                          <span className="text-xl font-mono font-bold text-rose-500">{formatAZN(overallTotalCostPrice)}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider mb-1">Cəmi Veriləcək Pul</span>
                          <span className="text-xl font-mono font-bold text-amber-500">{formatAZN(overallTotalServiceFee)}</span>
                        </div>
                        <div className="bg-indigo-100/50 p-4 rounded-lg border border-indigo-200 md:-mt-2 md:-mb-2 md:-mr-2">
                          <span className="text-[10px] text-indigo-500 font-bold uppercase block tracking-wider mb-1">Mənə Qalan Cəmi Xeyir</span>
                          <span className={`text-2xl font-mono font-black ${overallNetProfit >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                            {formatAZN(overallNetProfit)}
                          </span>
                        </div>
                      </div>
                      
                      <div className="mt-6 pt-6 border-t border-slate-200 flex justify-end">
                        <button
                          onClick={handleMarkAsPaid}
                          disabled={allSelectedPaid}
                          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            allSelectedPaid 
                            ? "bg-slate-200 text-slate-500 cursor-not-allowed" 
                            : "bg-emerald-600 hover:bg-emerald-700 text-white"
                          }`}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          {allSelectedPaid 
                            ? "Seçilənlər Artıq Ödənilib" 
                            : (selectedPaidCount > 0 
                                ? `Seçilənləri Ödənildi Kimi İşarələ (${selectedPaidCount}/${selectedInvoices.length} ödənilib)`
                                : "Seçilənləri Ödənildi Kimi İşarələ")}
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
            
            {selectedInvoices.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                Xeyiri görmək üçün ən azı bir qaimə seçin
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
