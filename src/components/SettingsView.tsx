import React, { useState } from "react";
import { 
  Settings, 
  RotateCcw, 
  CheckCircle, 
  Key, 
  Database, 
  HelpCircle,
  TrendingUp,
  AlertCircle,
  User,
  Building,
  Globe,
  Save
} from "lucide-react";

interface SettingsViewProps {
  onResetDB: () => Promise<void>;
  currency: string;
  userInfo: {
    companyName: string;
    ownerName: string;
    email: string;
    phone: string;
  };
  onUpdateSettings: (currency: string, userInfo: { companyName: string; ownerName: string; email: string; phone: string; }) => void;
  showToast?: (message: string, type?: "success" | "error" | "info") => void;
}

export default function SettingsView({ onResetDB, currency, userInfo, onUpdateSettings, showToast }: SettingsViewProps) {
  const [resetSuccess, setResetSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  // Profile and currency local states
  const [companyName, setCompanyName] = useState(userInfo?.companyName || "");
  const [ownerName, setOwnerName] = useState(userInfo?.ownerName || "");
  const [email, setEmail] = useState(userInfo?.email || "");
  const [phone, setPhone] = useState(userInfo?.phone || "");
  const [selectedCurrency, setSelectedCurrency] = useState(currency || "AZN");

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings(selectedCurrency, { companyName, ownerName, email, phone });
    if (showToast) {
      showToast("Ayarlar və valyuta tənzimləmələri uğurla yadda saxlanıldı!", "success");
    }
  };

  const [confirmReset, setConfirmReset] = useState(false);

  const handleReset = async () => {
    setLoading(true);
    setResetSuccess(false);
    try {
      await onResetDB();
      setResetSuccess(true);
      setConfirmReset(false);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-[#F8FAFC] space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-slate-800 tracking-tight">Sistem Ayarları</h2>
        <p className="text-xs text-slate-500">Qaimə ERP sisteminin konfiqurasiyası, verilənlər bazası və AI parametrləri.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Configuration cards */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm lg:col-span-2 space-y-6">
          
          {/* User Profile & Currency Settings */}
          <div className="space-y-4 pb-6 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-800 flex items-center space-x-2">
              <User className="w-4 h-4 text-indigo-600" />
              <span>İstifadəçi Profili və Valyuta Tənzimləmələri</span>
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Sistemdə görünəcək şirkət, rəhbər və əlaqə məlumatlarını, habelə qaimələrin, hesabatların və borcların hesablanacağı əsas valyutanı tənzimləyin.
            </p>

            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase tracking-wider">Şirkət Adı</label>
                  <div className="relative">
                    <Building className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
                    <input 
                      type="text" 
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Məs. MMC Şirkəti"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:border-indigo-500 font-semibold"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase tracking-wider">Məsul Şəxs (Rəhbər)</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
                    <input 
                      type="text" 
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                      placeholder="Adı, Soyadı"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:border-indigo-500 font-semibold"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase tracking-wider">E-poçt Ünvanı</label>
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@example.com"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:border-indigo-500 font-semibold"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase tracking-wider">Telefon Nömrəsi</label>
                  <input 
                    type="text" 
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+994 (50) 000-00-00"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:border-indigo-500 font-semibold"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase tracking-wider">Əsas Sistem Valyutası</label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
                    <select 
                      value={selectedCurrency}
                      onChange={(e) => setSelectedCurrency(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:border-indigo-500 font-bold"
                    >
                      <option value="AZN">AZN (₼) - Azərbaycan Manatı</option>
                      <option value="USD">USD ($) - ABŞ Dolları</option>
                      <option value="EUR">EUR (€) - Avro</option>
                    </select>
                  </div>
                </div>
                <div>
                  <button 
                    type="submit"
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition flex items-center justify-center space-x-1.5 cursor-pointer shadow-md"
                  >
                    <Save className="w-4 h-4" />
                    <span>Yadda Saxla</span>
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Database Admin Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-800 flex items-center space-x-2">
              <Database className="w-4 h-4 text-indigo-600" />
              <span>Verilənlər Bazası Uçotu</span>
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              ERP sisteminizi ilkin demo qaimələr, müştərilər və ödənişlər ilə sıfırlamaq istəyirsinizsə aşağıdakı əməliyyatı yerinə yetirin. Bu əməliyyat bütün cari verilənləri silib Azərbaycan dili üzrə təmiz seed data yükləyəcəkdir.
            </p>

            <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-150 flex items-center justify-between">
              <div>
                <span className="font-semibold text-xs text-slate-800 block">Məlumatları Sıfırla</span>
                <span className="text-[10px] text-slate-400">İlk quraşdırılma vəziyyətinə geri qaytarır</span>
              </div>
              {confirmReset ? (
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-rose-600 font-bold animate-pulse">Əminsiniz?</span>
                  <button 
                    onClick={handleReset}
                    disabled={loading}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition cursor-pointer shadow-md"
                  >
                    Bəli, Sil!
                  </button>
                  <button 
                    onClick={() => setConfirmReset(false)}
                    className="px-3 py-1.5 bg-slate-200 text-slate-700 hover:bg-slate-300 rounded-lg text-xs font-semibold transition cursor-pointer"
                  >
                    Xeyr
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => setConfirmReset(true)}
                  disabled={loading}
                  className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition flex items-center space-x-1.5 cursor-pointer shadow-md"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{loading ? "Sıfırlanır..." : "Sıfırla"}</span>
                </button>
              )}
            </div>

            {resetSuccess && (
              <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 p-3 rounded-lg text-xs flex items-center space-x-2">
                <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                <span>Bazanın sıfırlanması uğurla başa çatdı! Dashboard yeniləndi.</span>
              </div>
            )}
          </div>

          {/* Backup & Restore Section */}
          <div className="space-y-3 border-t border-slate-100 pt-5">
            <h3 className="text-sm font-semibold text-slate-800 flex items-center space-x-2">
              <Database className="w-4 h-4 text-emerald-600" />
              <span>Ehtiyat Nüsxə və Bərpa (Backup / Restore)</span>
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Sistemdəki bütün məlumatları (qaimələr, müştərilər, borclar) JSON formatında kompüterinizə yükləyərək pulsuz yadda saxlaya və ya əvvəlcədən yüklədiyiniz nüsxəni geri bərpa edə bilərsiniz.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
              <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 flex flex-col justify-between items-start space-y-3">
                <div>
                  <span className="font-bold text-xs text-emerald-900 block mb-1">Məlumatları Yüklə (Backup)</span>
                  <p className="text-[10px] text-emerald-700/80 leading-relaxed">Bütün sistemi JSON formatında cihazınıza yükləyir. Təhlükəsizlik üçün periyodik olaraq nüsxə çıxarmağınız tövsiyə olunur.</p>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    const savedUser = localStorage.getItem("erp_user");
                    const userObj = savedUser ? JSON.parse(savedUser) : null;
                    const res = await fetch("/api/backup", {
                      headers: {
                        "x-user-role": userObj?.role || "",
                        "x-user-username": userObj?.username || ""
                      }
                    });
                    if (res.ok) {
                      const blob = await res.blob();
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `erp_backup_${new Date().toISOString().split('T')[0]}.json`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      if(showToast) showToast("Backup uğurla yükləndi!", "success");
                    } else {
                      if(showToast) showToast("Backup yüklənərkən xəta baş verdi.", "error");
                    }
                  }}
                  className="px-4 py-2 w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center justify-center space-x-1.5 shadow-sm"
                >
                  <Save className="w-4 h-4" />
                  <span>Backup Et</span>
                </button>
              </div>

              <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-100 flex flex-col justify-between items-start space-y-3">
                <div>
                  <span className="font-bold text-xs text-amber-900 block mb-1">Məlumatı Bərpa Et (Restore)</span>
                  <p className="text-[10px] text-amber-700/80 leading-relaxed">Əvvəllər yüklədiyiniz JSON faylını seçərək sistemi əvvəlki vəziyyətinə qaytarın. Cari məlumatlar silinəcək.</p>
                </div>
                <label className="px-4 py-2 w-full bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition flex items-center justify-center space-x-1.5 shadow-sm cursor-pointer">
                  <RotateCcw className="w-4 h-4" />
                  <span>JSON Seç və Bərpa Et</span>
                  <input 
                    type="file" 
                    accept=".json"
                    className="hidden" 
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = async (event) => {
                        try {
                          const data = JSON.parse(event.target?.result as string);
                          const savedUser = localStorage.getItem("erp_user");
                          const userObj = savedUser ? JSON.parse(savedUser) : null;
                          const res = await fetch("/api/restore", {
                            method: "POST",
                            headers: {
                              "Content-Type": "application/json",
                              "x-user-role": userObj?.role || "",
                              "x-user-username": userObj?.username || ""
                            },
                            body: JSON.stringify(data)
                          });
                          if (res.ok) {
                            if(showToast) showToast("Məlumatlar uğurla bərpa edildi! Səhifə yenilənir...", "success");
                            setTimeout(() => window.location.reload(), 1500);
                          } else {
                            if(showToast) showToast("Bərpa zamanı xəta baş verdi.", "error");
                          }
                        } catch (err) {
                          if(showToast) showToast("Fayl oxunarkən və ya JSON formatında xəta baş verdi.", "error");
                        }
                      };
                      reader.readAsText(file);
                    }} 
                  />
                </label>
              </div>
            </div>
          </div>

          {/* AI Configuration Help */}
          <div className="space-y-3 border-t border-slate-100 pt-5">
            <h3 className="text-sm font-semibold text-slate-800 flex items-center space-x-2">
              <Key className="w-4 h-4 text-indigo-600" />
              <span>Gemini AI Konfiqurasiyası</span>
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Bu tətbiq qaimələrin (PDF, Excel, Şəkil) məzmununu ağıllı şəkildə analiz etmək üçün <strong>Gemini 3.5 Flash</strong> modelindən istifadə edir. Analizin düzgün işləməsi üçün tətbiqin serverində <code>GEMINI_API_KEY</code> təyin olunmalıdır.
            </p>

            <div className="bg-indigo-50/50 p-3.5 rounded-lg border border-indigo-100 flex items-start space-x-3 text-indigo-900">
              <AlertCircle className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1.5">
                <p className="font-bold">Açarı necə təyin etməli?</p>
                <p className="leading-relaxed text-[11px] text-slate-600">
                  1. Sol menyuda və ya tətbiq kənarında yerləşən <strong>Settings (Ayarlar) &gt; Secrets</strong> panelinə keçin.<br />
                  2. <code>GEMINI_API_KEY</code> açarını öz Google AI Studio api key-iniz ilə doldurun.<br />
                  3. Açar daxil edilmədikdə belə, sistem qaimə yükləmələrində ağıllı demo simulyatordan istifadə edərək tətbiqin funksionallığını 100% qoruyacakdır.
                </p>
              </div>
            </div>
          </div>

        </div>

        {/* Technical help sidebar info */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-2">
              <HelpCircle className="w-4 h-4 text-slate-400" />
              <span>Dəstək və Uçot</span>
            </h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Qaimə idarəetmə ERP sistemi kiçik və orta sahibkarlıq subyektləri üçün sənəd dövriyyəsinin rəqəmsallaşdırılması və debitor borcların idarə edilməsi üçün hazırlanmışdır.
            </p>
            
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-150 text-[11px] text-slate-600 space-y-1">
              <div className="font-bold text-slate-800">Sistem Versiyası:</div>
              <div className="font-mono text-[10px]">v1.0.0 Stable (Azərbaycan)</div>
              <div className="font-bold text-slate-800 pt-1.5">Lisenziya:</div>
              <div className="font-mono text-[10px]">Apache-2.0</div>
            </div>
          </div>

          <div className="text-[10px] text-slate-400 text-center border-t border-slate-100 pt-3 mt-4 leading-relaxed">
            Hər hansı bir texniki sualınız yarandıqda sistem administratoru ilə əlaqə saxlamağınız xahiş olunur.
          </div>
        </div>
      </div>
    </div>
  );
}
