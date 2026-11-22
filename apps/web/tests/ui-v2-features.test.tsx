import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import { Product, ProductCard, getStockBadgeInfo } from "../src/components/MenuScreen";
import ProductModal from "../src/components/ProductModal";
import HomeScreen from "../src/components/HomeScreen";
import CartDrawer from "../src/components/CartDrawer";
import { getCategory, filterProducts } from "../src/app/menu/menu-controller.mjs";

const DEMO_PRODUCTS: Product[] = [
  {
    id: 1,
    name: "Cà phê Latte",
    description: "Cà phê Espresso kết hợp sữa tươi",
    price: 45000,
    imageUrl: null,
    isAvailable: true,
    stock: 50,
  },
  {
    id: 2,
    name: "Trà đào",
    description: "Trà đào cam sả thanh mát",
    price: 35000,
    imageUrl: null,
    isAvailable: true,
    stock: 40,
  },
  {
    id: 3,
    name: "Cacao sữa",
    description: "Cacao nguyên chất kết hợp sữa",
    price: 40000,
    imageUrl: null,
    isAvailable: true,
    stock: 35,
  },
  {
    id: 4,
    name: "Nước suối",
    description: "Nước uống đóng chai",
    price: 10000,
    imageUrl: null,
    isAvailable: true,
    stock: 100,
  },
  {
    id: 5,
    name: "Cà phê đen đá",
    description: "Cà phê Robusta Đắk Lắk pha phin truyền thống đậm đà",
    price: 28000,
    imageUrl: null,
    isAvailable: true,
    stock: 45,
  },
  {
    id: 6,
    name: "Cà phê sữa đá",
    description: "Cà phê phin đậm vị kết hợp sữa đặc",
    price: 32000,
    imageUrl: null,
    isAvailable: true,
    stock: 50,
  },
  {
    id: 7,
    name: "Bạc xỉu",
    description: "Nhiều sữa ít cà phê, béo ngọt thanh nhẹ",
    price: 35000,
    imageUrl: null,
    isAvailable: true,
    stock: 30,
  },
  {
    id: 8,
    name: "Espresso",
    description: "Chiết xuất áp suất cao từ hạt Arabica Cầu Đất",
    price: 30000,
    imageUrl: null,
    isAvailable: true,
    stock: 40,
  },
  {
    id: 9,
    name: "Americano đá",
    description: "Espresso đậm đà pha loãng với nước tinh khiết",
    price: 35000,
    imageUrl: null,
    isAvailable: true,
    stock: 25,
  },
  {
    id: 10,
    name: "Cappuccino",
    description: "Tỉ lệ hoàn hảo giữa Espresso, sữa nóng và lớp bọt sữa",
    price: 48000,
    imageUrl: null,
    isAvailable: true,
    stock: 20,
  },
  {
    id: 11,
    name: "Caramel Macchiato",
    description: "Cà phê Espresso hòa quyện vani ngọt dịu và sốt caramel",
    price: 52000,
    imageUrl: null,
    isAvailable: true,
    stock: 15,
  },
  {
    id: 12,
    name: "Cold Brew cam",
    description: "Cà phê ủ lạnh 16 giờ kết hợp nước cam vàng mọng nước",
    price: 49000,
    imageUrl: null,
    isAvailable: true,
    stock: 8, // Low stock: 8
  },
  {
    id: 13,
    name: "Matcha Latte",
    description: "Bột trà xanh Uji Nhật Bản nguyên chất đánh bọt cùng sữa tươi",
    price: 45000,
    imageUrl: null,
    isAvailable: false,
    stock: 0, // Out of stock: 0
  },
  {
    id: 14,
    name: "Trà vải",
    description: "Trà lài thơm ngát kết hợp trái vải thiều ngọt lịm",
    price: 38000,
    imageUrl: null,
    isAvailable: true,
    stock: 20,
  },
  {
    id: 15,
    name: "Trà chanh mật ong",
    description: "Trà đen ủ ấm pha cùng chanh tươi và mật ong hoa rừng",
    price: 32000,
    imageUrl: null,
    isAvailable: false,
    stock: 0, // Out of stock: 0
  },
];

describe("UI-01: Product Stock Badges and Availability Logic", () => {
  it("1.1. Displays 'Còn X ly' with neutral green styling when stock > 10 and isAvailable=true", () => {
    const p: Product = {
      id: 1,
      name: "Cà phê Latte",
      description: "Test",
      price: 45000,
      isAvailable: true,
      stock: 50,
    };
    const info = getStockBadgeInfo(p);
    expect(info.text).toBe("Còn 50 ly");
    expect(info.isOutOfStock).toBe(false);
    expect(info.className).toContain("bg-[#059669]");

    render(
      <ProductCard
        product={p}
        onOpenDetail={jest.fn()}
        onQuickAdd={jest.fn()}
      />
    );
    expect(screen.getByText("Còn 50 ly")).toBeInTheDocument();
  });

  it("1.2. Displays 'Sắp hết · Còn X ly' with amber styling when stock is between 1 and 10", () => {
    const p: Product = {
      id: 12,
      name: "Cold Brew cam",
      description: "Ủ lạnh 16h",
      price: 49000,
      isAvailable: true,
      stock: 8,
    };
    const info = getStockBadgeInfo(p);
    expect(info.text).toBe("Sắp hết · Còn 8 ly");
    expect(info.isOutOfStock).toBe(false);
    expect(info.className).toContain("bg-[#D97706]");

    render(
      <ProductCard
        product={p}
        onOpenDetail={jest.fn()}
        onQuickAdd={jest.fn()}
      />
    );
    expect(screen.getByText("Sắp hết · Còn 8 ly")).toBeInTheDocument();
  });

  it("1.3. Displays 'Hết hàng' with red styling and disables Quick Add when stock === 0 or isAvailable=false", () => {
    const p: Product = {
      id: 13,
      name: "Matcha Latte",
      description: "Trà xanh Uji",
      price: 45000,
      isAvailable: false,
      stock: 0,
    };
    const info = getStockBadgeInfo(p);
    expect(info.text).toBe("Hết hàng");
    expect(info.isOutOfStock).toBe(true);
    expect(info.className).toContain("bg-[#DC2626]");

    const onQuickAdd = jest.fn();
    render(
      <ProductCard
        product={p}
        onOpenDetail={jest.fn()}
        onQuickAdd={onQuickAdd}
      />
    );
    expect(screen.getByText("Hết hàng")).toBeInTheDocument();

    const quickAddBtn = screen.getByRole("button", { name: /hết hàng/i });
    expect(quickAddBtn).toBeDisabled();
    fireEvent.click(quickAddBtn);
    expect(onQuickAdd).not.toHaveBeenCalled();
  });

  it("1.4. Displays 'Chưa rõ tồn kho' when stock is missing or invalid without inventing a quantity", () => {
    const p: Product = {
      id: 99,
      name: "Món thử nghiệm",
      description: "Chưa cấu hình kho",
      price: 30000,
      isAvailable: true,
      stock: undefined,
    };
    const info = getStockBadgeInfo(p);
    expect(info.text).toBe("Chưa rõ tồn kho");
    expect(info.isOutOfStock).toBe(false);

    render(
      <ProductCard
        product={p}
        onOpenDetail={jest.fn()}
        onQuickAdd={jest.fn()}
      />
    );
    expect(screen.getByText("Chưa rõ tồn kho")).toBeInTheDocument();
  });

  it("1.5. Displays cart quantity in a separate badge when product is already in cart", () => {
    const p: Product = {
      id: 1,
      name: "Cà phê Latte",
      description: "Test",
      price: 45000,
      isAvailable: true,
      stock: 50,
    };

    const { rerender } = render(
      <ProductCard
        product={p}
        onOpenDetail={jest.fn()}
        onQuickAdd={jest.fn()}
        cartCount={0}
      />
    );
    expect(screen.queryByText(/trong giỏ:/i)).not.toBeInTheDocument();

    rerender(
      <ProductCard
        product={p}
        onOpenDetail={jest.fn()}
        onQuickAdd={jest.fn()}
        cartCount={3}
      />
    );
    expect(screen.getByText("Trong giỏ: 3")).toBeInTheDocument();
    expect(screen.getByText("Còn 50 ly")).toBeInTheDocument();
  });

  it("1.6. Disables Quick Add when cart count has reached available stock", () => {
    const p: Product = {
      id: 12,
      name: "Cold Brew cam",
      description: "Ủ lạnh 16h",
      price: 49000,
      isAvailable: true,
      stock: 2,
    };

    const onQuickAdd = jest.fn();
    render(
      <ProductCard
        product={p}
        onOpenDetail={jest.fn()}
        onQuickAdd={onQuickAdd}
        cartCount={2}
      />
    );

    const quickAddBtn = screen.getByRole("button", { name: /đã đạt giới hạn tồn kho/i });
    expect(quickAddBtn).toBeDisabled();
    fireEvent.click(quickAddBtn);
    expect(onQuickAdd).not.toHaveBeenCalled();
  });

  it("1.7. ProductModal disables Add to Cart and stepper when product is out of stock", () => {
    const outOfStockProduct: Product = {
      id: 13,
      name: "Matcha Latte",
      description: "Trà xanh Uji",
      price: 45000,
      isAvailable: false,
      stock: 0,
    };

    const onAddToCart = jest.fn();
    render(
      <ProductModal
        isOpen={true}
        product={outOfStockProduct}
        onClose={jest.fn()}
        onAddToCart={onAddToCart}
        cartCount={0}
      />
    );

    expect(screen.getAllByText("Hết hàng").length).toBeGreaterThanOrEqual(1);
    const addBtn = screen.getByRole("button", { name: /hết hàng/i });
    expect(addBtn).toBeDisabled();
    fireEvent.click(addBtn);
    expect(onAddToCart).not.toHaveBeenCalled();
  });

  it("1.8. ProductModal respects remaining available stock when product already has items in cart", () => {
    const lowStockProduct: Product = {
      id: 12,
      name: "Cold Brew cam",
      description: "Ủ lạnh 16h",
      price: 49000,
      isAvailable: true,
      stock: 5,
    };

    // User already has 5 in cart (full stock reached)
    render(
      <ProductModal
        isOpen={true}
        product={lowStockProduct}
        onClose={jest.fn()}
        onAddToCart={jest.fn()}
        cartCount={5}
      />
    );

    const addBtn = screen.getByRole("button", { name: /đã đạt giới hạn tồn kho/i });
    expect(addBtn).toBeDisabled();
  });

  it("1.9. CartDrawer disables '+' button when cart quantity reaches available stock", () => {
    const cartItems = [
      {
        key: "12__SMALL____",
        productId: 12,
        productName: "Cold Brew cam",
        imageUrl: null,
        basePrice: 49000,
        size: "SMALL" as const,
        toppings: [],
        note: "",
        unitPrice: 49000,
        quantity: 3,
        subtotal: 147000,
      },
    ];

    const products = [
      {
        id: 12,
        name: "Cold Brew cam",
        stock: 3, // Already 3 in cart
        isAvailable: true,
      },
    ];

    const onUpdateQuantity = jest.fn();
    render(
      <CartDrawer
        isOpen={true}
        onClose={jest.fn()}
        cartItems={cartItems}
        products={products}
        onUpdateQuantity={onUpdateQuantity}
        onRemoveItem={jest.fn()}
        onClearCart={jest.fn()}
        showCheckoutForm={false}
        onStartCheckout={jest.fn()}
        customerName=""
        onCustomerNameChange={jest.fn()}
        customerPhone=""
        onCustomerPhoneChange={jest.fn()}
        onProceedOrder={jest.fn()}
        isCreatingOrder={false}
        pendingOrder={null}
        onOpenPaymentModal={jest.fn()}
      />
    );

    const plusBtn = screen.getByRole("button", { name: /tăng số lượng/i });
    expect(plusBtn).toBeDisabled();
    fireEvent.click(plusBtn);
    expect(onUpdateQuantity).not.toHaveBeenCalled();
  });
});

describe("UI-02: Category Categorization for Expanded 15 Drinks", () => {
  it("2.1. Correctly classifies Matcha & Cacao drinks", () => {
    expect(getCategory({ name: "Matcha Latte", description: "Bột trà xanh Uji" })).toBe("Matcha & Cacao");
    expect(getCategory({ name: "Cacao sữa", description: "Cacao nguyên chất kết hợp sữa" })).toBe("Matcha & Cacao");
  });

  it("2.2. Correctly classifies Espresso & Cold Brew drinks (including Cold Brew cam)", () => {
    expect(getCategory({ name: "Cold Brew cam", description: "Cà phê ủ lạnh 16 giờ" })).toBe("Cold Brew & Espresso");
    expect(getCategory({ name: "Espresso", description: "Arabica Cầu Đất" })).toBe("Cold Brew & Espresso");
    expect(getCategory({ name: "Americano đá", description: "Espresso đậm đà" })).toBe("Cold Brew & Espresso");
    expect(getCategory({ name: "Cappuccino", description: "Espresso và sữa nóng" })).toBe("Cold Brew & Espresso");
    expect(getCategory({ name: "Caramel Macchiato", description: "Cà phê Espresso vani caramel" })).toBe("Cold Brew & Espresso");
    expect(getCategory({ name: "Cà phê Latte", description: "Cà phê Espresso kết hợp sữa tươi" })).toBe("Cold Brew & Espresso");
  });

  it("2.3. Correctly classifies Traditional Vietnamese Coffee drinks", () => {
    expect(getCategory({ name: "Cà phê đen đá", description: "Robusta Đắk Lắk pha phin" })).toBe("Cà phê truyền thống");
    expect(getCategory({ name: "Cà phê sữa đá", description: "Cà phê phin đậm vị sữa đặc" })).toBe("Cà phê truyền thống");
    expect(getCategory({ name: "Bạc xỉu", description: "Nhiều sữa ít cà phê" })).toBe("Cà phê truyền thống");
  });

  it("2.4. Correctly classifies Fruit Tea drinks", () => {
    expect(getCategory({ name: "Trà đào", description: "Trà đào cam sả" })).toBe("Trà trái cây");
    expect(getCategory({ name: "Trà vải", description: "Trà lài thơm ngát kết hợp trái vải thiều" })).toBe("Trà trái cây");
    expect(getCategory({ name: "Trà chanh mật ong", description: "Trà đen pha cùng chanh tươi" })).toBe("Trà trái cây");
  });

  it("2.5. filterProducts filters accurately across the 15 demonstration drinks", () => {
    const traditional = filterProducts(DEMO_PRODUCTS, "", "Cà phê truyền thống");
    expect(traditional.map((p: Product) => p.name)).toEqual(["Cà phê đen đá", "Cà phê sữa đá", "Bạc xỉu"]);

    const espressoColdBrew = filterProducts(DEMO_PRODUCTS, "", "Espresso & Cold Brew");
    expect(espressoColdBrew.map((p: Product) => p.name)).toEqual([
      "Cà phê Latte",
      "Espresso",
      "Americano đá",
      "Cappuccino",
      "Caramel Macchiato",
      "Cold Brew cam",
    ]);

    const matchaCacao = filterProducts(DEMO_PRODUCTS, "", "Matcha & Cacao");
    expect(matchaCacao.map((p: Product) => p.name)).toEqual(["Cacao sữa", "Matcha Latte"]);

    const fruitTea = filterProducts(DEMO_PRODUCTS, "", "Trà trái cây");
    expect(fruitTea.map((p: Product) => p.name)).toEqual(["Trà đào", "Trà vải", "Trà chanh mật ong"]);

    const all = filterProducts(DEMO_PRODUCTS, "", "Tất cả");
    expect(all.length).toBe(15);
  });
});

describe("UI-03: Premium BrewLite HomeScreen Component", () => {
  it("3.1. Renders Hero section with heading 'Mỗi ly cà phê, một khoảnh khắc.' and action buttons", () => {
    const onNavigateToMenu = jest.fn();
    render(
      <HomeScreen
        products={DEMO_PRODUCTS}
        onNavigateToMenu={onNavigateToMenu}
        onOpenProduct={jest.fn()}
        onQuickAdd={jest.fn()}
      />
    );

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/mỗi ly cà phê,/i);
    expect(screen.getByText("một khoảnh khắc.")).toBeInTheDocument();

    const exploreBtn = screen.getAllByRole("button", { name: /khám phá thực đơn/i })[0];
    fireEvent.click(exploreBtn);
    expect(onNavigateToMenu).toHaveBeenCalled();
  });

  it("3.2. Renders 4 Category discovery cards and clicking navigates to Menu with filter applied", () => {
    const onNavigateToMenu = jest.fn();
    render(
      <HomeScreen
        products={DEMO_PRODUCTS}
        onNavigateToMenu={onNavigateToMenu}
        onOpenProduct={jest.fn()}
        onQuickAdd={jest.fn()}
      />
    );

    expect(screen.getByText("Cà phê truyền thống")).toBeInTheDocument();
    expect(screen.getByText("Espresso & Cold Brew")).toBeInTheDocument();
    expect(screen.getByText("Matcha & Cacao")).toBeInTheDocument();
    expect(screen.getByText("Trà trái cây")).toBeInTheDocument();

    const traditionalCard = screen.getByText("Cà phê truyền thống").closest('[role="button"]')!;
    fireEvent.click(traditionalCard);
    expect(onNavigateToMenu).toHaveBeenCalledWith("Cà phê truyền thống");
  });

  it("3.3. Renders Featured Drinks section using real backend product data", () => {
    render(
      <HomeScreen
        products={DEMO_PRODUCTS}
        onNavigateToMenu={jest.fn()}
        onOpenProduct={jest.fn()}
        onQuickAdd={jest.fn()}
      />
    );

    expect(screen.getByText("Món nổi bật hôm nay")).toBeInTheDocument();
    // Featured displays first 6 drinks
    expect(screen.getByText("Cà phê Latte")).toBeInTheDocument();
    expect(screen.getByText("Trà đào")).toBeInTheDocument();
  });

  it("3.4. Renders 'How BrewLite Works' 4-step workflow and simulated payment notice", () => {
    render(
      <HomeScreen
        products={DEMO_PRODUCTS}
        onNavigateToMenu={jest.fn()}
        onOpenProduct={jest.fn()}
        onQuickAdd={jest.fn()}
      />
    );

    expect(screen.getByText("Cách BrewLite hoạt động")).toBeInTheDocument();
    expect(screen.getByText("Chọn đồ uống")).toBeInTheDocument();
    expect(screen.getByText("Tùy chỉnh khẩu vị")).toBeInTheDocument();
    expect(screen.getByText("Mô phỏng thanh toán")).toBeInTheDocument();
    expect(screen.getByText("Nhận vé chuông điện tử")).toBeInTheDocument();
    expect(screen.getByText(/chế độ mô phỏng \(simulated cashless\)/i)).toBeInTheDocument();
  });

  it("3.5. Renders Brand Story & Final CTA", () => {
    const onNavigateToMenu = jest.fn();
    render(
      <HomeScreen
        products={DEMO_PRODUCTS}
        onNavigateToMenu={onNavigateToMenu}
        onOpenProduct={jest.fn()}
        onQuickAdd={jest.fn()}
      />
    );

    expect(screen.getByText("Câu chuyện BrewLite")).toBeInTheDocument();
    expect(screen.getByText(/nơi công nghệ nâng niu hương vị cà phê mộc/i)).toBeInTheDocument();

    const ctaBtn = screen.getByRole("button", { name: /khám phá thực đơn ngay/i });
    fireEvent.click(ctaBtn);
    expect(onNavigateToMenu).toHaveBeenCalled();
  });

  it("3.6. Renders clean Footer with project branding and navigation without fake store addresses", () => {
    render(
      <HomeScreen
        products={DEMO_PRODUCTS}
        onNavigateToMenu={jest.fn()}
        onOpenProduct={jest.fn()}
        onQuickAdd={jest.fn()}
      />
    );

    expect(screen.getByText(/hệ thống đặt đồ uống tự phục vụ và chuông điện tử thông minh/i)).toBeInTheDocument();
    expect(screen.getByText(/© 2026 BrewLite Coffee Ordering System/i)).toBeInTheDocument();
    // Confirm footer has no fake address, telephone number or store opening hours
    const footer = screen.getByRole("contentinfo");
    expect(within(footer).queryByText(/090/)).not.toBeInTheDocument();
    expect(within(footer).queryByText(/đường|phố|quận|quận/i)).not.toBeInTheDocument();
    expect(within(footer).queryByText(/giờ mở cửa/i)).not.toBeInTheDocument();
  });
});
