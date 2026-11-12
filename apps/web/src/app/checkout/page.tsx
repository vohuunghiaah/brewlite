'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '../../components/Header';
import { formatVND } from '../../components/ProductCard';
import { useAppStore } from '../../lib/store';
import { createOrder, processPayment } from '../../lib/api-client';
import {
  ArrowLeft,
  CreditCard,
  Wallet,
  Tag,
  AlertCircle,
  FileText,
  ShieldCheck,
  Loader2,
} from 'lucide-react';

export default function CheckoutPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  const cart = useAppStore((state) => state.cart);
  const clearCart = useAppStore((state) => state.clearCart);
  const getCartSubtotal = useAppStore((state) => state.getCartSubtotal);
  const token = useAppStore((state) => state.token);
  const user = useAppStore((state) => state.user);

  const [paymentMethod, setPaymentMethod] = useState<'E_WALLET' | 'BANK_CARD'>('E_WALLET');
  const [mockOutcome, setMockOutcome] = useState<'SUCCESS' | 'FAILED' | 'PENDING'>('SUCCESS');
  const [note, setNote] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<string | null>(null);
  const [discountAmount, setDiscountAmount] = useState(0);

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !token) {
      router.push('/login?redirect=/checkout');
    }
  }, [mounted, token, router]);

  if (!mounted || !token) {
    return (
      <div className="min-h-screen bg-stone-50">
        <Header />
        <main className="max-w-md mx-auto p-4 space-y-3 animate-pulse">
          <div className="h-40 bg-stone-200 rounded-2xl" />
        </main>
      </div>
    );
  }

  const subtotal = getCartSubtotal();
  const totalAmount = Math.max(0, subtotal - discountAmount);

  const handleApplyPromo = () => {
    if (promoCode.trim().toUpperCase() === 'BREW20') {
      if (subtotal >= 50000) {
        const discount = Math.round((subtotal * 20) / 100);
        setDiscountAmount(discount);
        setAppliedPromo('BREW20');
        setErrorMessage(null);
      } else {
        setErrorMessage('Mã BREW20 chỉ áp dụng cho đơn hàng từ 50.000đ.');
      }
    } else {
      setErrorMessage('Mã khuyến mãi không hợp lệ hoặc đã hết hạn.');
    }
  };

  const handleCreateAndPay = async () => {
    if (cart.length === 0) {
      router.push('/cart');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      // 1. Tạo đơn hàng mới ở trạng thái PENDING
      const orderPayload = {
        items: cart.map((item) => ({
          productId: item.productId,
          size: item.size,
          toppings: item.toppings,
          quantity: item.quantity,
        })),
        note: note.trim() || undefined,
        promoCode: appliedPromo || undefined,
      };

      const order = await createOrder(token, orderPayload);

      // 2. Sinh khóa Idempotency duy nhất (UUID-v4)
      const idempotencyKey =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `idemp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      // 3. Thực hiện thanh toán mô phỏng (Mock Payment)
      const paymentResult = await processPayment(token, idempotencyKey, {
        orderId: order.id,
        method: paymentMethod,
        amount: Number(order.totalAmount),
        mockOutcome,
      });

      if (paymentResult.status === 'SUCCESS' || paymentResult.success) {
        // Thanh toán thành công: làm sạch giỏ hàng và chuyển sang màn hình xác nhận
        clearCart();
        router.push(`/order/confirmation?id=${order.id}`);
      } else if (paymentResult.status === 'FAILED') {
        // Thanh toán thất bại: KHÔNG xóa giỏ hàng, cho phép thử lại
        setErrorMessage(
          'Thanh toán không thành công: ' +
            (paymentResult.message || 'Số dư tài khoản không đủ. Giỏ hàng của bạn vẫn được giữ nguyên.'),
        );
      } else {
        // Trạng thái PENDING
        router.push(`/order/confirmation?id=${order.id}&status=PENDING`);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Đã có lỗi xảy ra khi xử lý đơn hàng.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 pb-28">
      <Header />

      <main className="max-w-md mx-auto px-4 py-4 space-y-4">
        {/* Nút quay lại */}
        <button
          onClick={() => router.push('/cart')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-800 hover:text-brand-900"
        >
          <ArrowLeft className="w-4 h-4" />
          Quay lại Giỏ hàng
        </button>

        <h1 className="text-xl font-bold text-brand-900">Xác nhận & Thanh toán</h1>

        {errorMessage && (
          <div
            data-testid="checkout-error-banner"
            className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2"
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">Thông báo lỗi:</span>
              <span>{errorMessage}</span>
            </div>
          </div>
        )}

        {/* Thông tin người nhận */}
        <div className="bg-white p-4 rounded-2xl border border-brand-100 shadow-sm space-y-2">
          <span className="text-xs font-bold text-brand-900 block uppercase tracking-wider">
            Khách hàng nhận món
          </span>
          <div className="text-xs text-stone-700">
            <p className="font-semibold">{user?.fullName}</p>
            <p className="text-stone-500 mt-0.5">{user?.email}</p>
            <p className="text-stone-400 text-[11px] mt-1">Hình thức: Nhận đồ uống tại quầy BrewLite sau 5-10 phút</p>
          </div>
        </div>

        {/* Tóm tắt món trong giỏ */}
        <div className="bg-white p-4 rounded-2xl border border-brand-100 shadow-sm space-y-3">
          <div className="flex justify-between items-center border-b border-brand-50 pb-2">
            <span className="text-xs font-bold text-brand-900 uppercase tracking-wider">
              Tóm tắt đơn hàng ({cart.reduce((s, i) => s + i.quantity, 0)} ly)
            </span>
          </div>

          <div className="space-y-2.5 max-h-52 overflow-y-auto pr-1">
            {cart.map((item) => (
              <div key={item.id} className="flex justify-between items-start text-xs">
                <div>
                  <span className="font-semibold text-stone-800">
                    {item.quantity}x {item.name}
                  </span>
                  <div className="text-[10px] text-stone-400">
                    {item.size} {item.toppings.length > 0 && `• ${item.toppings.join(', ')}`}
                  </div>
                </div>
                <span className="font-bold text-brand-800">
                  {formatVND(item.lineTotal)}
                </span>
              </div>
            ))}
          </div>

          {/* Ghi chú */}
          <div className="pt-2 border-t border-brand-50">
            <label className="text-[11px] font-semibold text-stone-600 block mb-1 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-stone-400" />
              Ghi chú cho Barista (Ví dụ: ít đá, 50% ngọt)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Nhập yêu cầu đặc biệt..."
              className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
        </div>

        {/* Mã giảm giá Voucher */}
        <div className="bg-white p-4 rounded-2xl border border-brand-100 shadow-sm space-y-2">
          <span className="text-xs font-bold text-brand-900 block flex items-center gap-1.5">
            <Tag className="w-4 h-4 text-amber-500" />
            Mã khuyến mãi
          </span>
          <div className="flex gap-2">
            <input
              type="text"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value)}
              placeholder="Nhập BREW20..."
              className="flex-grow px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs uppercase font-mono focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            <button
              type="button"
              onClick={handleApplyPromo}
              className="px-4 py-2 bg-stone-800 text-white rounded-xl text-xs font-bold hover:bg-black transition"
            >
              Áp dụng
            </button>
          </div>
          {appliedPromo && (
            <p className="text-[11px] text-emerald-600 font-semibold">
              ✓ Đã áp dụng mã {appliedPromo}: giảm {formatVND(discountAmount)}
            </p>
          )}
        </div>

        {/* Phương thức thanh toán không tiền mặt */}
        <div className="bg-white p-4 rounded-2xl border border-brand-100 shadow-sm space-y-3">
          <span className="text-xs font-bold text-brand-900 block uppercase tracking-wider">
            Phương thức thanh toán không tiền mặt
          </span>

          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setPaymentMethod('E_WALLET')}
              className={`w-full p-3 rounded-xl border flex items-center justify-between transition-all ${
                paymentMethod === 'E_WALLET'
                  ? 'border-brand-500 bg-brand-50/50 text-brand-900 shadow-sm'
                  : 'border-stone-200 text-stone-700'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Wallet className="w-4 h-4 text-brand-600" />
                <span className="text-xs font-semibold">Ví điện tử (MoMo / ZaloPay mô phỏng)</span>
              </div>
              <div
                className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                  paymentMethod === 'E_WALLET' ? 'border-brand-500 bg-brand-500' : 'border-stone-300'
                }`}
              >
                {paymentMethod === 'E_WALLET' && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
              </div>
            </button>

            <button
              type="button"
              onClick={() => setPaymentMethod('BANK_CARD')}
              className={`w-full p-3 rounded-xl border flex items-center justify-between transition-all ${
                paymentMethod === 'BANK_CARD'
                  ? 'border-brand-500 bg-brand-50/50 text-brand-900 shadow-sm'
                  : 'border-stone-200 text-stone-700'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <CreditCard className="w-4 h-4 text-brand-600" />
                <span className="text-xs font-semibold">Thẻ ngân hàng / Napas / Visa mô phỏng</span>
              </div>
              <div
                className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                  paymentMethod === 'BANK_CARD' ? 'border-brand-500 bg-brand-500' : 'border-stone-300'
                }`}
              >
                {paymentMethod === 'BANK_CARD' && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
              </div>
            </button>
          </div>

          {/* Công cụ mô phỏng kết quả kiểm thử */}
          <div className="pt-2 border-t border-brand-50 flex items-center justify-between text-[11px] text-stone-500">
            <span className="flex items-center gap-1 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-stone-400" />
              Mô phỏng kết quả:
            </span>
            <select
              value={mockOutcome}
              onChange={(e) => setMockOutcome(e.target.value as any)}
              className="bg-stone-50 border border-stone-200 rounded-lg px-2 py-1 text-[11px] font-semibold text-stone-700 focus:outline-none"
            >
              <option value="SUCCESS">Thành công (SUCCESS)</option>
              <option value="FAILED">Thất bại (FAILED)</option>
              <option value="PENDING">Đang chờ (PENDING)</option>
            </select>
          </div>
        </div>

        {/* Bảng tổng kết chi phí */}
        <div className="bg-white p-4 rounded-2xl border border-brand-100 shadow-sm space-y-2">
          <div className="flex justify-between text-xs text-stone-600">
            <span>Tạm tính:</span>
            <span>{formatVND(subtotal)}</span>
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between text-xs text-emerald-600 font-semibold">
              <span>Khuyến mãi ({appliedPromo}):</span>
              <span>-{formatVND(discountAmount)}</span>
            </div>
          )}
          <div className="border-t border-brand-50 pt-2 flex justify-between items-center">
            <span className="text-xs font-bold text-brand-900">Tổng thanh toán:</span>
            <span className="text-base font-bold text-brand-800">
              {formatVND(totalAmount)}
            </span>
          </div>
        </div>
      </main>

      {/* Thanh hành động chân trang */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-brand-100 p-3 z-30 shadow-lg">
        <div className="max-w-md mx-auto flex items-center justify-between gap-3">
          <div>
            <span className="text-[10px] text-stone-400 block font-medium">Cần thanh toán</span>
            <span className="text-base font-bold text-brand-800">
              {formatVND(totalAmount)}
            </span>
          </div>

          <button
            onClick={handleCreateAndPay}
            disabled={submitting || cart.length === 0}
            data-testid="pay-now-button"
            className="flex-grow py-3 px-5 rounded-xl bg-brand-500 text-white font-bold text-xs hover:bg-brand-600 active:scale-95 transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Đang xử lý giao dịch...</span>
              </>
            ) : (
              <span>Thanh toán ngay ({formatVND(totalAmount)})</span>
            )}
          </button>
        </div>
      </footer>
    </div>
  );
}

