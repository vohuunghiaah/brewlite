"use client";

import { useState } from "react";
import { Clock, RotateCcw, Package, Bell } from "lucide-react";
import { formatVND } from "./Header";

export interface OrderHistoryDetailItem {
  id: number;
  productId: number;
  productName: string;
  size: "SMALL" | "MEDIUM" | "LARGE";
  toppings: string[];
  note: string | null;
  quantity: number;
  unitPrice: string | number;
  subtotal: string | number;
  product?: {
    id: number;
    name: string;
    imageUrl?: string | null;
    price: string | number;
    isAvailable: boolean;
    stock?: number;
  };
}

export interface OrderHistoryItem {
  id: number;
  orderCode: string | null;
  pickupMethod: string;
  tableNumber: string | null;
  userId: number;
  customerName: string;
  customerPhone: string;
  note: string | null;
  totalAmount: string | number;
  status: string;
  createdAt: string;
  items: OrderHistoryDetailItem[];
}

interface OrderHistoryProps {
  orders: OrderHistoryItem[];
  loading: boolean;
  error?: string;
  onRetry?: () => void;
  isAuthenticated: boolean;
  onOpenLogin: () => void;
  onReorder: (order: OrderHistoryItem) => void;
  onViewConfirmationTicket: (order: OrderHistoryItem) => void;
  reorderNotice?: string;
  onGoMenu?: () => void;
}

export default function OrderHistory({
  orders,
  loading,
  error,
  onRetry,
  isAuthenticated,
  onOpenLogin,
  onReorder,
  onViewConfirmationTicket,
  reorderNotice,
  onGoMenu,
}: OrderHistoryProps) {
  const [tab, setTab] = useState<"processing" | "completed" | "cancelled">("processing");
  const [expandedOrders, setExpandedOrders] = useState<Record<number, boolean>>({});

  const toggleExpand = (id: number) => {
    setExpandedOrders((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-2xl font-extrabold text-[#3D261D] mb-6">
          Lịch sử đơn hàng
        </h1>
        <div className="bg-white border border-[#EFE8DF] rounded-3xl p-8 text-center max-w-md mx-auto shadow-sm">
          <div className="w-16 h-16 bg-[#FAF6F0] rounded-full flex items-center justify-center mx-auto mb-4 text-[#C28D58]">
            <Clock size={32} />
          </div>
          <h3 className="font-extrabold text-[#3D261D] text-lg mb-2">
            Đăng nhập để xem lịch sử đơn hàng
          </h3>
          <p className="text-xs text-[#6B4235] mb-6 leading-relaxed">
            Xem lại các đơn hàng bạn đã đặt, kiểm tra trạng thái pha chế và đặt lại món yêu thích chỉ với một chạm.
          </p>
          <button
            type="button"
            onClick={onOpenLogin}
            className="w-full bg-[#C28D58] hover:bg-[#3D261D] text-white py-3 rounded-2xl font-bold text-xs transition-colors shadow"
          >
            Đăng nhập ngay
          </button>
        </div>
      </div>
    );
  }

  // Group orders into tabs: PAYMENT_FAILED belongs to processing (FIX-03)
  const activeOrders = orders.filter((o) =>
    ["PENDING", "PAYMENT_FAILED", "PAID", "PREPARING", "READY"].includes(o.status)
  );
  const completedOrders = orders.filter((o) => o.status === "COMPLETED");
  const cancelledOrders = orders.filter((o) => o.status === "CANCELLED");

  const displayedOrders =
    tab === "processing"
      ? activeOrders
      : tab === "completed"
      ? completedOrders
      : cancelledOrders;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PAID":
        return {
          label: "• Đã thanh toán",
          bg: "bg-blue-100",
          text: "text-blue-700",
        };
      case "PREPARING":
        return {
          label: "• Đang pha chế",
          bg: "bg-[#FEF3C7]",
          text: "text-[#92400E]",
        };
      case "READY":
        return {
          label: "• Mời lấy nước",
          bg: "bg-[#D1FAE5]",
          text: "text-[#065F46]",
        };
      case "COMPLETED":
        return {
          label: "• Hoàn tất",
          bg: "bg-emerald-100",
          text: "text-emerald-700",
        };
      case "PAYMENT_FAILED":
        return {
          label: "• Thanh toán lỗi (Thử lại)",
          bg: "bg-red-100",
          text: "text-red-600",
        };
      case "CANCELLED":
        return {
          label: "• Đã hủy",
          bg: "bg-gray-100",
          text: "text-gray-600",
        };
      default:
        return {
          label: "• Chờ thanh toán",
          bg: "bg-yellow-100",
          text: "text-yellow-700",
        };
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-[#3D261D]">
            Lịch sử đơn hàng
          </h1>
          <p className="text-xs text-[#6B4235] mt-1">
            Theo dõi tiến trình và thông tin các đơn hàng đã thực hiện
          </p>
        </div>
        <span className="text-xs font-bold bg-[#FAF6F0] text-[#C28D58] px-3 py-1.5 rounded-full border border-[#EFE8DF]">
          {orders.length} đơn hàng
        </span>
      </div>

      {/* Error alert */}
      {error && (
        <div
          role="alert"
          className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-2xl text-xs font-semibold flex items-center justify-between"
        >
          <span>{error}</span>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="bg-red-600 text-white px-3 py-1 rounded-xl text-xs font-bold hover:bg-red-700 transition-colors ml-3"
            >
              Thử lại
            </button>
          )}
        </div>
      )}

      {/* Reorder notice */}
      {reorderNotice && (
        <div
          role="status"
          className="bg-[#FEF3C7] border border-[#FDE68A] text-[#92400E] p-3 rounded-2xl text-xs font-semibold animate-fade-in"
        >
          {reorderNotice}
        </div>
      )}

      {/* Tabs */}
      <div role="tablist" className="flex gap-2 bg-[#FAF6F0] p-1 rounded-2xl border border-[#EFE8DF]">
        <button
          type="button"
          role="tab"
          id="tab-processing"
          aria-controls="panel-processing"
          aria-selected={tab === "processing"}
          onClick={() => setTab("processing")}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            tab === "processing"
              ? "bg-[#3D261D] text-white shadow-sm"
              : "text-[#6B4235] hover:text-[#3D261D]"
          }`}
        >
          <span>Đang xử lý</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
            tab === "processing" ? "bg-[#C28D58] text-white" : "bg-[#EFE8DF] text-[#3D261D]"
          }`}>
            {activeOrders.length}
          </span>
        </button>

        <button
          type="button"
          role="tab"
          id="tab-completed"
          aria-controls="panel-completed"
          aria-selected={tab === "completed"}
          onClick={() => setTab("completed")}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            tab === "completed"
              ? "bg-[#3D261D] text-white shadow-sm"
              : "text-[#6B4235] hover:text-[#3D261D]"
          }`}
        >
          <span>Hoàn tất</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
            tab === "completed" ? "bg-[#C28D58] text-white" : "bg-[#EFE8DF] text-[#3D261D]"
          }`}>
            {completedOrders.length}
          </span>
        </button>

        <button
          type="button"
          role="tab"
          id="tab-cancelled"
          aria-controls="panel-cancelled"
          aria-selected={tab === "cancelled"}
          onClick={() => setTab("cancelled")}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            tab === "cancelled"
              ? "bg-[#3D261D] text-white shadow-sm"
              : "text-[#6B4235] hover:text-[#3D261D]"
          }`}
        >
          <span>Đã hủy</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
            tab === "cancelled" ? "bg-[#C28D58] text-white" : "bg-[#EFE8DF] text-[#3D261D]"
          }`}>
            {cancelledOrders.length}
          </span>
        </button>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white border border-[#EFE8DF] rounded-2xl p-5 skeleton h-28" />
          ))}
        </div>
      )}

      {/* Empty Tab State */}
      {!loading && !error && displayedOrders.length === 0 && (
        <div className="bg-white border border-[#EFE8DF] rounded-3xl p-8 text-center max-w-sm mx-auto shadow-sm">
          <div className="w-14 h-14 bg-[#FAF6F0] rounded-full flex items-center justify-center mx-auto mb-3 text-[#C28D58]">
            <Package size={26} />
          </div>
          <h3 className="font-extrabold text-[#3D261D] text-sm mb-1">
            {tab === "processing"
              ? "Không có đơn hàng nào đang xử lý"
              : tab === "completed"
              ? "Chưa có đơn hàng nào hoàn tất"
              : "Không có đơn hàng nào bị hủy"}
          </h3>
          <p className="text-xs text-[#6B4235] mb-4">
            {tab === "processing"
              ? "Các món đồ uống thơm ngon đang chờ bạn khám phá và đặt hàng!"
              : "Hãy đặt món để lưu giữ lịch sử thưởng thức đồ uống tại BrewLite nhé."}
          </p>
          {onGoMenu && (
            <button
              type="button"
              onClick={onGoMenu}
              className="bg-[#3D261D] hover:bg-[#C28D58] text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors shadow"
            >
              Khám phá Menu ngay
            </button>
          )}
        </div>
      )}

      {/* Orders List Panel */}
      {!loading && displayedOrders.length > 0 && (
        <div role="tabpanel" id={`panel-${tab}`} className="space-y-4">
          {displayedOrders.map((order) => {
            const badge = getStatusBadge(order.status);
            const isExpanded = !!expandedOrders[order.id];
            const orderCode = order.orderCode || `#BL-${order.id.toString().padStart(4, "0")}`;
            const total = Number(order.totalAmount);
            const isReady = order.status === "READY";

            return (
              <article
                key={order.id}
                aria-label={orderCode}
                className={`bg-white border rounded-2xl overflow-hidden shadow-sm transition-all ${
                  isReady
                    ? "border-[#10B981] ring-2 ring-[#10B981]/20"
                    : "border-[#EFE8DF] hover:shadow-md"
                }`}
              >
                {/* Ready banner alert */}
                {isReady && (
                  <div className="bg-[#10B981] text-white px-4 py-2 flex items-center gap-2 text-xs font-bold">
                    <Bell size={14} className="animate-status-pulse" />
                    <span>Đồ uống đã sẵn sàng! Mời bạn lên quầy nhận nước.</span>
                  </div>
                )}

                <div className="p-4 sm:p-5">
                  {/* Top line: Code, date, status */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#FAF6F0] flex items-center justify-center text-[#C28D58] shrink-0">
                        <Package size={20} />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-[#3D261D] text-base">
                          {orderCode}
                        </h3>
                        <p className="text-[11px] text-[#6B4235]">
                          {new Date(order.createdAt).toLocaleString("vi-VN")}
                          {order.pickupMethod === "AT_TABLE"
                            ? ` · 🍽️ Giao tại bàn: ${order.tableNumber || "Chưa ghi số bàn"}`
                            : " · 🏪 Lấy nước tại quầy"}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold ${badge.bg} ${badge.text}`}
                    >
                      {badge.label}
                    </span>
                  </div>

                  {/* Items summary */}
                  <div className="space-y-1 py-2 border-t border-b border-[#FAF6F0] my-2">
                    {order.items?.map((it, idx) => {
                      const sizeLabel = it.size === "SMALL" ? "Size S" : it.size === "MEDIUM" ? "Size M" : "Size L";
                      return (
                        <div key={idx} className="flex justify-between text-xs text-[#3D261D]">
                          <span>
                            {it.quantity}x {it.productName} ({sizeLabel})
                          </span>
                          <span className="font-bold text-[#6B4235]">
                            {formatVND(Number(it.subtotal))}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Expanded Customization Details Breakdown */}
                  {isExpanded && (
                    <div className="bg-[#FAF6F0] rounded-xl p-3 my-2 text-xs space-y-2 animate-fade-in">
                      <p className="font-extrabold text-[#3D261D]">Chi tiết đồ uống:</p>
                      <div className="space-y-1.5 pl-2 border-l-2 border-[#C28D58]">
                        {order.items?.map((it, idx) => {
                          const sizeLabel = it.size === "SMALL" ? "Size S" : it.size === "MEDIUM" ? "Size M" : "Size L";
                          return (
                            <div key={idx} className="text-[#6B4235]">
                              <p className="font-bold text-[#3D261D]">
                                {it.quantity}x {it.productName} ({sizeLabel}):
                              </p>
                              {it.toppings?.length > 0 && (
                                <p>Topping: {it.toppings.join(", ")}</p>
                              )}
                              {it.note && <p>Ghi chú: {it.note}</p>}
                            </div>
                          );
                        })}
                      </div>

                      {/* Customer and Recipient Breakdown */}
                      <div className="pt-2 border-t border-[#EFE8DF] text-[11px] text-[#6B4235]">
                        👤 Người nhận: <strong>{order.customerName}</strong> ({order.customerPhone})
                        {order.note && ` • Ghi chú: ${order.note}`}
                      </div>
                    </div>
                  )}

                  {/* Footer actions: Total, Details, Reorder */}
                  <div className="flex items-center justify-between pt-2">
                    <div>
                      <span className="text-xs text-[#6B4235]">Tổng tiền: </span>
                      <span className="font-black text-base text-[#C28D58]">
                        {formatVND(total)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Collapse/Expand button */}
                      <button
                        type="button"
                        onClick={() => toggleExpand(order.id)}
                        className="text-xs font-bold text-[#6B4235] hover:text-[#3D261D] px-2 py-1 transition-colors"
                      >
                        {isExpanded ? "Thu gọn ▴" : "Chi tiết ▾"}
                      </button>

                      {/* View Confirmation Ticket button */}
                      <button
                        type="button"
                        onClick={() => onViewConfirmationTicket(order)}
                        className="bg-[#FAF6F0] hover:bg-[#EFE8DF] text-[#3D261D] px-3 py-1.5 rounded-xl text-xs font-bold transition-colors border border-[#EFE8DF]"
                      >
                        Xem vé xác nhận {orderCode}
                      </button>

                      {/* Reorder button */}
                      {(order.status === "COMPLETED" || order.status === "CANCELLED" || order.status === "PAID") && (
                        <button
                          type="button"
                          onClick={() => onReorder(order)}
                          aria-label={`Đặt lại đơn ${orderCode}`}
                          className="bg-[#3D261D] hover:bg-[#C28D58] text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1 shadow-sm active:scale-95"
                        >
                          <RotateCcw size={12} />
                          <span>Đặt lại</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
