'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header } from '../../components/Header';
import { formatVND } from '../../components/ProductCard';
import { useAppStore } from '../../lib/store';
import {
  ArrowLeft,
  Trash2,
  Plus,
  Minus,
  ShoppingBag,
  ArrowRight,
  Coffee,
} from 'lucide-react';

export default function CartPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  const cart = useAppStore((state) => state.cart);
  const updateQuantity = useAppStore((state) => state.updateQuantity);
  const removeFromCart = useAppStore((state) => state.removeFromCart);
  const clearCart = useAppStore((state) => state.clearCart);
  const getCartSubtotal = useAppStore((state) => state.getCartSubtotal);
  const token = useAppStore((state) => state.token);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-stone-50">
        <Header />
        <main className="max-w-md mx-auto p-4 space-y-3 animate-pulse">
          <div className="h-20 bg-stone-200 rounded-xl" />
          <div className="h-20 bg-stone-200 rounded-xl" />
        </main>
      </div>
    );
  }

  const subtotal = getCartSubtotal();

  const handleCheckout = () => {
    if (!token) {
      router.push('/login?redirect=/checkout');
    } else {
      router.push('/checkout');
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 pb-28">
      <Header />

      <main className="max-w-md mx-auto px-4 py-4 space-y-4">
        {/* Nút quay lại & Tiêu đề */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push('/')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-800 hover:text-brand-900"
          >
            <ArrowLeft className="w-4 h-4" />
            Tiếp tục chọn món
          </button>

          {cart.length > 0 && (
            <button
              onClick={clearCart}
              className="text-xs text-stone-400 hover:text-rose-600 transition font-medium"
            >
              Xóa tất cả
            </button>
          )}
        </div>

        <h1 className="text-xl font-bold text-brand-900 flex items-center gap-2">
          <ShoppingBag className="w-5 h-5 text-brand-500" />
          Giỏ hàng của bạn
        </h1>

        {/* Trạng thái giỏ hàng trống */}
        {cart.length === 0 ? (
          <div
            data-testid="empty-cart"
            className="p-8 bg-white border border-stone-100 rounded-2xl text-center space-y-4 shadow-sm"
          >
            <div className="w-16 h-16 bg-brand-50 text-brand-500 rounded-full flex items-center justify-center mx-auto">
              <Coffee className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-800">
                Chưa có đồ uống nào trong giỏ
              </h2>
              <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                Hãy khám phá các món cà phê, trà thơm ngon tại BrewLite ngay nhé!
              </p>
            </div>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-500 text-white rounded-xl text-xs font-semibold shadow hover:bg-brand-600 transition"
            >
              Xem thực đơn ngay
            </Link>
          </div>
        ) : (
          <div className="space-y-3" data-testid="cart-items-list">
            {/* Danh sách món trong giỏ */}
            {cart.map((item) => (
              <div
                key={item.id}
                data-testid={`cart-item-${item.id}`}
                className="bg-white p-3.5 rounded-2xl border border-brand-100 shadow-sm flex gap-3 items-center justify-between"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  className="w-16 h-16 rounded-xl object-cover bg-brand-50 flex-shrink-0"
                />

                <div className="flex-grow min-w-0 pr-1">
                  <h3 className="font-semibold text-brand-900 text-sm truncate">
                    {item.name}
                  </h3>
                  <div className="flex flex-wrap gap-1 mt-1">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-brand-50 text-brand-700">
                      {item.size}
                    </span>
                    {item.toppings.map((top) => (
                      <span
                        key={top}
                        className="px-1.5 py-0.5 rounded text-[10px] bg-stone-100 text-stone-600"
                      >
                        +{top}
                      </span>
                    ))}
                  </div>
                  <span className="text-xs font-bold text-brand-800 mt-1.5 block">
                    {formatVND(item.lineTotal)}
                  </span>
                </div>

                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="text-stone-300 hover:text-rose-500 p-1 transition"
                    aria-label="Xóa món"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <div className="flex items-center gap-2 bg-stone-50 border border-stone-200 rounded-lg p-0.5">
                    <button
                      onClick={() => updateQuantity(item.id, -1)}
                      className="w-6 h-6 rounded flex items-center justify-center text-stone-600 hover:bg-white"
                      aria-label="Giảm số lượng"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-xs font-bold text-brand-900 w-4 text-center">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.id, 1)}
                      className="w-6 h-6 rounded flex items-center justify-center text-stone-600 hover:bg-white"
                      aria-label="Tăng số lượng"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {/* Bảng tóm tắt thanh toán */}
            <div className="bg-white p-4 rounded-2xl border border-brand-100 shadow-sm space-y-2 mt-4">
              <h2 className="text-xs font-bold text-brand-900 uppercase tracking-wider">
                Chi tiết thanh toán
              </h2>
              <div className="flex justify-between text-xs text-stone-600 pt-1">
                <span>Tạm tính ({cart.reduce((s, i) => s + i.quantity, 0)} ly):</span>
                <span className="font-semibold text-stone-800">{formatVND(subtotal)}</span>
              </div>
              <div className="flex justify-between text-xs text-stone-600">
                <span>Phí dịch vụ & đóng gói:</span>
                <span className="text-emerald-600 font-semibold">Miễn phí (0đ)</span>
              </div>
              <div className="border-t border-brand-50 pt-2 flex justify-between items-center">
                <span className="text-xs font-bold text-brand-900">Tổng thanh toán:</span>
                <span className="text-base font-bold text-brand-800">
                  {formatVND(subtotal)}
                </span>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Thanh hành động chân trang */}
      {cart.length > 0 && (
        <footer className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-brand-100 p-3 z-30 shadow-lg">
          <div className="max-w-md mx-auto flex items-center justify-between gap-3">
            <div>
              <span className="text-[10px] text-stone-400 block font-medium">Tổng tiền</span>
              <span className="text-base font-bold text-brand-800">
                {formatVND(subtotal)}
              </span>
            </div>

            <button
              onClick={handleCheckout}
              data-testid="checkout-button"
              className="flex-grow py-3 px-5 rounded-xl bg-brand-500 text-white font-bold text-xs hover:bg-brand-600 active:scale-95 transition-all shadow-md flex items-center justify-center gap-2"
            >
              <span>{token ? 'Tiến hành đặt hàng' : 'Đăng nhập để đặt hàng'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </footer>
      )}
    </div>
  );
}

