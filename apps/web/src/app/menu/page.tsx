/* eslint-disable @next/next/no-img-element */
"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { FormEvent } from "react";
import { fetchProducts } from "./products.mjs";
import {
  createAuthController,
  generatePaymentIdempotencyKey,
  createMenuModalController,
  getCategory,
  AVAILABLE_SIZES,
  AVAILABLE_TOPPINGS,
  AVAILABLE_ICE_LEVELS,
  AVAILABLE_SUGAR_LEVELS,
  calculateItemPrice,
  buildCartItemKey,
  combineItemNote,
} from "./menu-controller.mjs";
import ui from "./menu.module.css";

// ================= API BACKEND =================
const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

// ================= KIỂU DỮ LIỆU =================
interface Product {
  id: number;
  name: string;
  description: string;
  price: number | string;
  imageUrl?: string | null;
  isAvailable: boolean;
}

export interface CartItem {
  key: string;
  productId: number;
  productName: string;
  basePrice: number;
  size: "SMALL" | "MEDIUM" | "LARGE";
  toppings: string[];
  note: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
}

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

const categories = [
  "Tất cả",
  "Cà phê truyền thống",
  "Cold Brew & Espresso",
  "Trà trái cây",
  "Bánh ngọt",
];

const fallbackImages = {
  coffee:
    "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=900&q=85",
  tea:
    "https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=900&q=85",
  cacao:
    "https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=900&q=85",
  water:
    "https://images.unsplash.com/photo-1548839140-29a749e1cf4d?auto=format&fit=crop&w=900&q=85",
};

function getFallbackImage(product: Product): string {
  const details = `${product.name} ${product.description}`.toLocaleLowerCase();

  if (/trà|tea|đào|cam/.test(details)) return fallbackImages.tea;
  if (/cacao|chocolate/.test(details)) return fallbackImages.cacao;
  if (/nước|water/.test(details)) return fallbackImages.water;
  return fallbackImages.coffee;
}

// ================= COMPONENT MENU =================
export default function MenuPage() {
  // Danh sách sản phẩm
  const [products, setProducts] = useState<Product[]>([]);

  // Giỏ hàng danh sách CartItem (Task 5.1.1)
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  // Trạng thái tải dữ liệu
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Tất cả");
  const [favorites, setFavorites] = useState<Record<number, boolean>>({});

  // Tùy chỉnh sản phẩm trong Modal (Task 5.1.1 & Figma Screen 02)
  const [selectedSize, setSelectedSize] = useState<"SMALL" | "MEDIUM" | "LARGE">("SMALL");
  const [selectedToppings, setSelectedToppings] = useState<string[]>([]);
  const [selectedIce, setSelectedIce] = useState<string>("Đá đầy");
  const [selectedSugar, setSelectedSugar] = useState<string>("100%");
  const [customNote, setCustomNote] = useState<string>("");
  const [itemQuantity, setItemQuantity] = useState<number>(1);

  // Trạng thái Giỏ hàng Slide-over Drawer (Task 5.1.1 & Figma Screen 03)
  const [isCartOpen, setIsCartOpen] = useState(false);
  const cartDrawerRef = useRef<HTMLElement>(null);
  const cartSummaryBtnRef = useRef<HTMLButtonElement>(null);
  const drawerTriggerRef = useRef<HTMLElement | null>(null);

  // ================= XÁC THỰC NGƯỜI DÙNG (TASK 5.1.2 & FIGMA SCREEN 04) =================
  interface AuthUser {
    id: number;
    email: string;
  }
  interface AuthSession {
    token: string | null;
    user: AuthUser | null;
  }

  const authController = useMemo(() => createAuthController(), []);
  const authState = useSyncExternalStore<AuthSession>(
    authController.subscribe,
    authController.getState,
    authController.getServerSnapshot
  );
  const { token: authToken, user } = authState;

  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [resumeCheckoutAfterAuth, setResumeCheckoutAfterAuth] = useState(false);
  const authModalRef = useRef<HTMLDivElement>(null);
  const authTriggerRef = useRef<HTMLElement | null>(null);

  const openAuthModal = useCallback((mode: "login" | "register" = "login", resumeCheckout = false) => {
    authTriggerRef.current = document.activeElement as HTMLElement;
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

  const handleLogout = useCallback(() => {
    authController.clearSession();
  }, [authController]);

  // Đơn hàng PENDING đã tạo (Chống tạo đơn lặp ngoài ý muốn)
  const [pendingOrder, setPendingOrder] = useState<{ id: number; status: string } | null>(null);

  // ================= THANH TOÁN MÔ PHỎNG & VÉ CHUÔNG (TASK 5.1.3 & FIGMA SCREENS 05 & 06) =================
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<"MOMO" | "VIETQR" | "CARD">("MOMO");
  const [pickupMethod, setPickupMethod] = useState<"AT_COUNTER" | "AT_TABLE">("AT_COUNTER");
  const [tableNumber, setTableNumber] = useState("");
  const [testMode, setTestMode] = useState<"SUCCESS" | "FAILED" | "PENDING">("SUCCESS");
  const [paying, setPaying] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [paymentMessage, setPaymentMessage] = useState("");
  const [paymentIdempotencyKey, setPaymentIdempotencyKey] = useState<string>("");

  interface BuzzerTicketData {
    orderId: number;
    orderCode: string;
    status: string;
    pickupMethod: string;
    tableNumber?: string;
    totalAmount: number;
    items: CartItem[];
  }
  const [buzzerTicket, setBuzzerTicket] = useState<BuzzerTicketData | null>(null);
  const [isBuzzerOpen, setIsBuzzerOpen] = useState(false);
  const paymentModalRef = useRef<HTMLDivElement>(null);
  const buzzerModalRef = useRef<HTMLDivElement>(null);

  // Thông tin đặt hàng
  const [showCheckout, setShowCheckout] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [orderNote, setOrderNote] = useState("");

  // Trạng thái xử lý đơn hàng
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [orderMessage, setOrderMessage] = useState("");
  const [orderError, setOrderError] = useState("");

  // Chi tiết sản phẩm (Modal Task 4.3 Controller & Focus Manager)
  const modalController = useMemo(
    () => createMenuModalController({ apiUrl: API_URL }),
    []
  );
  const modalState = useSyncExternalStore(
    modalController.subscribe,
    modalController.getState,
    getServerModalSnapshot
  ) as ModalState;
  const { selectedProduct, loadingDetail, detailError, isOpen } = modalState;
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Mở modal và khởi tạo tùy chỉnh mặc định
  const handleOpenProductModal = useCallback(
    (product: Product) => {
      setSelectedSize("SMALL");
      setSelectedToppings([]);
      setSelectedIce("Đá đầy");
      setSelectedSugar("100%");
      setCustomNote("");
      setItemQuantity(1);
      void modalController.openProductDetail(product);
    },
    [modalController]
  );

  // Quản lý Focus khi mở và đóng modal
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      modalRef.current?.focus();
    } else if (previousFocusRef.current) {
      previousFocusRef.current.focus();
      previousFocusRef.current = null;
    }
  }, [isOpen]);

  // Quản lý Drawer: Focus trap, Escape, khóa cuộn trang và hoàn trả focus
  useEffect(() => {
    if (!isCartOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Ghi nhận element mở Drawer để hoàn trả focus khi đóng
    if (!drawerTriggerRef.current && document.activeElement instanceof HTMLElement) {
      drawerTriggerRef.current = document.activeElement;
    }

    const restoreTarget = drawerTriggerRef.current ?? cartSummaryBtnRef.current;
    cartDrawerRef.current?.focus();

    function handleDrawerKeyDown(event: KeyboardEvent) {
      if (modalState.isOpen) return; // Nhường phím Escape cho Product Detail Modal

      if (event.key === "Escape") {
        event.preventDefault();
        setIsCartOpen(false);
        return;
      }

      if (event.key === "Tab" && cartDrawerRef.current) {
        const focusables = cartDrawerRef.current.querySelectorAll<HTMLElement>(
          'button:not(:disabled), [tabindex="0"], a[href], input:not(:disabled), textarea:not(:disabled)'
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }

    window.addEventListener("keydown", handleDrawerKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleDrawerKeyDown);
      restoreTarget?.focus();
      drawerTriggerRef.current = null;
    };
  }, [isCartOpen, modalState.isOpen]);

  // Quản lý sự kiện bàn phím: Escape đóng modal & Trap Focus
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        modalController.handleEscape();
        return;
      }

      if (event.key === "Tab" && modalRef.current) {
        const focusables = modalRef.current.querySelectorAll<HTMLElement>(
          'button:not(:disabled), [tabindex="0"], a[href], input:not(:disabled), textarea:not(:disabled)'
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, modalController]);

  // Quản lý sự kiện bàn phím & Trap Focus cho Auth Modal
  useEffect(() => {
    if (!isAuthOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    authModalRef.current?.focus();

    function handleAuthKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeAuthModal();
        return;
      }

      if (event.key === "Tab" && authModalRef.current) {
        const focusables = authModalRef.current.querySelectorAll<HTMLElement>(
          'button:not(:disabled), [tabindex="0"], a[href], input:not(:disabled), textarea:not(:disabled)'
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }

    window.addEventListener("keydown", handleAuthKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleAuthKeyDown);
      authTriggerRef.current?.focus();
      authTriggerRef.current = null;
    };
  }, [isAuthOpen, closeAuthModal]);

  // Xử lý đăng nhập / đăng ký tài khoản (Task 5.1.2)
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

      // Nếu đang dở dang luồng đặt hàng, mở tiếp form checkout
      if (resumeCheckoutAfterAuth) {
        setShowCheckout(true);
        setResumeCheckoutAfterAuth(false);
        setIsCartOpen(true);
      }
    } catch (err: unknown) {
      setAuthError(err instanceof Error ? err.message : "Đã có lỗi xảy ra.");
    } finally {
      setAuthLoading(false);
    }
  }

  // Focus trap & Escape cho Cashless Checkout Modal
  useEffect(() => {
    if (!isPaymentOpen) return;

    paymentModalRef.current?.focus();

    function handlePaymentKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setIsPaymentOpen(false);
      }
    }

    window.addEventListener("keydown", handlePaymentKeyDown);
    return () => window.removeEventListener("keydown", handlePaymentKeyDown);
  }, [isPaymentOpen]);

  // Focus trap & Escape cho Buzzer Ticket Modal
  useEffect(() => {
    if (!isBuzzerOpen) return;

    buzzerModalRef.current?.focus();

    function handleBuzzerKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setIsBuzzerOpen(false);
      }
    }

    window.addEventListener("keydown", handleBuzzerKeyDown);
    return () => window.removeEventListener("keydown", handleBuzzerKeyDown);
  }, [isBuzzerOpen]);

  // Xử lý thanh toán mô phỏng (Task 5.1.3 & UC-10 & FIX-13)
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
    setPaymentMessage("");
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
          amount: totalPrice,
          method: selectedPaymentMethod,
          idempotencyKey: key,
          mockOutcome: testMode,
          pickupMethod,
          tableNumber: pickupMethod === "AT_TABLE" ? tableNumber.trim() : undefined,
        }),
      });

      const data = await res.json().catch(() => ({}));

      // Xử lý xung đột hoặc bồi hoàn BR-REFUND-OCC (HTTP 409) (FIX-12 & FIX-13)
      if (res.status === 409) {
        if (data.status === "REFUNDED") {
          setPendingOrder((prev) => (prev ? { ...prev, status: "CANCELLED" } : null));
          setPaymentError(
            `Rất tiếc, sản phẩm vừa hết hàng khi bạn đang thanh toán. Giao dịch đã được bồi hoàn hoàn tiền tự động (Mã hoàn: ${
              data.refundKey || "Đã bồi hoàn"
            }). Đơn hàng đã được hủy an toàn theo BR-REFUND-OCC.`
          );
          setPaymentIdempotencyKey("");
          return;
        }

        if (data.status === "REFUND_PENDING") {
          setPaymentError(
            `Xung đột tồn kho đồng thời. Tiến trình hoàn tiền đang được xử lý (Mã: ${
              data.refundKey || "Đang hoàn"
            }). Vui lòng kiểm tra lại trạng thái sau.`
          );
          return;
        }

        throw new Error(data.message || "Xung đột giao dịch đồng thời.");
      }

      if (!res.ok) {
        const detail = data?.message || `Lỗi thanh toán: HTTP ${res.status}`;
        throw new Error(Array.isArray(detail) ? detail.join(", ") : detail);
      }

      // Xử lý trường hợp PENDING / Timeout (EX-07 / FIX-13)
      if (data.status === "PENDING") {
        setPaymentMessage(
          data.message ||
            "Giao dịch đang chờ phản hồi từ cổng thanh toán. Đơn hàng và giỏ hàng được bảo lưu an toàn. Bạn có thể bấm 'Đối soát' để kiểm tra kết quả."
        );
        // Không coi là PAYMENT_FAILED, giữ giỏ hàng, giữ order PENDING và giữ idempotency key
        return;
      }

      // Xử lý trường hợp FAILED xác nhận (EX-06 / FIX-13)
      if (data.status === "FAILED" || !data.success) {
        setPendingOrder((prev) => (prev ? { ...prev, status: "PAYMENT_FAILED" } : null));
        setPaymentError(
          data.message || "Thanh toán thất bại: Số dư tài khoản không đủ hoặc thẻ bị từ chối."
        );
        // Sau khi attempt FAILED được xác nhận, reset key để lần thanh toán thử lại tiếp theo sinh khóa mới (FIX-03 & FIX-06)
        setPaymentIdempotencyKey("");
        return;
      }

      // Thanh toán THÀNH CÔNG (PAID - TX2 Commit)
      const paidOrder = data.order || {};
      const buzzerCode = paidOrder.orderCode;
      if (!buzzerCode) {
        throw new Error("Không nhận được mã chuông định danh hợp lệ từ máy chủ.");
      }

      setBuzzerTicket({
        orderId: pendingOrder.id,
        orderCode: buzzerCode,
        status: "PAID",
        pickupMethod,
        tableNumber: pickupMethod === "AT_TABLE" ? tableNumber.trim() : undefined,
        totalAmount: totalPrice,
        items: [...cartItems],
      });

      // Tự động xóa giỏ hàng theo đúng FR-06 khi đã thanh toán PAID thành công
      setCartItems([]);

      setIsBuzzerOpen(true);
      setIsPaymentOpen(false);
      setPendingOrder({ id: pendingOrder.id, status: "PAID" });
      setPaymentIdempotencyKey("");
      setOrderMessage(
        `Thanh toán thành công đơn hàng #${pendingOrder.id}! Mã lấy nước: ${buzzerCode}. Trạng thái: PAID.`
      );
    } catch (err: unknown) {
      setPaymentError(
        err instanceof Error ? err.message : "Đã xảy ra sự cố trong quá trình thanh toán."
      );
      // Giữ nguyên paymentIdempotencyKey khi timeout / mạng chập chờn để retry idempotent (FIX-03 & FIX-13)
    } finally {
      setPaying(false);
    }
  }

  // Đối soát giao dịch PENDING (FIX-09, FIX-11 & FIX-13)
  async function handleReconcilePayment() {
    if (!paymentIdempotencyKey || !authToken || paying) return;
    setPaymentError("");
    setPaymentMessage("");
    setPaying(true);

    try {
      const res = await fetch(`${API_URL}/payments/reconcile/${paymentIdempotencyKey}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      const data = await res.json().catch(() => ({}));

      if (res.status === 409 && data.status === "REFUNDED") {
        setPendingOrder((prev) => (prev ? { ...prev, status: "CANCELLED" } : null));
        setPaymentError(
          `Giao dịch đã được bồi hoàn hoàn tiền do hết hàng (Mã hoàn: ${data.refundKey}). Đơn hàng đã được hủy.`
        );
        setPaymentIdempotencyKey("");
        return;
      }

      if (!res.ok) {
        throw new Error(data?.message || "Đối soát chưa thành công.");
      }

      if (data.status === "PENDING") {
        setPaymentMessage(
          data.message || "Giao dịch vẫn đang chờ xử lý từ cổng thanh toán. Vui lòng thử lại sau ít phút."
        );
        return;
      }

      if (data.status === "FAILED") {
        setPendingOrder((prev) => (prev ? { ...prev, status: "PAYMENT_FAILED" } : null));
        setPaymentError(data.message || "Thanh toán thất bại sau đối soát.");
        setPaymentIdempotencyKey("");
        return;
      }

      if (data.status === "SUCCESS") {
        const buzzerCode = data.order?.orderCode || data.payment?.buzzerCode;
        setBuzzerTicket({
          orderId: pendingOrder!.id,
          orderCode: buzzerCode,
          status: "PAID",
          pickupMethod,
          tableNumber: pickupMethod === "AT_TABLE" ? tableNumber.trim() : undefined,
          totalAmount: totalPrice,
          items: [...cartItems],
        });
        setCartItems([]);
        setIsBuzzerOpen(true);
        setIsPaymentOpen(false);
        setPendingOrder({ id: pendingOrder!.id, status: "PAID" });
        setPaymentIdempotencyKey("");
        setOrderMessage(
          `Đối soát thành công đơn hàng #${pendingOrder!.id}! Mã chuông: ${buzzerCode}. Trạng thái: PAID.`
        );
      }
    } catch (err: unknown) {
      setPaymentError(err instanceof Error ? err.message : "Lỗi khi đối soát giao dịch.");
    } finally {
      setPaying(false);
    }
  }

  // ================= LẤY DANH SÁCH SẢN PHẨM =================
  const loadProducts = useCallback((signal?: AbortSignal) => {
    return fetchProducts(API_URL, signal)
      .then((data: Product[]) => {
        if (!signal?.aborted) setProducts(data);
      })
      .catch((err: unknown) => {
        if (signal?.aborted) return;
        console.error("Lỗi tải sản phẩm:", err);
        setError(err instanceof Error ? err.message : "Không thể tải danh sách đồ uống");
      })
      .finally(() => {
        if (!signal?.aborted) setLoading(false);
      });
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadProducts(controller.signal);
    return () => controller.abort();
  }, [loadProducts]);

  const filteredProducts = products.filter((product) => {
    const searchText = `${product.name} ${product.description}`.toLocaleLowerCase();
    const matchesSearch = searchText.includes(search.trim().toLocaleLowerCase());
    const matchesCategory =
      selectedCategory === "Tất cả" ||
      getCategory(product) === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  // ================= ĐỊNH DẠNG TIỀN =================
  function formatPrice(price: number | string) {
    return Number(price).toLocaleString("vi-VN") + " đ";
  }

  // ================= TÍNH TOÁN GIÁ TÙY CHỈNH MODAL =================
  const modalUnitPrice = useMemo(() => {
    if (!selectedProduct) return 0;
    return calculateItemPrice(Number(selectedProduct.price), selectedSize, selectedToppings);
  }, [selectedProduct, selectedSize, selectedToppings]);

  const modalSubtotal = modalUnitPrice * itemQuantity;

  // ================= THÊM MÓN VÀO GIỎ HÀNG (TASK 5.1.1) =================
  function addItemToCart(
    product: Product,
    size: "SMALL" | "MEDIUM" | "LARGE" = "SMALL",
    toppings: string[] = [],
    note: string = "",
    quantity: number = 1
  ) {
    if (!product.isAvailable || quantity <= 0) return;

    setPendingOrder(null);
    const sortedToppings = [...toppings].sort();
    const key = buildCartItemKey(product.id, size, sortedToppings, note);
    const unitPrice = calculateItemPrice(Number(product.price), size, sortedToppings);

    setCartItems((prev) => {
      const existingIndex = prev.findIndex((item) => item.key === key);
      if (existingIndex >= 0) {
        const next = [...prev];
        const existing = next[existingIndex];
        const updatedQty = existing.quantity + quantity;
        next[existingIndex] = {
          ...existing,
          quantity: updatedQty,
          subtotal: existing.unitPrice * updatedQty,
        };
        return next;
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

    setOrderMessage("");
    setOrderError("");
  }

  // ================= CẬP NHẬT SỐ LƯỢNG MÓN TRONG GIỎ =================
  function updateCartItemQuantity(key: string, delta: number) {
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

    setOrderMessage("");
    setOrderError("");
  }

  // ================= XÓA 1 MÓN KHỎI GIỎ =================
  function removeCartItem(key: string) {
    setPendingOrder(null);
    setCartItems((prev) => prev.filter((item) => item.key !== key));
    setOrderMessage("");
    setOrderError("");
  }

  // ================= XÓA TOÀN BỘ GIỎ HÀNG =================
  function clearCart() {
    setPendingOrder(null);
    setCartItems([]);
    setShowCheckout(false);
    setOrderMessage("");
    setOrderError("");
  }

  // ================= TỔNG SỐ LƯỢNG & TỔNG TIỀN =================
  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cartItems.reduce((sum, item) => sum + item.subtotal, 0);

  // ================= ĐẶT HÀNG (UC-04) =================
  async function handlePlaceOrder(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (submittingOrder) return;

    setOrderError("");
    setOrderMessage("");

    // Chống vô tình gửi lại cùng một đơn khi đã có đơn PENDING (Section D)
    if (pendingOrder) {
      setOrderError(
        `Đơn hàng #${pendingOrder.id} đã được tạo và đang chờ thanh toán. Vui lòng thanh toán đơn hiện tại hoặc nhấn "Tạo đơn hàng mới" để đặt đơn khác.`
      );
      return;
    }

    // Kiểm tra thông tin khách hàng
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

    // Kiểm tra tình trạng sản phẩm
    const unavailableProduct = products.find(
      (p) => !p.isAvailable && cartItems.some((item) => item.productId === p.id)
    );

    if (unavailableProduct) {
      setOrderError(`${unavailableProduct.name} hiện đã hết hàng.`);
      return;
    }

    // Yêu cầu xác thực tài khoản để đặt hàng (Task 5.1.2)
    if (!authToken) {
      setResumeCheckoutAfterAuth(true);
      setIsAuthOpen(true);
      setOrderError("Vui lòng đăng nhập để hoàn tất đặt hàng.");
      return;
    }

    // Dữ liệu chi tiết gửi đến NestJS OrdersService (bao gồm ghi chú món - FIX-02)
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
      note: orderNote.trim(),
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
      }
      setOrderMessage(
        `Đặt hàng thành công! ${
          orderId !== undefined ? `Mã đơn hàng: #${orderId}. ` : ""
        }Trạng thái: ${orderStatus} (Chờ thanh toán). Giỏ hàng được giữ nguyên để tiến hành thanh toán.`
      );

      // FIX-03: Đơn hàng PENDING (UC-04) chưa được thanh toán (UC-10)
      // Giữ nguyên giỏ hàng để bảo toàn thông tin cho bước thanh toán tiếp theo
      setShowCheckout(false);
      setCustomerName("");
      setCustomerPhone("");
      setOrderNote("");
    } catch (err) {
      console.error("Lỗi đặt hàng:", err);
      setOrderError(
        err instanceof Error ? err.message : "Không thể thực hiện đặt hàng."
      );
    } finally {
      setSubmittingOrder(false);
    }
  }

  // ================= GIAO DIỆN =================
  return (
    <main className={ui.page} id="top">
      <header className={ui.topbar}>
        <div className={ui.navInner}>
          <a className={ui.brand} href="#top" aria-label="BrewLite - Trang chủ">
            <span className={ui.brandIcon} aria-hidden="true">☕</span>
            <span>Brew<span>Lite</span></span>
          </a>

          <nav className={ui.navigation} aria-label="Điều hướng chính">
            <a href="#top">Trang chủ</a>
            <a href="#menu" className={ui.activeNav} aria-current="page">
              Menu
            </a>
            <a
              href="#cart"
              onClick={(e) => {
                e.preventDefault();
                setIsCartOpen(true);
              }}
            >
              Giỏ hàng
            </a>
          </nav>

          <div className={ui.navActions}>
            {user ? (
              <div className={ui.userSession}>
                <span className={ui.userEmail} title={user.email}>
                  👤 {user.email}
                </span>
                <button
                  type="button"
                  className={ui.logoutBtn}
                  onClick={handleLogout}
                  aria-label="Đăng xuất"
                >
                  Đăng xuất
                </button>
              </div>
            ) : (
              <button
                type="button"
                className={ui.loginBtn}
                onClick={() => openAuthModal("login", false)}
                aria-label="Đăng nhập tài khoản"
              >
                👤 Đăng nhập
              </button>
            )}

            <button
              ref={cartSummaryBtnRef}
              type="button"
              className={ui.cartSummary}
              onClick={() => setIsCartOpen(true)}
              aria-label={`Giỏ hàng: ${totalItems} món, ${formatPrice(totalPrice)}`}
            >
              <span aria-hidden="true">🛒</span>
              <span className={ui.cartCount}>{totalItems}</span>
              <span className={ui.cartDivider} />
              <span>{formatPrice(totalPrice)}</span>
            </button>
          </div>
        </div>
      </header>

      <div className={ui.content}>
        <section className={ui.hero}>
          <div className={ui.heroCopy}>
            <p className={ui.eyebrow}>
              <span aria-hidden="true">✦</span> HÔM NAY TẠI BREWLITE
            </p>
            <h1>
              Mỗi ly cà phê,
              <br />
              <span>một khoảnh khắc.</span>
            </h1>
            <p className={ui.heroDescription}>
              Pha chế tỉ mỉ · Hương vị thật ngon · Đặt món thật dễ
            </p>
          </div>
          <div className={ui.heroStats}>
            <div>
              <strong>{products.length}</strong>
              <span>MÓN HÔM NAY</span>
            </div>
            <span className={ui.statDivider} />
            <div>
              <strong>+</strong>
              <span>ĐẶT HÀNG NHANH</span>
            </div>
          </div>
        </section>

        <section className={ui.menuSection} id="menu">
          <label className={ui.searchBox}>
            <span className={ui.searchIcon} aria-hidden="true" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm cà phê, trà, bánh..."
              aria-label="Tìm đồ uống"
            />
          </label>

          <div
            className={ui.categoryList}
            role="group"
            aria-label="Danh mục đồ uống"
          >
            {categories.map((category) => (
              <button
                type="button"
                key={category}
                className={
                  selectedCategory === category
                    ? `${ui.categoryChip} ${ui.selectedCategory}`
                    : ui.categoryChip
                }
                aria-pressed={selectedCategory === category}
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </button>
            ))}
          </div>

          <div className={ui.menuHeading}>
            <div>
              <p className={ui.sectionKicker}>Pha chế mỗi ngày</p>
              <h2>Thực đơn hôm nay <span>({filteredProducts.length})</span></h2>
            </div>
            <p className={ui.menuHint}>Chọn món bạn yêu thích</p>
          </div>

          {loading ? (
            <div className={ui.stateCard} role="status" aria-live="polite">
              <span className={ui.spinner} aria-hidden="true" />
              <strong>Đang pha chế thực đơn...</strong>
              <p>Chờ một chút, BrewLite đang tải đồ uống.</p>
            </div>
          ) : error ? (
            <div className={ui.stateCard} role="alert">
              <span className={ui.stateIcon} aria-hidden="true">☕</span>
              <strong>Chưa kết nối được với quầy.</strong>
              <p>{error}</p>
              <button
                type="button"
                className={ui.retryButton}
                onClick={() => {
                  setLoading(true);
                  setError("");
                  void loadProducts();
                }}
              >
                Thử tải lại
              </button>
            </div>
          ) : products.length === 0 ? (
            <div className={ui.stateCard} role="status" aria-live="polite">
              <span className={ui.stateIcon} aria-hidden="true">☕</span>
              <strong>Thực đơn đang được cập nhật.</strong>
              <p>Hiện chưa có đồ uống nào. Bạn quay lại sau nhé.</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className={ui.stateCard} role="status" aria-live="polite">
              <span className={ui.stateIcon} aria-hidden="true">⌕</span>
              <strong>Chưa tìm thấy món phù hợp.</strong>
              <p>Thử đổi từ khóa hoặc chọn danh mục khác.</p>
            </div>
          ) : (
            <div className={ui.productGrid}>
              {filteredProducts.map((product, index) => (
                <article key={product.id} className={ui.productCard}>
                  <div
                    className={ui.productPhoto}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleOpenProductModal(product)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleOpenProductModal(product);
                      }
                    }}
                    style={{ cursor: "pointer" }}
                    aria-label={`Xem chi tiết ${product.name}`}
                  >
                    <div className={ui.photoFallback} aria-hidden="true">
                      {getCategory(product) === "Trà trái cây" ? "🧋" : "☕"}
                    </div>
                    <img
                      src={product.imageUrl || getFallbackImage(product)}
                      alt={product.name}
                      loading="lazy"
                      onError={(event) => {
                        event.currentTarget.style.display = "none";
                      }}
                    />
                    {index === 0 && (
                      <span className={ui.productBadge}>BÁN CHẠY</span>
                    )}
                    <button
                      type="button"
                      className={
                        favorites[product.id]
                          ? `${ui.favoriteButton} ${ui.isFavorite}`
                          : ui.favoriteButton
                      }
                      aria-label={
                        favorites[product.id]
                          ? `Bỏ yêu thích ${product.name}`
                          : `Yêu thích ${product.name}`
                      }
                      aria-pressed={Boolean(favorites[product.id])}
                      onClick={(e) => {
                        e.stopPropagation();
                        setFavorites((previous) => ({
                          ...previous,
                          [product.id]: !previous[product.id],
                        }));
                      }}
                    >
                      ★ <span>Yêu thích</span>
                    </button>
                  </div>

                  <div className={ui.productContent}>
                    <div className={ui.productTitleRow}>
                      <h3
                        onClick={() => handleOpenProductModal(product)}
                        style={{ cursor: "pointer" }}
                        title={`Xem chi tiết ${product.name}`}
                      >
                        {product.name}
                      </h3>
                      <span
                        className={
                          product.isAvailable
                            ? ui.available
                            : ui.unavailable
                        }
                        aria-label={product.isAvailable ? "Còn hàng" : "Hết hàng"}
                        title={product.isAvailable ? "Còn hàng" : "Hết hàng"}
                      >
                        ●
                      </span>
                    </div>
                    <p className={ui.productDescription}>
                      {product.description || "Pha mới mỗi ngày tại BrewLite."}
                    </p>
                    <div className={ui.productFooter}>
                      <strong>{formatPrice(product.price)}</strong>
                      <div className={ui.cardActions}>
                        <button
                          type="button"
                          className={ui.detailButton}
                          onClick={() => handleOpenProductModal(product)}
                          aria-label={`Xem chi tiết ${product.name}`}
                        >
                          Chi tiết
                        </button>
                        <button
                          type="button"
                          className={ui.addButton}
                          disabled={!product.isAvailable}
                          onClick={() => addItemToCart(product, "SMALL", [], "", 1)}
                          aria-label={`Thêm nhanh ${product.name} vào giỏ`}
                          title="Thêm nhanh vào giỏ"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* ================= FOOTER ================= */}
        <footer className={ui.footer}>
          <span className={ui.footerIcon} aria-hidden="true">☕</span>
          <p>BrewLite · Một ly ngon, một ngày vui.</p>
        </footer>
      </div>

      {/* ================= OVERLAY GIỎ HÀNG ================= */}
      {isCartOpen && (
        <div
          className={ui.drawerOverlay}
          role="presentation"
          onClick={() => setIsCartOpen(false)}
        />
      )}

      {/* ================= GIỎ HÀNG SLIDE-OVER DRAWER (TASK 5.1.1 & FIGMA) ================= */}
      <section
        id="cart"
        ref={cartDrawerRef}
        tabIndex={-1}
        className={`${ui.cartDrawer} ${isCartOpen ? ui.cartDrawerOpen : ""}`}
        role={isCartOpen ? "dialog" : undefined}
        aria-modal={isCartOpen ? "true" : undefined}
        aria-hidden={!isCartOpen ? true : undefined}
        inert={!isCartOpen ? true : undefined}
        aria-label="Giỏ hàng của bạn"
      >
        <div className={ui.drawerHeader}>
          <div className={ui.drawerHeaderTitle}>
            <span aria-hidden="true">🛒</span>
            <h2>Giỏ hàng của bạn</h2>
            {totalItems > 0 && (
              <span className={ui.drawerItemBadge}>{totalItems} món</span>
            )}
          </div>
          <button
            type="button"
            className={ui.drawerCloseBtn}
            onClick={() => setIsCartOpen(false)}
            aria-label="Đóng giỏ hàng"
          >
            ✕
          </button>
        </div>

        <div className={ui.drawerBody}>
          {/* Banner đơn hàng PENDING đã tạo (Chống gửi đơn lặp - Section D) */}
          {pendingOrder && (
            <div className={ui.pendingOrderBanner} role="status">
              <div className={ui.pendingOrderHeader}>
                <span className={ui.pendingBadge}>ĐƠN CHỜ THANH TOÁN</span>
                <strong>Mã đơn hàng: #{pendingOrder.id}</strong>
              </div>
              <p>
                Trạng thái: <strong>{pendingOrder.status}</strong> (Chờ thanh toán). Giỏ hàng được giữ nguyên để tiến hành thanh toán (UC-10).
              </p>
              <div className={ui.pendingOrderActions}>
                <button
                  type="button"
                  className={ui.payNowBtn}
                  onClick={() => {
                    setPaymentError("");
                    setIsPaymentOpen(true);
                  }}
                >
                  💳 Tiếp tục thanh toán đơn #{pendingOrder.id}
                </button>
                <button
                  type="button"
                  className={ui.newOrderBtn}
                  onClick={() => {
                    setPendingOrder(null);
                    setOrderMessage("");
                    setOrderError("");
                    setShowCheckout(true);
                  }}
                >
                  + Tạo đơn hàng mới
                </button>
              </div>
            </div>
          )}

          {/* Thông báo thành công */}
          {orderMessage && (
            <div style={styles.successMessage} role="status">
              <strong>✓ Đặt hàng thành công!</strong>
              <p>{orderMessage}</p>
            </div>
          )}

          {/* Thông báo lỗi */}
          {orderError && !showCheckout && (
            <p style={styles.error} role="alert">
              {orderError}
            </p>
          )}

          {cartItems.length === 0 ? (
            <div className={ui.drawerEmptyNotice}>
              <span style={{ fontSize: "32px" }}>☕</span>
              <p>Giỏ hàng đang trống. Hãy chọn đồ uống nhé!</p>
            </div>
          ) : (
            <>
              {/* Danh sách CartItem chi tiết */}
              <div>
                {cartItems.map((item) => (
                  <div key={item.key} className={ui.cartItemCard}>
                    <div className={ui.cartItemDetails}>
                      <div className={ui.cartItemNameRow}>
                        <span className={ui.cartItemName}>{item.productName}</span>
                        <span className={ui.sizeBadge}>
                          {item.size === "SMALL"
                            ? "Size S"
                            : item.size === "MEDIUM"
                            ? "Size M"
                            : "Size L"}
                        </span>
                      </div>

                      {item.toppings.length > 0 && (
                        <div className={ui.cartItemToppings}>
                          {item.toppings.map((top) => (
                            <span key={top} className={ui.cartToppingPill}>
                              +{top}
                            </span>
                          ))}
                        </div>
                      )}

                      {item.note && (
                        <p className={ui.cartItemNote}>
                          Ghi chú: {item.note}
                        </p>
                      )}

                      <p className={ui.cartItemUnitPrice}>
                        {formatPrice(item.unitPrice)} / ly
                      </p>
                    </div>

                    <div className={ui.cartActionsCol}>
                      <div className={ui.qtyControl}>
                        <button
                          type="button"
                          className={ui.qtyBtn}
                          onClick={() => updateCartItemQuantity(item.key, -1)}
                          aria-label={`Giảm số lượng ${item.productName}`}
                        >
                          -
                        </button>
                        <span className={ui.qtyValue}>{item.quantity}</span>
                        <button
                          type="button"
                          className={ui.qtyBtn}
                          onClick={() => updateCartItemQuantity(item.key, 1)}
                          aria-label={`Tăng số lượng ${item.productName}`}
                        >
                          +
                        </button>
                      </div>

                      <strong>{formatPrice(item.subtotal)}</strong>

                      <button
                        type="button"
                        className={ui.deleteItemBtn}
                        onClick={() => removeCartItem(item.key)}
                        aria-label={`Xóa ${item.productName} khỏi giỏ`}
                        title="Xóa món"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Tổng tiền */}
              <div style={styles.total}>
                <span>Tổng cộng ({totalItems} món):</span>
                <strong>{formatPrice(totalPrice)}</strong>
              </div>

              {/* Nút tiếp tục đặt hàng */}
              <button
                type="button"
                disabled={submittingOrder}
                onClick={() => {
                  if (pendingOrder) {
                    setOrderError(
                      `Đơn hàng #${pendingOrder.id} đã được tạo và đang chờ thanh toán. Vui lòng thanh toán đơn hiện tại hoặc nhấn "Tạo đơn hàng mới" để đặt đơn khác.`
                    );
                    return;
                  }
                  setOrderError("");
                  setOrderMessage("");

                  // Nếu chưa đăng nhập, kích hoạt Auth Modal và tiếp tục checkout sau khi đăng nhập
                  if (!user || !authToken) {
                    openAuthModal("login", true);
                    return;
                  }

                  setShowCheckout(true);
                }}
                style={styles.orderButton}
              >
                Tiếp tục đặt hàng
              </button>

              {/* Form thông tin khách hàng */}
              {showCheckout && (
                <div style={styles.checkoutSection}>
                  <h3 style={styles.checkoutTitle}>Thông tin đặt hàng</h3>

                  <form onSubmit={handlePlaceOrder}>
                    <div style={styles.formGroup}>
                      <label htmlFor="customerName">Tên khách hàng *</label>
                      <input
                        id="customerName"
                        type="text"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Nhập họ và tên"
                        required
                        maxLength={100}
                        style={styles.checkoutInput}
                      />
                    </div>

                    <div style={styles.formGroup}>
                      <label htmlFor="customerPhone">Số điện thoại *</label>
                      <input
                        id="customerPhone"
                        type="tel"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="Nhập số điện thoại"
                        required
                        maxLength={20}
                        style={styles.checkoutInput}
                      />
                    </div>

                    <div style={styles.formGroup}>
                      <label htmlFor="orderNote">Ghi chú đơn hàng</label>
                      <textarea
                        id="orderNote"
                        value={orderNote}
                        onChange={(e) => setOrderNote(e.target.value)}
                        placeholder="Ví dụ: Giao trước 10h, gọi trước khi đến..."
                        rows={3}
                        style={styles.checkoutInput}
                      />
                    </div>

                    {/* Tổng thanh toán */}
                    <div style={styles.checkoutTotal}>
                      <span>Tổng thanh toán:</span>
                      <strong>{formatPrice(totalPrice)}</strong>
                    </div>

                    {/* Lỗi khi đặt hàng */}
                    {orderError && (
                      <p style={styles.error} role="alert">
                        {orderError}
                      </p>
                    )}

                    {/* Nút xác nhận */}
                    <div style={styles.checkoutActions}>
                      <button
                        type="submit"
                        disabled={submittingOrder}
                        style={{
                          ...styles.confirmButton,
                          opacity: submittingOrder ? 0.6 : 1,
                          cursor: submittingOrder ? "not-allowed" : "pointer",
                        }}
                      >
                        {submittingOrder ? "Đang xử lý..." : "✓ Xác nhận đặt hàng"}
                      </button>

                      <button
                        type="button"
                        disabled={submittingOrder}
                        onClick={() => {
                          setShowCheckout(false);
                          setOrderError("");
                        }}
                        style={styles.cancelButton}
                      >
                        Hủy
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Nút xóa giỏ hàng */}
              <button
                type="button"
                disabled={submittingOrder}
                onClick={clearCart}
                style={styles.clearButton}
              >
                Xóa giỏ hàng
              </button>
            </>
          )}
        </div>
      </section>

      {/* ================= MODAL TÙY CHỈNH & CHI TIẾT SẢN PHẨM (TASK 4.3 + TASK 5.1.1) ================= */}
      {isOpen && selectedProduct && (
        <div
          className={ui.modalOverlay}
          role="presentation"
          onClick={() => modalController.closeProductDetail()}
        >
          <div
            ref={modalRef}
            tabIndex={-1}
            className={ui.modalCard}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-product-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className={ui.modalCloseButton}
              onClick={() => modalController.closeProductDetail()}
              aria-label="Đóng chi tiết sản phẩm"
            >
              ✕
            </button>

            <div className={ui.modalPhotoWrapper}>
              <div className={ui.photoFallback} aria-hidden="true">
                {getCategory(selectedProduct) === "Trà trái cây" ? "🧋" : "☕"}
              </div>
              <img
                src={selectedProduct.imageUrl || getFallbackImage(selectedProduct)}
                alt={selectedProduct.name}
                className={ui.modalPhoto}
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                }}
              />
              <span className={ui.modalCategoryBadge}>
                {getCategory(selectedProduct)}
              </span>
            </div>

            <div className={ui.modalBody}>
              <div className={ui.modalMetaRow}>
                <span className={ui.modalProductId}>
                  Mã món: #{selectedProduct.id}
                </span>
                <span
                  className={
                    selectedProduct.isAvailable
                      ? ui.modalStatusAvailable
                      : ui.modalStatusUnavailable
                  }
                >
                  {selectedProduct.isAvailable
                    ? "● Còn hàng phục vụ"
                    : "● Tạm hết hàng"}
                </span>
              </div>

              <h2 id="modal-product-title" className={ui.modalTitle}>
                {selectedProduct.name}
              </h2>

              <p className={ui.modalDescription}>
                {selectedProduct.description || "Pha chế tỉ mỉ mỗi ngày tại quầy BrewLite."}
              </p>

              {loadingDetail && (
                <p className={ui.modalSyncNotice}>
                  Đang đồng bộ dữ liệu mới nhất từ quầy...
                </p>
              )}

              {detailError && (
                <div className={ui.modalErrorNotice} role="alert">
                  <span>⚠️ Không thể cập nhật chi tiết mới nhất ({detailError})</span>
                  <button
                    type="button"
                    className={ui.modalRetryButton}
                    onClick={() => void modalController.openProductDetail(selectedProduct)}
                  >
                    Thử lại
                  </button>
                </div>
              )}

              {/* 1. TÙY CHỌN SIZE (FR-02) */}
              <div className={ui.customSection}>
                <span className={ui.customTitle} id="size-label">
                  CHỌN KÍCH CỠ (SIZE)
                </span>
                <div
                  className={ui.sizeGrid}
                  role="radiogroup"
                  aria-labelledby="size-label"
                >
                  {AVAILABLE_SIZES.map((sizeOpt) => {
                    const isSelected = selectedSize === sizeOpt.id;
                    return (
                      <button
                        key={sizeOpt.id}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        className={`${ui.sizeOption} ${
                          isSelected ? ui.sizeOptionActive : ""
                        }`}
                        onClick={() =>
                          setSelectedSize(
                            sizeOpt.id as "SMALL" | "MEDIUM" | "LARGE"
                          )
                        }
                      >
                        <span className={ui.sizeName}>{sizeOpt.name}</span>
                        <span className={ui.sizePriceTag}>
                          {sizeOpt.surcharge > 0
                            ? `+${formatPrice(sizeOpt.surcharge)}`
                            : "+0 đ"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. TÙY CHỌN TOPPING (FR-02) */}
              <div className={ui.customSection}>
                <span className={ui.customTitle} id="topping-label">
                  TOPPING THÊM
                </span>
                <div
                  className={ui.toppingList}
                  role="group"
                  aria-labelledby="topping-label"
                >
                  {AVAILABLE_TOPPINGS.map((topping) => {
                    const isChecked = selectedToppings.includes(topping.name);
                    return (
                      <label
                        key={topping.name}
                        className={`${ui.toppingOption} ${
                          isChecked ? ui.toppingOptionActive : ""
                        }`}
                      >
                        <span className={ui.toppingLabel}>
                          <input
                            type="checkbox"
                            className={ui.toppingCheckbox}
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedToppings((prev) => [
                                  ...prev,
                                  topping.name,
                                ]);
                              } else {
                                setSelectedToppings((prev) =>
                                  prev.filter((t) => t !== topping.name)
                                );
                              }
                            }}
                          />
                          {topping.name}
                        </span>
                        <span className={ui.toppingSurcharge}>
                          +{formatPrice(topping.price)}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* 3. TÙY CHỌN MỨC ĐÁ (QUICK SELECTOR) */}
              <div className={ui.customSection}>
                <span className={ui.customTitle} id="ice-label">
                  MỨC ĐÁ
                </span>
                <div
                  className={ui.selectorGrid}
                  role="radiogroup"
                  aria-labelledby="ice-label"
                >
                  {AVAILABLE_ICE_LEVELS.map((iceOpt) => {
                    const isSelected = selectedIce === iceOpt;
                    return (
                      <button
                        key={iceOpt}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        className={`${ui.selectorOption} ${
                          isSelected ? ui.selectorOptionActive : ""
                        }`}
                        onClick={() => setSelectedIce(iceOpt)}
                      >
                        {iceOpt}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 4. TÙY CHỌN MỨC ĐƯỜNG (QUICK SELECTOR) */}
              <div className={ui.customSection}>
                <span className={ui.customTitle} id="sugar-label">
                  MỨC ĐƯỜNG
                </span>
                <div
                  className={ui.selectorGrid}
                  role="radiogroup"
                  aria-labelledby="sugar-label"
                >
                  {AVAILABLE_SUGAR_LEVELS.map((sugarOpt) => {
                    const isSelected = selectedSugar === sugarOpt;
                    return (
                      <button
                        key={sugarOpt}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        className={`${ui.selectorOption} ${
                          isSelected ? ui.selectorOptionActive : ""
                        }`}
                        onClick={() => setSelectedSugar(sugarOpt)}
                      >
                        {sugarOpt}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 5. GHI CHÚ BỔ SUNG (FR-02) */}
              <div className={ui.customSection}>
                <label className={ui.customTitle} htmlFor="modal-item-note">
                  GHI CHÚ BỔ SUNG
                </label>
                <input
                  id="modal-item-note"
                  type="text"
                  className={ui.itemNoteInput}
                  value={customNote}
                  onChange={(e) => setCustomNote(e.target.value)}
                  placeholder="Ví dụ: Mang đi, ít sữa, giao tận bàn..."
                  maxLength={150}
                />
              </div>

              {/* 6. ĐIỀU CHỈNH SỐ LƯỢNG */}
              <div className={ui.modalQtyRow}>
                <span className={ui.customTitle}>SỐ LƯỢNG</span>
                <div className={ui.qtyControl}>
                  <button
                    type="button"
                    className={ui.qtyBtn}
                    onClick={() =>
                      setItemQuantity((q) => Math.max(1, q - 1))
                    }
                    disabled={itemQuantity <= 1}
                    aria-label="Giảm số lượng"
                  >
                    -
                  </button>
                  <span className={ui.qtyValue}>{itemQuantity}</span>
                  <button
                    type="button"
                    className={ui.qtyBtn}
                    onClick={() => setItemQuantity((q) => q + 1)}
                    aria-label="Tăng số lượng"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* ĐƠN GIÁ & NÚT THÊM VÀO GIỎ */}
              <div className={ui.modalPriceRow}>
                <div>
                  <span className={ui.modalPriceLabel}>Đơn giá niêm yết</span>
                  <strong className={ui.modalPrice}>
                    {formatPrice(selectedProduct.price)}
                  </strong>
                </div>
                <div className={ui.modalActions}>
                  <button
                    type="button"
                    className={ui.modalAddButton}
                    disabled={!selectedProduct.isAvailable}
                    onClick={() => {
                      const finalNote = combineItemNote(
                        selectedIce,
                        selectedSugar,
                        customNote
                      );
                      addItemToCart(
                        selectedProduct,
                        selectedSize,
                        selectedToppings,
                        finalNote,
                        itemQuantity
                      );
                      modalController.closeProductDetail();
                    }}
                  >
                    {selectedProduct.isAvailable
                      ? `Thêm vào giỏ hàng • ${formatPrice(modalSubtotal)}`
                      : "Hết hàng"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL XÁC THỰC NGƯỜI DÙNG (TASK 5.1.2 & FIGMA SCREEN 04) ================= */}
      {isAuthOpen && (
        <div
          className={ui.authModalOverlay}
          role="presentation"
          onClick={closeAuthModal}
        >
          <div
            ref={authModalRef}
            tabIndex={-1}
            className={ui.authModalCard}
            role="dialog"
            aria-modal="true"
            aria-labelledby="auth-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className={ui.authModalHeader}>
              <button
                type="button"
                className={ui.authModalClose}
                onClick={closeAuthModal}
                aria-label="Đóng cửa sổ xác thực"
              >
                ✕
              </button>
              <h2 id="auth-modal-title" className={ui.authModalTitle}>
                Chào mừng đến BrewLite
              </h2>
              <p className={ui.authModalSubtitle}>
                {authMode === "login"
                  ? "Đăng nhập tài khoản để tiếp tục đặt hàng và tích lũy điểm thưởng"
                  : "Tạo tài khoản mới để trải nghiệm dịch vụ trọn vẹn tại BrewLite"}
              </p>
            </div>

            <div className={ui.authTabs} role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={authMode === "login"}
                className={`${ui.authTab} ${authMode === "login" ? ui.authTabActive : ""}`}
                onClick={() => {
                  setAuthMode("login");
                  setAuthError("");
                }}
              >
                Đăng nhập
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={authMode === "register"}
                className={`${ui.authTab} ${authMode === "register" ? ui.authTabActive : ""}`}
                onClick={() => {
                  setAuthMode("register");
                  setAuthError("");
                }}
              >
                Đăng ký
              </button>
            </div>

            <div className={ui.authBody}>
              <form onSubmit={handleAuthSubmit} className={ui.authForm}>
                {authError && (
                  <div role="alert" className={ui.authError}>
                    {authError}
                  </div>
                )}

                <div className={ui.authField}>
                  <label htmlFor="auth-email" className={ui.authLabel}>
                    Email *
                  </label>
                  <input
                    id="auth-email"
                    type="email"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    placeholder="name@brewlite.vn"
                    required
                    autoComplete="email"
                    className={ui.authInput}
                  />
                </div>

                <div className={ui.authField}>
                  <label htmlFor="auth-password" className={ui.authLabel}>
                    Mật khẩu *
                  </label>
                  <input
                    id="auth-password"
                    type="password"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    placeholder="Tối thiểu 6 ký tự"
                    required
                    minLength={6}
                    autoComplete={authMode === "login" ? "current-password" : "new-password"}
                    className={ui.authInput}
                  />
                </div>

                <button
                  type="submit"
                  disabled={authLoading}
                  className={ui.authSubmitBtn}
                >
                  {authLoading
                    ? "Đang xử lý..."
                    : authMode === "login"
                    ? "Đăng nhập"
                    : "Đăng ký tài khoản"}
                </button>
              </form>

              <div className={ui.authFooter}>
                {authMode === "login" ? (
                  <p>
                    Chưa có tài khoản?{" "}
                    <button
                      type="button"
                      className={ui.authSwitchBtn}
                      onClick={() => {
                        setAuthMode("register");
                        setAuthError("");
                      }}
                    >
                      Đăng ký ngay
                    </button>
                  </p>
                ) : (
                  <p>
                    Đã có tài khoản?{" "}
                    <button
                      type="button"
                      className={ui.authSwitchBtn}
                      onClick={() => {
                        setAuthMode("login");
                        setAuthError("");
                      }}
                    >
                      Đăng nhập ngay
                    </button>
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ================= MODAL THANH TOÁN KHÔNG TIỀN MẶT (TASK 5.1.3 & FIGMA SCREEN 05) ================= */}
      {isPaymentOpen && pendingOrder && (
        <div
          className={ui.authModalOverlay}
          role="presentation"
          onClick={() => setIsPaymentOpen(false)}
        >
          <div
            ref={paymentModalRef}
            tabIndex={-1}
            className={ui.authModalCard}
            role="dialog"
            aria-modal="true"
            aria-labelledby="checkout-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className={ui.authModalHeader}>
              <button
                type="button"
                className={ui.authModalClose}
                onClick={() => setIsPaymentOpen(false)}
                aria-label="Đóng cửa sổ thanh toán"
              >
                ✕
              </button>
              <h2 id="checkout-modal-title" className={ui.authModalTitle}>
                Thanh toán đơn #{pendingOrder.id}
              </h2>
              <p className={ui.authModalSubtitle}>
                Tổng thanh toán: <strong>{formatPrice(totalPrice)}</strong>
              </p>
            </div>

            <div className={ui.authBody}>
              {/* PHƯƠNG THỨC NHẬN HÀNG */}
              <h3 className={ui.checkoutSectionTitle}>1. Phương thức nhận hàng</h3>
              <div className={ui.segmentedControl} role="group" aria-label="Phương thức nhận hàng">
                <button
                  type="button"
                  className={`${ui.segmentedBtn} ${pickupMethod === "AT_COUNTER" ? ui.segmentedBtnActive : ""}`}
                  onClick={() => setPickupMethod("AT_COUNTER")}
                >
                  🏪 Lấy tại quầy
                </button>
                <button
                  type="button"
                  className={`${ui.segmentedBtn} ${pickupMethod === "AT_TABLE" ? ui.segmentedBtnActive : ""}`}
                  onClick={() => setPickupMethod("AT_TABLE")}
                >
                  🍽️ Giao tận bàn
                </button>
              </div>

              {pickupMethod === "AT_TABLE" && (
                <div className={ui.tableInputRow}>
                  <label htmlFor="table-number-input" className={ui.authLabel}>
                    Số bàn *
                  </label>
                  <input
                    id="table-number-input"
                    type="text"
                    value={tableNumber}
                    onChange={(e) => setTableNumber(e.target.value)}
                    placeholder="Ví dụ: Bàn số 4"
                    className={ui.tableInput}
                    required
                  />
                </div>
              )}

              {/* PHƯƠNG THỨC THANH TOÁN (3 PHƯƠNG THỨC FIGMA) */}
              <h3 className={ui.checkoutSectionTitle}>2. Chọn cổng thanh toán</h3>
              <div className={ui.paymentMethodsGrid} role="radiogroup" aria-label="Phương thức thanh toán">
                <div
                  role="radio"
                  aria-checked={selectedPaymentMethod === "MOMO"}
                  tabIndex={0}
                  className={`${ui.paymentMethodCard} ${selectedPaymentMethod === "MOMO" ? ui.paymentMethodCardActive : ""}`}
                  onClick={() => {
                    if (selectedPaymentMethod !== "MOMO") {
                      setSelectedPaymentMethod("MOMO");
                      setPaymentIdempotencyKey("");
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      if (selectedPaymentMethod !== "MOMO") {
                        setSelectedPaymentMethod("MOMO");
                        setPaymentIdempotencyKey("");
                      }
                    }
                  }}
                >
                  <span className={ui.paymentMethodIcon}>🟣</span>
                  <div className={ui.paymentMethodDetails}>
                    <span className={ui.paymentMethodName}>Ví điện tử MoMo / ZaloPay</span>
                    <span className={ui.paymentMethodSub}>Quét mã QR qua ứng dụng Ví</span>
                  </div>
                </div>

                <div
                  role="radio"
                  aria-checked={selectedPaymentMethod === "VIETQR"}
                  tabIndex={0}
                  className={`${ui.paymentMethodCard} ${selectedPaymentMethod === "VIETQR" ? ui.paymentMethodCardActive : ""}`}
                  onClick={() => {
                    if (selectedPaymentMethod !== "VIETQR") {
                      setSelectedPaymentMethod("VIETQR");
                      setPaymentIdempotencyKey("");
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      if (selectedPaymentMethod !== "VIETQR") {
                        setSelectedPaymentMethod("VIETQR");
                        setPaymentIdempotencyKey("");
                      }
                    }
                  }}
                >
                  <span className={ui.paymentMethodIcon}>🏦</span>
                  <div className={ui.paymentMethodDetails}>
                    <span className={ui.paymentMethodName}>Chuyển khoản VietQR / Napas247</span>
                    <span className={ui.paymentMethodSub}>Quét mã chuyển khoản ngân hàng 24/7</span>
                  </div>
                </div>

                <div
                  role="radio"
                  aria-checked={selectedPaymentMethod === "CARD"}
                  tabIndex={0}
                  className={`${ui.paymentMethodCard} ${selectedPaymentMethod === "CARD" ? ui.paymentMethodCardActive : ""}`}
                  onClick={() => {
                    if (selectedPaymentMethod !== "CARD") {
                      setSelectedPaymentMethod("CARD");
                      setPaymentIdempotencyKey("");
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      if (selectedPaymentMethod !== "CARD") {
                        setSelectedPaymentMethod("CARD");
                        setPaymentIdempotencyKey("");
                      }
                    }
                  }}
                >
                  <span className={ui.paymentMethodIcon}>💳</span>
                  <div className={ui.paymentMethodDetails}>
                    <span className={ui.paymentMethodName}>Thẻ quốc tế Visa / Mastercard</span>
                    <span className={ui.paymentMethodSub}>Thanh toán an toàn bảo mật PCI-DSS</span>
                  </div>
                </div>
              </div>

              {/* DEVELOPER TEST MODE SWITCH (FIGMA SCREEN 05) */}
              <div className={ui.testModeContainer}>
                <div className={ui.testModeHeader}>
                  <span className={ui.testModeLabel}>🛠️ Chế độ thử nghiệm</span>
                  <span className={ui.testModeBadge}>Dev Mode</span>
                </div>
                <div className={ui.testModeSwitches} role="group" aria-label="Chế độ thanh toán giả lập">
                  <button
                    type="button"
                    className={`${ui.testModeOption} ${testMode === "SUCCESS" ? ui.testModeOptionSuccess : ""}`}
                    onClick={() => setTestMode("SUCCESS")}
                  >
                    ✓ Thanh toán Thành công
                  </button>
                  <button
                    type="button"
                    className={`${ui.testModeOption} ${testMode === "FAILED" ? ui.testModeOptionFailed : ""}`}
                    onClick={() => setTestMode("FAILED")}
                  >
                    ✕ Giả lập Thất bại (EX-06)
                  </button>
                  <button
                    type="button"
                    className={`${ui.testModeOption} ${testMode === "PENDING" ? ui.testModeOptionFailed : ""}`}
                    onClick={() => setTestMode("PENDING")}
                  >
                    ⏱️ Chờ duyệt (EX-07)
                  </button>
                </div>
              </div>

              {paymentMessage && (
                <div
                  role="status"
                  className={ui.authSuccess}
                  style={{
                    marginTop: "12px",
                    background: "#fef3c7",
                    color: "#92400e",
                    border: "1px solid #fde68a",
                    fontSize: "0.875rem",
                    lineHeight: "1.4",
                    padding: "8px 12px",
                    borderRadius: "6px",
                  }}
                >
                  ⏳ {paymentMessage}
                </div>
              )}

              {paymentError && (
                <div role="alert" className={ui.authError} style={{ marginTop: "12px" }}>
                  {paymentError}
                </div>
              )}

              <button
                type="button"
                disabled={paying}
                onClick={handleProcessPayment}
                className={ui.paySubmitBtn}
              >
                {paying ? "Đang xử lý giao dịch..." : `💳 Xác nhận thanh toán • ${formatPrice(totalPrice)}`}
              </button>

              {paymentIdempotencyKey && pendingOrder?.status === "PENDING" && (
                <button
                  type="button"
                  disabled={paying}
                  onClick={handleReconcilePayment}
                  className={ui.paySubmitBtn}
                  style={{
                    marginTop: "8px",
                    background: "#f59e0b",
                    borderColor: "#d97706",
                  }}
                >
                  🔄 Đối soát / Kiểm tra kết quả
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL VÉ CHUÔNG ĐIỆN TỬ (TASK 5.1.3 & FIGMA SCREEN 06) ================= */}
      {isBuzzerOpen && buzzerTicket && (
        <div
          className={ui.buzzerOverlay}
          role="presentation"
          onClick={() => setIsBuzzerOpen(false)}
        >
          <div
            ref={buzzerModalRef}
            tabIndex={-1}
            className={ui.buzzerCard}
            role="dialog"
            aria-modal="true"
            aria-labelledby="buzzer-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className={ui.buzzerHeader}>
              <button
                type="button"
                className={ui.buzzerClose}
                onClick={() => setIsBuzzerOpen(false)}
                aria-label="Đóng vé chuông"
              >
                ✕
              </button>
              <div className={ui.buzzerBrand}>BrewLite Digital Buzzer</div>
              <h2 id="buzzer-modal-title" className={ui.buzzerCode}>
                {buzzerTicket.orderCode}
              </h2>
              <p className={ui.buzzerPickupInfo}>
                {buzzerTicket.pickupMethod === "AT_TABLE"
                  ? `🍽️ Giao tận bàn: ${buzzerTicket.tableNumber || "Chưa ghi số bàn"}`
                  : "🏪 Lấy nước tại quầy khi chuông báo rung"}
              </p>
            </div>

            {/* RĂNG CƯA PHÂN CÁCH VÉ RUNG (PERFORATION) */}
            <div className={ui.buzzerPerforation} aria-hidden="true">
              <span className={ui.perforationHoleLeft} />
              <span className={ui.perforationLine} />
              <span className={ui.perforationHoleRight} />
            </div>

            <div className={ui.buzzerBody}>
              {/* QR CODE MÃ HÓA */}
              <div className={ui.qrContainer}>
                <div className={ui.qrBox}>
                  <div className={ui.qrPlaceholder} aria-label="Mã QR nhận nước" />
                </div>
                <span className={ui.qrCaption}>
                  Mock QR Code • Đưa mã QR cho Barista khi đến lấy đồ uống
                </span>
              </div>

              {/* INTERACTIVE 4-STAGE TIMELINE */}
              <div className={ui.timeline} role="list" aria-label="Tiến trình đơn hàng">
                <div className={`${ui.timelineStep} ${ui.timelineActive}`} role="listitem">
                  <div className={ui.timelineNode}>✓</div>
                  <span className={ui.timelineLabel}>PAID<br />Đã trả</span>
                </div>
                <div className={ui.timelineStep} role="listitem">
                  <div className={ui.timelineNode}>2</div>
                  <span className={ui.timelineLabel}>PREP<br />Pha chế</span>
                </div>
                <div className={ui.timelineStep} role="listitem">
                  <div className={ui.timelineNode}>3</div>
                  <span className={ui.timelineLabel}>READ<br />Sẵn sàng</span>
                </div>
                <div className={ui.timelineStep} role="listitem">
                  <div className={ui.timelineNode}>4</div>
                  <span className={ui.timelineLabel}>COMP<br />Hoàn tất</span>
                </div>
              </div>

              <div className={ui.buzzerActions}>
                <button
                  type="button"
                  className={ui.buzzerNewOrderBtn}
                  onClick={() => {
                    setIsBuzzerOpen(false);
                    setBuzzerTicket(null);
                    setPendingOrder(null);
                    clearCart();
                  }}
                >
                  + Đặt đơn hàng mới
                </button>
                <button
                  type="button"
                  className={ui.buzzerDismissBtn}
                  onClick={() => setIsBuzzerOpen(false)}
                >
                  Đóng vé chuông
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

// ================= CSS GIAO DIỆN PHỤ TRỢ =================
const styles: Record<string, React.CSSProperties> = {
  cartSection: {
    backgroundColor: "white",
    padding: "25px",
    marginTop: "40px",
    borderRadius: "12px",
    boxShadow: "0 3px 10px rgba(0,0,0,0.06)",
  },

  total: {
    display: "flex",
    justifyContent: "space-between",
    marginTop: "25px",
    fontSize: "20px",
    color: "#4b2e20",
    gap: "10px",
    flexWrap: "wrap",
  },

  orderButton: {
    width: "100%",
    padding: "14px",
    marginTop: "20px",
    backgroundColor: "#4b2e20",
    color: "white",
    border: "none",
    borderRadius: "8px",
    fontWeight: "bold",
    cursor: "pointer",
  },

  clearButton: {
    width: "100%",
    padding: "10px",
    marginTop: "10px",
    backgroundColor: "#eee",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
  },

  checkoutSection: {
    backgroundColor: "#faf7f3",
    padding: "22px",
    marginTop: "20px",
    borderRadius: "10px",
    border: "1px solid #e8d6c4",
  },

  checkoutTitle: {
    color: "#4b2e20",
    marginTop: 0,
    marginBottom: "20px",
  },

  formGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    marginBottom: "16px",
  },

  checkoutInput: {
    display: "block",
    width: "100%",
    boxSizing: "border-box",
    padding: "12px",
    border: "1px solid #ddd",
    borderRadius: "7px",
    fontSize: "14px",
    fontFamily: "inherit",
  },

  checkoutTotal: {
    display: "flex",
    justifyContent: "space-between",
    marginTop: "20px",
    fontSize: "18px",
    color: "#4b2e20",
    gap: "10px",
  },

  checkoutActions: {
    display: "flex",
    gap: "10px",
    marginTop: "20px",
    flexWrap: "wrap",
  },

  confirmButton: {
    flex: 1,
    minWidth: "180px",
    padding: "14px",
    backgroundColor: "#4b2e20",
    color: "white",
    border: "none",
    borderRadius: "8px",
    fontWeight: "bold",
  },

  cancelButton: {
    flex: 1,
    minWidth: "100px",
    padding: "14px",
    backgroundColor: "#ddd",
    color: "#333",
    border: "none",
    borderRadius: "8px",
    fontWeight: "bold",
    cursor: "pointer",
  },

  successMessage: {
    backgroundColor: "#dcfce7",
    color: "#166534",
    padding: "15px",
    borderRadius: "8px",
    marginBottom: "15px",
  },

  error: {
    color: "#b91c1c",
  },
};
