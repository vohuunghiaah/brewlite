"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { API_URL } from "../../api-url";
import { createAuthController } from "../../menu/menu-controller.mjs";
import styles from "./staff.module.css";

const actions = {
  PAID: { label: "Đã thanh toán", button: "Bắt đầu pha chế", next: "PREPARING" },
  PREPARING: { label: "Đang pha chế", button: "Đánh dấu sẵn sàng", next: "READY" },
  READY: { label: "Sẵn sàng", button: "Xác nhận đã giao món", next: "COMPLETED" },
} as const;

interface QueueOrder {
  id: number;
  orderCode: string;
  createdAt: string;
  status: keyof typeof actions;
  pickupMethod: string;
  tableNumber: string | null;
  note: string | null;
  items: {id: number; productName: string; quantity: number; size: string; toppings: string[]; note?: string}[];
}

export default function StaffOrdersPage() {
  const auth = useMemo(() => createAuthController(), []);
  const { token } = useSyncExternalStore(auth.subscribe, auth.getState, auth.getServerSnapshot);
  const [orders, setOrders] = useState<QueueOrder[] | null>(null);
  const [notice, setNotice] = useState("");
  const [denied, setDenied] = useState(false);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const active = useRef<AbortController | null>(null);

  const request = useCallback(async (path: string, signal: AbortSignal, init?: RequestInit) => {
    const res = await fetch(API_URL + path, {
      ...init, signal, cache: "no-store",
      headers: { Authorization: `Bearer ${token}`, ...(init && { "Content-Type": "application/json" }) },
    });
    if (signal.aborted) throw new Error("Đã ngắt kết nối.");
    if (res.status === 401 || res.status === 403) {
      setOrders(null);
      setDenied(true);
      if (res.status === 401) auth.clearSession();
      throw new Error(res.status === 401 ? "Phiên đăng nhập đã hết hạn." : "Tài khoản không có quyền truy cập quầy.");
    }
    return res;
  }, [auth, token]);

  const refresh = useCallback(async (order?: QueueOrder) => {
    if (!token || inFlight.current) return;
    const controller = new AbortController();
    active.current = controller;
    inFlight.current = true;
    setBusy(true);
    setNotice("");
    let message = "";
    try {
      if (order) {
        const res = await request(`/orders/${order.id}/status`, controller.signal, {
          method: "PATCH", body: JSON.stringify({ status: actions[order.status].next }),
        });
        if (!res.ok && res.status !== 409) throw new Error(`Cập nhật thất bại (HTTP ${res.status}).`);
        message = res.ok ? `Đã cập nhật đơn ${order.orderCode}.` : "Trạng thái đã thay đổi. Đã tải lại danh sách.";
      }
      const res = await request("/orders/staff", controller.signal);
      if (!res.ok) throw new Error("Không tải được danh sách. Vui lòng thử lại.");
      const data: QueueOrder[] = await res.json();
      if (!controller.signal.aborted) {
        setOrders(data);
        setDenied(false);
        setNotice(message);
      }
    } catch (error) {
      if (!controller.signal.aborted) setNotice(error instanceof Error ? error.message : "Lỗi kết nối.");
    } finally {
      if (!controller.signal.aborted) {
        inFlight.current = false;
        setBusy(false);
      }
    }
  }, [request, token]);

  useEffect(() => {
    const initial = window.setTimeout(() => void refresh(), 0);
    return () => {
      window.clearTimeout(initial);
      active.current?.abort();
      inFlight.current = false;
    };
  }, [refresh]);

  return <main className={styles.board}>
    <header><h1>Quầy pha chế</h1><Link href="/menu">Về thực đơn</Link></header>
    {(!token || denied) ? <p>{notice || "Vui lòng đăng nhập bằng tài khoản nhân viên."} <Link href="/menu#login">Đăng nhập</Link></p> : <>
      {(orders !== null || notice) && <button onClick={() => void refresh()} disabled={busy}>Làm mới danh sách</button>}
      <p role="status">{busy ? "Đang xử lý…" : notice}</p>
      {orders?.length === 0 && <p>Chưa có đơn cần phục vụ.</p>}
      {orders?.map(order => <article key={order.id} aria-label={order.orderCode}>
        <header><h2>{order.orderCode}</h2><strong>{actions[order.status].label}</strong></header>
        <time dateTime={order.createdAt}>{new Date(order.createdAt).toLocaleString("vi-VN")}</time>
        <p>{order.pickupMethod === "AT_TABLE" ? `Giao tại bàn ${order.tableNumber}` : "Nhận tại quầy"}</p>
        <ul>{order.items.map(item => <li key={item.id}>
          <b>{item.quantity} × {item.productName}</b> · {item.size}
          {item.toppings?.length > 0 && <span> · {item.toppings.join(", ")}</span>}
          {item.note && <p>{item.note}</p>}
        </li>)}</ul>
        {order.note && <p>Ghi chú đơn: {order.note}</p>}
        <button disabled={busy} onClick={() => void refresh(order)}>{actions[order.status].button}</button>
      </article>)}
    </>}
  </main>;
}
