import { useState } from "react";
import { X, User, Lock, UserPlus, LogIn, AlertCircle } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: { username: string; display_name?: string }) => void;
}

const API = "http://localhost:8000";

export function AuthModal({ isOpen, onClose, onSuccess }: Props) {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanUsername = username.trim();
    if (!cleanUsername) {
      setError("Username is required.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    try {
      if (isRegister) {
        // Register account
        const regRes = await fetch(`${API}/api/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: cleanUsername,
            password,
            display_name: displayName.trim() || cleanUsername,
          }),
        });

        if (!regRes.ok) {
          const data = await regRes.json();
          throw new Error(data.detail || `Registration failed (${regRes.status})`);
        }
      }

      // Login to get token
      const loginRes = await fetch(`${API}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: cleanUsername,
          password,
        }),
      });

      if (!loginRes.ok) {
        const data = await loginRes.json();
        throw new Error(data.detail || `Login failed (${loginRes.status})`);
      }

      const loginData = await loginRes.json();
      localStorage.setItem("megan_token", loginData.token);
      localStorage.setItem("megan_user", JSON.stringify(loginData.user));

      onSuccess(loginData.user);
      onClose();
    } catch (err: any) {
      setError(err.message || "An authentication error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-[#121216] border border-[#27272e] rounded-3xl shadow-2xl overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#27272e] bg-[#141418]">
          <div className="flex items-center gap-2">
            {isRegister ? (
              <UserPlus className="w-5 h-5 text-rose-400" />
            ) : (
              <LogIn className="w-5 h-5 text-rose-400" />
            )}
            <h2 className="text-sm font-bold text-zinc-100">
              {isRegister ? "Create Megan Account" : "Sign In to Megan"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-[#27272e] bg-[#0c0c0f]">
          <button
            type="button"
            onClick={() => {
              setIsRegister(false);
              setError(null);
            }}
            className={`flex-1 py-3 text-xs font-semibold text-center border-b-2 transition-colors ${
              !isRegister
                ? "border-rose-500 text-rose-400 bg-[#141418]"
                : "border-transparent text-zinc-400 hover:text-white"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setIsRegister(true);
              setError(null);
            }}
            className={`flex-1 py-3 text-xs font-semibold text-center border-b-2 transition-colors ${
              isRegister
                ? "border-rose-500 text-rose-400 bg-[#141418]"
                : "border-transparent text-zinc-400 hover:text-white"
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-950/40 border border-red-500/30 rounded-xl flex items-center gap-2.5 text-xs text-red-300 animate-fade-in">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
              Username
            </label>
            <div className="relative flex items-center">
              <User className="absolute left-3 w-4 h-4 text-zinc-500 pointer-events-none" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. dev_user"
                required
                className="w-full pl-9 pr-3 py-2.5 bg-[#0a0a0c] border border-[#27272e] rounded-xl text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-rose-500/80 focus:ring-2 focus:ring-rose-500/20 transition-all"
              />
            </div>
          </div>

          {isRegister && (
            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                Display Name (Optional)
              </label>
              <div className="relative flex items-center">
                <User className="absolute left-3 w-4 h-4 text-zinc-500 pointer-events-none" />
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Alex Smith"
                  className="w-full pl-9 pr-3 py-2.5 bg-[#0a0a0c] border border-[#27272e] rounded-xl text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-rose-500/80 focus:ring-2 focus:ring-rose-500/20 transition-all"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <div className="relative flex items-center">
              <Lock className="absolute left-3 w-4 h-4 text-zinc-500 pointer-events-none" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                required
                className="w-full pl-9 pr-3 py-2.5 bg-[#0a0a0c] border border-[#27272e] rounded-xl text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-rose-500/80 focus:ring-2 focus:ring-rose-500/20 transition-all"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white rounded-xl text-xs font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-coral-glow-sm active:scale-[0.99]"
            >
              {loading
                ? isRegister
                  ? "Creating Account..."
                  : "Signing In..."
                : isRegister
                ? "Register & Sign In"
                : "Sign In"}
            </button>
          </div>

          <p className="text-center text-[11px] text-zinc-500 pt-1">
            Accounts and session data are stored securely on this computer.
          </p>
        </form>
      </div>
    </div>
  );
}
