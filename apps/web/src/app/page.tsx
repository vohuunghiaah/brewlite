
"use client";

import { useEffect, useState, FormEvent } from "react";

// Địa chỉ Backend NestJS
const API_URL =
  "https://scaling-dollop-gxr9xjw7xg7gcvg5g-3001.app.github.dev";

// Cấu trúc sản phẩm
interface Product {
  id: number;
  name: string;
  description: string;
  price: number | string;
  imageUrl?: string;
  isAvailable: boolean;
}

// Dữ liệu biểu mẫu
interface ProductForm {
  name: string;
  description: string;
  price: string;
  imageUrl: string;
  isAvailable: boolean;
}

const initialForm: ProductForm = {
  name: "",
  description: "",
  price: "",
  imageUrl: "",
  isAvailable: true,
};

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [status, setStatus] = useState("Đang kết nối...");
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState<ProductForm>(initialForm);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Xử lý phản hồi từ Backend
  async function request(url: string, options?: RequestInit) {
    const response = await fetch(url, options);

    const text = await response.text();

    let data: any = null;

    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }

    if (!response.ok) {
      const detail =
        data?.message ||
        data?.error ||
        `HTTP Error: ${response.status}`;

      throw new Error(
        Array.isArray(detail) ? detail.join(", ") : detail
      );
    }

    return data;
  }

  // Lấy danh sách sản phẩm
  async function fetchProducts() {
    try {
      setLoading(true);

      const data = await request(`${API_URL}/products`);

      if (!Array.isArray(data)) {
        throw new Error("Dữ liệu sản phẩm không hợp lệ");
      }

      setProducts(data);
      setStatus("Đã kết nối Backend");
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Lỗi không xác định";

      setStatus("Không thể kết nối Backend: " + errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchProducts();
  }, []);

  // Định dạng tiền
  const formatPrice = (price: number | string) => {
    return Number(price).toLocaleString("vi-VN") + " đ";
  };

  // Mở biểu mẫu thêm mới
  function handleAdd() {
    setEditingId(null);
    setForm(initialForm);
    setMessage("");
    setError("");
    setShowForm(true);
  }

  // Mở biểu mẫu chỉnh sửa
  function handleEdit(product: Product) {
    setEditingId(product.id);

    setForm({
      name: product.name,
      description: product.description || "",
      price: String(product.price),
      imageUrl: product.imageUrl || "",
      isAvailable: product.isAvailable,
    });

    setMessage("");
    setError("");
    setShowForm(true);
  }

  // Đóng biểu mẫu
  function handleCancel() {
    setShowForm(false);
    setEditingId(null);
    setForm(initialForm);
  }

  // Thêm hoặc cập nhật sản phẩm
  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setError("");
    setMessage("");

    const price = Number(form.price);

    if (!form.name.trim()) {
      setError("Vui lòng nhập tên đồ uống");
      return;
    }

    if (!Number.isFinite(price) || price <= 0) {
      setError("Giá sản phẩm phải lớn hơn 0");
      return;
    }

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      // Backend DTO sử dụng @IsNumberString(), vì vậy gửi giá dạng chuỗi
      price: String(price),
      imageUrl: form.imageUrl.trim() || null,
      isAvailable: form.isAvailable,
    };

    try {
      setSaving(true);

      if (editingId !== null) {
        await request(`${API_URL}/products/${editingId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        setMessage("Cập nhật sản phẩm thành công!");
      } else {
        await request(`${API_URL}/products`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        setMessage("Thêm sản phẩm thành công!");
      }

      handleCancel();
      await fetchProducts();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Không thể lưu sản phẩm"
      );
    } finally {
      setSaving(false);
    }
  }

  // Xóa sản phẩm
  async function handleDelete(product: Product) {
    const confirmed = window.confirm(
      `Bạn có chắc chắn muốn xóa "${product.name}" không?`
    );

    if (!confirmed) return;

    setError("");
    setMessage("");

    try {
      setDeletingId(product.id);

      await request(`${API_URL}/products/${product.id}`, {
        method: "DELETE",
      });

      setMessage("Xóa sản phẩm thành công!");

      await fetchProducts();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Không thể xóa sản phẩm"
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <main style={styles.main}>

      {/* HEADER */}
      <header style={styles.header}>
        <div>
          <h1 style={styles.logo}>BrewLite ☕</h1>
          <h2 style={styles.subtitle}>
            Hệ thống quản lý và đặt đồ uống
          </h2>

          <p style={styles.status}>
            ● {status}
          </p>
        </div>
      </header>

      {/* THÔNG BÁO */}
      {message && (
        <div style={styles.success}>
          {message}
        </div>
      )}

      {error && (
        <div style={styles.error}>
          {error}
        </div>
      )}

      {/* QUẢN LÝ SẢN PHẨM */}
      <section style={styles.section}>

        <div style={styles.sectionHeader}>
          <div>
            <h2 style={styles.heading}>
              Danh sách đồ uống
            </h2>

            <p style={styles.subText}>
              Tổng số: {products.length} sản phẩm
            </p>
          </div>

          <button
            onClick={handleAdd}
            style={styles.addButton}
          >
            + Thêm đồ uống
          </button>
        </div>

        {/* BIỂU MẪU */}
        {showForm && (
          <div style={styles.formContainer}>

            <h3 style={styles.formTitle}>
              {editingId !== null
                ? "Chỉnh sửa đồ uống"
                : "Thêm đồ uống mới"}
            </h3>

            <form onSubmit={handleSubmit}>

              <div style={styles.formGrid}>

                <div style={styles.field}>
                  <label style={styles.label}>
                    Tên đồ uống *
                  </label>

                  <input
                    style={styles.input}
                    type="text"
                    placeholder="Ví dụ: Cà phê Latte"
                    value={form.name}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        name: e.target.value,
                      })
                    }
                    required
                  />
                </div>

                <div style={styles.field}>
                  <label style={styles.label}>
                    Giá bán (VNĐ) *
                  </label>

                  <input
                    style={styles.input}
                    type="number"
                    min="1"
                    placeholder="45000"
                    value={form.price}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        price: e.target.value,
                      })
                    }
                    required
                  />
                </div>

                <div style={styles.field}>
                  <label style={styles.label}>
                    Mô tả
                  </label>

                  <input
                    style={styles.input}
                    type="text"
                    placeholder="Mô tả đồ uống..."
                    value={form.description}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        description: e.target.value,
                      })
                    }
                  />
                </div>

                <div style={styles.field}>
                  <label style={styles.label}>
                    Đường dẫn hình ảnh
                  </label>

                  <input
                    style={styles.input}
                    type="url"
                    placeholder="https://example.com/image.jpg"
                    value={form.imageUrl}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        imageUrl: e.target.value,
                      })
                    }
                  />
                </div>

              </div>

              <label style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={form.isAvailable}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      isAvailable: e.target.checked,
                    })
                  }
                />
                Còn hàng
              </label>

              <div style={styles.formActions}>

                <button
                  type="submit"
                  disabled={saving}
                  style={styles.saveButton}
                >
                  {saving
                    ? "Đang lưu..."
                    : editingId !== null
                      ? "Lưu thay đổi"
                      : "Thêm sản phẩm"}
                </button>

                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={saving}
                  style={styles.cancelButton}
                >
                  Hủy
                </button>

              </div>

            </form>
          </div>
        )}

        {/* DANH SÁCH SẢN PHẨM */}
        {loading ? (
          <p style={styles.empty}>
            Đang tải sản phẩm...
          </p>
        ) : products.length === 0 ? (
          <div style={styles.emptyBox}>
            <p>☕ Hiện chưa có sản phẩm nào.</p>

            <button
              onClick={handleAdd}
              style={styles.addButton}
            >
              Thêm đồ uống đầu tiên
            </button>
          </div>
        ) : (

          <div style={styles.productGrid}>

            {products.map((product) => (

              <article
                key={product.id}
                style={styles.card}
              >

                {product.imageUrl ? (
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    style={styles.image}
                  />
                ) : (
                  <div style={styles.imagePlaceholder}>
                    ☕
                    <span>Chưa có hình ảnh</span>
                  </div>
                )}

                <div style={styles.cardContent}>

                  <h3 style={styles.productName}>
                    {product.name}
                  </h3>

                  <p style={styles.description}>
                    {product.description || "Chưa có mô tả"}
                  </p>

                  <p style={styles.price}>
                    {formatPrice(product.price)}
                  </p>

                  <p
                    style={{
                      ...styles.availability,
                      color: product.isAvailable
                        ? "#16803c"
                        : "#dc2626",
                    }}
                  >
                    {product.isAvailable
                      ? "● Còn hàng"
                      : "● Hết hàng"}
                  </p>

                  <div style={styles.cardActions}>

                    <button
                      onClick={() => handleEdit(product)}
                      style={styles.editButton}
                    >
                      ✎ Sửa
                    </button>

                    <button
                      onClick={() => handleDelete(product)}
                      disabled={deletingId === product.id}
                      style={styles.deleteButton}
                    >
                      {deletingId === product.id
                        ? "Đang xóa..."
                        : "✕ Xóa"}
                    </button>

                  </div>

                </div>

              </article>

            ))}

          </div>
        )}

      </section>

      <footer style={styles.footer}>
        BrewLite © 2026 - Hệ thống quản lý đồ uống
      </footer>

    </main>
  );
}

// CSS giao diện
const styles: Record<string, React.CSSProperties> = {

  main: {
    minHeight: "100vh",
    padding: "40px",
    fontFamily: "Arial, sans-serif",
    backgroundColor: "#f5f5f5",
    color: "#333",
  },

  header: {
    backgroundColor: "#4b2e20",
    color: "white",
    padding: "30px",
    borderRadius: "14px",
    marginBottom: "35px",
  },

  logo: {
    fontSize: "34px",
    margin: "0 0 8px",
  },

  subtitle: {
    fontSize: "21px",
    margin: "0 0 10px",
  },

  status: {
    fontSize: "14px",
    margin: 0,
  },

  section: {
    maxWidth: "1400px",
    margin: "0 auto",
  },

  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "15px",
    marginBottom: "20px",
  },

  heading: {
    fontSize: "25px",
    margin: 0,
  },

  subText: {
    color: "#777",
    marginTop: "7px",
  },

  addButton: {
    backgroundColor: "#6f432d",
    color: "white",
    padding: "12px 20px",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "bold",
  },

  formContainer: {
    backgroundColor: "white",
    padding: "25px",
    borderRadius: "12px",
    marginBottom: "25px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
  },

  formTitle: {
    marginTop: 0,
    color: "#4b2e20",
  },

  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: "18px",
  },

  field: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },

  label: {
    fontWeight: "bold",
    fontSize: "14px",
  },

  input: {
    padding: "12px",
    border: "1px solid #ddd",
    borderRadius: "7px",
    fontSize: "14px",
    width: "100%",
    boxSizing: "border-box",
  },

  checkboxLabel: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginTop: "20px",
  },

  formActions: {
    display: "flex",
    gap: "10px",
    marginTop: "22px",
  },

  saveButton: {
    backgroundColor: "#4b2e20",
    color: "white",
    border: "none",
    borderRadius: "7px",
    padding: "11px 20px",
    cursor: "pointer",
  },

  cancelButton: {
    backgroundColor: "#e5e5e5",
    color: "#333",
    border: "none",
    borderRadius: "7px",
    padding: "11px 20px",
    cursor: "pointer",
  },

  productGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
    gap: "22px",
  },

  card: {
    backgroundColor: "white",
    borderRadius: "13px",
    overflow: "hidden",
    boxShadow: "0 3px 10px rgba(0,0,0,0.08)",
  },

  image: {
    width: "100%",
    height: "190px",
    objectFit: "cover",
    display: "block",
  },

  imagePlaceholder: {
    height: "190px",
    backgroundColor: "#eee5dc",
    color: "#79543b",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "42px",
    gap: "8px",
  },

  cardContent: {
    padding: "18px",
  },

  productName: {
    margin: "0 0 10px",
    fontSize: "19px",
  },

  description: {
    color: "#777",
    minHeight: "35px",
    fontSize: "14px",
  },

  price: {
    color: "#a0522d",
    fontSize: "20px",
    fontWeight: "bold",
  },

  availability: {
    fontSize: "14px",
  },

  cardActions: {
    display: "flex",
    gap: "10px",
    marginTop: "15px",
  },

  editButton: {
    flex: 1,
    padding: "10px",
    backgroundColor: "#eee5dc",
    color: "#4b2e20",
    border: "none",
    borderRadius: "7px",
    cursor: "pointer",
  },

  deleteButton: {
    flex: 1,
    padding: "10px",
    backgroundColor: "#fee2e2",
    color: "#b91c1c",
    border: "none",
    borderRadius: "7px",
    cursor: "pointer",
  },

  success: {
    backgroundColor: "#dcfce7",
    color: "#166534",
    padding: "12px",
    borderRadius: "8px",
    marginBottom: "15px",
  },

  error: {
    backgroundColor: "#fee2e2",
    color: "#991b1b",
    padding: "12px",
    borderRadius: "8px",
    marginBottom: "15px",
  },

  empty: {
    textAlign: "center",
    padding: "40px",
  },

  emptyBox: {
    textAlign: "center",
    backgroundColor: "white",
    padding: "40px",
    borderRadius: "12px",
  },

  footer: {
    textAlign: "center",
    color: "#888",
    marginTop: "60px",
    padding: "20px",
  },
};
