import React, { useState, useEffect } from "react";
import { Shield, Clock, Terminal, User, RefreshCw, AlertTriangle, Search, Activity, Trash2 } from "lucide-react";

interface LogEntry {
  id: string;
  user: string;
  action: string;
  details: string;
  timestamp: string;
}

interface AdminPanelViewProps {
  currentUser: { username: string; role: string } | null;
  onResetDB: () => Promise<void>;
  showToast: (message: string, type: "success" | "error" | "info") => void;
}

export default function AdminPanelView({ currentUser, onResetDB, showToast }: AdminPanelViewProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [users, setUsers] = useState<{ username: string; role: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filterUser, setFilterUser] = useState("all");
  const [resetting, setResetting] = useState(false);
  const [updatingUser, setUpdatingUser] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      const savedUser = localStorage.getItem("erp_user");
      const userObj = savedUser ? JSON.parse(savedUser) : null;
      const res = await fetch("/api/users", {
        headers: {
          "x-user-role": userObj?.role || "",
          "x-user-username": userObj?.username || ""
        }
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error("İstifadəçilər yüklənə bilmədi:", err);
    }
  };

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const savedUser = localStorage.getItem("erp_user");
      const userObj = savedUser ? JSON.parse(savedUser) : null;
      
      const res = await fetch("/api/logs", {
        headers: {
          "x-user-role": userObj?.role || "",
          "x-user-username": userObj?.username || ""
        }
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      } else {
        throw new Error("Loglar oxuna bilmədi.");
      }
    } catch (err: any) {
      showToast(err.message || "Logların yüklənməsində xəta.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (username: string, newRole: "admin" | "user") => {
    if (username.toLowerCase() === "admin") {
      showToast("Əsas 'admin' istifadəçisinin rolu dəyişdirilə bilməz!", "error");
      return;
    }
    setUpdatingUser(username);
    try {
      const savedUser = localStorage.getItem("erp_user");
      const userObj = savedUser ? JSON.parse(savedUser) : null;
      const res = await fetch(`/api/users/${encodeURIComponent(username)}/role`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-role": userObj?.role || "",
          "x-user-username": userObj?.username || ""
        },
        body: JSON.stringify({ role: newRole })
      });
      if (res.ok) {
        showToast(`"${username}" istifadəçisinin rolu "${newRole === "admin" ? "Admin" : "User"}" olaraq yeniləndi.`, "success");
        await fetchUsers();
        await fetchLogs();
      } else {
        const data = await res.json();
        showToast(data.error || "Rol dəyişdirilə bilmədi.", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Rol dəyişdirilərkən xəta baş verdi.", "error");
    } finally {
      setUpdatingUser(null);
    }
  };

  useEffect(() => {
    if (currentUser?.role === "admin") {
      fetchLogs();
      fetchUsers();
    }
  }, [currentUser]);

  const handleResetClick = async () => {
    if (!window.confirm("Sistemin bütün məlumatlarını ilkin vəziyyətinə sıfırlamaq istədiyinizdən əminsiniz? Bu əməliyyat geri qaytarıla bilməz!")) {
      return;
    }

    setResetting(true);
    try {
      await onResetDB();
      showToast("Verilənlər bazası uğurla sıfırlandı!", "success");
      await fetchLogs();
    } catch (err: any) {
      showToast(err.message || "Sıfırlama zamanı xəta baş verdi.", "error");
    } finally {
      setResetting(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.details.toLowerCase().includes(search.toLowerCase()) || 
                          log.action.toLowerCase().includes(search.toLowerCase());
    const matchesUser = filterUser === "all" || log.user === filterUser;
    return matchesSearch && matchesUser;
  });

  const getActionBadgeStyle = (action: string) => {
    switch (action) {
      case "invoice_created":
        return "bg-emerald-50 text-emerald-700 border-emerald-100";
      case "invoice_deleted":
        return "bg-rose-50 text-rose-700 border-rose-100";
      case "customer_created":
        return "bg-indigo-50 text-indigo-700 border-indigo-100";
      case "customer_deleted":
        return "bg-amber-50 text-amber-700 border-amber-100";
      case "payment_recorded":
        return "bg-cyan-50 text-cyan-700 border-cyan-100";
      case "payment_deleted":
        return "bg-orange-50 text-orange-700 border-orange-100";
      case "database_reset":
        return "bg-purple-50 text-purple-700 border-purple-100";
      default:
        return "bg-slate-50 text-slate-700 border-slate-100";
    }
  };

  const getActionNameAzeri = (action: string) => {
    switch (action) {
      case "invoice_created":
        return "Qaimə Yaradıldı";
      case "invoice_deleted":
        return "Qaimə Silindi";
      case "customer_created":
        return "Müştəri Əlavə Edildi";
      case "customer_deleted":
        return "Müştəri Silindi";
      case "payment_recorded":
        return "Ödəniş Qəbul Edildi";
      case "payment_deleted":
        return "Ödəniş Silindi";
      case "database_reset":
        return "Sistem Sıfırlandı";
      default:
        return action;
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden">
      {/* Top Banner/Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-3">
          <div className="bg-slate-900 text-white p-2 rounded-lg">
            <Shield className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-sm font-bold font-display text-slate-900 uppercase tracking-tight">Admin Paneli və Sistem Logları</h1>
            <p className="text-[11px] text-slate-500 font-medium">Sistemdə baş verən bütün əməliyyatların real-vaxt izlənməsi</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={fetchLogs}
            disabled={loading}
            className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg border border-slate-200 cursor-pointer disabled:opacity-50"
            title="Logları Yenilə"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-indigo-600" : ""}`} />
          </button>
          
          <button
            onClick={handleResetClick}
            disabled={resetting}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-lg text-xs font-bold transition cursor-pointer disabled:opacity-50"
          >
            <AlertTriangle className="w-4 h-4" />
            <span>Sistemi Sıfırla</span>
          </button>
        </div>
      </header>

      {/* Main Content Pane */}
      <div className="flex-1 overflow-hidden p-6 flex flex-col space-y-4">
        {/* Statistics Widgets */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center space-x-4">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cəmi Əməliyyat Logu</p>
              <h3 className="text-xl font-black text-slate-900 font-mono mt-0.5">{logs.length}</h3>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center space-x-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Son 24 saatda fəaliyyət</p>
              <h3 className="text-xl font-black text-slate-900 font-mono mt-0.5">
                {logs.filter(l => Date.now() - new Date(l.timestamp).getTime() < 24 * 60 * 60 * 1000).length}
              </h3>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center space-x-4">
            <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
              <User className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mövcud Sessiyanız</p>
              <h3 className="text-xs font-black text-purple-700 bg-purple-50 border border-purple-100 px-2 py-0.5 rounded-md mt-1 inline-block uppercase tracking-wider">
                {currentUser?.username} ({currentUser?.role})
              </h3>
            </div>
          </div>
        </div>

        {/* Filters and List */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-4 overflow-hidden">
          {/* Left Column: Users management */}
          <div className="lg:col-span-1 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
              <span className="font-bold text-xs text-slate-700 uppercase tracking-wider">İstifadəçilər</span>
              <span className="text-[10px] bg-indigo-50 text-indigo-600 font-bold px-2 py-0.5 rounded-full border border-indigo-100">{users.length}</span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {users.map((u) => {
                const isMainAdmin = u.username.toLowerCase() === "admin";
                return (
                  <div key={u.username} className="flex flex-col p-3 rounded-lg border border-slate-100 bg-slate-50/50 space-y-2">
                    <div className="flex items-center justify-between space-x-2">
                      <div className="flex items-center space-x-2 overflow-hidden">
                        <div className="w-7 h-7 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                          {u.username.charAt(0)}
                        </div>
                        <div className="overflow-hidden">
                          <p className="text-xs font-bold text-slate-800 truncate">{u.username}</p>
                          <span className={`inline-block text-[9px] font-black uppercase tracking-wider px-1 py-0.5 rounded ${
                            u.role === "admin" ? "bg-indigo-50 text-indigo-600" : "bg-slate-100 text-slate-500"
                          }`}>
                            {u.role}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-1 pt-1">
                      <button
                        disabled={isMainAdmin || updatingUser === u.username}
                        onClick={() => handleRoleChange(u.username, "admin")}
                        className={`flex-1 text-[9px] font-black uppercase py-1 rounded transition border text-center cursor-pointer ${
                          u.role === "admin"
                            ? "bg-indigo-600 border-indigo-600 text-white font-black shadow-xs"
                            : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        Admin
                      </button>
                      <button
                        disabled={isMainAdmin || updatingUser === u.username}
                        onClick={() => handleRoleChange(u.username, "user")}
                        className={`flex-1 text-[9px] font-black uppercase py-1 rounded transition border text-center cursor-pointer ${
                          u.role === "user"
                            ? "bg-indigo-600 border-indigo-600 text-white font-black shadow-xs"
                            : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        User
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Logs List */}
          <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col overflow-hidden">
            {/* Controls Bar */}
            <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row gap-3 items-center justify-between bg-slate-50/50">
              {/* Search */}
              <div className="relative w-full md:max-w-xs">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Loglarda axtarış..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-900 focus:outline-hidden focus:border-indigo-500 font-medium placeholder-slate-400"
                />
              </div>

              {/* User Filter */}
              <div className="flex items-center space-x-2 w-full md:w-auto justify-end">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">İstifadəçi filtri:</span>
                <select
                  value={filterUser}
                  onChange={(e) => setFilterUser(e.target.value)}
                  className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-hidden focus:border-indigo-500 font-medium"
                >
                  <option value="all">Hamısı</option>
                  <option value="admin">Admin</option>
                  <option value="user">User (Oxucu)</option>
                </select>
              </div>
            </div>

            {/* Logs Terminal Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-slate-950 font-mono text-xs text-slate-300">
              {filteredLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center text-slate-500 space-y-2">
                  <Terminal className="w-8 h-8 text-slate-600 animate-pulse" />
                  <p>Heç bir əməliyyat logu tapılmadı.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {filteredLogs.map((log) => (
                    <div key={log.id} className="flex flex-col md:flex-row md:items-start md:space-x-3 border-b border-slate-900 pb-2 hover:bg-slate-900/30 px-2 py-1 rounded transition">
                      {/* Timestamp */}
                      <div className="flex items-center text-slate-500 font-semibold shrink-0 select-none pb-1 md:pb-0">
                        <Clock className="w-3.5 h-3.5 mr-1" />
                        <span>{new Date(log.timestamp).toLocaleTimeString("az-AZ")}</span>
                        <span className="mx-1 text-slate-800">|</span>
                        <span>{new Date(log.timestamp).toLocaleDateString("az-AZ")}</span>
                      </div>

                      {/* User */}
                      <div className="flex items-center shrink-0">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border tracking-wide uppercase ${
                          log.user === "admin" 
                            ? "bg-indigo-950/40 text-indigo-400 border-indigo-900/50" 
                            : "bg-slate-900 text-slate-400 border-slate-800"
                        }`}>
                          {log.user}
                        </span>
                      </div>

                      {/* Action */}
                      <div className="shrink-0 mt-1 md:mt-0">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border tracking-wide ${getActionBadgeStyle(log.action)}`}>
                          {getActionNameAzeri(log.action)}
                        </span>
                      </div>

                      {/* Details */}
                      <div className="flex-1 text-slate-200 break-all mt-1 md:mt-0 font-medium">
                        {log.details}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
