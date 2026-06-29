import React from "react";
import { 
  FileText, 
  TrendingUp, 
  Users, 
  DollarSign, 
  ArrowUpRight, 
  AlertCircle,
  Clock,
  ChevronRight,
  Package,
  CheckSquare
} from "lucide-react";
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  BarChart, 
  Bar,
  Cell,
  Legend,
  CartesianGrid
} from "recharts";
import { DashboardData, Invoice, Customer } from "../types";

interface DashboardViewProps {
  data: DashboardData | null;
  loading: boolean;
  onNavigate: (tab: string) => void;
  onSelectInvoice: (invoice: Invoice) => void;
  invoices?: Invoice[];
  customers?: Customer[];
  currency?: string;
}

export default function DashboardView({ data, loading, onNavigate, onSelectInvoice, invoices = [], customers = [], currency = "AZN" }: DashboardViewProps) {
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium">Dashboard məlumatları yüklənir...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex-1 p-8 text-center text-slate-500">
        Məlumat tapılmadı. Zəhmət olmasa səhifəni yeniləyin və ya verilənlər bazasını sıfırlayın.
      </div>
    );
  }

  // Format currency
  const formatAZN = (val: number) => {
    return new Intl.NumberFormat("az-AZ", { style: "currency", currency }).format(val);
  };

  // Current year-month in format "YYYY-MM"
  const currentYearMonth = React.useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
  }, []);

  const currentMonthName = React.useMemo(() => {
    const AZ_MONTHS: Record<string, string> = {
      "01": "Yanvar", "02": "Fevral", "03": "Mart", "04": "Aprel", "05": "May", "06": "İyun",
      "07": "İyul", "08": "Avqust", "09": "Sentyabr", "10": "Oktyabr", "11": "Noyabr", "12": "Dekabr",
    };
    const parts = currentYearMonth.split("-");
    return AZ_MONTHS[parts[1]] || "Cari Ay";
  }, [currentYearMonth]);

  // Current month's invoices (for goods shipped statistics)
  const currentMonthInvoices = React.useMemo(() => {
    return (invoices || []).filter(inv => inv.invoiceDate && inv.invoiceDate.startsWith(currentYearMonth));
  }, [invoices, currentYearMonth]);

  // Goods sold/shipped this month value (Bu ay çıxılan mal)
  const goodsShippedThisMonthValue = React.useMemo(() => {
    return currentMonthInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
  }, [currentMonthInvoices]);

  // Paid this month value (Bu ay ödənilən)
  const paidThisMonthValue = React.useMemo(() => {
    const allPayments = (customers || []).flatMap(c => c.payments || []);
    return allPayments
      .filter(p => p.paymentDate && p.paymentDate.startsWith(currentYearMonth))
      .reduce((sum, p) => sum + p.amount, 0);
  }, [customers, currentYearMonth]);

  // Group items by name to get quantities shipped this month (Bu ay çıxılan mallar)
  const currentMonthGoodsStats = React.useMemo(() => {
    const stats: Record<string, { name: string; quantity: number; totalAmount: number }> = {};
    currentMonthInvoices.forEach(inv => {
      (inv.items || []).forEach(item => {
        const name = item.name ? item.name.trim() : "Digər məhsullar";
        if (!stats[name]) {
          stats[name] = { name, quantity: 0, totalAmount: 0 };
        }
        stats[name].quantity += Number(item.quantity) || 0;
        stats[name].totalAmount += Number(item.total) || (Number(item.quantity) * Number(item.price)) || 0;
      });
    });
    return Object.values(stats).sort((a, b) => b.totalAmount - a.totalAmount);
  }, [currentMonthInvoices]);

  // Group invoices by month for the bar chart
  const monthlyData = React.useMemo(() => {
    const list = invoices || [];
    const groups: Record<string, { monthKey: string; monthName: string; totalSales: number; unpaidDebt: number }> = {};
    
    const AZ_MONTHS: Record<string, string> = {
      "01": "Yanvar", "02": "Fevral", "03": "Mart", "04": "Aprel", "05": "May", "06": "İyun",
      "07": "İyul", "08": "Avqust", "09": "Sentyabr", "10": "Oktyabr", "11": "Noyabr", "12": "Dekabr",
    };

    list.forEach(inv => {
      if (!inv.invoiceDate) return;
      const parts = inv.invoiceDate.split("-");
      if (parts.length < 2) return;
      const year = parts[0];
      const monthNum = parts[1];
      const monthName = AZ_MONTHS[monthNum] || "Bilinməyən";
      const key = `${year}-${monthNum}`;
      const name = `${monthName} font-mono`;
      
      if (!groups[key]) {
        groups[key] = {
          monthKey: key,
          monthName: `${monthName} ${year}`,
          totalSales: 0,
          unpaidDebt: 0
        };
      }
      
      const amt = inv.totalAmount || 0;
      groups[key].totalSales += amt;
      if (inv.status !== "paid") {
        groups[key].unpaidDebt += amt;
      }
    });

    return Object.values(groups).sort((a, b) => a.monthKey.localeCompare(b.monthKey));
  }, [invoices]);

  const barChartData = monthlyData.length > 0 ? monthlyData : [
    { monthName: "Aprel 2026", totalSales: 15400, unpaidDebt: 3200 },
    { monthName: "May 2026", totalSales: 28900, unpaidDebt: 8400 },
    { monthName: "İyun 2026", totalSales: 42000, unpaidDebt: 15300 },
  ];

  const kpis = [
    {
      title: "Ümumi Qaimə Sayı",
      value: data.totalInvoices,
      icon: FileText,
      color: "bg-blue-50 text-blue-600 border-blue-100",
      iconColor: "text-blue-600",
      desc: "Sistemdə qeydiyyatda olan qaimələr",
      onClick: () => onNavigate("invoices")
    },
    {
      title: "Ümumi Satış",
      value: formatAZN(data.totalSales),
      icon: TrendingUp,
      color: "bg-emerald-50 text-emerald-600 border-emerald-100",
      iconColor: "text-emerald-600",
      desc: "Bütün qaimələrin yekun cəmi",
      onClick: () => onNavigate("invoices")
    },
    {
      title: `${currentMonthName}-da Satış`,
      value: formatAZN(goodsShippedThisMonthValue),
      icon: Package,
      color: "bg-indigo-50 text-indigo-600 border-indigo-100",
      iconColor: "text-indigo-600",
      desc: "Bu ay çıxılan malların cəmi",
      onClick: () => onNavigate("invoices")
    },
    {
      title: `${currentMonthName}-da Ödənilən`,
      value: formatAZN(paidThisMonthValue),
      icon: CheckSquare,
      color: "bg-cyan-50 text-cyan-600 border-cyan-100",
      iconColor: "text-cyan-600",
      desc: "Bu ay daxil olan ödənişlər",
      onClick: () => onNavigate("debts")
    },
    {
      title: "Borclu Müştəri",
      value: data.debtorCount,
      icon: Users,
      color: "bg-amber-50 text-amber-600 border-amber-100",
      iconColor: "text-amber-600",
      desc: "Ödənişi tamamlanmayanlar",
      onClick: () => onNavigate("debts")
    },
    {
      title: "Yığılmalı Məbləğ",
      value: formatAZN(data.totalRemainingDebt),
      icon: DollarSign,
      color: "bg-rose-50 text-rose-600 border-rose-100",
      iconColor: "text-rose-600",
      desc: "Müştərilərin qalıq borcları",
      onClick: () => onNavigate("debts")
    }
  ];

  // If there's no sales trend data, fill with dummy dates for aesthetic preview
  const trendData = data.salesTrend && data.salesTrend.length > 0 
    ? data.salesTrend 
    : [
        { date: "2026-06-10", amount: 5450 },
        { date: "2026-06-15", amount: 8300 },
        { date: "2026-06-18", amount: 15200 },
        { date: "2026-06-20", amount: 7000 },
        { date: "2026-06-22", amount: 42000 },
        { date: "2026-06-25", amount: 3150 },
      ];

  // Colors for bars
  const BAR_COLORS = ["#4f46e5", "#06b6d4", "#10b981", "#f59e0b", "#ef4444"];

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-[#F8FAFC] space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 shrink-0">
        <div>
          <h2 className="text-xl font-semibold text-slate-800 tracking-tight">Maliyyə Paneli</h2>
          <p className="text-xs text-slate-500">Müəssisənizin qaimə və borclarının real-vaxt analitikası.</p>
        </div>
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => onNavigate("invoices")} 
            className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-md transition-all cursor-pointer"
          >
            <span>Yeni Qaimə Yüklə</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPI Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 md:gap-6">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div 
              key={idx}
              onClick={kpi.onClick}
              className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-slate-300 transition duration-150 cursor-pointer group flex flex-col justify-between"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">{kpi.title}</p>
                  <h3 className="text-3xl font-mono font-bold text-slate-800 mt-1">{kpi.value}</h3>
                </div>
                <div className={`p-2.5 rounded-lg ${kpi.color} border transition duration-200 group-hover:scale-105`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <p className="text-[11px] text-slate-400 mt-3 border-t border-slate-100 pt-2.5 flex items-center justify-between">
                <span>{kpi.desc}</span>
                <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition duration-200" />
              </p>
            </div>
          );
        })}
      </div>

      {/* Charts and Lists Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Trend Chart (2 columns width) */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h4 className="font-bold text-slate-700 tracking-tight uppercase text-xs">Satış Dinamikası</h4>
              <p className="text-[11px] text-slate-400">Tarixlər üzrə satış məbləğlərinin dəyişməsi</p>
            </div>
            <div className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded">
              AZN
            </div>
          </div>
          
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="date" 
                  tickLine={false} 
                  axisLine={false} 
                  tickFormatter={(val) => {
                    const parts = val.split("-");
                    return parts.length === 3 ? `${parts[2]}/${parts[1]}` : val;
                  }}
                  tick={{ fontSize: 10, fill: "#94a3b8", fontFamily: "monospace" }}
                />
                <YAxis 
                  tickLine={false} 
                  axisLine={false}
                  tick={{ fontSize: 10, fill: "#94a3b8", fontFamily: "monospace" }}
                  tickFormatter={(val) => `${val}`}
                />
                <Tooltip 
                  formatter={(value) => [`${value} AZN`, "Satış"]}
                  labelFormatter={(label) => `Tarix: ${label}`}
                  contentStyle={{ backgroundColor: "#1e293b", borderRadius: "8px", border: "none", color: "#fff", fontSize: "11px" }}
                />
                <Area type="monotone" dataKey="amount" stroke="#4f46e5" strokeWidth={2} fillOpacity={1} fill="url(#colorSales)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Debt Stats (1 column width) */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="space-y-3">
            <div className="border-b border-slate-100 pb-3">
              <h4 className="font-bold text-slate-700 tracking-tight uppercase text-xs">Təhlil və Nisbətlər</h4>
              <p className="text-[11px] text-slate-400">Ödəniş nisbətləri və yığımlar</p>
            </div>

            {/* Simulated mini analytics circle / bars */}
            <div className="space-y-3 pt-1">
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-slate-500 font-medium">Yığılmış Məbləğ (Ödənilən)</span>
                  <span className="font-bold text-emerald-600">
                    {data.totalSales > 0 
                      ? `${Math.round(((data.totalSales - data.totalRemainingDebt) / data.totalSales) * 100)}%`
                      : "0%"}
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                    style={{ 
                      width: data.totalSales > 0 
                        ? `${((data.totalSales - data.totalRemainingDebt) / data.totalSales) * 100}%`
                        : "0%" 
                    }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-slate-500 font-medium">Gözləyən Məbləğ (Borc)</span>
                  <span className="font-bold text-rose-600">
                    {data.totalSales > 0 
                      ? `${Math.round((data.totalRemainingDebt / data.totalSales) * 100)}%`
                      : "0%"}
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-rose-500 h-full rounded-full transition-all duration-500"
                    style={{ 
                      width: data.totalSales > 0 
                        ? `${(data.totalRemainingDebt / data.totalSales) * 100}%`
                        : "0%" 
                    }}
                  ></div>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-100 mt-2 space-y-2">
              <div className="flex items-start space-x-2">
                <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  <strong>Ağıllı Qeyd:</strong> Qaimələrin vaxtında yığılması debitor borclarının azaldılması üçün vacibdir. Hesabatlar bölməsindən analiz edin.
                </p>
              </div>
            </div>
          </div>

          <button 
            onClick={() => onNavigate("debts")}
            className="w-full bg-slate-900 text-white text-xs font-semibold py-2.5 rounded-lg mt-4 hover:bg-slate-800 transition flex items-center justify-center space-x-2 cursor-pointer"
          >
            <span>Ödəniş Qəbul Edin</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Aylıq Satış və Yığılmalı Məbləğ Müqayisəsi */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Aylıq Satış və Yığılmalı Məbləğ Müqayisəsi */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3 lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h4 className="font-bold text-slate-700 tracking-tight uppercase text-xs">Aylıq Satış və Yığılmalı Məbləğ Müqayisəsi</h4>
              <p className="text-[11px] text-slate-400">Hər ay üzrə ümumi satış dövriyyəsi və hələ də yığılmalı olan borc məbləği (AZN)</p>
            </div>
            <div className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded">
              AZN
            </div>
          </div>

          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="monthName" 
                  tickLine={false} 
                  axisLine={false} 
                  tick={{ fontSize: 10, fill: "#64748b", fontWeight: 600 }}
                />
                <YAxis 
                  tickLine={false} 
                  axisLine={false}
                  tick={{ fontSize: 10, fill: "#64748b", fontFamily: "monospace" }}
                />
                <Tooltip 
                  formatter={(value) => [`${formatAZN(Number(value))}`]}
                  contentStyle={{ backgroundColor: "#1e293b", borderRadius: "8px", border: "none", color: "#fff", fontSize: "11px" }}
                />
                <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: "11px", fontWeight: 500 }} />
                <Bar name="Ümumi Satış" dataKey="totalSales" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                <Bar name="Yığılmalı Məbləğ (Borc)" dataKey="unpaidDebt" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bu Ay Çıxılan Mallar */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="space-y-3">
            <div className="border-b border-slate-100 pb-3">
              <h4 className="font-bold text-slate-700 tracking-tight uppercase text-xs">Bu Ay Çıxılan Mallar</h4>
              <p className="text-[11px] text-slate-400">{currentMonthName} ayı üzrə anbar/satış çıxışları</p>
            </div>

            {currentMonthGoodsStats.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center space-y-2">
                <Package className="w-8 h-8 text-slate-300 animate-pulse" />
                <p className="text-xs text-slate-400 font-medium">Bu ay hələ ki mal çıxışı qeydə alınmayıb.</p>
              </div>
            ) : (
              <div className="space-y-3.5 max-h-[220px] overflow-y-auto pr-1">
                {currentMonthGoodsStats.map((item, idx) => {
                  const percentage = goodsShippedThisMonthValue > 0 
                    ? Math.round((item.totalAmount / goodsShippedThisMonthValue) * 100)
                    : 0;
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-700 truncate max-w-[150px]" title={item.name}>
                          {item.name}
                        </span>
                        <span className="font-mono text-slate-500 font-bold bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded text-[10px]">
                          {item.quantity} ədəd
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
                        <span>{formatAZN(item.totalAmount)}</span>
                        <span>{percentage}%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                        <div 
                          className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="border-t border-slate-150 pt-3 mt-3 flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Ümumi Çeşid Sayı:</span>
            <span className="font-mono font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
              {currentMonthGoodsStats.length} növ
            </span>
          </div>
        </div>
      </div>

      {/* Recent Invoices Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
          <h2 className="font-bold text-slate-700 tracking-tight uppercase text-xs">Son Yüklənmiş Qaimələr</h2>
          <button 
            onClick={() => onNavigate("invoices")} 
            className="text-[11px] font-bold uppercase text-indigo-600 hover:text-indigo-800 transition flex items-center space-x-1 cursor-pointer"
          >
            <span>Bütün qaimələr</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Desktop Table View */}
        <div className="overflow-x-auto hidden md:block">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-[10px] text-slate-500 uppercase tracking-[0.1em] border-b border-slate-200">
                <th className="px-6 py-4 font-semibold">Qaimə No</th>
                <th className="px-6 py-4 font-semibold">Müştəri adı</th>
                <th className="px-6 py-4 font-semibold">Qaimə Tarixi</th>
                <th className="px-6 py-4 font-semibold text-right">Məbləğ</th>
                <th className="px-6 py-4 font-semibold text-center">Məhsul Sayı</th>
                <th className="px-6 py-4 font-semibold text-right">Fəaliyyət</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {data.recentInvoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-indigo-50/30 transition duration-150">
                  <td className="px-6 py-3.5 font-mono text-sm text-slate-900 font-bold">{inv.invoiceNumber}</td>
                  <td className="px-6 py-3.5 font-semibold text-slate-700 text-sm">{inv.customerName}</td>
                  <td className="px-6 py-3.5 text-xs text-slate-500">
                    <div className="flex items-center space-x-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{inv.invoiceDate}</span>
                    </div>
                  </td>
                  <td className="px-6 py-3.5 text-right font-mono text-sm font-bold text-indigo-600">{formatAZN(inv.totalAmount)}</td>
                  <td className="px-6 py-3.5 text-center text-xs text-slate-500 font-medium">
                    {inv.items ? inv.items.length : 0} sətir
                  </td>
                  <td className="px-6 py-3.5 text-right">
                    <button 
                      onClick={() => onSelectInvoice(inv)}
                      className="px-3 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded text-xs font-medium text-slate-600 transition cursor-pointer"
                    >
                      Bax
                    </button>
                  </td>
                </tr>
              ))}
              {data.recentInvoices.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Sistemdə hələ qaimə yoxdur. İlk qaiməni "Qaimələr" bölməsindən yükləyin.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards View */}
        <div className="block md:hidden p-4 space-y-3">
          {data.recentInvoices.map((inv) => (
            <div 
              key={inv.id}
              onClick={() => onSelectInvoice(inv)}
              className="bg-slate-50 p-4 rounded-xl border border-slate-150 hover:border-slate-200 cursor-pointer transition"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-xs font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">{inv.invoiceNumber}</span>
                <span className="font-mono text-xs font-bold text-indigo-600">{formatAZN(inv.totalAmount)}</span>
              </div>
              
              <div className="font-bold text-slate-800 text-sm mb-3 truncate">{inv.customerName}</div>
              
              <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-dashed border-slate-200">
                <div className="flex items-center space-x-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>{inv.invoiceDate}</span>
                </div>
                <span>{inv.items ? inv.items.length : 0} sətir</span>
              </div>
            </div>
          ))}
          {data.recentInvoices.length === 0 && (
            <div className="py-8 text-center text-slate-400 text-xs">
              Sistemdə hələ qaimə yoxdur. İlk qaiməni "Qaimələr" bölməsindən yükləyin.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
