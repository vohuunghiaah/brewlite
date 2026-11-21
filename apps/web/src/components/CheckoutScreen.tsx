"use client";

import { X, MapPin, Tablet, AlertCircle } from "lucide-react";
import { formatVND } from "./Header";

interface CheckoutScreenProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: number;
  totalAmount: number;
  pickupMethod: "AT_COUNTER" | "AT_TABLE";
  onPickupMethodChange: (val: "AT_COUNTER" | "AT_TABLE") => void;
  tableNumber: string;
  onTableNumberChange: (val: string) => void;
  paymentMethod: "MOMO" | "VIETQR" | "CARD";
  onPaymentMethodChange: (val: "MOMO" | "VIETQR" | "CARD") => void;
  testMode: "SUCCESS" | "FAILED" | "PENDING";
  onTestModeChange: (val: "SUCCESS" | "FAILED" | "PENDING") => void;
  onConfirmPayment: () => void;
  processing: boolean;
  paymentError?: string;
}

export default function CheckoutScreen({
  isOpen,
  onClose,
  orderId,
  totalAmount,
  pickupMethod,
  onPickupMethodChange,
  tableNumber,
  onTableNumberChange,
  paymentMethod,
  onPaymentMethodChange,
  testMode,
  onTestModeChange,
  onConfirmPayment,
  processing,
  paymentError,
}: CheckoutScreenProps) {
  if (!isOpen) return null;

  const paymentOptions: {
    id: "VIETQR" | "MOMO" | "CARD";
    title: string;
    sub: string;
    icon: React.ReactNode;
  }[] = [
    {
      id: "VIETQR",
      title: "VietQR / Napas247",
      sub: "Chuyển khoản VietQR / Napas247 tức thì",
      icon: (
        <div className="w-9 h-9 rounded-xl bg-[#0065AC] text-white flex items-center justify-center font-black text-[10px] leading-tight text-center shrink-0">
          Viet<br />QR
        </div>
      ),
    },
    {
      id: "MOMO",
      title: "Ví MoMo",
      sub: "Quét mã QR thanh toán qua ứng dụng MoMo",
      icon: (
        <div className="w-9 h-9 rounded-xl bg-[#AE2070] text-white flex items-center justify-center font-black text-sm shrink-0">
          M
        </div>
      ),
    },
    {
      id: "CARD",
      title: "Thẻ quốc tế",
      sub: "Visa / Mastercard / JCB qua cổng thanh toán",
      icon: (
        <div className="w-9 h-9 rounded-xl bg-[#1A1F71] text-[#FFB511] flex items-center justify-center font-black text-xs italic shrink-0">
          VISA
        </div>
      ),
    },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Thanh toán đơn #${orderId}`}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-[#3D261D]/50 backdrop-blur-sm" />

      {/* Dialog container */}
      <div
        className="relative bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] overflow-y-auto animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#EFE8DF] bg-[#FDFCFA]">
          <div>
            <h2 className="font-extrabold text-[#3D261D] text-lg">
              Thanh toán đơn #{orderId}
            </h2>
            <p className="text-xs text-[#6B4235] mt-0.5">
              Hệ thống thanh toán không tiền mặt Cashless BrewLite
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Đóng cửa sổ thanh toán"
            className="w-8 h-8 bg-[#FAF6F0] hover:bg-[#EFE8DF] text-[#3D261D] rounded-full flex items-center justify-center transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-5">
          {/* Error notice */}
          {paymentError && (
            <div
              role="alert"
              className="bg-[#EF4444]/10 border border-[#EF4444]/30 rounded-2xl p-3 text-xs text-[#EF4444] font-semibold flex items-center gap-2"
            >
              <AlertCircle size={16} className="shrink-0" />
              <span>{paymentError}</span>
            </div>
          )}

          {/* Total Amount Card */}
          <div className="bg-[#FAF6F0] border border-[#EFE8DF] rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-[#6B4235] font-semibold">Tổng tiền thanh toán</p>
              <p className="text-2xl font-black text-[#C28D58] mt-0.5">
                {formatVND(totalAmount)}
              </p>
            </div>
            <div className="bg-[#3D261D] text-white px-3 py-1.5 rounded-xl text-xs font-bold">
              Đơn #{orderId}
            </div>
          </div>

          {/* Pickup Method */}
          <div>
            <p className="text-xs font-bold text-[#3D261D] uppercase tracking-wider mb-2">
              Phương thức nhận đồ uống
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => onPickupMethodChange("AT_COUNTER")}
                className={`p-3 rounded-2xl border-2 transition-all flex items-center gap-2.5 text-left ${
                  pickupMethod === "AT_COUNTER"
                    ? "border-[#3D261D] bg-[#3D261D] text-white shadow-sm"
                    : "border-[#EFE8DF] bg-white text-[#3D261D] hover:border-[#C28D58]"
                }`}
              >
                <MapPin size={18} className="shrink-0" />
                <div>
                  <p className="text-xs font-extrabold">Nhận tại quầy</p>
                  <p className={`text-[10px] ${pickupMethod === "AT_COUNTER" ? "text-[#E8C99A]" : "text-[#6B4235]"}`}>
                    Lấy nước khi chuông báo
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => onPickupMethodChange("AT_TABLE")}
                className={`p-3 rounded-2xl border-2 transition-all flex items-center gap-2.5 text-left ${
                  pickupMethod === "AT_TABLE"
                    ? "border-[#3D261D] bg-[#3D261D] text-white shadow-sm"
                    : "border-[#EFE8DF] bg-white text-[#3D261D] hover:border-[#C28D58]"
                }`}
              >
                <Tablet size={18} className="shrink-0" />
                <div>
                  <p className="text-xs font-extrabold">Giao tận bàn</p>
                  <p className={`text-[10px] ${pickupMethod === "AT_TABLE" ? "text-[#E8C99A]" : "text-[#6B4235]"}`}>
                    Phục vụ tại bàn của bạn
                  </p>
                </div>
              </button>
            </div>

            {/* Table Number Input if AT_TABLE is selected */}
            {pickupMethod === "AT_TABLE" && (
              <div className="mt-3 animate-fade-in-up">
                <label
                  htmlFor="table-number-input"
                  className="text-xs font-bold text-[#3D261D] block mb-1"
                >
                  Số bàn *
                </label>
                <input
                  id="table-number-input"
                  type="text"
                  required
                  value={tableNumber}
                  onChange={(e) => onTableNumberChange(e.target.value)}
                  placeholder="Ví dụ: B-12 hoặc Bàn VIP 05"
                  className="w-full border-2 border-[#EFE8DF] focus:border-[#C28D58] rounded-xl px-3.5 py-2 text-xs sm:text-sm text-[#3D261D] focus:outline-none"
                />
              </div>
            )}
          </div>

          {/* Payment Method Selection */}
          <div>
            <p className="text-xs font-bold text-[#3D261D] uppercase tracking-wider mb-2">
              Phương thức thanh toán
            </p>
            <div role="radiogroup" aria-label="Phương thức thanh toán" className="space-y-2">
              {paymentOptions.map((opt) => {
                const selected = paymentMethod === opt.id;
                return (
                  <div
                    key={opt.id}
                    role="radio"
                    aria-checked={selected}
                    tabIndex={0}
                    onClick={() => onPaymentMethodChange(opt.id)}
                    className={`flex items-center justify-between p-3 rounded-2xl border-2 cursor-pointer transition-all ${
                      selected
                        ? "border-[#C28D58] bg-[#FAF6F0]"
                        : "border-[#EFE8DF] bg-white hover:border-[#C28D58]/50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {opt.icon}
                      <div>
                        <p className="text-xs sm:text-sm font-extrabold text-[#3D261D]">
                          {opt.title}
                        </p>
                        <p className="text-[10px] sm:text-xs text-[#6B4235]">
                          {opt.sub}
                        </p>
                      </div>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        selected
                          ? "border-[#C28D58] bg-[#C28D58]"
                          : "border-[#EFE8DF]"
                      }`}
                    >
                      {selected && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Test Mode Simulator (Included for test suites compatibility) */}
          <div className="bg-[#FAF6F0] border border-[#EFE8DF] rounded-xl p-2.5 flex items-center justify-between text-xs">
            <span className="font-bold text-[#6B4235] text-[11px]">
              Chế độ thử nghiệm:
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => onTestModeChange("SUCCESS")}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
                  testMode === "SUCCESS"
                    ? "bg-[#10B981] text-white"
                    : "bg-white text-[#6B4235] border border-[#EFE8DF]"
                }`}
              >
                Thanh toán thành công
              </button>
              <button
                type="button"
                onClick={() => onTestModeChange("FAILED")}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
                  testMode === "FAILED"
                    ? "bg-[#EF4444] text-white"
                    : "bg-white text-[#6B4235] border border-[#EFE8DF]"
                }`}
              >
                Giả lập thất bại
              </button>
            </div>
          </div>

          {/* Confirm Action Button */}
          <div className="pt-2">
            <button
              type="button"
              disabled={processing}
              onClick={onConfirmPayment}
              className="w-full bg-[#C28D58] hover:bg-[#3D261D] text-white py-3.5 rounded-2xl font-bold text-sm transition-all duration-200 shadow-md active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {processing ? (
                <span>Đang xử lý giao dịch...</span>
              ) : (
                <span>Xác nhận thanh toán</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
