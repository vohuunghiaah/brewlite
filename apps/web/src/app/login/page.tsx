'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Header } from '../../components/Header';
import { loginUser, registerUser } from '../../lib/api-client';
import { useAppStore } from '../../lib/store';
import { Coffee, Lock, Mail, User, AlertCircle, LogOut } from 'lucide-react';

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/';

  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [mounted, setMounted] = useState(false);
  const token = useAppStore((state) => state.token);
  const currentUser = useAppStore((state) => state.user);
  const setAuth = useAppStore((state) => state.setAuth);
  const logout = useAppStore((state) => state.logout);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError('Vui lòng điền đầy đủ email và mật khẩu.');
      return;
    }

    if (password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }

    if (isRegister && !fullName.trim()) {
      setError('Vui lòng nhập họ và tên của bạn.');
      return;
    }

    try {
      setLoading(true);
      if (isRegister) {
        const data = await registerUser(email, password, fullName);
        setAuth(data.accessToken, data.user);
      } else {
        const data = await loginUser(email, password);
        setAuth(data.accessToken, data.user);
      }
      router.push(redirectUrl);
    } catch (err: any) {
      setError(err.message || 'Thao tác không thành công.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-stone-50">
      <Header />

      <main className="max-w-md mx-auto px-4 py-8">
        {token && currentUser ? (
          // Đã đăng nhập
          <div className="bg-white p-6 rounded-2xl border border-brand-100 shadow-sm text-center space-y-4">
            <div className="w-16 h-16 bg-brand-50 text-brand-600 rounded-full flex items-center justify-center mx-auto">
              <User className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-brand-900">
                {currentUser.fullName}
              </h2>
              <p className="text-xs text-stone-500">{currentUser.email}</p>
              <div className="mt-2 inline-flex items-center gap-1 px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-xs font-semibold">
                Điểm thưởng: {currentUser.loyaltyPoints} điểm
              </div>
            </div>

            <div className="pt-4 border-t border-brand-50 flex flex-col gap-2">
              <button
                onClick={() => router.push('/orders')}
                className="w-full py-2.5 rounded-xl bg-brand-500 text-white text-xs font-bold hover:bg-brand-600 transition"
              >
                Xem lịch sử đơn hàng
              </button>
              <button
                onClick={handleLogout}
                className="w-full py-2.5 rounded-xl border border-rose-200 text-rose-600 text-xs font-bold hover:bg-rose-50 transition flex items-center justify-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                Đăng xuất tài khoản
              </button>
            </div>
          </div>
        ) : (
          // Chưa đăng nhập: Form Đăng nhập / Đăng ký
          <div className="bg-white p-6 rounded-2xl border border-brand-100 shadow-sm space-y-5">
            <div className="text-center space-y-1">
              <div className="w-12 h-12 bg-brand-500 text-white rounded-full flex items-center justify-center mx-auto mb-2">
                <Coffee className="w-6 h-6" />
              </div>
              <h1 className="text-xl font-bold text-brand-900">
                {isRegister ? 'Tạo tài khoản mới' : 'Đăng nhập BrewLite'}
              </h1>
              <p className="text-xs text-stone-500">
                {isRegister
                  ? 'Đăng ký để tích lũy điểm thưởng và nhận ưu đãi'
                  : 'Đăng nhập để đặt món và theo dõi đơn hàng'}
              </p>
            </div>

            {/* Chuyển tab Đăng nhập / Đăng ký */}
            <div className="grid grid-cols-2 p-1 bg-stone-100 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => {
                  setIsRegister(false);
                  setError(null);
                }}
                className={`py-2 rounded-lg transition-all ${
                  !isRegister
                    ? 'bg-white text-brand-900 shadow-sm'
                    : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                Đăng nhập
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsRegister(true);
                  setError(null);
                }}
                className={`py-2 rounded-lg transition-all ${
                  isRegister
                    ? 'bg-white text-brand-900 shadow-sm'
                    : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                Đăng ký
              </button>
            </div>

            {error && (
              <div
                data-testid="auth-error-banner"
                className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              {isRegister && (
                <div>
                  <label className="text-xs font-semibold text-stone-700 block mb-1">
                    Họ và tên
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Nguyễn Văn A"
                      className="w-full pl-9 pr-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
                    />
                    <User className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">
                  Địa chỉ Email
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="customer@brewlite.com"
                    className="w-full pl-9 pr-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
                  />
                  <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">
                  Mật khẩu
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Tối thiểu 6 ký tự"
                    className="w-full pl-9 pr-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
                  />
                  <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                data-testid="auth-submit-button"
                className="w-full py-3 rounded-xl bg-brand-500 text-white font-bold text-xs hover:bg-brand-600 active:scale-95 transition-all shadow-md disabled:opacity-50 mt-2"
              >
                {loading
                  ? 'Đang xử lý...'
                  : isRegister
                  ? 'Hoàn tất Đăng ký'
                  : 'Đăng nhập ngay'}
              </button>
            </form>

            {/* Gợi ý tài khoản demo */}
            <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200/60 text-[11px] text-amber-800 space-y-1">
              <span className="font-bold block">Tài khoản mẫu thử nghiệm:</span>
              <p>Email: <code className="font-mono bg-white px-1 rounded">customer@brewlite.com</code></p>
              <p>Mật khẩu: <code className="font-mono bg-white px-1 rounded">Password123!</code></p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-stone-50 flex items-center justify-center text-xs text-stone-500">
          Đang tải xác thực...
        </div>
      }
    >
      <LoginFormContent />
    </Suspense>
  );
}
