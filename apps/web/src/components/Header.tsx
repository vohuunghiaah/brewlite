"use client";

import { ShoppingBag, Home, UtensilsCrossed, ClockIcon, User } from "lucide-react";

export type NavView = "home" | "menu" | "orders" | "account";

interface HeaderProps {
  currentView: NavView;
  onNavigate: (view: NavView) => void;
  cartCount: number;
  cartTotal: number;
  onOpenCart: () => void;
  userEmail?: string | null;
  onOpenAuth: () => void;
  onLogout: () => void;
}

export function formatVND(amount: number): string {
  return amount.toLocaleString("vi-VN") + " đ";
}

export default function Header({
  currentView,
  onNavigate,
  cartCount,
  cartTotal,
  onOpenCart,
  userEmail,
  onOpenAuth,
  onLogout,
}: HeaderProps) {
  const cartSummaryLabel = `Giỏ hàng: ${cartCount} món - ${formatVND(cartTotal)}`;

  return (
    <header className="sticky top-0 z-40 bg-[#FDFCFA]/95 backdrop-blur-md border-b border-[#EFE8DF] transition-colors">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2.5 xl:py-0 xl:h-16 grid grid-cols-2 xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-y-2 gap-x-3">
        {/* Logo */}
        <div className="flex items-center justify-start">
          <a
            href="#menu"
            onClick={(e) => {
              e.preventDefault();
              onNavigate("menu");
            }}
            className="flex items-center gap-2 shrink-0 group focus:outline-none"
            aria-label="BrewLite Coffee"
          >
            <div className="w-8 h-8 xl:w-9 xl:h-9 bg-[#3D261D] rounded-xl flex items-center justify-center group-hover:bg-[#C28D58] transition-colors duration-200 shadow-sm">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <ellipse cx="12" cy="14" rx="7" ry="5" fill="#FAF6F0" opacity="0.9" />
                <path
                  d="M8 14 C8 10 10 6 12 4 C14 6 16 10 16 14"
                  stroke="#FAF6F0"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  fill="none"
                />
                <path d="M5 19 Q12 22 19 19" stroke="#FAF6F0" strokeWidth="1.5" strokeLinecap="round" fill="none" />
              </svg>
            </div>
            <span className="font-extrabold text-[#3D261D] text-base xl:text-lg tracking-tight select-none">
              Brew<span className="text-[#C28D58]">Lite</span>
            </span>
          </a>
        </div>

        {/* Desktop / Responsive Navigation */}
        <nav
          role="navigation"
          aria-label="Điều hướng chính"
          className="col-span-2 xl:col-span-1 xl:col-start-2 row-start-2 xl:row-start-1 justify-self-center flex items-center justify-center gap-1 sm:gap-2 w-full xl:w-auto"
        >
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              onNavigate("home");
            }}
            aria-current={currentView === "home" ? "page" : undefined}
            className={`relative px-2.5 sm:px-4 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-all duration-200 flex items-center gap-1 sm:gap-1.5 ${
              currentView === "home"
                ? "bg-[#3D261D] text-[#FAF6F0] shadow-sm"
                : "text-[#6B4235] hover:bg-[#EFE8DF] hover:text-[#3D261D]"
            }`}
          >
            <Home size={14} className="hidden sm:inline" />
            <span>Trang chủ</span>
          </a>

          <a
            href="#menu"
            onClick={(e) => {
              e.preventDefault();
              onNavigate("menu");
            }}
            aria-current={currentView === "menu" ? "page" : undefined}
            className={`relative px-2.5 sm:px-4 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-all duration-200 flex items-center gap-1 sm:gap-1.5 ${
              currentView === "menu"
                ? "bg-[#3D261D] text-[#FAF6F0] shadow-sm"
                : "text-[#6B4235] hover:bg-[#EFE8DF] hover:text-[#3D261D]"
            }`}
          >
            <UtensilsCrossed size={14} className="hidden sm:inline" />
            <span>Menu</span>
          </a>

          <a
            href="#history"
            onClick={(e) => {
              e.preventDefault();
              onNavigate("orders");
            }}
            aria-current={currentView === "orders" ? "page" : undefined}
            className={`relative px-2.5 sm:px-4 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-all duration-200 flex items-center gap-1 sm:gap-1.5 ${
              currentView === "orders"
                ? "bg-[#3D261D] text-[#FAF6F0] shadow-sm"
                : "text-[#6B4235] hover:bg-[#EFE8DF] hover:text-[#3D261D]"
            }`}
          >
            <ClockIcon size={14} className="hidden sm:inline" />
            <span>Lịch sử</span>
          </a>

          <a
            href="#account"
            onClick={(e) => {
              e.preventDefault();
              onNavigate("account");
            }}
            aria-current={currentView === "account" ? "page" : undefined}
            className={`relative px-2.5 sm:px-4 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-all duration-200 flex items-center gap-1 sm:gap-1.5 ${
              currentView === "account"
                ? "bg-[#3D261D] text-[#FAF6F0] shadow-sm"
                : "text-[#6B4235] hover:bg-[#EFE8DF] hover:text-[#3D261D]"
            }`}
          >
            <User size={14} className="hidden sm:inline" />
            <span>Tài khoản</span>
          </a>
        </nav>

        {/* Right side: Auth indicator + Cart Button */}
        <div className="col-start-2 xl:col-start-3 row-start-1 justify-self-end flex items-center gap-2 shrink-0">
          {userEmail ? (
            <div className="hidden xl:flex items-center gap-2 pl-2 text-xs font-semibold text-[#6B4235]">
              <span className="truncate max-w-[130px] font-medium text-[#3D261D]">{userEmail}</span>
              <button
                onClick={onLogout}
                className="text-[#EF4444] hover:underline transition-colors text-xs font-bold"
              >
                Đăng xuất
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="hidden xl:inline-flex text-xs font-bold text-[#3D261D] hover:text-[#C28D58] px-2.5 py-1.5 rounded-xl transition-colors"
            >
              Đăng nhập tài khoản
            </button>
          )}

          {/* Cart Button */}
          <button
            onClick={onOpenCart}
            aria-label={cartSummaryLabel}
            className="cartSummary relative flex items-center gap-2 bg-[#3D261D] hover:bg-[#C28D58] text-[#FAF6F0] px-3.5 py-2 rounded-2xl transition-all duration-200 shrink-0 group shadow-sm active:scale-95"
          >
            <ShoppingBag size={18} strokeWidth={2.2} className="shrink-0" />
            {cartCount > 0 ? (
              <>
                <span className="text-sm font-black">{cartCount}</span>
                <span className="hidden sm:block text-xs font-bold border-l border-white/20 pl-2">
                  {formatVND(cartTotal)}
                </span>
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[#C28D58] group-hover:bg-[#3D261D] text-white rounded-full text-[10px] font-black flex items-center justify-center transition-colors shadow animate-status-pulse">
                  {cartCount}
                </span>
              </>
            ) : (
              <span className="text-xs font-semibold opacity-85 hidden sm:block">0 món</span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
