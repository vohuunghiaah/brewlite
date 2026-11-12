'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header } from '../../components/Header';
import { formatVND } from '../../components/ProductCard';
import { useAppStore } from '../../lib/store';
import { fetchMyOrders, Order, API_BASE_URL } from '../../lib/api-client';
import {
  ArrowLeft,
  Clock,
  Coffee,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sparkles,
} from 'lucide-react';

const STATUS_BADGES: Record<
  string,
  { label: string; color: string; bg: string; icon: any }
> = {
  PENDING: {
    label: 'Chờ thanh toán',
    color: 'text-amber-700',
    bg: 'bg-amber-50 border-amber-200',
    icon: Clock,
  },
  PAID: {
    label: 'Đã thanh toán',
    color: 'text-emerald-700',
    bg: 'bg-emerald-50 border-emerald-200',
    icon: CheckCircle2,
  },
  PREPARING: {
    label: 'Đang pha chế',
    color: 'text-blue-700',
    bg: 'bg-blue-50 border-blue-200',
    icon: Coffee,
  },
  READY: {
    label: 'Đã pha xong - Mời nhận món',
    color: 'text-purple-700',
    bg: 'bg-purple-50 border-purple-200',
    icon: Sparkles,
  },
  COMPLETED: {
    label: 'Hoàn tất',
    color: 'text-stone-700',
    bg: 'bg-stone-100 border-stone-200',
    icon: CheckCircle2,
  },
  PAYMENT_FAILED: {
    label: 'Thanh toán thất bại',
    color: 'text-rose-700',
    bg: 'bg-rose-50 border-rose-200',
    icon: AlertCircle,
  },
  CANCELLED: {
    label: 'Đã hủy',
    color: 'text-stone-500',
    bg: 'bg-stone-100 border-stone-200',
    icon: AlertCircle,
  },
};

export default function OrdersHistoryPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const token = useAppStore((state) => state.token);
  const user = useAppStore((state) => state.user);

  const loadOrders = useCallback(async () => {
    if (!token) {
      router.push('/login?redirect=/orders');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await fetchMyOrders(token);
      setOrders(data);
    } catch (err: any) {
      setError(err.message || 'Không thể tải danh sách đơn hàng.');
    } finally {
      setLoading(false);
    }
  }, [token, router]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // Hỗ trợ Barista cập nhật trạng thái trực tiếp để demo và test
  const handleUpdateStatus = async (orderId: string, nextStatus: string) => {
    if (!token) return;
    try {
      await fetch(`${API_BASE_URL}/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: nextStatus }),
      });
      loadOrders();
    } catch {
      // ignore
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 pb-16">
      <Header />

      <main className="max-w-md mx-auto px-4 py-4 space-y-4">
        {/* Nút quay lại */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push('/')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-800 hover:text-brand-900"
          >
            <ArrowLeft className="w-4 h-4" />
            Về trang thực đơn
          </button>

          <button
            onClick={loadOrders}
            className="text-stone-400 hover:text-brand-800 transition p-1"
            title="Làm mới"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        <div>
          <h1 className="text-xl font-bold text-brand-900">Lịch sử đơn hàng</h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Theo dõi tiến độ pha chế và các hóa đơn của bạn.
          </p>
        </div>

        {loading && (
          <div className="space-y-3 animate-pulse">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-stone-200 rounded-2xl" />
            ))}
          </div>
        )}

        {error && !loading && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 space-y-2 text-center">
            <p>{error}</p>
            <button
              onClick={loadOrders}
              className="px-3 py-1.5 bg-rose-600 text-white rounded-lg font-semibold"
            >
              Thử lại
            </button>
          </div>
        )}

        {!loading && !error && orders.length === 0 && (
          <div className="p-8 bg-white border border-stone-100 rounded-2xl text-center space-y-3 shadow-sm">
            <Coffee className="w-12 h-12 text-stone-300 mx-auto" />
            <h2 className="text-sm font-bold text-stone-700">
              Bạn chưa có đơn hàng nào
            </h2>
            <p className="text-xs text-stone-400">
              Khi bạn đặt cà phê hoặc trà, các hóa đơn sẽ xuất hiện tại đây.
            </p>
            <Link
              href="/"
              className="inline-block px-4 py-2 bg-brand-500 text-white rounded-xl text-xs font-semibold"
            >
              Đặt món ngay
            </Link>
          </div>
        )}

        {!loading && !error && orders.length > 0 && (
          <div className="space-y-3" data-testid="orders-history-list">
            {orders.map((ord) => {
              const badge = STATUS_BADGES[ord.status] || STATUS_BADGES.PENDING;
              const BadgeIcon = badge.icon;
              const dateStr = new Date(ord.createdAt).toLocaleString('vi-VN', {
                dateStyle: 'short',
                timeStyle: 'short',
              });

              return (
                <div
                  key={ord.id}
                  data-testid={`order-card-${ord.id}`}
                  className="bg-white p-4 rounded-2xl border border-brand-100 shadow-sm space-y-3"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-bold text-sm text-brand-900 block">
                        {ord.orderCode}
                      </span>
                      <span className="text-[10px] text-stone-400 block mt-0.5">
                        {dateStr}
                      </span>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${badge.bg} ${badge.color}`}
                    >
                      <BadgeIcon className="w-3.5 h-3.5" />
                      {badge.label}
                    </span>
                  </div>

                  {/* Danh sách món tóm tắt */}
                  <div className="space-y-1 text-xs text-stone-600 border-t border-b border-brand-50 py-2">
                    {ord.items.map((item) => (
                      <div key={item.id} className="flex justify-between">
                        <span>
                          {item.quantity}x {item.product?.name || 'Món nước'} ({item.size})
                        </span>
                        <span className="font-semibold text-stone-800">
                          {formatVND(item.lineTotal)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-between items-center text-xs">
                    <span className="text-stone-500 font-medium">Tổng tiền:</span>
                    <span className="text-sm font-bold text-brand-800">
                      {formatVND(ord.totalAmount)}
                    </span>
                  </div>

                  {/* Tiến trình Barista Demo (cho tài khoản staff hoặc kiểm thử) */}
                  {(user?.role === 'STAFF' || user?.role === 'ADMIN') && (
                    <div className="pt-2 border-t border-dashed border-stone-200 flex items-center justify-between text-[11px]">
                      <span className="font-bold text-amber-700">Barista Controls:</span>
                      <div className="flex gap-1.5">
                        {ord.status === 'PAID' && (
                          <button
                            onClick={() => handleUpdateStatus(ord.id, 'PREPARING')}
                            className="px-2 py-1 bg-blue-600 text-white rounded text-[10px] font-bold"
                          >
                            Bắt đầu pha
                          </button>
                        )}
                        {ord.status === 'PREPARING' && (
                          <button
                            onClick={() => handleUpdateStatus(ord.id, 'READY')}
                            className="px-2 py-1 bg-purple-600 text-white rounded text-[10px] font-bold"
                          >
                            Đã pha xong
                          </button>
                        )}
                        {ord.status === 'READY' && (
                          <button
                            onClick={() => handleUpdateStatus(ord.id, 'COMPLETED')}
                            className="px-2 py-1 bg-emerald-600 text-white rounded text-[10px] font-bold"
                          >
                            Đã giao khách
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
