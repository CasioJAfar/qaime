import React, { useState } from "react";
import { Lock, User, AlertCircle, ShieldAlert } from "lucide-react";

interface LoginViewProps {
  onLoginSuccess: (user: { username: string; role: string }) => void;
}

export default function LoginView({ onLoginSuccess }: LoginViewProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Giriş uğursuz oldu.");
      }

      onLoginSuccess({ username: data.username, role: data.role });
    } catch (err: any) {
      setError(err.message || "Bilinməyən xəta baş verdi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-slate-900 px-4 py-12 relative overflow-hidden font-sans">
      {/* Background Decorative Rings */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>

      <div className="w-full max-w-md space-y-8 z-10">
        <div className="flex flex-col items-center">
          <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center font-bold text-white shadow-xl text-2xl mb-4 font-display">
            Q
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight font-display uppercase">QAİMƏ.PRO</h2>
          <p className="mt-2 text-xs text-slate-400 font-medium">Bulud Əsaslı Qaimə və Borc İdarəetmə Sistemi</p>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-md p-8 rounded-2xl border border-slate-700/60 shadow-2xl space-y-6">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white tracking-tight">Sistemə Giriş</h3>
            <p className="text-xs text-slate-400">Davam etmək üçün istifadəçi məlumatlarınızı daxil edin</p>
          </div>

          {error && (
            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-200 px-4 py-3 rounded-lg flex items-center gap-2.5 text-xs font-semibold animate-shake">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase tracking-wider">İstifadəçi Adı</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <User className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-2.5 pl-10 pr-3 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500 font-medium"
                  placeholder="İstifadəçi adı"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase tracking-wider">Şifrə</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-2.5 pl-10 pr-3 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500 font-medium"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-lg hover:shadow-indigo-500/20 cursor-pointer flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                "Sistemə Daxil Ol"
              )}
            </button>
          </form>


        </div>
      </div>
    </div>
  );
}
