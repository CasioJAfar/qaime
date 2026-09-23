import React, { useState, useEffect, useMemo } from "react";
import { 
  TrendingUp, 
  Save, 
  Search, 
  CheckCircle2, 
  Users, 
  Layers, 
  X, 
  Filter, 
  ChevronDown, 
  ChevronRight,
  FileText,
  CheckSquare
} from "lucide-react";
import { Invoice, Customer } from "../types";

interface ProfitViewProps {
  invoices: Invoice[];
  customers?: Customer[];
  currency?: string;
  showToast?: (message: string, type?: "success" | "error" | "info") => void;
}

export default function ProfitView({ invoices, customers = [], currency = "AZN", showToast }: ProfitViewProps) {
  const formatAZN = (val: number) => {
    return `${new Intl.NumberFormat("az-AZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val)} ₼`;
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

  // Selected invoices for profit calculation
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<string[]>([]);

  // Search & Filters in Invoices Profit Tab
  const [invoiceSearchQuery, setInvoiceSearchQuery] = useState("");
  const [selectedCustomerFilter, setSelectedCustomerFilter] = useState("all");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<"all" | "paid" | "unpaid">("all");
  const [groupByCustomer, setGroupByCustomer] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  // Unique customers derived from invoices and customers list
  const customerOptions = useMemo(() => {
    const custMap = new Map<string, { name: string; code?: string; count: number; totalAmount: number }>();
    invoices.forEach(inv => {
      const name = inv.customerName || "Naməlum Müştəri";
      const existing = custMap.get(name);
      if (existing) {
        existing.count += 1;
        existing.totalAmount += inv.totalAmount || 0;
      } else {
        custMap.set(name, {
          name,
          code: inv.customerCode,
          count: 1,
          totalAmount: inv.totalAmount || 0
        });
      }
    });
    return Array.from(custMap.values()).sort((a, b) => a.name.localeCompare(b.name, "az"));
  }, [invoices]);

  // Filtered invoices according to customer, payment status, and search query
  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      // 1. Customer filter
      if (selectedCustomerFilter !== "all" && inv.customerName !== selectedCustomerFilter) {
        return false;
      }

      // 2. Payment status in profit tab
      const isPaid = profitPaidInvoices.includes(inv.id);
      if (paymentStatusFilter === "paid" && !isPaid) return false;
      if (paymentStatusFilter === "unpaid" && isPaid) return false;

      // 3. Search query: invoiceNumber, customerName, customerCode, item names, date
      if (invoiceSearchQuery.trim()) {
        const q = invoiceSearchQuery.toLowerCase();
        const matchNumber = inv.invoiceNumber?.toLowerCase().includes(q);
        const matchCustomer = inv.customerName?.toLowerCase().includes(q);
        const matchCode = inv.customerCode?.toLowerCase().includes(q);
        const matchDate = inv.invoiceDate?.toLowerCase().includes(q);
        const matchItems = inv.items?.some(it => it.name.toLowerCase().includes(q));
        if (!matchNumber && !matchCustomer && !matchCode && !matchDate && !matchItems) {
          return false;
        }
      }

      return true;
    });
  }, [invoices, selectedCustomerFilter, paymentStatusFilter, invoiceSearchQuery, profitPaidInvoices]);

  // Grouped filtered invoices by customer
  const groupedFilteredInvoices = useMemo(() => {
    const groups: Record<string, { customerName: string; customerCode?: string; invoices: Invoice[]; totalAmount: number }> = {};
    filteredInvoices.forEach(inv => {
      const key = inv.customerName || "Naməlum Müştəri";
      if (!groups[key]) {
        groups[key] = {
          customerName: key,
          customerCode: inv.customerCode,
          invoices: [],
          totalAmount: 0
        };
      }
      groups[key].invoices.push(inv);
      groups[key].totalAmount += inv.totalAmount || 0;
    });
    return Object.values(groups).sort((a, b) => a.customerName.localeCompare(b.customerName, "az"));
  }, [filteredInvoices]);

  const toggleGroupCollapse = (customerName: string) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [customerName]: !prev[customerName]
    }));
  };

  const handleToggleInvoice = (id: string) => {
    setSelectedInvoiceIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSelectFiltered = () => {
    const filteredIds = filteredInvoices.map(i => i.id);
    const allFilteredSelected = filteredIds.length > 0 && filteredIds.every(id => selectedInvoiceIds.includes(id));
    if (allFilteredSelected) {
      // Deselect filtered
      setSelectedInvoiceIds(prev => prev.filter(id => !filteredIds.includes(id)));
    } else {
      // Select all filtered
      setSelectedInvoiceIds(prev => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  const handleSelectCustomerGroup = (customerName: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const custInvoiceIds = invoices.filter(i => (i.customerName || "Naməlum Müştəri") === customerName).map(i => i.id);
    const allSelected = custInvoiceIds.length > 0 && custInvoiceIds.every(id => selectedInvoiceIds.includes(id));
    if (allSelected) {
      setSelectedInvoiceIds(prev => prev.filter(id => !custInvoiceIds.includes(id)));
    } else {
      setSelectedInvoiceIds(prev => Array.from(new Set([...prev, ...custInvoiceIds])));
    }
  };

  const handleSelectAll = () => {
    if (selectedInvoiceIds.length === invoices.length) {
      setSelectedInvoiceIds([]);
    } else {
      setSelectedInvoiceIds(invoices.map(i => i.id));
    }
  };

  const handleClearAllSelection = () => {
    setSelectedInvoiceIds([]);
  };

  const handleResetFilters = () => {
    setInvoiceSearchQuery("");
    setSelectedCustomerFilter("all");
    setPaymentStatusFilter("all");
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
            
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
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

            {/* Mobile Cards View */}
            <div className="block md:hidden space-y-4">
              {allProducts.length === 0 ? (
                <div className="p-8 text-center text-slate-500 bg-slate-50 rounded-lg border border-slate-200">
                  {searchQuery ? "Axtarışa uyğun məhsul tapılmadı." : "Sistemdə məhsul yoxdur."}
                </div>
              ) : (
                allProducts.map((p, idx) => {
                  const data = localProductInputs[p.name] || { payee: "", serviceFee: 0, costPrice: 0 };
                  const isSaved = productCosts[p.name]?.payee === data.payee && 
                                  productCosts[p.name]?.serviceFee === data.serviceFee && 
                                  productCosts[p.name]?.costPrice === data.costPrice;

                  return (
                    <div key={idx} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
                      <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                        <h3 className="font-bold text-slate-800 text-sm leading-tight pr-2">{p.name}</h3>
                        <span className="font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded text-xs whitespace-nowrap shrink-0">{formatAZN(p.price)}</span>
                      </div>
                      
                      <div className="space-y-3 pt-1">
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Ödəniş ediləcək şəxs</label>
                          <input 
                            type="text" 
                            placeholder="Ad/Soyad"
                            value={data.payee}
                            onChange={(e) => handleUpdateLocalInput(p.name, "payee", e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-hidden focus:border-indigo-500 focus:bg-white transition-colors"
                          />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Xidmət haqqı (1 əd)</label>
                            <input 
                              type="number" 
                              min="0" step="0.01"
                              value={data.serviceFee || ""}
                              onChange={(e) => handleUpdateLocalInput(p.name, "serviceFee", parseFloat(e.target.value) || 0)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-hidden focus:border-indigo-500 focus:bg-white transition-colors text-amber-600 font-mono font-medium"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Maya dəyəri (1 əd)</label>
                            <input 
                              type="number" 
                              min="0" step="0.01"
                              value={data.costPrice || ""}
                              onChange={(e) => handleUpdateLocalInput(p.name, "costPrice", parseFloat(e.target.value) || 0)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-hidden focus:border-indigo-500 focus:bg-white transition-colors text-rose-600 font-mono font-medium"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="pt-4 mt-2 border-t border-slate-100">
                        <button
                          onClick={() => handleSaveProduct(p.name)}
                          className={`w-full flex justify-center items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-bold transition-colors ${
                            isSaved 
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                            : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm"
                          }`}
                        >
                          {isSaved ? (
                            <>
                              <CheckCircle2 className="w-4 h-4" />
                              Yaddaşdadır
                            </>
                          ) : (
                            <>
                              <Save className="w-4 h-4" />
                              Təsdiqlə
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Invoices Profit Tab */}
        {activeTab === "invoices" && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-6">
            {/* Filter and Search Controls for Invoices */}
            <div className="space-y-4 bg-slate-50/80 p-4 md:p-5 rounded-xl border border-slate-200">
              <div className="flex flex-col lg:flex-row gap-3">
                {/* Search Input */}
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Qaimə №, məhsul, tarix və ya müştəri adı ilə axtar..." 
                    value={invoiceSearchQuery}
                    onChange={(e) => setInvoiceSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-9 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-slate-400"
                  />
                  {invoiceSearchQuery && (
                    <button 
                      onClick={() => setInvoiceSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Customer Filter Dropdown */}
                <div className="w-full sm:w-72 relative">
                  <Users className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <select 
                    value={selectedCustomerFilter}
                    onChange={(e) => setSelectedCustomerFilter(e.target.value)}
                    className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all cursor-pointer"
                  >
                    <option value="all">Bütün Müştərilər ({customerOptions.length} müştəri)</option>
                    {customerOptions.map((cust, idx) => (
                      <option key={idx} value={cust.name}>
                        {cust.name} {cust.code ? `[${cust.code}]` : ""} ({cust.count} qaimə)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status Filter Dropdown */}
                <div className="w-full sm:w-48 relative">
                  <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <select 
                    value={paymentStatusFilter}
                    onChange={(e) => setPaymentStatusFilter(e.target.value as any)}
                    className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all cursor-pointer"
                  >
                    <option value="all">Bütün Statuslar</option>
                    <option value="unpaid">Yalnız Ödənilməmişlər</option>
                    <option value="paid">Yalnız Ödənilənlər</option>
                  </select>
                </div>

                {/* Group By Customer Toggle Button */}
                <button
                  type="button"
                  onClick={() => setGroupByCustomer(!groupByCustomer)}
                  className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition cursor-pointer border shrink-0 ${
                    groupByCustomer 
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-sm" 
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                  }`}
                  title="Qaimələri müştərilərə görə qruplaşdır"
                >
                  <Layers className="w-4 h-4" />
                  <span>{groupByCustomer ? "Qruplaşma Aktivdir" : "Müştəriyə görə Qruplaşdır"}</span>
                </button>
              </div>

              {/* Selection Bar & Stats */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-200 text-xs text-slate-500">
                <div className="flex items-center space-x-2">
                  <span className="font-semibold text-slate-800">Tapılan: {filteredInvoices.length} qaimə</span>
                  <span>•</span>
                  <span>Cəmi: {invoices.length}</span>
                  <span>•</span>
                  <span className="font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                    {selectedInvoiceIds.length} seçilib
                  </span>
                  {(invoiceSearchQuery || selectedCustomerFilter !== "all" || paymentStatusFilter !== "all") && (
                    <button 
                      onClick={handleResetFilters}
                      className="text-xs text-rose-600 hover:text-rose-700 underline font-medium ml-2 cursor-pointer"
                    >
                      Filtrləri sıfırla
                    </button>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <button 
                    onClick={handleSelectFiltered}
                    className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 font-medium rounded border border-slate-200 text-xs transition cursor-pointer"
                  >
                    {filteredInvoices.length > 0 && filteredInvoices.every(i => selectedInvoiceIds.includes(i.id))
                      ? "Filterlənənləri Ləğv Et"
                      : "Filterlənənləri Seç"}
                  </button>
                  {selectedInvoiceIds.length > 0 && (
                    <button 
                      onClick={handleClearAllSelection}
                      className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-medium rounded border border-rose-200 text-xs transition cursor-pointer"
                    >
                      Bütün Seçimi Sıfırla
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Invoices List Display */}
            <div>
              <div className="max-h-80 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-slate-50/30">
                {filteredInvoices.length === 0 ? (
                  <div className="p-8 text-center text-sm text-slate-500 space-y-2">
                    <p className="font-medium text-slate-700">Heç bir qaimə tapılmadı.</p>
                    <p className="text-xs text-slate-400">Axtarış sözünü dəyişin və ya seçilmiş filtrləri sıfırlayın.</p>
                    <button
                      onClick={handleResetFilters}
                      className="mt-2 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 cursor-pointer"
                    >
                      Filtrləri Sıfırla
                    </button>
                  </div>
                ) : groupByCustomer ? (
                  /* Grouped by customer view */
                  <div className="divide-y divide-slate-200">
                    {groupedFilteredInvoices.map((group) => {
                      const allGroupSelected = group.invoices.length > 0 && group.invoices.every(inv => selectedInvoiceIds.includes(inv.id));
                      const someGroupSelected = group.invoices.some(inv => selectedInvoiceIds.includes(inv.id));
                      const isCollapsed = collapsedGroups[group.customerName];

                      return (
                        <div key={group.customerName} className="bg-white">
                          {/* Customer Group Header */}
                          <div 
                            onClick={() => toggleGroupCollapse(group.customerName)}
                            className="p-3 bg-slate-100/80 hover:bg-slate-200/70 transition-colors flex items-center justify-between cursor-pointer border-b border-slate-200/60"
                          >
                            <div className="flex items-center space-x-3 min-w-0">
                              <div onClick={(e) => e.stopPropagation()} className="shrink-0 flex items-center">
                                <input 
                                  type="checkbox"
                                  checked={allGroupSelected}
                                  ref={el => {
                                    if (el) {
                                      el.indeterminate = someGroupSelected && !allGroupSelected;
                                    }
                                  }}
                                  onChange={(e) => handleSelectCustomerGroup(group.customerName, e)}
                                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                                  title="Bu müştərinin bütün qaimələrini seç"
                                />
                              </div>
                              <span className="font-bold text-slate-900 text-sm truncate">{group.customerName}</span>
                              {group.customerCode && (
                                <span className="text-[10px] font-mono bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-semibold shrink-0">
                                  {group.customerCode}
                                </span>
                              )}
                              <span className="text-xs text-slate-500 font-medium shrink-0">
                                ({group.invoices.length} qaimə • {formatAZN(group.totalAmount)})
                              </span>
                            </div>

                            <div className="flex items-center space-x-2">
                              <button
                                type="button"
                                onClick={(e) => handleSelectCustomerGroup(group.customerName, e)}
                                className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 bg-white hover:bg-indigo-50 px-2 py-0.5 rounded border border-slate-200 cursor-pointer"
                              >
                                {allGroupSelected ? "Hamısını Ləğv Et" : "Qrupu Seç"}
                              </button>
                              {isCollapsed ? (
                                <ChevronRight className="w-4 h-4 text-slate-400" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-slate-400" />
                              )}
                            </div>
                          </div>

                          {/* Customer Group Invoices */}
                          {!isCollapsed && (
                            <div className="divide-y divide-slate-100 pl-4 sm:pl-8 bg-white">
                              {group.invoices.map(inv => (
                                <label 
                                  key={inv.id} 
                                  className={`flex items-center gap-3 p-3 cursor-pointer transition-colors ${
                                    profitPaidInvoices.includes(inv.id) 
                                      ? "bg-emerald-50/60 hover:bg-emerald-50" 
                                      : selectedInvoiceIds.includes(inv.id)
                                      ? "bg-indigo-50/50 hover:bg-indigo-50/70"
                                      : "hover:bg-slate-50"
                                  }`}
                                >
                                  <input 
                                    type="checkbox"
                                    checked={selectedInvoiceIds.includes(inv.id)}
                                    onChange={() => handleToggleInvoice(inv.id)}
                                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                                  />
                                  <div className="flex flex-col flex-1 min-w-0">
                                    <div className="flex items-center space-x-2">
                                      <span className="text-sm font-semibold text-slate-800 truncate">{inv.invoiceNumber}</span>
                                    </div>
                                    <span className="text-xs text-slate-500">{inv.invoiceDate} • {formatAZN(inv.totalAmount)}</span>
                                  </div>
                                  {profitPaidInvoices.includes(inv.id) && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-100 text-emerald-700 shrink-0">
                                      <CheckCircle2 className="w-3 h-3" />
                                      Ödənilib
                                    </span>
                                  )}
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* Flat list view */
                  filteredInvoices.map(inv => (
                    <label 
                      key={inv.id} 
                      className={`flex items-center gap-3 p-3 cursor-pointer transition-colors ${
                        profitPaidInvoices.includes(inv.id) 
                          ? "bg-emerald-50/70 hover:bg-emerald-50" 
                          : selectedInvoiceIds.includes(inv.id)
                          ? "bg-indigo-50/50 hover:bg-indigo-50/70"
                          : "hover:bg-slate-50"
                      }`}
                    >
                      <input 
                        type="checkbox"
                        checked={selectedInvoiceIds.includes(inv.id)}
                        onChange={() => handleToggleInvoice(inv.id)}
                        className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                      />
                      <div className="flex flex-col flex-1 min-w-0">
                        <div className="flex items-center space-x-2 truncate">
                          <span className="text-sm font-bold text-slate-800">{inv.invoiceNumber}</span>
                          <span className="text-slate-400">-</span>
                          <span className="text-sm font-semibold text-indigo-900 truncate">{inv.customerName}</span>
                          {inv.customerCode && (
                            <span className="text-[10px] font-mono bg-slate-200 text-slate-600 px-1.5 py-0.2 rounded font-semibold shrink-0">
                              {inv.customerCode}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-slate-500">{inv.invoiceDate} • {formatAZN(inv.totalAmount)}</span>
                      </div>
                      {profitPaidInvoices.includes(inv.id) && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold uppercase bg-emerald-50 text-emerald-600 border border-emerald-200 shrink-0">
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
                <div className="hidden md:block overflow-x-auto">
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
                            <td colSpan={7} className={`px-4 py-2 text-xs font-bold border-t border-slate-200 ${profitPaidInvoices.includes(invoice.id) ? "text-emerald-700" : "text-slate-600"}`}>
                              <div className="flex justify-between items-center">
                                <div className="flex items-center space-x-2">
                                  <span>{invoice.invoiceNumber}</span>
                                  <span className="text-slate-400">-</span>
                                  <span className="text-indigo-950 font-bold">{invoice.customerName}</span>
                                  {invoice.customerCode && (
                                    <span className="text-[10px] font-mono bg-slate-200/80 text-slate-700 px-1.5 py-0.5 rounded font-semibold">
                                      {invoice.customerCode}
                                    </span>
                                  )}
                                  <span className="text-slate-400 font-normal">({invoice.invoiceDate})</span>
                                </div>
                                {profitPaidInvoices.includes(invoice.id) && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-emerald-100 text-emerald-700">
                                    <CheckCircle2 className="w-3 h-3" />
                                    Ödənilib
                                  </span>
                                )}
                              </div>
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

                {/* Mobile View */}
                <div className="block md:hidden space-y-4">
                  {selectedInvoices.map((invoice) => (
                    <div key={invoice.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                      <div className={`px-4 py-3 flex justify-between items-center border-b border-slate-200 ${profitPaidInvoices.includes(invoice.id) ? "bg-emerald-50 text-emerald-800" : "bg-slate-50 text-slate-800"}`}>
                        <div className="font-bold text-sm truncate pr-2 flex items-center gap-1.5">
                          <span>{invoice.invoiceNumber}</span>
                          <span className="text-slate-400">-</span>
                          <span className="font-semibold text-indigo-950">{invoice.customerName}</span>
                          {invoice.customerCode && (
                            <span className="text-[10px] font-mono bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded font-semibold shrink-0">
                              {invoice.customerCode}
                            </span>
                          )}
                        </div>
                        {profitPaidInvoices.includes(invoice.id) && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-100 text-emerald-700 shrink-0">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Ödənilib
                          </span>
                        )}
                      </div>
                      <div className="divide-y divide-slate-100">
                        {invoice.items.map((item, idx) => {
                          const globalData = productCosts[item.name] || { payee: "-", serviceFee: 0, costPrice: 0 };
                          const totalServiceFee = globalData.serviceFee * item.quantity;
                          const totalCostPrice = globalData.costPrice * item.quantity;
                          const revenue = item.price * item.quantity;
                          const netProfit = revenue - totalCostPrice - totalServiceFee;

                          return (
                            <div key={`${invoice.id}-${idx}`} className="p-4 space-y-3">
                              <div className="flex justify-between items-start">
                                <span className="font-semibold text-slate-800 text-sm leading-tight pr-2">{item.name}</span>
                                <span className="font-mono font-bold text-slate-700 text-sm bg-slate-100 px-2 py-0.5 rounded shrink-0">{item.quantity} x {formatAZN(item.price)}</span>
                              </div>
                              <div className="bg-slate-50 rounded-lg p-3 grid grid-cols-2 gap-3 text-xs">
                                <div>
                                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Ödəniş ediləcək şəxs</span>
                                  <span className="font-medium text-slate-700">{globalData.payee || "-"}</span>
                                </div>
                                <div className="text-right">
                                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Xidmət Haqqı (1 əd)</span>
                                  <span className="font-mono font-semibold text-amber-600">{globalData.serviceFee > 0 ? formatAZN(globalData.serviceFee) : "-"}</span>
                                </div>
                                <div>
                                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Maya Dəyəri (1 əd)</span>
                                  <span className="font-mono font-semibold text-rose-600">{globalData.costPrice > 0 ? formatAZN(globalData.costPrice) : "-"}</span>
                                </div>
                                <div className="text-right">
                                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Xalis Xeyir (Cəmi)</span>
                                  <span className={`font-mono font-bold text-sm ${netProfit >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{formatAZN(netProfit)}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
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
