"use client";

import { useEffect, useState } from "react";
import { X, ShoppingBag, Trash2, Tag, ArrowRight } from "lucide-react";
import { formatVND } from "./Header";
import { CartItem } from "../app/menu/session-cart";

function getCartItemImage(item: CartItem): string {
  if (item.imageUrl && item.imageUrl.startsWith("http")) return item.imageUrl;
  const name = item.productName.toLowerCase();
  if (/croissant|bánh|pastry|cake|cookie/.test(name)) return "https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=800&q=80";
  if (/trà|tea|đào|cam/.test(name)) return "https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=800&q=80";
  if (/cacao|chocolate/.test(name)) return "https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=800&q=80";
  if (/nước|water/.test(name)) return "https://images.unsplash.com/photo-1548839140-29a749e1cf4d?auto=format&fit=crop&w=800&q=80";
  return "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=800&q=80";
}

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  onUpdateQuantity: (key: string, delta: number) => void;
  onRemoveItem: (key: string) => void;
  onClearCart: () => void;
  // Checkout section
  showCheckoutForm: boolean;
  onStartCheckout: () => void;
  customerName: string;
  onCustomerNameChange: (val: string) => void;
  customerPhone: string;
  onCustomerPhoneChange: (val: string) => void;
  onProceedOrder: () => void;
  isCreatingOrder: boolean;
  pendingOrder: { id: number; status: string } | null;
  onOpenPaymentModal: () => void;
  orderError?: string;
  onNewOrder?: () => void;
  onExploreMenu?: () => void;
}

export default function CartDrawer({
  isOpen,
  onClose,
  cartItems,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  showCheckoutForm,
  onStartCheckout,
  customerName,
  onCustomerNameChange,
  customerPhone,
  onCustomerPhoneChange,
  onProceedOrder,
  isCreatingOrder,
  pendingOrder,
  onOpenPaymentModal,
  orderError,
  onNewOrder,
  onExploreMenu,
}: CartDrawerProps) {
  const [voucherCode, setVoucherCode] = useState("");
  const [voucherMessage, setVoucherMessage] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const totalQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cartItems.reduce((sum, item) => sum + item.subtotal, 0);
  // FR-10 (Promotions & Vouchers) is DEFERRED/BLOCKED. Frontend must NOT calculate unsupported discounts.
  const grandTotal = subtotal;

  const handleApplyVoucher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!voucherCode.trim()) return;
    setVoucherMessage("Tính năng mã ưu đãi (FR-10) hiện chưa khả dụng trên hệ thống. Không áp dụng giảm giá.");
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-[#3D261D]/40 backdrop-blur-sm animate-fade-in"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Slide-over Drawer */}
      <aside
        id="cart"
        role="dialog"
        aria-label="Giỏ hàng của bạn"
        aria-modal={isOpen ? "true" : undefined}
        aria-hidden={!isOpen ? "true" : undefined}
        inert={!isOpen ? true : undefined}
        tabIndex={-1}
        className={`fixed top-0 right-0 bottom-0 z-50 bg-white w-full sm:w-[420px] max-w-full h-full flex-col shadow-2xl overflow-hidden ${
          isOpen ? "flex pointer-events-auto" : "hidden pointer-events-none"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#EFE8DF] bg-[#FDFCFA]">
          <div className="flex items-center gap-2">
            <ShoppingBag size={20} className="text-[#C28D58]" strokeWidth={2.2} />
            <h2 className="font-extrabold text-[#3D261D] text-lg">
              Giỏ hàng của bạn
              {totalQuantity > 0 && (
                <span className="ml-2 text-[#C28D58] text-base font-black">
                  ({totalQuantity})
                </span>
              )}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng giỏ hàng"
            className="drawerCloseBtn w-8 h-8 bg-[#FAF6F0] hover:bg-[#EFE8DF] text-[#3D261D] rounded-full flex items-center justify-center transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Error message */}
        {orderError && (
          <div role="alert" className="m-4 mb-0 bg-red-50 text-red-600 p-3 text-xs font-semibold rounded-2xl border border-red-200">
            <span>{orderError}</span>
          </div>
        )}

        {/* Pending Order Banner (Section D) */}
        {pendingOrder && pendingOrder.status === "PENDING" && (
          <div role="status" className="m-4 mb-0 bg-[#FEF3C7] border border-[#FDE68A] text-[#92400E] p-3 rounded-2xl text-xs font-semibold">
            Đặt hàng thành công! Mã đơn hàng: #{pendingOrder.id}. Trạng thái: Chờ thanh toán. Giỏ hàng được giữ nguyên để tiến hành thanh toán.
            {onNewOrder && (
              <button
                type="button"
                onClick={onNewOrder}
                className="block mt-1 font-bold text-[#3D261D] underline"
              >
                Tạo đơn hàng mới
              </button>
            )}
          </div>
        )}

        {/* Drawer Body */}
        {cartItems.length === 0 ? (
          /* Empty state */
          <div className="drawerEmptyNotice flex-1 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-20 h-20 bg-[#FAF6F0] rounded-full flex items-center justify-center mb-4 text-[#C28D58]">
              <ShoppingBag size={36} strokeWidth={1.5} />
            </div>
            <h3 className="font-extrabold text-[#3D261D] text-lg mb-1">
              Giỏ hàng đang trống
            </h3>
            <p className="text-[#6B4235] text-xs leading-relaxed max-w-xs mb-6">
              Giỏ hàng đang trống. Hãy chọn đồ uống nhé!
            </p>
            <button
              type="button"
              onClick={() => {
                onClose();
                onExploreMenu?.();
              }}
              className="bg-[#3D261D] hover:bg-[#C28D58] text-white px-5 py-2.5 rounded-2xl font-bold text-xs transition-colors shadow"
            >
              Khám phá menu ngay
            </button>
          </div>
        ) : (
          /* Cart Items List */
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5">
            {cartItems.map((item) => {
              const sizeBadge = item.size === "SMALL" ? "Size S" : item.size === "MEDIUM" ? "Size M" : "Size L";
              return (
                <div
                  key={item.key}
                  className="bg-[#FAF6F0] border border-[#EFE8DF] rounded-2xl p-3.5 space-y-2.5 transition-all hover:border-[#C28D58]/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    {/* Item Thumbnail Image */}
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden bg-[#EFE8DF] shrink-0 border border-[#EFE8DF]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={getCartItemImage(item)}
                        alt={item.productName}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-[#3D261D] text-sm leading-tight">
                          {item.productName}
                        </span>
                        <span className="text-xs font-bold text-[#C28D58] bg-[#EFE8DF] px-2 py-0.5 rounded-full">
                          {sizeBadge}
                        </span>
                      </div>

                      {item.toppings?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {item.toppings.map((top) => (
                            <span
                              key={top}
                              className="text-[11px] font-semibold text-[#6B4235] bg-white px-2 py-0.5 rounded-md border border-[#EFE8DF]"
                            >
                              +{top}
                            </span>
                          ))}
                        </div>
                      )}

                      {item.note && (
                        <p className="text-[11px] text-[#6B4235] mt-1 leading-relaxed">
                          Ghi chú: {item.note}
                        </p>
                      )}

                      <p className="text-xs text-[#6B4235] mt-1">
                        {formatVND(item.unitPrice)} / ly
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => onRemoveItem(item.key)}
                      aria-label={`Xóa ${item.productName} khỏi giỏ`}
                      title="Xóa món"
                      className="text-gray-400 hover:text-[#EF4444] p-1.5 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  {/* Quantity and Price */}
                  <div className="flex items-center justify-between pt-1 border-t border-[#EFE8DF]/60">
                    {/* Stepper */}
                    <div className="flex items-center gap-1 bg-white border border-[#EFE8DF] rounded-xl px-1.5 py-0.5">
                      <button
                        type="button"
                        onClick={() => onUpdateQuantity(item.key, -1)}
                        aria-label={`Giảm số lượng ${item.productName}`}
                        className="w-6 h-6 rounded-lg bg-[#FAF6F0] flex items-center justify-center text-[#3D261D] hover:bg-[#3D261D] hover:text-white transition-colors text-xs font-bold leading-none select-none"
                      >
                        -
                      </button>
                      <span className="text-xs font-black text-[#3D261D] w-6 text-center">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => onUpdateQuantity(item.key, 1)}
                        aria-label={`Tăng số lượng ${item.productName}`}
                        className="w-6 h-6 rounded-lg bg-[#3D261D] flex items-center justify-center text-white hover:bg-[#C28D58] transition-colors text-xs font-bold leading-none select-none"
                      >
                        +
                      </button>
                    </div>

                    <span className="text-sm font-black text-[#C28D58]">
                      {formatVND(item.subtotal)}
                    </span>
                  </div>
                </div>
              );
            })}

            {/* Clear Cart Button */}
            <div className="pt-2 flex justify-between items-center text-xs">
              <button
                type="button"
                onClick={onClearCart}
                className="text-xs font-bold text-[#6B4235] hover:text-[#EF4444] transition-colors"
              >
                Xóa giỏ hàng
              </button>
            </div>

            {/* Voucher Code Form */}
            <form
              onSubmit={handleApplyVoucher}
              className="bg-[#FAF6F0] border border-[#EFE8DF] rounded-2xl p-3 mt-4"
            >
              <div className="flex items-center gap-2">
                <Tag size={16} className="text-[#C28D58] shrink-0" />
                <input
                  type="text"
                  placeholder="Mã ưu đãi (Chưa kích hoạt)..."
                  value={voucherCode}
                  onChange={(e) => setVoucherCode(e.target.value)}
                  className="bg-transparent flex-1 text-xs text-[#3D261D] focus:outline-none placeholder:text-[#6B4235]/50 px-1"
                />
                <button
                  type="submit"
                  className="bg-[#3D261D] hover:bg-[#C28D58] text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-colors"
                >
                  Áp dụng
                </button>
              </div>
              {voucherMessage && (
                <p
                  className="text-[10px] font-bold mt-1.5 ml-2 text-[#EF4444]"
                >
                  {voucherMessage}
                </p>
              )}
            </form>

            {/* Order Placement Form (Customer Name & Phone) */}
            {showCheckoutForm && !pendingOrder && (
              <div className="bg-[#FAF6F0] border border-[#EFE8DF] rounded-2xl p-4 space-y-3 animate-fade-in-up mt-3">
                <h4 className="font-extrabold text-[#3D261D] text-xs uppercase tracking-wider">
                  Thông tin người nhận đồ uống
                </h4>
                <div>
                  <label
                    htmlFor="customerName"
                    className="text-xs font-bold text-[#3D261D] block mb-1"
                  >
                    Tên khách hàng *
                  </label>
                  <input
                    id="customerName"
                    type="text"
                    value={customerName}
                    onChange={(e) => onCustomerNameChange(e.target.value)}
                    placeholder="Ví dụ: Nguyễn Văn A"
                    className="w-full bg-white border border-[#EFE8DF] focus:border-[#C28D58] rounded-xl px-3 py-2 text-xs text-[#3D261D] focus:outline-none"
                  />
                </div>
                <div>
                  <label
                    htmlFor="customerPhone"
                    className="text-xs font-bold text-[#3D261D] block mb-1"
                  >
                    Số điện thoại *
                  </label>
                  <input
                    id="customerPhone"
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => onCustomerPhoneChange(e.target.value)}
                    placeholder="Ví dụ: 0912345678"
                    className="w-full bg-white border border-[#EFE8DF] focus:border-[#C28D58] rounded-xl px-3 py-2 text-xs text-[#3D261D] focus:outline-none"
                  />
                </div>
                <button
                  type="button"
                  disabled={isCreatingOrder}
                  onClick={onProceedOrder}
                  className="w-full bg-[#C28D58] hover:bg-[#3D261D] text-white py-2.5 rounded-xl text-xs font-bold transition-colors shadow flex items-center justify-center gap-1.5"
                >
                  <span>Xác nhận đặt hàng</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Footer Summary & Checkout button */}
        {cartItems.length > 0 && (
          <div className="p-4 sm:p-5 border-t border-[#EFE8DF] bg-[#FDFCFA] space-y-3">
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-[#6B4235]">
                <span>Tạm tính</span>
                <span className="font-bold text-[#3D261D]">{formatVND(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm sm:text-base font-extrabold text-[#3D261D] pt-1 border-t border-[#EFE8DF]">
                <span>Tổng cộng ({totalQuantity} món):</span>
                <span className="text-[#C28D58] font-black">{formatVND(grandTotal)}</span>
              </div>
            </div>

            {/* Action buttons */}
            {pendingOrder && (pendingOrder.status === "PENDING" || pendingOrder.status === "PAYMENT_FAILED") && (
              <button
                type="button"
                onClick={onOpenPaymentModal}
                className="w-full bg-[#10B981] hover:bg-emerald-600 text-white py-3 rounded-2xl font-bold text-xs sm:text-sm transition-all shadow-md flex items-center justify-center gap-2 active:scale-95"
              >
                <span>Tiếp tục thanh toán đơn #{pendingOrder.id}</span>
                <ArrowRight size={16} />
              </button>
            )}

            {!showCheckoutForm && (
              <button
                type="button"
                onClick={onStartCheckout}
                className="w-full bg-[#3D261D] hover:bg-[#C28D58] text-white py-3 rounded-2xl font-bold text-xs sm:text-sm transition-all shadow-md flex items-center justify-center gap-2 active:scale-95"
              >
                <span>Tiếp tục đặt hàng</span>
                <ArrowRight size={16} />
              </button>
            )}
          </div>
        )}
      </aside>
    </>
  );
}
