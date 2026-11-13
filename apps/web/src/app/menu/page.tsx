
"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
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

interface OrderResponse {
  id?: number;
  customerName?: string;
  status?: string;
  message?: string;
}

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

function getCategory(product: Product): string {
  const details = `${product.name} ${product.description}`.toLocaleLowerCase();

  if (/trà|tea|đào|cam/.test(details)) return "Trà trái cây";
  if (/cold brew|espresso|americano/.test(details)) {
    return "Cold Brew & Espresso";
  }
  if (/cà phê|latte|cappuccino/.test(details)) {
    return "Cà phê truyền thống";
  }
  if (/bánh|cake/.test(details)) return "Bánh ngọt";
  return "Khác";
}

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

  // Giỏ hàng: productId -> quantity
  const [cart, setCart] = useState<Record<number, number>>({});

  // Trạng thái tải dữ liệu
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Tất cả");
  const [favorites, setFavorites] = useState<Record<number, boolean>>({});

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
  const loadProducts = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  const filteredProducts = products.filter((product) => {
    const searchText = `${product.name} ${product.description}`.toLocaleLowerCase();
    const matchesSearch = searchText.includes(search.trim().toLocaleLowerCase());
    const matchesCategory =
      selectedCategory === "Tất cả" ||
      getCategory(product) === selectedCategory;

    return matchesSearch && matchesCategory;
  });

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
            <a href="#cart">Giỏ hàng</a>
          </nav>

          <button
            type="button"
            className={ui.cartSummary}
            onClick={() =>
              document.getElementById("cart")?.scrollIntoView({
                behavior: "smooth",
              })
            }
            aria-label={`Giỏ hàng: ${totalItems} món, ${formatPrice(totalPrice)}`}
          >
            <span aria-hidden="true">🛒</span>
            <span className={ui.cartCount}>{totalItems}</span>
            <span className={ui.cartDivider} />
            <span>{formatPrice(totalPrice)}</span>
          </button>
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
                onClick={() => void loadProducts()}
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
                  <div className={ui.productPhoto}>
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
                      onClick={() =>
                        setFavorites((previous) => ({
                          ...previous,
                          [product.id]: !previous[product.id],
                        }))
                      }
                    >
                      ★ <span>Yêu thích</span>
                    </button>
                  </div>

                  <div className={ui.productContent}>
                    <div className={ui.productTitleRow}>
                      <h3>{product.name}</h3>
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
                      <button
                        type="button"
                        className={ui.addButton}
                        disabled={!product.isAvailable}
                        onClick={() => addToCart(product)}
                        aria-label={`Thêm ${product.name} vào giỏ`}
                      >
                        +
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

      {/* ================= GIỎ HÀNG ================= */}
      <section id="cart" className={ui.cartPanel} style={styles.cartSection}>

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
        <footer className={ui.footer}>
          <span className={ui.footerIcon} aria-hidden="true">☕</span>
          <p>BrewLite · Một ly ngon, một ngày vui.</p>
        </footer>
      </div>
    </main>
  );
}

// ================= CSS GIAO DIỆN =================
const styles: Record<string, React.CSSProperties> = {
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

};
