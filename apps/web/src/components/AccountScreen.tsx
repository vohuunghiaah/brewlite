"use client";

import { LogOut, Coffee, Shield, Gift, HelpCircle, Package, ArrowRight } from "lucide-react";
import { formatVND } from "./Header";
import { OrderHistoryItem } from "./OrderHistory";

interface AccountScreenProps {
  user: { id: number; email: string } | null;
  isAuthenticated: boolean;
  onOpenLogin: () => void;
  onLogout: () => void;
  orders: OrderHistoryItem[];
  onNavigateToHistory: () => void;
}

export default function AccountScreen({
  user,
  isAuthenticated,
  onOpenLogin,
  onLogout,
  orders,
  onNavigateToHistory,
}: AccountScreenProps) {
  if (!isAuthenticated || !user) {
    return (
      <div className="max-w-lg mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-2xl font-extrabold text-[#3D261D] mb-6">
          Tài khoản
        </h1>
        <div className="bg-[#3D261D] rounded-3xl p-8 text-center text-white mb-6 shadow-md">
          <div className="w-16 h-16 bg-[#C28D58]/30 rounded-full flex items-center justify-center mx-auto mb-4 text-[#C28D58]">
            <Coffee size={30} />
          </div>
          <h2 className="text-xl font-extrabold mb-2">Chào bạn!</h2>
          <p className="text-[#E8C99A] text-xs sm:text-sm mb-6 leading-relaxed max-w-sm mx-auto">
            Đăng nhập để quản lý tài khoản, theo dõi đơn hàng thời gian thực và trải nghiệm dịch vụ cà phê cashierless tiện lợi.
          </p>
          <button
            onClick={onOpenLogin}
            className="w-full bg-[#C28D58] hover:bg-white hover:text-[#3D261D] text-white py-3 rounded-2xl font-bold text-xs sm:text-sm transition-all shadow"
          >
            Đăng nhập / Đăng ký
          </button>
        </div>

        {/* Value props */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white border border-[#EFE8DF] rounded-2xl p-3.5 text-center shadow-sm">
            <Coffee size={20} className="text-[#C28D58] mx-auto mb-1.5" />
            <p className="text-xs font-bold text-[#3D261D]">Pha chế chuẩn</p>
            <p className="text-[10px] text-[#6B4235] mt-0.5">Cà phê hảo hạng</p>
          </div>
          <div className="bg-white border border-[#EFE8DF] rounded-2xl p-3.5 text-center shadow-sm">
            <Shield size={20} className="text-[#C28D58] mx-auto mb-1.5" />
            <p className="text-xs font-bold text-[#3D261D]">Thanh toán</p>
            <p className="text-[10px] text-[#6B4235] mt-0.5">100% Cashless</p>
          </div>
          <div className="bg-white border border-[#EFE8DF] rounded-2xl p-3.5 text-center shadow-sm">
            <Gift size={20} className="text-[#C28D58] mx-auto mb-1.5" />
            <p className="text-xs font-bold text-[#3D261D]">Ưu đãi</p>
            <p className="text-[10px] text-[#6B4235] mt-0.5">Dành riêng cho bạn</p>
          </div>
        </div>
      </div>
    );
  }

  const initial = user.email ? user.email.charAt(0).toUpperCase() : "U";
  const displayName = user.email.split("@")[0];
  const totalSpent = orders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);

  return (
    <div className="max-w-lg mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-[#3D261D]">Tài khoản</h1>
        <button
          onClick={onLogout}
          className="flex items-center gap-1.5 text-xs font-bold text-[#EF4444] hover:bg-red-50 px-3 py-1.5 rounded-xl transition-colors"
        >
          <LogOut size={14} />
          <span>Đăng xuất</span>
        </button>
      </div>

      {/* Profile Card */}
      <div className="bg-[#3D261D] rounded-3xl overflow-hidden shadow-lg text-white">
        {/* Top header */}
        <div className="p-6 flex items-center gap-4">
          <div className="w-14 h-14 bg-[#C28D58] rounded-2xl flex items-center justify-center font-black text-2xl text-white shadow-md">
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-extrabold text-lg text-white truncate">
              {displayName}
            </h2>
            <p className="text-xs text-[#E8C99A] truncate">{user.email}</p>
            <span className="inline-block mt-1 text-[10px] font-bold bg-[#FAF6F0]/20 text-[#FAF6F0] px-2.5 py-0.5 rounded-full">
              Thành viên BrewLite
            </span>
          </div>
        </div>

        {/* Real Order Stats */}
        <div className="grid grid-cols-2 border-t border-[#6B4235] bg-[#3D261D]/50">
          <div
            onClick={onNavigateToHistory}
            className="p-4 text-center border-r border-[#6B4235] cursor-pointer hover:bg-white/5 transition-colors"
          >
            <p className="text-2xl font-black text-[#C28D58]">{orders.length}</p>
            <p className="text-[10px] font-bold text-[#E8C99A] uppercase tracking-wider mt-0.5">
              Đơn hàng đã đặt
            </p>
          </div>
          <div className="p-4 text-center">
            <p className="text-2xl font-black text-[#C28D58]">
              {formatVND(totalSpent)}
            </p>
            <p className="text-[10px] font-bold text-[#E8C99A] uppercase tracking-wider mt-0.5">
              Tổng chi tiêu
            </p>
          </div>
        </div>
      </div>

      {/* Loyalty & Rewards Notice (Honest, Unfabricated Scope Presentation) */}
      <div className="bg-white border border-[#EFE8DF] rounded-2xl p-4 shadow-sm flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-[#FAF6F0] flex items-center justify-center text-[#C28D58] shrink-0 mt-0.5">
          <Gift size={18} />
        </div>
        <div>
          <h3 className="font-bold text-[#3D261D] text-xs sm:text-sm">
            Chương trình hội viên BrewPoints
          </h3>
          <p className="text-xs text-[#6B4235] mt-0.5 leading-relaxed">
            Hệ thống tích điểm đổi quà và hạng thẻ thành viên đang trong quá trình chuẩn bị triển khai trong phiên bản tiếp theo.
          </p>
        </div>
      </div>

      {/* Settings List */}
      <div className="bg-white border border-[#EFE8DF] rounded-2xl overflow-hidden shadow-sm divide-y divide-[#EFE8DF]">
        <button
          onClick={onNavigateToHistory}
          className="w-full flex items-center justify-between p-4 hover:bg-[#FAF6F0] transition-colors text-left"
        >
          <div className="flex items-center gap-3">
            <Package size={18} className="text-[#C28D58]" />
            <span className="text-xs sm:text-sm font-bold text-[#3D261D]">
              Lịch sử đơn hàng của tôi
            </span>
          </div>
          <ArrowRight size={14} className="text-[#6B4235]" />
        </button>

        <div className="flex items-center justify-between p-4 text-[#6B4235] text-xs">
          <div className="flex items-center gap-3">
            <Shield size={18} className="text-[#C28D58]" />
            <span className="font-bold text-[#3D261D]">Bảo mật & Phiên đăng nhập</span>
          </div>
          <span className="text-[11px] font-semibold text-[#10B981]">JWT Active</span>
        </div>

        <div className="flex items-center justify-between p-4 text-[#6B4235] text-xs">
          <div className="flex items-center gap-3">
            <HelpCircle size={18} className="text-[#C28D58]" />
            <span className="font-bold text-[#3D261D]">Thông tin ứng dụng</span>
          </div>
          <span className="text-[11px] font-semibold">BrewLite ASM2 v1.0</span>
        </div>
      </div>
    </div>
  );
}
