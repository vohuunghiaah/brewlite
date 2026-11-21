"use client";

import { useEffect, useState } from "react";
import { CheckCircle, X, ArrowRight } from "lucide-react";
import { formatVND } from "./Header";
import { CartItem } from "../app/menu/session-cart";

interface OrderConfirmationProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: number;
  orderCode: string;
  status: string;
  pickupMethod: string;
  tableNumber?: string | null;
  totalAmount: number;
  items: CartItem[];
  onViewHistory: () => void;
  onContinueShopping: () => void;
}

const CONFETTI_COLORS = ["#C28D58", "#3D261D", "#10B981", "#F59E0B", "#E8C99A", "#FAF6F0"];
const STATIC_CONFETTI_PIECES = Array.from({ length: 28 }, (_, i) => {
  const left = ((i * 37) % 100);
  const delay = ((i * 13) % 15) / 10;
  const duration = 2 + ((i * 7) % 20) / 10;
  const size = 6 + (i % 6);
  const rot = (i * 45) % 360;
  const shape = i % 3 === 0 ? "circle" : i % 3 === 1 ? "rect" : "diamond";
  return {
    id: i,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    left,
    delay,
    duration,
    size,
    rot,
    shape,
  };
});

function Confetti() {
  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {STATIC_CONFETTI_PIECES.map((p) => (
        <div
          key={p.id}
          className={`confetti-piece ${
            p.shape === "circle" ? "rounded-full" : p.shape === "diamond" ? "rotate-45" : ""
          }`}
          style={{
            left: `${p.left}%`,
            top: "-20px",
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: p.color,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
            // @ts-expect-error CSS custom variable
            "--rot": `${p.rot}deg`,
          }}
        />
      ))}
    </div>
  );
}

export default function OrderConfirmation({
  isOpen,
  onClose,
  orderId,
  orderCode,
  status,
  pickupMethod,
  tableNumber,
  totalAmount,
  items,
  onViewHistory,
  onContinueShopping,
}: OrderConfirmationProps) {
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => setShowConfetti(false), 3500);
    return () => clearTimeout(timer);
  }, [isOpen]);

  if (!isOpen) return null;

  const displayCode = orderCode || `#BL-${orderId.toString().padStart(4, "0")}`;
  const isTable = pickupMethod === "AT_TABLE" || (tableNumber && tableNumber.trim().length > 0);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={displayCode}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-[#3D261D]/60 backdrop-blur-sm" />

      {/* Confetti animation */}
      {showConfetti && <Confetti />}

      {/* Main Ticket Dialog */}
      <div
        className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng vé chuông"
          className="absolute top-4 right-4 z-20 w-8 h-8 bg-black/20 hover:bg-black/30 text-white rounded-full flex items-center justify-center transition-colors"
        >
          <X size={16} />
        </button>

        {/* Success Banner Top */}
        <div className="bg-[#3D261D] text-white p-6 pb-5 text-center relative overflow-hidden">
          {/* Decorative badge */}
          <div className="w-14 h-14 bg-[#10B981] rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg animate-bounce-in">
            <CheckCircle size={30} className="text-white" strokeWidth={2.5} />
          </div>

          <span className="text-[10px] font-bold uppercase tracking-widest text-[#C28D58] block mb-1">
            BrewLite Digital Buzzer · Vé chuông điện tử
          </span>
          <h2 className="text-xl font-extrabold text-white">
            Đặt hàng thành công!
          </h2>
          <p className="text-xs text-[#E8C99A] mt-1 leading-relaxed max-w-xs mx-auto">
            {isTable
              ? "Đã thanh toán thành công. Vui lòng giữ mã đơn để nhận đồ uống tại bàn."
              : "Thanh toán thành công. Vui lòng giữ mã đơn để nhận đồ uống tại quầy."}
          </p>
        </div>

        {/* Ticket Tear Line (Dashed) */}
        <div className="relative bg-[#3D261D] py-1 border-t-2 border-b-2 border-dashed border-[#6B4235]">
          <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white" />
          <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white" />
        </div>

        {/* Ticket Middle Section: Order Code */}
        <div className="bg-[#3D261D] text-center px-6 py-6 border-b border-[#6B4235]">
          <p className="text-xs font-bold text-[#E8C99A] uppercase tracking-wider mb-2">
            Mã lấy đồ uống
          </p>
          <div className="text-5xl font-black text-white tracking-tight">
            {displayCode}
          </div>
          <div className="mt-3 flex items-center justify-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/30">
              <span className="w-2 h-2 rounded-full bg-[#10B981] animate-status-pulse" />
              Đã thanh toán ({status})
            </span>
            <span className="text-xs font-semibold text-[#E8C99A]">
              {isTable ? `Bàn: ${tableNumber || "VIP"}` : "Tại quầy"}
            </span>
          </div>
        </div>

        {/* Order Details Body */}
        <div className="p-5 sm:p-6 bg-white space-y-4">
          {/* Items Summary */}
          {items && items.length > 0 && (
            <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
              {items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center text-xs">
                  <span className="font-bold text-[#3D261D]">
                    {item.quantity}x {item.productName}
                  </span>
                  <span className="font-semibold text-[#6B4235]">
                    {formatVND(item.subtotal)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Grand Total */}
          <div className="flex justify-between items-center pt-2 border-t border-[#EFE8DF]">
            <span className="text-xs font-bold text-[#3D261D]">Tổng tiền</span>
            <span className="text-lg font-black text-[#C28D58]">
              {formatVND(totalAmount)}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                onViewHistory();
              }}
              className="w-full bg-[#3D261D] hover:bg-[#C28D58] text-white py-3 rounded-2xl font-bold text-xs transition-colors shadow flex items-center justify-center gap-1.5"
            >
              <span>Xem lịch sử đơn hàng</span>
              <ArrowRight size={14} />
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onContinueShopping();
              }}
              className="w-full bg-[#FAF6F0] hover:bg-[#EFE8DF] text-[#3D261D] py-2.5 rounded-2xl font-bold text-xs transition-colors"
            >
              Tiếp tục mua hàng
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-full bg-white hover:bg-gray-50 text-[#6B4235] py-2 rounded-xl text-xs font-semibold transition-colors border border-[#EFE8DF]"
            >
              Đóng vé chuông
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
