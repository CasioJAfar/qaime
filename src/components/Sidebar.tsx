import React from "react";
import { 
  LayoutDashboard, 
  FileText, 
  Users, 
  CreditCard, 
  FileSpreadsheet, 
  Settings,
  Shield,
  LogOut,
  User
} from "lucide-react";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentUser: { username: string; role: string } | null;
  onLogout: () => void;
}

export default function Sidebar({ activeTab, setActiveTab, currentUser, onLogout }: SidebarProps) {
  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "invoices", label: "Qaimələr", icon: FileText },
    { id: "customers", label: "Müştərilər", icon: Users },
    { id: "debts", label: "Borclar", icon: CreditCard },
    { id: "reports", label: "Hesabatlar", icon: FileSpreadsheet },
    ...(currentUser?.role === "admin" ? [{ id: "admin_panel", label: "Admin Panel", icon: Shield }] : []),
    { id: "settings", label: "Ayarlar", icon: Settings },
  ];

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-60 bg-[#1E293B] flex-col h-full shrink-0 border-r border-[#334155]">
        {/* Brand Header */}
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-500 rounded flex items-center justify-center font-bold text-white shadow-lg font-display">
            Q
          </div>
          <span className="text-white font-bold text-lg tracking-tight font-display">QAİMƏ.PRO</span>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
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
              <p className="text-[10px] text-slate-400 truncate capitalize font-medium">{currentUser?.role === "admin" ? "Yüksək Səlahiyyət" : "Oxucu"}</p>
            </div>
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

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#1E293B] border-t border-[#334155] flex items-center justify-around px-1 z-40 shadow-xl overflow-x-auto whitespace-nowrap scrollbar-none">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center flex-1 min-w-[50px] h-full py-1 transition-all cursor-pointer ${
                isActive ? "text-indigo-400" : "text-slate-400"
              }`}
            >
              <Icon className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] font-medium truncate tracking-tight">{item.label}</span>
            </button>
          );
        })}
        {/* Mobile Logout Button */}
        <button
          onClick={onLogout}
          className="flex flex-col items-center justify-center flex-1 min-w-[50px] h-full py-1 transition-all cursor-pointer text-rose-400 hover:text-rose-300"
        >
          <LogOut className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] font-medium truncate tracking-tight">Çıxış</span>
        </button>
      </nav>
    </>
  );
}
