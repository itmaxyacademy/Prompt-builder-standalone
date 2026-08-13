import React, { useState } from "react";
import { X, User, LogOut, LogIn, UserPlus } from "lucide-react";

interface AuthUser {
  id: number;
  name: string;
  email: string;
  type: string;
  profile_picture: string | null;
  phone: string | null;
  token?: string;
}

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: AuthUser | null;
  onLogin: (user: AuthUser) => void;
  onLogout: () => void;
}

export function LoginModal({ isOpen, onClose, user, onLogin, onLogout }: LoginModalProps) {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const endpoint = isRegister
      ? "https://api.maxy.academy/api/v1/auth/register"
      : "https://api.maxy.academy/api/v1/auth/login";

    const payload = isRegister
      ? { name, email, password, client_app: "web" }
      : { email, password, client_app: "web" };

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || data.error || (isRegister ? "Registration failed" : "Login failed"));
      }

      onLogin({ ...data.data.user, token: data.data.access_token });
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl relative">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">
            {user ? "Your Profile" : isRegister ? "Create Maxy Account" : "Login to Prompt Builder"}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          {user ? (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-full flex items-center justify-center text-white text-xl font-bold shadow-sm bg-gradient-to-tr from-indigo-600 to-purple-600">
                  {user.name ? user.name.charAt(0).toUpperCase() : <User size={28} />}
                </div>
                <div>
                  <h3 className="font-bold text-lg text-gray-900">{user.name}</h3>
                  <p className="text-sm text-gray-500">{user.email}</p>
                  <span className="text-xs text-indigo-600 font-semibold capitalize">{user.type}</span>
                </div>
              </div>
              <div className="bg-green-50 text-green-700 px-4 py-3 rounded-xl text-sm border border-green-100 flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                Models & API keys synced from your account
              </div>
              <button
                onClick={() => { onLogout(); onClose(); }}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-red-50 text-red-600 rounded-xl font-semibold hover:bg-red-100 transition-colors"
              >
                <LogOut size={16} />
                Sign Out
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-sm text-gray-600 pb-1">
                {isRegister
                  ? "Daftar akun Maxy Academy baru untuk menyimpan API keys & custom models."
                  : "Sign in with your Maxy Academy account to sync your API keys and custom models."}
              </p>

              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-100">
                  {error}
                </div>
              )}

              {isRegister && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">Full Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-neutral-100 text-neutral-900 border border-gray-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    placeholder="Masukkan nama lengkap"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-neutral-100 text-neutral-900 border border-gray-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  placeholder="Enter your email"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-neutral-100 text-neutral-900 border border-gray-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  placeholder="Enter your password"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold transition-all shadow-md hover:opacity-90 mt-2 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
              >
                {isRegister ? <UserPlus size={16} /> : <LogIn size={16} />}
                {loading ? (isRegister ? "Registering..." : "Signing in...") : isRegister ? "Daftar Sekarang" : "Sign In"}
              </button>

              <div className="pt-2 text-center border-t border-gray-100">
                {isRegister ? (
                  <p className="text-xs text-gray-500">
                    Sudah punya akun Maxy?{" "}
                    <button
                      type="button"
                      onClick={() => { setIsRegister(false); setError(null); }}
                      className="font-bold text-indigo-600 hover:underline cursor-pointer"
                    >
                      Login disini
                    </button>
                  </p>
                ) : (
                  <p className="text-xs text-gray-500">
                    Belum punya akun Maxy?{" "}
                    <button
                      type="button"
                      onClick={() => { setIsRegister(true); setError(null); }}
                      className="font-bold text-indigo-600 hover:underline cursor-pointer"
                    >
                      Daftar gratis sekarang
                    </button>
                  </p>
                )}
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
