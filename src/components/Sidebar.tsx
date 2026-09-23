import React, { useState, useEffect } from "react";
import { 
  LayoutDashboard, 
  FileText, 
  Users, 
  CreditCard, 
  FileSpreadsheet, 
  Settings,
  Shield,
  LogOut,
  User,
  TrendingUp,
  Book,
  Menu,
  X,
  Moon,
  Sun,
  ChevronRight
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentUser: { username: string; role: string } | null;
  onLogout: () => void;
}

export default function Sidebar({ activeTab, setActiveTab, currentUser, onLogout }: SidebarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains("dark"));

  useEffect(() => {
    const handleThemeCheck = () => {
      setIsDark(document.documentElement.classList.contains("dark"));
    };
    handleThemeCheck();
  }, []);

  const toggleTheme = () => {
    const nextDark = !document.documentElement.classList.contains("dark");
    if (nextDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("erp_theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("erp_theme", "light");
    }
    setIsDark(nextDark);
  };

  // Full list of menu items for desktop
  const desktopMenuItems = [
    ...(currentUser?.role !== "2" ? [{ id: "dashboard", label: "Dashboard", icon: LayoutDashboard }] : []),
    { id: "invoices", label: "Qaimələr", icon: FileText },
    ...(currentUser?.role !== "2" ? [{ id: "customers", label: "Müştərilər", icon: Users }] : []),
    { id: "debts", label: "Borclar", icon: CreditCard },
    { id: "reports", label: "Hesabatlar", icon: FileSpreadsheet },
    ...(currentUser?.role !== "user" && currentUser?.role !== "2" ? [{ id: "profit", label: "Xərc və Mənfəət", icon: TrendingUp }] : []),
    ...(currentUser?.role !== "user" ? [{ id: "contacts", label: "Müştəri məlumatları", icon: Book }] : []),
    ...(currentUser?.role === "admin" ? [{ id: "admin_panel", label: "Admin Panel", icon: Shield }] : []),
    { id: "settings", label: "Ayarlar", icon: Settings },
  ];

  // Mobile Bottom Bar primary items: exactly Dashboard, Qaimələr, Müştərilər, Borclar
  const mobilePrimaryItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "invoices", label: "Qaimələr", icon: FileText },
    { id: "customers", label: "Müştərilər", icon: Users },
    { id: "debts", label: "Borclar", icon: CreditCard },
  ].filter(item => {
    if (currentUser?.role === "2" && (item.id === "dashboard" || item.id === "customers")) {
      return false;
    }
    return true;
  });

  // Mobile Drawer items: the remaining navigation items
  const mobileSecondaryItems = [
    { id: "reports", label: "Hesabatlar", icon: FileSpreadsheet },
    ...(currentUser?.role !== "user" && currentUser?.role !== "2" ? [{ id: "profit", label: "Xərc və Mənfəət", icon: TrendingUp }] : []),
    ...(currentUser?.role !== "user" ? [{ id: "contacts", label: "Müştəri məlumatları", icon: Book }] : []),
    ...(currentUser?.role === "admin" ? [{ id: "admin_panel", label: "Admin Panel", icon: Shield }] : []),
    { id: "settings", label: "Ayarlar", icon: Settings },
  ];

  // Check if activeTab is currently one of the secondary items in the drawer
  const isSecondaryTabActive = mobileSecondaryItems.some(item => item.id === activeTab);

  const handleMobileTabClick = (tabId: string) => {
    setActiveTab(tabId);
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-60 bg-[#1E293B] flex-col h-full shrink-0 border-r border-[#334155] print:hidden">
        {/* Brand Header */}
        <div 
          onClick={() => window.location.reload()}
          className="p-6 flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
        >
          <div className="w-8 h-8 bg-indigo-500 rounded flex items-center justify-center font-bold text-white shadow-lg font-display">
            S
          </div>
          <span className="text-white font-bold text-lg tracking-tight font-display">STAR BOYA</span>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {desktopMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 transition-all cursor-pointer ${
                  isActive 
                    ? "bg-indigo-600/20 text-indigo-400 border-l-4 border-indigo-500 rounded-r-md" 
                    : "text-slate-400 hover:text-white hover:bg-slate-800 rounded-md"
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? "text-indigo-400" : "text-slate-400"}`} />
                <span className="text-sm font-medium">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* User profile & Logout */}
        <div className="p-4 border-t border-slate-700 bg-slate-900/40 space-y-2.5">
          <div className="flex items-center gap-2.5 px-3">
            <div className="w-7 h-7 bg-slate-800 rounded-full flex items-center justify-center text-slate-300 border border-slate-700">
              <User className="w-4 h-4" />
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-xs font-bold text-white truncate uppercase tracking-wide">{currentUser?.username}</p>
              <p className="text-[10px] text-slate-400 truncate capitalize font-medium">{
                currentUser?.role === "admin" ? "Yüksək Səlahiyyət" : 
                currentUser?.role === "moderator" ? "Moderator" : 
                "Oxucu"
              }</p>
            </div>
            <button 
              onClick={toggleTheme}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-md text-slate-400 hover:text-white transition cursor-pointer"
              title="Gecə/Gündüz Rejimi"
            >
              {isDark ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-slate-300" />}
            </button>
          </div>

          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3 py-2 text-rose-400 hover:text-white hover:bg-rose-600/25 rounded-md transition text-xs font-bold cursor-pointer"
          >
            <LogOut className="w-4 h-4 text-rose-400" />
            <span>Çıxış Et</span>
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Navigation Bar (4 Main Tabs + Menu) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#1E293B] border-t border-[#334155] z-40 shadow-2xl px-2 print:hidden">
        <div className="grid grid-cols-5 h-full max-w-md mx-auto items-center">
          {/* Primary 4 Tabs */}
          {mobilePrimaryItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`mobile-tab-${item.id}`}
                onClick={() => handleMobileTabClick(item.id)}
                className={`flex flex-col items-center justify-center h-full py-1 transition-colors cursor-pointer relative ${
                  isActive ? "text-indigo-400 font-semibold" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {isActive && (
                  <span className="absolute top-0 w-8 h-1 bg-indigo-500 rounded-b-full"></span>
                )}
                <Icon className={`w-5 h-5 mb-0.5 ${isActive ? "text-indigo-400" : "text-slate-400"}`} />
                <span className="text-[10px] tracking-tight truncate w-full text-center px-0.5">
                  {item.label}
                </span>
              </button>
            );
          })}

          {/* 5th Button: Menyu */}
          <button
            id="mobile-tab-menu"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className={`flex flex-col items-center justify-center h-full py-1 transition-colors cursor-pointer relative ${
              isMobileMenuOpen || isSecondaryTabActive ? "text-indigo-400 font-semibold" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {isSecondaryTabActive && (
              <span className="absolute top-1 right-3 w-2 h-2 bg-indigo-400 rounded-full ring-2 ring-[#1E293B]"></span>
            )}
            {isMobileMenuOpen ? (
              <X className="w-5 h-5 mb-0.5 text-indigo-400" />
            ) : (
              <Menu className="w-5 h-5 mb-0.5" />
            )}
            <span className="text-[10px] tracking-tight truncate w-full text-center px-0.5">
              Menyu
            </span>
          </button>
        </div>
      </nav>

      {/* Mobile Menu Bottom Drawer / Modal */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs"
            />

            {/* Bottom Sheet Card */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="relative w-full bg-[#1E293B] border-t border-[#334155] rounded-t-3xl shadow-2xl p-5 max-h-[85vh] overflow-y-auto flex flex-col space-y-4"
            >
              {/* Drag handle */}
              <div className="w-10 h-1 bg-slate-600 rounded-full mx-auto -mt-1 mb-1 shrink-0" />

              {/* Drawer Header: User Info & Close */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-700/80">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 bg-indigo-600/30 border border-indigo-500/40 rounded-full flex items-center justify-center text-indigo-300 font-bold">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white uppercase tracking-wide">
                      {currentUser?.username}
                    </h4>
                    <p className="text-[11px] text-slate-400 font-medium">
                      {currentUser?.role === "admin" ? "Yüksək Səlahiyyət (Admin)" : 
                       currentUser?.role === "moderator" ? "Moderator" : "Oxucu"}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-white border border-slate-700 cursor-pointer"
                  title="Bağla"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Secondary Navigation List */}
              <div className="space-y-1.5 py-1">
                <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 px-2 mb-2">
                  Digər Bölmələr
                </p>
                {mobileSecondaryItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleMobileTabClick(item.id)}
                      className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl transition-all cursor-pointer ${
                        isActive 
                          ? "bg-indigo-600 text-white font-semibold shadow-md" 
                          : "bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/50"
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <Icon className={`w-5 h-5 ${isActive ? "text-white" : "text-indigo-400"}`} />
                        <span className="text-sm">{item.label}</span>
                      </div>
                      <ChevronRight className={`w-4 h-4 ${isActive ? "text-white" : "text-slate-500"}`} />
                    </button>
                  );
                })}
              </div>

              {/* Quick Actions (Dark Mode + Logout) */}
              <div className="pt-2 border-t border-slate-700/80 space-y-2">
                <button
                  onClick={toggleTheme}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-slate-800/40 hover:bg-slate-800 text-slate-300 border border-slate-700/40 transition cursor-pointer"
                >
                  <div className="flex items-center space-x-3">
                    {isDark ? (
                      <Sun className="w-4 h-4 text-amber-400" />
                    ) : (
                      <Moon className="w-4 h-4 text-slate-300" />
                    )}
                    <span className="text-xs font-medium">
                      {isDark ? "Gündüz Rejiminə Keç" : "Gecə Rejiminə Keç"}
                    </span>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-400 bg-slate-700/50 px-2 py-0.5 rounded">
                    {isDark ? "Gecə" : "Gündüz"}
                  </span>
                </button>

                {/* Mobile Logout Button */}
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onLogout();
                  }}
                  className="w-full flex items-center justify-center space-x-2 py-3 rounded-xl bg-rose-600/15 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-500/30 transition-all font-bold text-xs cursor-pointer shadow-xs"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sistemdən Çıxış Et</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
