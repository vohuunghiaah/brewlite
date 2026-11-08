
"use client";

import { useEffect, useState } from "react";

// Cấu hình địa chỉ Backend NestJS
const API_URL =
  "https://scaling-dollop-gxr9xjw7xg7gcvg5g-3001.app.github.dev";

// Định nghĩa cấu trúc sản phẩm
interface Product {
  id: number;
  name: string;
  description: string;
  price: number | string;
  imageUrl?: string;
  isAvailable: boolean;
}

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [status, setStatus] = useState("Đang kết nối...");
  const [loading, setLoading] = useState(true);

  // Lấy danh sách sản phẩm từ Backend
  useEffect(() => {
    fetch(`${API_URL}/products`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP Error: ${response.status}`);
        }

        return response.json();
      })
      .then((data: Product[]) => {
        setProducts(data);
        setStatus("Đã kết nối Backend");
      })
      .catch((error) => {
        console.error("Lỗi kết nối:", error);
        setStatus("Không thể kết nối Backend: " + error.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  // Định dạng giá tiền
  const formatPrice = (price: number | string) => {
    return Number(price).toLocaleString("vi-VN") + " đ";
  };

  return (
    <main style={{
      minHeight: "100vh",
      padding: "40px",
      fontFamily: "Arial",
      backgroundColor: "#f5f5f5",
      color: "#333"
    }}>

      <header style={{
        backgroundColor: "#4b2e20",
        color: "white",
        padding: "25px",
        borderRadius: "12px",
        marginBottom: "30px"
      }}>
        <h1>BrewLite</h1>
        <h2>Hệ thống đặt đồ uống</h2>

        <p>
          Trạng thái Backend: {status}
        </p>
      </header>

      <section>
        <h2>Danh sách đồ uống</h2>

        {loading && <p>Đang tải sản phẩm...</p>}

        {!loading && products.length === 0 && (
          <p>Hiện chưa có sản phẩm nào.</p>
        )}

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
          gap: "20px"
        }}>

          {products.map((product) => (
            <div
              key={product.id}
              style={{
                backgroundColor: "white",
                padding: "20px",
                borderRadius: "12px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
              }}
            >

              {product.imageUrl && (
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  style={{
                    width: "100%",
                    height: "180px",
                    objectFit: "cover",
                    borderRadius: "8px"
                  }}
                />
              )}

              <h3>{product.name}</h3>

              <p>{product.description}</p>

              <h3 style={{ color: "#a0522d" }}>
                {formatPrice(product.price)}
              </h3>

              <p style={{
                color: product.isAvailable ? "green" : "red"
              }}>
                {product.isAvailable
                  ? "Còn hàng"
                  : "Hết hàng"}
              </p>

            </div>
          ))}

        </div>
      </section>

    </main>
  );
}
