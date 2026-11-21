"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import type { FormEvent } from "react";
import { fetchProducts } from "./products.mjs";
import {
  createAuthController,
  generatePaymentIdempotencyKey,
  createMenuModalController,
  getCategory,
  calculateItemPrice,
  buildCartItemKey,
  combineItemNote,
} from "./menu-controller.mjs";
import { useSessionCart, type CartItem } from "./session-cart";

// API URL
import { API_URL } from "../api-url";

// Modular UI Components
import Header, { NavView } from "../../components/Header";
import MenuScreen, { Product } from "../../components/MenuScreen";
import ProductModal, { CustomizationOption } from "../../components/ProductModal";
import CartDrawer from "../../components/CartDrawer";
import AuthModal from "../../components/AuthModal";
import CheckoutScreen from "../../components/CheckoutScreen";
import OrderConfirmation from "../../components/OrderConfirmation";
import OrderHistory, { OrderHistoryItem } from "../../components/OrderHistory";
import AccountScreen from "../../components/AccountScreen";
import { ToastContainer, ToastItem } from "../../components/Toast";

interface OrderResponse {
  id?: number;
  customerName?: string;
  status?: string;
  message?: string;
}

interface ModalState {
  selectedProduct: Product | null;
  loadingDetail: boolean;
  detailError: string;
  isOpen: boolean;
}

const initialModalState: ModalState = {
  selectedProduct: null,
  loadingDetail: false,
  detailError: "",
  isOpen: false,
};
const getServerModalSnapshot = () => initialModalState;

interface AuthUser {
  id: number;
  email: string;
}
interface AuthSession {
  token: string | null;
  user: AuthUser | null;
}

interface BuzzerTicketData {
  orderId: number;
  orderCode: string;
  status: string;
  pickupMethod: string;
  tableNumber?: string;
  totalAmount: number;
  items: CartItem[];
}

export default function MenuPage() {
  const pathname = usePathname();
  const initialView: NavView = pathname === "/" ? "home" : "menu";

  // ================= 1. TOÀN BỘ STATE HOOKS ĐƯỢC KHỞI TẠO TẬP TRUNG TẠI ĐẦU COMPONENT =================
  // Products state
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Tất cả");

  // Cart state
  const [cartItems, setCartItems] = useSessionCart();
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Navigation view state
  const [activeNav, setActiveNav] = useState<NavView>(initialView);

  // Toasts
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  // Auth Modal state
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [resumeCheckoutAfterAuth, setResumeCheckoutAfterAuth] = useState(false);

  // Checkout and Order Placement state
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [showCheckoutForm, setShowCheckoutForm] = useState(false);
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [orderError, setOrderError] = useState("");
  const [pendingOrder, setPendingOrder] = useState<{ id: number; status: string } | null>(null);

  // Cashless Payment state
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<"MOMO" | "VIETQR" | "CARD">("VIETQR");
  const [pickupMethod, setPickupMethod] = useState<"AT_COUNTER" | "AT_TABLE">("AT_COUNTER");
  const [tableNumber, setTableNumber] = useState("");
  const [testMode, setTestMode] = useState<"SUCCESS" | "FAILED" | "PENDING">("SUCCESS");
  // Production safety: Mock payment controls are strictly hidden in production UI
  const showPaymentTestControls = useMemo(() => {
    if (typeof window === "undefined") return false;
    return (
      process.env.NODE_ENV === "test" ||
      (process.env.NODE_ENV !== "production" &&
        (process.env.NEXT_PUBLIC_ENABLE_TEST_PAYMENT_CONTROLS === "true" ||
          window.location.search.includes("test_payment_controls=true")))
    );
  }, []);
  const [paying, setPaying] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [paymentIdempotencyKey, setPaymentIdempotencyKey] = useState<string>("");

  // Buzzer Ticket Confirmation state
  const [buzzerTicket, setBuzzerTicket] = useState<BuzzerTicketData | null>(null);
  const [isBuzzerOpen, setIsBuzzerOpen] = useState(false);

  // Order History state
  const [orders, setOrders] = useState<OrderHistoryItem[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState("");
  const [reorderNotice, setReorderNotice] = useState("");

  // External store controllers
  const authController = useMemo(() => createAuthController(), []);
  const authState = useSyncExternalStore<AuthSession>(
    authController.subscribe,
    authController.getState,
    authController.getServerSnapshot
  );
  const { token: authToken, user } = authState;

  const modalController = useMemo(
    () => createMenuModalController({ apiUrl: API_URL }),
    []
  );
  const modalState = useSyncExternalStore(
    modalController.subscribe,
    modalController.getState,
    getServerModalSnapshot
  ) as ModalState;
  const { selectedProduct, loadingDetail, detailError, isOpen: isProductModalOpen } = modalState;

  // ================= 2. TOAST HELPERS =================
  const showToast = useCallback((message: string, type: ToastItem["type"] = "success") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // ================= 3. NAVIGATION & HASH ROUTING =================
  function navigate(view: NavView) {
    const hash =
      view === "home"
        ? "#top"
        : view === "menu"
        ? "#menu"
        : view === "orders"
        ? "#orders"
        : "#account";
    if (window.location.hash !== hash) window.history.pushState(null, "", hash);
    setActiveNav(view);
  }

  const openAuthModal = useCallback((mode: "login" | "register" = "login", resumeCheckout = false) => {
    setAuthMode(mode);
    setAuthError("");
    setResumeCheckoutAfterAuth(resumeCheckout);
    setIsAuthOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setIsAuthOpen(false);
    setAuthError("");
    setResumeCheckoutAfterAuth(false);
  }, []);

  // ================= 4. THÊM MÓN & QUẢN LÝ GIỎ HÀNG =================
  const addItemToCart = useCallback(
    (
      product: Product,
      size: "SMALL" | "MEDIUM" | "LARGE" = "SMALL",
      toppings: string[] = [],
      note: string = "",
      quantity: number = 1
    ) => {
      if (!product.isAvailable || quantity <= 0) return;

      setPendingOrder(null);
      const sortedToppings = [...toppings].sort();
      const key = buildCartItemKey(product.id, size, sortedToppings, note);
      const unitPrice = calculateItemPrice(Number(product.price), size, sortedToppings);

      setCartItems((prev) => {
        const existingIndex = prev.findIndex((item) => item.key === key);
        if (existingIndex > -1) {
          const updated = [...prev];
          const newQty = updated[existingIndex].quantity + quantity;
          updated[existingIndex] = {
            ...updated[existingIndex],
            quantity: newQty,
            subtotal: unitPrice * newQty,
          };
          return updated;
        } else {
          const newItem: CartItem = {
            key,
            productId: product.id,
            productName: product.name,
            basePrice: Number(product.price),
            size,
            toppings: sortedToppings,
            note: note.trim(),
            unitPrice,
            quantity,
            subtotal: unitPrice * quantity,
          };
          return [...prev, newItem];
        }
      });

      setOrderError("");
    },
    [setCartItems]
  );

  const handleOpenProductModal = useCallback(
    (product: Product) => {
      void modalController.openProductDetail(product);
    },
    [modalController]
  );

  const handleCloseProductModal = useCallback(() => {
    modalController.closeProductDetail();
  }, [modalController]);

  const handleAddToCartFromModal = useCallback(
    (customization: CustomizationOption) => {
      if (!selectedProduct) return;
      const combinedNote = combineItemNote(customization.ice, customization.sugar, customization.note);
      addItemToCart(
        selectedProduct,
        customization.size,
        customization.toppings,
        combinedNote,
        customization.quantity
      );
      modalController.closeProductDetail();
      showToast(`Đã thêm ${selectedProduct.name} vào giỏ hàng! ☕`, "success");
    },
    [selectedProduct, addItemToCart, modalController, showToast]
  );

  const handleQuickAdd = useCallback(
    (product: Product) => {
      addItemToCart(product, "SMALL", [], "", 1);
      showToast(`Đã thêm ${product.name} vào giỏ hàng ☕`, "success");
    },
    [addItemToCart, showToast]
  );

  const updateCartItemQuantity = useCallback(
    (key: string, delta: number) => {
      setPendingOrder(null);
      setCartItems((prev) => {
        const next: CartItem[] = [];
        for (const item of prev) {
          if (item.key === key) {
            const newQty = item.quantity + delta;
            if (newQty > 0) {
              next.push({
                ...item,
                quantity: newQty,
                subtotal: item.unitPrice * newQty,
              });
            }
          } else {
            next.push(item);
          }
        }
        return next;
      });
      setOrderError("");
    },
    [setCartItems]
  );

  const removeCartItem = useCallback(
    (key: string) => {
      setPendingOrder(null);
      setCartItems((prev) => prev.filter((item) => item.key !== key));
      setOrderError("");
      showToast("Đã xóa món khỏi giỏ hàng", "info");
    },
    [setCartItems, showToast]
  );

  const clearCart = useCallback(() => {
    setPendingOrder(null);
    setCartItems([]);
    setOrderError("");
  }, [setCartItems]);

  const totalCartQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalCartPrice = cartItems.reduce((sum, item) => sum + item.subtotal, 0);

  const handleClearCart = () => {
    clearCart();
    setOrderError("");
  };

  const handleStartCheckout = () => {
    if (pendingOrder) {
      setOrderError(
        `Đơn hàng #${pendingOrder.id} đã được tạo và đang chờ thanh toán. Vui lòng thanh toán đơn hiện tại hoặc nhấn "Tạo đơn hàng mới" để đặt đơn khác.`
      );
      return;
    }
    setOrderError("");

    if (!user || !authToken) {
      setResumeCheckoutAfterAuth(true);
      setIsAuthOpen(true);
      setAuthError("");
      return;
    }
    setShowCheckoutForm(true);
  };

  // ================= 5. TẠO ĐƠN HÀNG (UC-04: PENDING ORDER) =================
  async function handlePlaceOrder() {
    if (submittingOrder) return;
    setOrderError("");

    if (pendingOrder) {
      setOrderError(
        `Đơn hàng #${pendingOrder.id} đã được tạo và đang chờ thanh toán. Vui lòng thanh toán đơn hiện tại hoặc nhấn "Tạo đơn hàng mới" để đặt đơn khác.`
      );
      return;
    }

    if (!customerName.trim()) {
      setOrderError("Vui lòng nhập tên khách hàng.");
      return;
    }

    if (!customerPhone.trim()) {
      setOrderError("Vui lòng nhập số điện thoại.");
      return;
    }

    if (cartItems.length === 0) {
      setOrderError("Giỏ hàng đang trống.");
      return;
    }

    const unavailableProduct = products.find(
      (p) => !p.isAvailable && cartItems.some((item) => item.productId === p.id)
    );
    if (unavailableProduct) {
      setOrderError(`${unavailableProduct.name} hiện đã hết hàng.`);
      return;
    }

    if (!authToken) {
      setResumeCheckoutAfterAuth(true);
      setIsAuthOpen(true);
      setOrderError("Vui lòng đăng nhập để hoàn tất đặt hàng.");
      return;
    }

    const items = cartItems.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      size: item.size,
      toppings: item.toppings,
      note: item.note ? item.note.trim() : undefined,
    }));

    const payload = {
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      items,
    };

    try {
      setSubmittingOrder(true);
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (authToken) {
        headers["Authorization"] = `Bearer ${authToken}`;
      }

      const response = await fetch(`${API_URL}/orders`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      const responseText = await response.text();
      let data: OrderResponse = {};
      try {
        data = responseText ? JSON.parse(responseText) : {};
      } catch {
        data = { message: responseText };
      }

      if (!response.ok) {
        const detail = data?.message || `HTTP Error: ${response.status}`;
        throw new Error(Array.isArray(detail) ? detail.join(", ") : detail);
      }

      const orderId = data.id;
      const orderStatus = data.status || "PENDING";
      if (orderId !== undefined) {
        setPendingOrder({ id: orderId, status: orderStatus });
        setShowCheckoutForm(false);
      }

      showToast(`Đã tạo đơn hàng #${orderId}! Vui lòng thanh toán.`, "success");
    } catch (err) {
      console.error("Lỗi đặt hàng:", err);
      setOrderError(err instanceof Error ? err.message : "Không thể thực hiện đặt hàng.");
      showToast(err instanceof Error ? err.message : "Lỗi khi tạo đơn hàng", "error");
    } finally {
      setSubmittingOrder(false);
    }
  }

  // ================= 6. XỬ LÝ THANH TOÁN (UC-10: CASHLESS PAYMENT) =================
  async function handleProcessPayment() {
    if (!pendingOrder || paying) return;
    if (!authToken) {
      openAuthModal("login", false);
      return;
    }

    if (pickupMethod === "AT_TABLE" && !tableNumber.trim()) {
      setPaymentError("Vui lòng nhập số bàn hợp lệ khi chọn hình thức Giao tận bàn.");
      return;
    }

    setPaymentError("");
    setPaying(true);

    let key = paymentIdempotencyKey;
    if (!key) {
      key = generatePaymentIdempotencyKey();
      setPaymentIdempotencyKey(key);
    }

    try {
      const res = await fetch(`${API_URL}/payments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
          "Idempotency-Key": key,
        },
        body: JSON.stringify({
          orderId: pendingOrder.id,
          amount: totalCartPrice,
          method: selectedPaymentMethod,
          idempotencyKey: key,
          mockOutcome: testMode,
          pickupMethod,
          tableNumber: pickupMethod === "AT_TABLE" ? tableNumber.trim() : undefined,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.status === 409) {
        if (data.status === "REFUNDED") {
          setPendingOrder((prev) => (prev ? { ...prev, status: "CANCELLED" } : null));
          setPaymentError(
            `Rất tiếc, sản phẩm vừa hết hàng khi bạn đang thanh toán. Giao dịch đã được hoàn tiền tự động (Mã hoàn: ${
              data.refundKey || "Đã bồi hoàn"
            }). Đơn hàng đã hủy an toàn.`
          );
          setPaymentIdempotencyKey("");
          return;
        }
        throw new Error(data.message || "Xung đột giao dịch đồng thời.");
      }

      if (!res.ok) {
        const detail = data?.message || `Lỗi thanh toán: HTTP ${res.status}`;
        throw new Error(Array.isArray(detail) ? detail.join(", ") : detail);
      }

      if (data.status === "FAILED" || !data.success) {
        setPendingOrder((prev) => (prev ? { ...prev, status: "PAYMENT_FAILED" } : null));
        setPaymentError(
          data.message || "Thanh toán thất bại: Số dư tài khoản không đủ hoặc thẻ bị từ chối."
        );
        setPaymentIdempotencyKey("");
        showToast("Thanh toán thất bại. Vui lòng thử lại.", "error");
        return;
      }

      // Thanh toán thành công (PAID)
      const paidOrder = data.order || {};
      const buzzerCode = paidOrder.orderCode;
      if (!buzzerCode) {
        throw new Error("Không nhận được mã chuông định danh hợp lệ từ máy chủ.");
      }

      setBuzzerTicket({
        orderId: pendingOrder.id,
        orderCode: buzzerCode,
        status: paidOrder.status || "PAID",
        pickupMethod,
        tableNumber: pickupMethod === "AT_TABLE" ? tableNumber.trim() : undefined,
        totalAmount: totalCartPrice,
        items: [...cartItems],
      });

      // Xóa sạch giỏ hàng theo FR-06
      setCartItems([]);
      setIsBuzzerOpen(true);
      setIsPaymentOpen(false);
      setPendingOrder({ id: pendingOrder.id, status: "PAID" });
      setPaymentIdempotencyKey("");
      showToast("Thanh toán thành công! ☕", "success");

      if (authToken) {
        void fetchOrders();
      }
    } catch (err: unknown) {
      setPaymentError(
        err instanceof Error ? err.message : "Đã xảy ra sự cố trong quá trình thanh toán."
      );
    } finally {
      setPaying(false);
    }
  }

  // ================= 7. LỊCH SỬ ĐƠN HÀNG (GET /orders/me) =================
  const historyRequest = useRef(0);
  const fetchOrders = useCallback(async () => {
    const requestId = ++historyRequest.current;
    if (!authToken) {
      setOrders([]);
      return;
    }
    setOrdersLoading(true);
    setOrdersError("");

    try {
      const res = await fetch(`${API_URL}/orders/me`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (requestId !== historyRequest.current) return;
      if (res.status === 401) {
        authController.clearSession();
        setOrders([]);
        setOrdersError("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
        return;
      }

      if (!res.ok) {
        throw new Error(`Lỗi kết nối máy chủ (${res.status})`);
      }

      const data = await res.json();
      if (requestId !== historyRequest.current) return;
      setOrders(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      if (requestId !== historyRequest.current) return;
      setOrdersError(
        err instanceof Error ? err.message : "Không thể tải lịch sử đơn hàng. Vui lòng thử lại."
      );
    } finally {
      if (requestId === historyRequest.current) setOrdersLoading(false);
    }
  }, [authToken, authController]);

  useEffect(() => {
    if (authToken && (activeNav === "orders" || activeNav === "account")) {
      void fetchOrders();
    }
  }, [authToken, activeNav, fetchOrders]);

  async function handleReorder(order: OrderHistoryItem) {
    if (!order.items || order.items.length === 0) return;

    let freshCatalog: Product[];
    try {
      const fetched = await fetchProducts(API_URL);
      if (!Array.isArray(fetched) || fetched.length === 0) {
        const errorMsg = "Không thể đặt lại đơn hàng do danh mục sản phẩm từ hệ thống hiện đang trống hoặc chưa sẵn sàng.";
        setReorderNotice(errorMsg);
        alert(errorMsg);
        return;
      }
      freshCatalog = fetched;
      setProducts(fetched);
    } catch (err) {
      console.error("Lỗi làm mới danh mục sản phẩm khi đặt lại đơn hàng:", err);
      const errorMsg = "Không thể đặt lại đơn hàng do không thể xác minh dữ liệu sản phẩm mới nhất từ hệ thống. Vui lòng thử lại sau.";
      setReorderNotice(errorMsg);
      alert(errorMsg);
      return;
    }

    let addedCount = 0;
    const warnings: string[] = [];
    const currentCartQuantities: Record<number, number> = {};
    for (const ci of cartItems) {
      currentCartQuantities[ci.productId] = (currentCartQuantities[ci.productId] || 0) + ci.quantity;
    }

    for (const item of order.items) {
      const liveProduct = freshCatalog.find((p) => p.id === item.productId);
      const itemName = item.productName || liveProduct?.name || `Món #${item.productId}`;

      if (!liveProduct) {
        warnings.push(`Món "${itemName}" đã ngừng kinh doanh`);
        continue;
      }
      if (!liveProduct.isAvailable) {
        warnings.push(`Món "${liveProduct.name}" tạm ngừng kinh doanh`);
        continue;
      }
      if (typeof liveProduct.stock !== "number" || isNaN(liveProduct.stock) || liveProduct.stock < 0) {
        warnings.push(`Món "${liveProduct.name}" thiếu dữ liệu tồn kho hợp lệ từ hệ thống`);
        continue;
      }

      const currentStock = liveProduct.stock;
      if (currentStock === 0) {
        warnings.push(`Món "${liveProduct.name}" đã hết hàng (tồn kho: 0)`);
        continue;
      }

      const alreadyInCart = currentCartQuantities[liveProduct.id] || 0;
      const remainingStock = Math.max(0, currentStock - alreadyInCart);

      if (remainingStock <= 0) {
        warnings.push(
          `Món "${liveProduct.name}" không thể thêm (trong giỏ đã có ${alreadyInCart} ly, đạt giới hạn kho: ${currentStock})`
        );
        continue;
      }

      const qtyToAdd = Math.min(item.quantity, remainingStock);
      if (qtyToAdd < item.quantity) {
        warnings.push(
          `Món "${liveProduct.name}" chỉ còn ${remainingStock} ly khả dụng (yêu cầu ${item.quantity} ly). Đã thêm ${qtyToAdd} ly.`
        );
      }

      addItemToCart(
        liveProduct,
        item.size,
        item.toppings || [],
        item.note || "",
        qtyToAdd
      );

      currentCartQuantities[liveProduct.id] = (currentCartQuantities[liveProduct.id] || 0) + qtyToAdd;
      addedCount += qtyToAdd;
    }

    if (addedCount > 0) {
      setIsCartOpen(true);
      if (warnings.length > 0) {
        setReorderNotice(`Đã thêm ${addedCount} món vào giỏ hàng. Cảnh báo: ${warnings.join("; ")}.`);
      } else {
        setReorderNotice(`Đã thêm toàn bộ món từ đơn ${order.orderCode || `#${order.id}`} vào giỏ hàng.`);
      }
      showToast(`Đã thêm ${addedCount} món vào giỏ hàng!`, "success");
    } else {
      const errorMsg = warnings.length > 0
        ? `Không thể đặt lại đơn hàng: ${warnings.join("; ")}.`
        : "Không thể đặt lại đơn hàng vì các sản phẩm hiện không khả dụng.";
      setReorderNotice(errorMsg);
      alert(errorMsg);
    }
  }

  function openOrderTicket(latestOrder: OrderHistoryItem) {
    const items: CartItem[] = (latestOrder.items || []).map((i) => ({
      key: `hist-${latestOrder.id}-${i.id}`,
      productId: i.productId,
      productName: i.productName,
      basePrice: Number(i.unitPrice),
      size: i.size,
      toppings: i.toppings || [],
      note: i.note || "",
      unitPrice: Number(i.unitPrice),
      quantity: i.quantity,
      subtotal: Number(i.subtotal),
    }));

    setBuzzerTicket({
      orderId: latestOrder.id,
      orderCode: latestOrder.orderCode || `#BL-${latestOrder.id}`,
      status: latestOrder.status,
      pickupMethod: latestOrder.pickupMethod,
      tableNumber: latestOrder.tableNumber || undefined,
      totalAmount: Number(latestOrder.totalAmount),
      items,
    });
    setIsBuzzerOpen(true);
  }

  const ticketId = isBuzzerOpen ? buzzerTicket?.orderId : undefined;
  useEffect(() => {
    if (!ticketId || !authToken) return;
    const request = new AbortController();
    async function refresh() {
      try {
        const response = await fetch(`${API_URL}/orders/${ticketId}`, {
          headers: { Authorization: `Bearer ${authToken}` },
          signal: request.signal,
          cache: "no-store",
        });
        if (request.signal.aborted) return;
        if (response.status === 401) {
          authController.clearSession();
          setOrders([]);
          setIsAuthOpen(true);
          setAuthMode("login");
          setAuthError("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
          return;
        }
        if (!response.ok) throw new Error("Không thể đọc trạng thái đơn.");
        const order: OrderHistoryItem = await response.json();
        if (request.signal.aborted) return;
        if (order.id !== ticketId || !order.status) throw new Error("Phản hồi đơn hàng không hợp lệ.");
        setBuzzerTicket((ticket) => (ticket?.orderId === order.id ? { ...ticket, status: order.status } : ticket));
        setOrders((history) => history.map((item) => (item.id === order.id ? order : item)));
      } catch {
        if (request.signal.aborted) return;
      }
    }
    void refresh();
    return () => request.abort();
  }, [ticketId, authToken, authController]);

  // ================= 8. XỬ LÝ AUTH SUBMIT & LOGOUT =================
  async function handleAuthSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (authLoading) return;
    setAuthError("");

    const email = authEmail.trim();
    const password = authPassword;

    if (!email) {
      setAuthError("Vui lòng nhập email.");
      return;
    }
    if (!password || password.length < 6) {
      setAuthError("Mật khẩu phải có tối thiểu 6 ký tự.");
      return;
    }

    setAuthLoading(true);
    try {
      if (authMode === "register") {
        const regRes = await fetch(`${API_URL}/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const regData = await regRes.json().catch(() => ({}));
        if (!regRes.ok) {
          const detail = regData?.message || "Đăng ký không thành công.";
          throw new Error(Array.isArray(detail) ? detail.join(", ") : detail);
        }
      }

      const loginRes = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const loginData = await loginRes.json().catch(() => ({}));
      if (!loginRes.ok) {
        const detail = loginData?.message || "Đăng nhập không thành công.";
        throw new Error(Array.isArray(detail) ? detail.join(", ") : detail);
      }

      const { accessToken, user: loggedUser } = loginData;
      if (!accessToken || !loggedUser) {
        throw new Error("Không nhận được token xác thực.");
      }

      authController.setSession(accessToken, loggedUser);
      setIsAuthOpen(false);
      setAuthEmail("");
      setAuthPassword("");
      showToast(`Xin chào, ${loggedUser.email}! ☕`, "success");

      if (resumeCheckoutAfterAuth) {
        setIsCartOpen(true);
        setShowCheckoutForm(true);
        setResumeCheckoutAfterAuth(false);
      }
    } catch (err: unknown) {
      setAuthError(err instanceof Error ? err.message : "Đã có lỗi xảy ra.");
    } finally {
      setAuthLoading(false);
    }
  }

  function handleLogout() {
    authController.clearSession();
    setOrders([]);
    setActiveNav("menu");
    setIsBuzzerOpen(false);
    setBuzzerTicket(null);
    showToast("Đã đăng xuất tài khoản", "info");
  }

  // ================= 9. LOAD INITIAL PRODUCTS VÀ SYNC LOCATION =================
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const data = await fetchProducts(API_URL);
        if (!cancelled) setProducts(Array.isArray(data) ? data : []);
      } catch (err: unknown) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Không thể tải danh sách sản phẩm.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    function handleLocation() {
      const hash = window.location.hash;
      if (hash === "#login") openAuthModal("login");
      else if (hash === "#orders" || hash === "#history") setActiveNav("orders");
      else if (hash === "#account") setActiveNav("account");
      else if (hash === "#menu") setActiveNav("menu");
      else if (hash === "#top") setActiveNav("home");
      else setActiveNav(initialView);
    }
    handleLocation();
    window.addEventListener("hashchange", handleLocation);
    window.addEventListener("popstate", handleLocation);
    return () => {
      window.removeEventListener("hashchange", handleLocation);
      window.removeEventListener("popstate", handleLocation);
    };
  }, [initialView, openAuthModal]);

  // Filter products by search and category
  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q));
      const matchesCategory =
        selectedCategory === "Tất cả" || getCategory(p) === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, search, selectedCategory]);

  return (
    <div className="min-h-screen bg-[#FDFCFA] text-[#3D261D] flex flex-col font-sans">
      {/* 1. Header Navigation */}
      <Header
        currentView={activeNav}
        onNavigate={navigate}
        cartCount={totalCartQuantity}
        cartTotal={totalCartPrice}
        onOpenCart={() => setIsCartOpen(true)}
        userEmail={user?.email}
        onOpenAuth={() => openAuthModal("login")}
        onLogout={handleLogout}
      />

      {/* 2. Main Body: Switch according to activeNav */}
      <main className="flex-1">
        {activeNav === "home" && (
          <MenuScreen
            isHomeView={true}
            onExploreMenu={() => navigate("menu")}
            products={products.slice(0, 4)}
            loading={loading}
            error={error}
            onRetry={() => {
              void (async () => {
                setLoading(true);
                setError("");
                try {
                  const data = await fetchProducts(API_URL);
                  setProducts(Array.isArray(data) ? data : []);
                } catch (err: unknown) {
                  setError(err instanceof Error ? err.message : "Không thể tải danh sách sản phẩm.");
                } finally {
                  setLoading(false);
                }
              })();
            }}
            search=""
            onSearchChange={() => {}}
            selectedCategory="Tất cả"
            onCategoryChange={() => {}}
            onOpenProduct={handleOpenProductModal}
            onQuickAdd={handleQuickAdd}
          />
        )}

        {activeNav === "menu" && (
          <MenuScreen
            isHomeView={false}
            products={filteredProducts}
            loading={loading}
            error={error}
            onRetry={() => {
              void (async () => {
                setLoading(true);
                setError("");
                try {
                  const data = await fetchProducts(API_URL);
                  setProducts(Array.isArray(data) ? data : []);
                } catch (err: unknown) {
                  setError(err instanceof Error ? err.message : "Không thể tải danh sách sản phẩm.");
                } finally {
                  setLoading(false);
                }
              })();
            }}
            search={search}
            onSearchChange={setSearch}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            onOpenProduct={handleOpenProductModal}
            onQuickAdd={handleQuickAdd}
          />
        )}

        {activeNav === "orders" && (
          <OrderHistory
            orders={orders}
            loading={ordersLoading}
            error={ordersError}
            onRetry={fetchOrders}
            isAuthenticated={!!authToken}
            onOpenLogin={() => openAuthModal("login")}
            onReorder={handleReorder}
            onViewConfirmationTicket={openOrderTicket}
            reorderNotice={reorderNotice}
            onGoMenu={() => navigate("menu")}
          />
        )}

        {activeNav === "account" && (
          <AccountScreen
            user={user}
            isAuthenticated={!!authToken}
            onOpenLogin={() => openAuthModal("login")}
            onLogout={handleLogout}
            orders={orders}
            onNavigateToHistory={() => navigate("orders")}
          />
        )}
      </main>

      {/* 3. Product Detail Modal */}
      <ProductModal
        isOpen={isProductModalOpen}
        product={selectedProduct}
        loadingDetail={loadingDetail}
        detailError={detailError}
        onClose={handleCloseProductModal}
        onAddToCart={handleAddToCartFromModal}
      />

      {/* 4. Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cartItems}
        onUpdateQuantity={updateCartItemQuantity}
        onRemoveItem={removeCartItem}
        onClearCart={handleClearCart}
        showCheckoutForm={showCheckoutForm}
        onStartCheckout={handleStartCheckout}
        customerName={customerName}
        onCustomerNameChange={setCustomerName}
        customerPhone={customerPhone}
        onCustomerPhoneChange={setCustomerPhone}
        onProceedOrder={handlePlaceOrder}
        isCreatingOrder={submittingOrder}
        pendingOrder={pendingOrder}
        onOpenPaymentModal={() => setIsPaymentOpen(true)}
        orderError={orderError}
        onNewOrder={() => {
          setPendingOrder(null);
          setShowCheckoutForm(true);
          setOrderError("");
        }}
      />

      {/* 5. Auth Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={closeAuthModal}
        mode={authMode}
        onModeChange={setAuthMode}
        email={authEmail}
        onEmailChange={setAuthEmail}
        password={authPassword}
        onPasswordChange={setAuthPassword}
        onSubmit={handleAuthSubmit}
        loading={authLoading}
        error={authError}
      />

      {/* 6. Cashless Checkout Screen / Modal */}
      {pendingOrder && (
        <CheckoutScreen
          isOpen={isPaymentOpen}
          onClose={() => setIsPaymentOpen(false)}
          orderId={pendingOrder.id}
          totalAmount={totalCartPrice}
          pickupMethod={pickupMethod}
          onPickupMethodChange={setPickupMethod}
          tableNumber={tableNumber}
          onTableNumberChange={setTableNumber}
          paymentMethod={selectedPaymentMethod}
          onPaymentMethodChange={setSelectedPaymentMethod}
          testMode={testMode}
          onTestModeChange={setTestMode}
          showTestControls={showPaymentTestControls}
          onConfirmPayment={handleProcessPayment}
          processing={paying}
          paymentError={paymentError}
        />
      )}

      {/* 7. Order Confirmation / Digital Buzzer Dialog */}
      {buzzerTicket && (
        <OrderConfirmation
          isOpen={isBuzzerOpen}
          onClose={() => setIsBuzzerOpen(false)}
          orderId={buzzerTicket.orderId}
          orderCode={buzzerTicket.orderCode}
          status={buzzerTicket.status}
          pickupMethod={buzzerTicket.pickupMethod}
          tableNumber={buzzerTicket.tableNumber}
          totalAmount={buzzerTicket.totalAmount}
          items={buzzerTicket.items}
          onViewHistory={() => {
            navigate("orders");
            if (authToken) void fetchOrders();
          }}
          onContinueShopping={() => navigate("menu")}
        />
      )}

      {/* 8. Toast Feedback System */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
