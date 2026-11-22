"use client";

import { useState } from "react";
import { X, Eye, EyeOff, AlertCircle, Coffee } from "lucide-react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "login" | "register";
  onModeChange: (mode: "login" | "register") => void;
  email: string;
  onEmailChange: (val: string) => void;
  password: string;
  onPasswordChange: (val: string) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  loading: boolean;
  error?: string;
}

function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;
  const strength = password.length < 6 ? 1 : password.length < 10 ? 2 : 3;
  const labels = ["", "Yếu (tối thiểu 6 ký tự)", "Trung bình", "Mạnh"];
  const colors = ["", "bg-[#EF4444]", "bg-[#F59E0B]", "bg-[#10B981]"];
  const textColors = ["", "text-[#EF4444]", "text-[#F59E0B]", "text-[#10B981]"];

  return (
    <div className="space-y-1 mt-1.5 animate-fade-in">
      <div className="flex gap-1.5">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
              i <= strength ? colors[strength] : "bg-[#EFE8DF]"
            }`}
          />
        ))}
      </div>
      <p className={`text-[10px] font-bold ${textColors[strength]}`}>
        {labels[strength]}
      </p>
    </div>
  );
}

export default function AuthModal({
  isOpen,
  onClose,
  mode,
  onModeChange,
  email,
  onEmailChange,
  password,
  onPasswordChange,
  onSubmit,
  loading,
  error,
}: AuthModalProps) {
  const [showPassword, setShowPassword] = useState(false);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Chào mừng đến BrewLite"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-[#3D261D]/50 backdrop-blur-sm" />

      {/* Modal Dialog Content */}
      <div
        className="relative bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl animate-scale-in overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Dark Espresso Brand Styling */}
        <div className="relative bg-[#3D261D] px-6 pt-6 pb-6 text-white">
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng cửa sổ đăng nhập"
            className="absolute top-4 right-4 w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors"
          >
            <X size={16} className="text-white" />
          </button>

          <div className="flex items-center gap-2 mb-2 text-[#C28D58]">
            <Coffee size={20} />
            <span className="text-xs font-bold uppercase tracking-wider">Tài khoản thành viên</span>
          </div>
          <h2 className="text-xl font-extrabold text-white mb-1">
            Chào mừng đến BrewLite
          </h2>
          <p className="text-[#E8C99A] text-xs leading-relaxed">
            Đăng nhập để theo dõi lịch sử đơn hàng, thanh toán nhanh và tận hưởng dịch vụ cà phê cashierless.
          </p>

          {/* Tab Selector */}
          <div role="tablist" className="flex mt-5 bg-white/10 rounded-2xl p-1">
            <button
              type="button"
              role="tab"
              aria-selected={mode === "login"}
              onClick={() => onModeChange("login")}
              className={`flex-1 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 ${
                mode === "login"
                  ? "bg-white text-[#3D261D] shadow-md"
                  : "text-white/70 hover:text-white"
              }`}
            >
              Đăng nhập
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "register"}
              onClick={() => onModeChange("register")}
              className={`flex-1 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 ${
                mode === "register"
                  ? "bg-white text-[#3D261D] shadow-md"
                  : "text-white/70 hover:text-white"
              }`}
            >
              Đăng ký
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={onSubmit} className="p-6 space-y-4">
          {/* Error Alert */}
          {error && (
            <div
              role="alert"
              className="bg-[#EF4444]/10 border border-[#EF4444]/30 rounded-2xl p-3 text-xs text-[#EF4444] font-semibold flex items-center gap-2"
            >
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Email input */}
          <div>
            <label
              htmlFor="auth-email"
              className="text-xs font-bold text-[#3D261D] uppercase tracking-wide mb-1.5 block"
            >
              Email *
            </label>
            <input
              id="auth-email"
              type="email"
              required
              value={email}
              onChange={(e) => onEmailChange(e.target.value)}
              placeholder="you@example.com"
              className="w-full border-2 border-[#EFE8DF] focus:border-[#C28D58] rounded-2xl px-4 py-3 text-sm text-[#3D261D] placeholder:text-[#C28D58]/40 focus:outline-none transition-colors"
            />
          </div>

          {/* Password input */}
          <div>
            <label
              htmlFor="auth-password"
              className="text-xs font-bold text-[#3D261D] uppercase tracking-wide mb-1.5 block"
            >
              Mật khẩu *
            </label>
            <div className="relative">
              <input
                id="auth-password"
                type={showPassword ? "text" : "password"}
                required
                minLength={6}
                value={password}
                onChange={(e) => onPasswordChange(e.target.value)}
                placeholder="••••••••"
                className="w-full border-2 border-[#EFE8DF] focus:border-[#C28D58] rounded-2xl px-4 py-3 pr-11 text-sm text-[#3D261D] placeholder:text-[#C28D58]/40 focus:outline-none transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#C28D58] hover:text-[#3D261D] transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {mode === "register" && <PasswordStrength password={password} />}
          </div>

          {/* Submit Action */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#C28D58] hover:bg-[#3D261D] text-white py-3 rounded-2xl font-bold text-sm transition-all duration-200 shadow-md active:scale-95 disabled:opacity-50"
            >
              {loading
                ? "Đang xử lý..."
                : mode === "login"
                ? "Đăng nhập"
                : "Đăng ký tài khoản"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
