'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header } from '../../../components/Header';
import { formatVND } from '../../../components/ProductCard';
import { useAppStore } from '../../../lib/store';
import { fetchOrderById, Order } from '../../../lib/api-client';
import {
  CheckCircle2,
  Clock,
  Coffee,
  ArrowRight,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

function OrderConfirmationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get('id');

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const token = useAppStore((state) => state.token);

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }

    if (!orderId) {
      setError('Không tìm thấy mã đơn hàng.');
      setLoading(false);
      return;
    }

    fetchOrderById(token, orderId)
      .then((data) => {
        setOrder(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Không thể tải thông tin xác nhận đơn.');
        setLoading(false);
      });
  }, [orderId, token, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50">
        <Header />
        <main className="max-w-md mx-auto p-6 space-y-4 text-center animate-pulse">
          <div className="w-16 h-16 bg-stone-200 rounded-full mx-auto" />
          <div className="h-6 bg-stone-200 rounded w-1/2 mx-auto" />
          <div className="h-4 bg-stone-200 rounded w-3/4 mx-auto" />
        </main>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-stone-50">
        <Header />
        <main className="max-w-md mx-auto p-6 text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
          <h1 className="text-base font-bold text-stone-800">Không tìm thấy đơn hàng</h1>
          <p className="text-xs text-stone-500">{error}</p>
          <Link
            href="/"
            className="inline-block px-4 py-2 bg-brand-500 text-white rounded-xl text-xs font-semibold"
          >
            Về trang chủ
          </Link>
        </main>
      </div>
    );
  }

  const isPaid = order.status === 'PAID';

  return (
    <div className="min-h-screen bg-stone-50 pb-16">
      <Header />

      <main className="max-w-md mx-auto px-4 py-6 space-y-4">
        {/* Banner Chúc Mừng & Thành Công */}
        <div className="bg-white p-6 rounded-2xl border border-brand-100 shadow-sm text-center space-y-3">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full inline-block mb-1">
              {isPaid ? 'ĐÃ THANH TOÁN THÀNH CÔNG' : order.status}
            </span>
            <h1 className="text-2xl font-extrabold text-brand-900">
              {order.orderCode}
            </h1>
            <p className="text-xs text-stone-500 mt-1">
              Cảm ơn bạn đã đặt món tại BrewLite!
            </p>
          </div>

          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-left flex items-start gap-2.5 text-xs text-amber-900">
            <Clock className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">Thời gian nhận món dự kiến: 5 - 10 phút</span>
              <p className="text-[11px] text-amber-700 mt-0.5">
                Vui lòng đưa mã đơn <strong>{order.orderCode}</strong> cho Barista tại quầy khi đồ uống sẵn sàng.
              </p>
            </div>
          </div>
        </div>

        {/* Chi tiết đơn hàng */}
        <div className="bg-white p-4 rounded-2xl border border-brand-100 shadow-sm space-y-3">
          <span className="text-xs font-bold text-brand-900 uppercase tracking-wider block">
            Chi tiết các món ({order.items.length} mục)
          </span>

          <div className="space-y-2 border-b border-brand-50 pb-3">
            {order.items.map((item) => (
              <div key={item.id} className="flex justify-between items-start text-xs">
                <div>
                  <span className="font-semibold text-stone-800">
                    {item.quantity}x {item.product?.name || 'Đồ uống'}
                  </span>
                  <div className="text-[10px] text-stone-400">
                    Size {item.size} {item.toppings?.length > 0 && `• ${item.toppings.join(', ')}`}
                  </div>
                </div>
                <span className="font-bold text-brand-800">
                  {formatVND(item.lineTotal)}
                </span>
              </div>
            ))}
          </div>

          <div className="space-y-1.5 text-xs text-stone-600">
            <div className="flex justify-between">
              <span>Tạm tính:</span>
              <span>{formatVND(order.subtotal)}</span>
            </div>
            {Number(order.discountAmount) > 0 && (
              <div className="flex justify-between text-emerald-600 font-semibold">
                <span>Giảm giá ({order.promoCode}):</span>
                <span>-{formatVND(order.discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-brand-900 pt-1 text-sm border-t border-brand-50">
              <span>Tổng thanh toán:</span>
              <span className="text-brand-800">{formatVND(order.totalAmount)}</span>
            </div>
          </div>

          {order.note && (
            <div className="pt-2 border-t border-brand-50 text-[11px] text-stone-500">
              <span className="font-semibold">Ghi chú:</span> {order.note}
            </div>
          )}
        </div>

        {/* Tích lũy điểm thưởng */}
        <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-white p-3.5 rounded-2xl shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-200" />
            <div>
              <span className="text-xs font-bold block">Tích lũy điểm thành công</span>
              <span className="text-[10px] text-amber-100">
                + {Math.floor(Number(order.totalAmount) / 1000)} điểm thưởng vào tài khoản
              </span>
            </div>
          </div>
          <Coffee className="w-6 h-6 text-white/30" />
        </div>

        {/* Điều hướng */}
        <div className="space-y-2 pt-2">
          <Link
            href="/orders"
            className="w-full py-3 rounded-xl bg-brand-500 text-white font-bold text-xs hover:bg-brand-600 transition shadow flex items-center justify-center gap-2"
          >
            <span>Xem lịch sử đơn của bạn</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <Link
            href="/"
            className="w-full py-3 rounded-xl bg-white border border-stone-200 text-stone-700 font-semibold text-xs hover:bg-stone-50 transition flex items-center justify-center"
          >
            Quay lại trang chủ Menu
          </Link>
        </div>
      </main>
    </div>
  );
}

export default function OrderConfirmationPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-stone-50 flex items-center justify-center text-xs text-stone-500">
          Đang tải xác nhận đơn...
        </div>
      }
    >
      <OrderConfirmationContent />
    </Suspense>
  );
}
