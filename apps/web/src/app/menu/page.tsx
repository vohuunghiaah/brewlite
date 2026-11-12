
"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";

// ================= API BACKEND =================
const API_URL =
  "https://scaling-dollop-gxr9xjw7xg7gcvg5g-3001.app.github.dev";

// ================= KIỂU DỮ LIỆU =================
interface Product {
  id: number;
  name: string;
  description: string;
  price: number | string;
  imageUrl?: string | null;
  isAvailable: boolean;
}

interface OrderResponse {
  id?: number;
  customerName?: string;
  status?: string;
  message?: string;
}

// ================= COMPONENT MENU =================
export default function MenuPage() {
  // Danh sách sản phẩm
  const [products, setProducts] = useState<Product[]>([]);

  // Giỏ hàng: productId -> quantity
  const [cart, setCart] = useState<Record<number, number>>({});

  // Trạng thái tải dữ liệu
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Thông tin đặt hàng
  const [showCheckout, setShowCheckout] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [note, setNote] = useState("");

  // Trạng thái xử lý đơn hàng
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [orderMessage, setOrderMessage] = useState("");
  const [orderError, setOrderError] = useState("");

  // ================= LẤY DANH SÁCH SẢN PHẨM =================
  useEffect(() => {
    async function loadProducts() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(`${API_URL}/products`);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data: Product[] = await response.json();

        setProducts(data);
      } catch (err) {
        console.error("Lỗi tải sản phẩm:", err);

        setError(
          err instanceof Error
            ? err.message
            : "Không thể tải danh sách đồ uống"
        );
      } finally {
        setLoading(false);
      }
    }

    loadProducts();
  }, []);

  // ================= THÊM VÀO GIỎ HÀNG =================
  function addToCart(product: Product) {
    if (!product.isAvailable) return;

    setCart((previous) => ({
      ...previous,
      [product.id]: (previous[product.id] || 0) + 1,
    }));

    setOrderMessage("");
    setOrderError("");
  }

  // ================= THAY ĐỔI SỐ LƯỢNG =================
  function updateQuantity(id: number, amount: number) {
    setCart((previous) => {
      const next = { ...previous };

      const quantity = (next[id] || 0) + amount;

      if (quantity <= 0) {
        delete next[id];
      } else {
        next[id] = quantity;
      }

      return next;
    });

    setOrderMessage("");
    setOrderError("");
  }

  // ================= XÓA GIỎ HÀNG =================
  function clearCart() {
    setCart({});
    setShowCheckout(false);
    setOrderMessage("");
    setOrderError("");
  }

  // ================= TÍNH TỔNG SỐ LƯỢNG =================
  const totalItems = Object.values(cart).reduce(
    (sum, quantity) => sum + quantity,
    0
  );

  // ================= TÍNH TỔNG TIỀN =================
  const totalPrice = products.reduce((sum, product) => {
    return (
      sum +
      Number(product.price) * (cart[product.id] || 0)
    );
  }, 0);

  // ================= ĐỊNH DẠNG TIỀN =================
  function formatPrice(price: number | string) {
    return Number(price).toLocaleString("vi-VN") + " đ";
  }

  // ================= ĐẶT HÀNG =================
  async function handlePlaceOrder(
    e: FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    if (submittingOrder) return;

    setOrderError("");
    setOrderMessage("");

    // Kiểm tra thông tin khách hàng
    if (!customerName.trim()) {
      setOrderError("Vui lòng nhập tên khách hàng.");
      return;
    }

    if (!customerPhone.trim()) {
      setOrderError("Vui lòng nhập số điện thoại.");
      return;
    }

    // Lấy các sản phẩm đang có trong giỏ
    const selectedProducts = products.filter(
      (product) => cart[product.id] > 0
    );

    if (selectedProducts.length === 0) {
      setOrderError("Giỏ hàng đang trống.");
      return;
    }

    // Kiểm tra tình trạng sản phẩm
    const unavailableProduct = selectedProducts.find(
      (product) => !product.isAvailable
    );

    if (unavailableProduct) {
      setOrderError(
        `${unavailableProduct.name} hiện đã hết hàng.`
      );
      return;
    }

    // Tạo danh sách chi tiết đơn hàng
    const items = selectedProducts.map((product) => ({
      productId: product.id,
      quantity: cart[product.id],
    }));

    // Dữ liệu gửi đến NestJS
    const payload = {
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      note: note.trim(),
      items,
    };

    try {
      setSubmittingOrder(true);

      // Gọi API POST /orders
      const response = await fetch(`${API_URL}/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      // Đọc phản hồi từ Backend
      const responseText = await response.text();

      let data: OrderResponse = {};

      try {
        data = responseText
          ? JSON.parse(responseText)
          : {};
      } catch {
        data = {
          message: responseText,
        };
      }

      // Kiểm tra kết quả
      if (!response.ok) {
        const detail =
          data?.message || `HTTP Error: ${response.status}`;

        throw new Error(
          Array.isArray(detail)
            ? detail.join(", ")
            : detail
        );
      }

      // Thông báo đặt hàng thành công
      const orderId = data.id;

      setOrderMessage(
        `Đặt hàng thành công! ${
          orderId !== undefined
            ? `Mã đơn hàng: #${orderId}.`
            : ""
        } Trạng thái: ${data.status || "PENDING"}.`
      );

      // Xóa giỏ hàng sau khi đặt hàng thành công
      setCart({});

      // Đóng form đặt hàng
      setShowCheckout(false);

      // Xóa thông tin biểu mẫu
      setCustomerName("");
      setCustomerPhone("");
      setNote("");

    } catch (err) {
      console.error("Lỗi đặt hàng:", err);

      setOrderError(
        err instanceof Error
          ? err.message
          : "Không thể thực hiện đặt hàng."
      );
    } finally {
      setSubmittingOrder(false);
    }
  }

  // ================= GIAO DIỆN =================
  return (
    <main style={styles.main}>

      {/* ================= HEADER ================= */}
      <header style={styles.header}>
        <div>
          <h1 style={styles.logo}>BrewLite ☕</h1>

          <p style={styles.headerText}>
            Thưởng thức hương vị cà phê mỗi ngày
          </p>
        </div>

        <a href="/" style={styles.adminLink}>
          Quản lý sản phẩm
        </a>
      </header>

      {/* ================= BANNER ================= */}
      <section style={styles.banner}>
        <h2>Chào mừng đến với BrewLite!</h2>

        <p>
          Khám phá những thức uống thơm ngon và chọn
          món yêu thích của bạn.
        </p>
      </section>

      {/* ================= MENU ĐỒ UỐNG ================= */}
      <section style={styles.menuSection}>
        <h2>☕ Menu đồ uống</h2>

        {loading && (
          <p>Đang tải danh sách đồ uống...</p>
        )}

        {error && (
          <p style={styles.error}>
            Không thể tải sản phẩm: {error}
          </p>
        )}

        {!loading && !error && products.length === 0 && (
          <p>Hiện chưa có đồ uống nào.</p>
        )}

        <div style={styles.productGrid}>
          {products.map((product) => (
            <article
              key={product.id}
              style={styles.card}
            >

              {/* Hình ảnh sản phẩm */}
              {product.imageUrl ? (
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  style={styles.image}
                />
              ) : (
                <div style={styles.placeholder}>
                  ☕
                </div>
              )}

              <div style={styles.cardContent}>

                <h3>{product.name}</h3>

                <p style={styles.description}>
                  {product.description}
                </p>

                <p style={styles.price}>
                  {formatPrice(product.price)}
                </p>

                <p
                  style={{
                    color: product.isAvailable
                      ? "green"
                      : "red",
                  }}
                >
                  {product.isAvailable
                    ? "Còn hàng"
                    : "Hết hàng"}
                </p>

                {/* Thêm sản phẩm */}
                <button
                  disabled={!product.isAvailable}
                  onClick={() => addToCart(product)}
                  style={{
                    ...styles.addButton,
                    opacity: product.isAvailable ? 1 : 0.5,
                    cursor: product.isAvailable
                      ? "pointer"
                      : "not-allowed",
                  }}
                >
                  + Thêm vào giỏ
                </button>

              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ================= GIỎ HÀNG ================= */}
      <section style={styles.cartSection}>

        <h2>🛒 Giỏ hàng của bạn</h2>

        {/* Thông báo thành công */}
        {orderMessage && (
          <div style={styles.successMessage}>
            <strong>✓ Đặt hàng thành công!</strong>
            <p>{orderMessage}</p>
          </div>
        )}

        {/* Thông báo lỗi */}
        {orderError && !showCheckout && (
          <p style={styles.error}>
            {orderError}
          </p>
        )}

        {totalItems === 0 ? (
          <p>
            Giỏ hàng đang trống. Hãy chọn đồ uống nhé!
          </p>
        ) : (
          <>

            {/* Danh sách sản phẩm trong giỏ */}
            {products
              .filter((product) => cart[product.id] > 0)
              .map((product) => (
                <div
                  key={product.id}
                  style={styles.cartItem}
                >

                  <div style={{ flex: 1 }}>
                    <strong>{product.name}</strong>

                    <p style={styles.cartPrice}>
                      {formatPrice(product.price)}
                    </p>
                  </div>

                  {/* Điều chỉnh số lượng */}
                  <div style={styles.quantity}>

                    <button
                      type="button"
                      onClick={() =>
                        updateQuantity(product.id, -1)
                      }
                      style={styles.quantityButton}
                    >
                      -
                    </button>

                    <strong>{cart[product.id]}</strong>

                    <button
                      type="button"
                      onClick={() =>
                        updateQuantity(product.id, 1)
                      }
                      disabled={!product.isAvailable}
                      style={styles.quantityButton}
                    >
                      +
                    </button>

                  </div>

                  {/* Thành tiền sản phẩm */}
                  <strong>
                    {formatPrice(
                      Number(product.price) *
                      cart[product.id]
                    )}
                  </strong>

                </div>
              ))}

            {/* Tổng tiền */}
            <div style={styles.total}>
              <span>
                Tổng cộng ({totalItems} sản phẩm):
              </span>

              <strong>
                {formatPrice(totalPrice)}
              </strong>
            </div>

            {/* Nút tiếp tục đặt hàng */}
            <button
              type="button"
              disabled={submittingOrder}
              onClick={() => {
                setOrderError("");
                setOrderMessage("");
                setShowCheckout(true);
              }}
              style={styles.orderButton}
            >
              Tiếp tục đặt hàng
            </button>

            {/* Form thông tin khách hàng */}
            {showCheckout && (
              <div style={styles.checkoutSection}>

                <h3 style={styles.checkoutTitle}>
                  Thông tin đặt hàng
                </h3>

                <form onSubmit={handlePlaceOrder}>

                  <div style={styles.formGroup}>

                    <label htmlFor="customerName">
                      Tên khách hàng *
                    </label>

                    <input
                      id="customerName"
                      type="text"
                      value={customerName}
                      onChange={(e) =>
                        setCustomerName(e.target.value)
                      }
                      placeholder="Nhập họ và tên"
                      required
                      maxLength={100}
                      style={styles.checkoutInput}
                    />

                  </div>

                  <div style={styles.formGroup}>

                    <label htmlFor="customerPhone">
                      Số điện thoại *
                    </label>

                    <input
                      id="customerPhone"
                      type="tel"
                      value={customerPhone}
                      onChange={(e) =>
                        setCustomerPhone(e.target.value)
                      }
                      placeholder="Nhập số điện thoại"
                      required
                      maxLength={20}
                      style={styles.checkoutInput}
                    />

                  </div>

                  <div style={styles.formGroup}>

                    <label htmlFor="note">
                      Ghi chú
                    </label>

                    <textarea
                      id="note"
                      value={note}
                      onChange={(e) =>
                        setNote(e.target.value)
                      }
                      placeholder="Ví dụ: Ít đường, ít đá..."
                      rows={3}
                      style={styles.checkoutInput}
                    />

                  </div>

                  {/* Tổng thanh toán */}
                  <div style={styles.checkoutTotal}>
                    <span>Tổng thanh toán:</span>

                    <strong>
                      {formatPrice(totalPrice)}
                    </strong>
                  </div>

                  {/* Lỗi khi đặt hàng */}
                  {orderError && (
                    <p style={styles.error}>
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
                        cursor: submittingOrder
                          ? "not-allowed"
                          : "pointer",
                      }}
                    >
                      {submittingOrder
                        ? "Đang xử lý..."
                        : "✓ Xác nhận đặt hàng"}
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

      </section>

      {/* ================= FOOTER ================= */}
      <footer style={styles.footer}>
        BrewLite © 2026 - Coffee & Drinks
      </footer>

    </main>
  );
}

// ================= CSS GIAO DIỆN =================
const styles: Record<string, React.CSSProperties> = {

  // Trang chính
  main: {
    minHeight: "100vh",
    padding: "30px",
    backgroundColor: "#f7f4f0",
    fontFamily: "Arial, sans-serif",
    color: "#333",
  },

  // Header
  header: {
    backgroundColor: "#4b2e20",
    color: "white",
    padding: "25px 35px",
    borderRadius: "12px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "15px",
  },

  logo: {
    fontSize: "30px",
    margin: 0,
  },

  headerText: {
    marginBottom: 0,
  },

  adminLink: {
    color: "white",
    textDecoration: "none",
    border: "1px solid white",
    padding: "10px 15px",
    borderRadius: "7px",
  },

  // Banner
  banner: {
    margin: "30px 0",
    padding: "35px",
    backgroundColor: "#e8d6c4",
    borderRadius: "12px",
    color: "#4b2e20",
  },

  // Menu
  menuSection: {
    marginTop: "35px",
  },

  productGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fill, minmax(230px, 1fr))",
    gap: "22px",
  },

  card: {
    backgroundColor: "white",
    borderRadius: "12px",
    overflow: "hidden",
    boxShadow: "0 3px 10px rgba(0,0,0,0.08)",
  },

  image: {
    width: "100%",
    height: "180px",
    objectFit: "cover",
  },

  placeholder: {
    height: "180px",
    backgroundColor: "#e8d6c4",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "55px",
  },

  cardContent: {
    padding: "18px",
  },

  description: {
    color: "#777",
    minHeight: "35px",
  },

  price: {
    color: "#a0522d",
    fontSize: "20px",
    fontWeight: "bold",
  },

  addButton: {
    width: "100%",
    padding: "12px",
    backgroundColor: "#6f432d",
    color: "white",
    border: "none",
    borderRadius: "7px",
    fontWeight: "bold",
  },

  // Giỏ hàng
  cartSection: {
    backgroundColor: "white",
    padding: "25px",
    marginTop: "40px",
    borderRadius: "12px",
    boxShadow: "0 3px 10px rgba(0,0,0,0.06)",
  },

  cartItem: {
    display: "flex",
    alignItems: "center",
    gap: "15px",
    padding: "15px 0",
    borderBottom: "1px solid #eee",
    flexWrap: "wrap",
  },

  cartPrice: {
    color: "#888",
    margin: "5px 0",
  },

  quantity: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },

  quantityButton: {
    width: "30px",
    height: "30px",
    border: "none",
    borderRadius: "5px",
    backgroundColor: "#e8d6c4",
    cursor: "pointer",
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

  // Form đặt hàng
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
    fontFamily: "Arial, sans-serif",
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

  // Thông báo
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

  // Footer
  footer: {
    textAlign: "center",
    marginTop: "50px",
    color: "#888",
  },
};
