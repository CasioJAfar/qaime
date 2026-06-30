import React, { useState, useEffect } from "react";
import Sidebar from "./components/Sidebar";
import DashboardView from "./components/DashboardView";
import InvoicesView from "./components/InvoicesView";
import CustomersView from "./components/CustomersView";
import DebtsView from "./components/DebtsView";
import ReportsView from "./components/ReportsView";
import SettingsView from "./components/SettingsView";
import LoginView from "./components/LoginView";
import AdminPanelView from "./components/AdminPanelView";
import { DashboardData, Invoice, Customer } from "./types";
import { AlertCircle, RefreshCw, CheckCircle, XCircle, Info } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<{ username: string; role: string } | null>(() => {
    const saved = localStorage.getItem("erp_user");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return null;
  });

  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  
  // Selection states across views
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Loading & error states
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  // Toast state
  const [toasts, setToasts] = useState<Toast[]>([]);
  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  // Set up global fetch interceptor to inject X-User-Role and X-User-Username headers
  useEffect(() => {
    const originalFetch = window.fetch;
    const customFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const savedUser = localStorage.getItem("erp_user");
      let headers = init?.headers || {};
      if (savedUser) {
        try {
          const userObj = JSON.parse(savedUser);
          if (headers instanceof Headers) {
            headers.set("x-user-role", userObj.role);
            headers.set("x-user-username", userObj.username);
          } else if (Array.isArray(headers)) {
            headers.push(["x-user-role", userObj.role]);
            headers.push(["x-user-username", userObj.username]);
          } else {
            headers = {
              ...headers,
              "x-user-role": userObj.role,
              "x-user-username": userObj.username
            };
          }
        } catch (e) {}
      }
      const response = await originalFetch(input, { ...init, headers });
      
      // If server returns 403 Forbidden, let's capture it and show user-friendly alert
      if (response.status === 403) {
        try {
          const clone = response.clone();
          const errData = await clone.json();
          showToast(errData.error || "Səlahiyyətiniz yoxdur.", "error");
        } catch (e) {
          showToast("Bu əməliyyat üçün səlahiyyətiniz yoxdur.", "error");
        }
      }
      return response;
    };

    try {
      Object.defineProperty(window, "fetch", {
        value: customFetch,
        configurable: true,
        writable: true
      });
    } catch (e) {
      try {
        (window as any).fetch = customFetch;
      } catch (err) {
        console.warn("Could not override fetch via assignment either", err);
      }
    }

    return () => {
      try {
        Object.defineProperty(window, "fetch", {
          value: originalFetch,
          configurable: true,
          writable: true
        });
      } catch (e) {
        try {
          (window as any).fetch = originalFetch;
        } catch (err) {}
      }
    };
  }, []);

  // User info and system currency settings
  const [currency, setCurrency] = useState<string>(() => localStorage.getItem("erp_currency") || "AZN");
  const [userInfo, setUserInfo] = useState<{
    companyName: string;
    ownerName: string;
    email: string;
    phone: string;
  }>(() => {
    const saved = localStorage.getItem("erp_user_info");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return {
      companyName: "Mədaxil ERP Sistemi",
      ownerName: "İstifadəçi",
      email: "destek@medaxilerp.az",
      phone: "+994 (50) 000-00-00"
    };
  });

  const updateSettings = (newCurrency: string, newUserInfo: { companyName: string; ownerName: string; email: string; phone: string; }) => {
    setCurrency(newCurrency);
    setUserInfo(newUserInfo);
    localStorage.setItem("erp_currency", newCurrency);
    localStorage.setItem("erp_user_info", JSON.stringify(newUserInfo));
  };

  // Fetch all ERP data in parallel
  useEffect(() => {
    async function fetchERPData() {
      setLoading(true);
      setError(null);
      try {
        const [dashRes, invRes, custRes] = await Promise.all([
          fetch("/api/dashboard"),
          fetch("/api/invoices"),
          fetch("/api/customers")
        ]);

        if (!dashRes.ok || !invRes.ok || !custRes.ok) {
          throw new Error("Sistem verilənlərinin oxunmasında xəta baş verdi.");
        }

        const dashData = await dashRes.json();
        const invData = await invRes.json();
        const custData = await custRes.json();

        setDashboardData(dashData);
        setInvoices(invData);
        setCustomers(custData);

        // Keep selected customer synchronized with refreshed data
        if (selectedCustomer) {
          const updatedCust = custData.find((c: any) => c.id === selectedCustomer.id);
          if (updatedCust) {
            setSelectedCustomer(updatedCust);
          }
        }
        // Keep selected invoice synchronized with refreshed data
        if (selectedInvoice) {
          const updatedInv = invData.find((i: any) => i.id === selectedInvoice.id);
          if (updatedInv) {
            setSelectedInvoice(updatedInv);
          }
        }
      } catch (err: any) {
        console.error("Fetch Error:", err);
        setError(err.message || "Bilinməyən xəta baş verdi.");
      } finally {
        setLoading(false);
      }
    }

    fetchERPData();
  }, [refreshTrigger]);

  const triggerRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleResetDatabase = async () => {
    const res = await fetch("/api/reset");
    if (res.ok) {
      triggerRefresh();
    } else {
      throw new Error("Verilənlər bazası sıfırlanmadı.");
    }
  };

  const handleNavigate = (tab: string) => {
    setActiveTab(tab);
  };

  const handleSelectInvoiceAndNavigate = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setActiveTab("invoices");
  };

  const handleSelectCustomerAndNavigate = (customer: Customer) => {
    setSelectedCustomer(customer);
    setActiveTab("customers");
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem("erp_user");
    setActiveTab("dashboard");
  };

  if (!currentUser) {
    return (
      <>
        <LoginView onLoginSuccess={(user) => {
          setCurrentUser(user);
          localStorage.setItem("erp_user", JSON.stringify(user));
        }} />
        {/* Toast Overlay for login errors/notifications */}
        <div className="fixed top-5 right-5 z-50 flex flex-col space-y-2 pointer-events-none max-w-sm w-full">
          <AnimatePresence>
            {toasts.map(toast => (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
                className={`p-4 rounded-xl border shadow-xl flex items-center space-x-3 pointer-events-auto bg-white ${
                  toast.type === "success" 
                    ? "border-emerald-100 text-emerald-800" 
                    : toast.type === "error" 
                      ? "border-rose-100 text-rose-800" 
                      : "border-slate-100 text-slate-800"
                }`}
              >
                {toast.type === "success" ? (
                  <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
                ) : toast.type === "error" ? (
                  <XCircle className="w-5 h-5 text-rose-500 shrink-0" />
                ) : (
                  <Info className="w-5 h-5 text-indigo-500 shrink-0" />
                )}
                <div className="text-xs font-bold leading-normal">{toast.message}</div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden font-sans text-slate-700 bg-slate-100">
      {/* Sidebar Navigation */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} currentUser={currentUser} onLogout={handleLogout} />

      {/* Main Content Pane */}
      <main className="flex-1 flex flex-col h-full overflow-hidden pb-16 md:pb-0">
        
        {/* Connection status and technical feedback banner */}
        {error && (
          <div className="bg-rose-600 text-white px-6 py-3 flex items-center justify-between shadow-md shrink-0">
            <div className="flex items-center space-x-2.5 text-sm font-medium">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
            <button 
              onClick={triggerRefresh}
              className="flex items-center space-x-1.5 bg-rose-700 hover:bg-rose-800 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Yenidən Sına</span>
            </button>
          </div>
        )}

        {/* View Router */}
        <div className="flex-1 flex overflow-hidden relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="flex-1 flex overflow-hidden w-full"
            >
              {activeTab === "dashboard" && (
                <DashboardView 
                  data={dashboardData} 
                  loading={loading} 
                  onNavigate={handleNavigate}
                  onSelectInvoice={handleSelectInvoiceAndNavigate}
                  invoices={invoices}
                  customers={customers}
                  currency={currency}
                />
              )}

              {activeTab === "invoices" && (
                <InvoicesView 
                  invoices={invoices} 
                  customers={customers}
                  loading={loading}
                  onInvoiceCreated={triggerRefresh}
                  selectedInvoice={selectedInvoice}
                  setSelectedInvoice={setSelectedInvoice}
                  onSelectInvoice={setSelectedInvoice}
                  showToast={showToast}
                  currency={currency}
                />
              )}

              {activeTab === "customers" && (
                <CustomersView 
                  customers={customers} 
                  loading={loading}
                  onCustomerAdded={triggerRefresh}
                  selectedCustomer={selectedCustomer}
                  setSelectedCustomer={setSelectedCustomer}
                  showToast={showToast}
                  currency={currency}
                />
              )}

              {activeTab === "debts" && (
                <DebtsView 
                  customers={customers} 
                  loading={loading}
                  onPaymentRecorded={triggerRefresh}
                  currency={currency}
                />
              )}

              {activeTab === "reports" && (
                <ReportsView 
                  customers={customers} 
                  invoices={invoices} 
                  loading={loading}
                  onInvoiceUpdated={triggerRefresh}
                  showToast={showToast}
                  currency={currency}
                />
              )}

              {activeTab === "admin_panel" && currentUser.role === "admin" && (
                <AdminPanelView 
                  currentUser={currentUser}
                  onResetDB={handleResetDatabase}
                  showToast={showToast}
                />
              )}

              {activeTab === "settings" && (
                <SettingsView 
                  onResetDB={handleResetDatabase}
                  currency={currency}
                  userInfo={userInfo}
                  onUpdateSettings={updateSettings}
                  showToast={showToast}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Toast Overlay */}
      <div className="fixed top-5 right-5 z-50 flex flex-col space-y-2 pointer-events-none max-w-sm w-full">
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
              className={`p-4 rounded-xl border shadow-xl flex items-center space-x-3 pointer-events-auto bg-white ${
                toast.type === "success" 
                  ? "border-emerald-100 text-emerald-800" 
                  : toast.type === "error" 
                    ? "border-rose-100 text-rose-800" 
                    : "border-slate-100 text-slate-800"
              }`}
            >
              {toast.type === "success" ? (
                <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
              ) : toast.type === "error" ? (
                <XCircle className="w-5 h-5 text-rose-500 shrink-0" />
              ) : (
                <Info className="w-5 h-5 text-indigo-500 shrink-0" />
              )}
              <div className="text-xs font-bold leading-normal">{toast.message}</div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
