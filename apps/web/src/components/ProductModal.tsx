"use client";

import { useEffect, useState } from "react";
import { X, Plus, ShoppingBag } from "lucide-react";
import { formatVND } from "./Header";
import { Product, getProductImage, getStockBadgeInfo } from "./MenuScreen";

export interface CustomizationOption {
  size: "SMALL" | "MEDIUM" | "LARGE";
  toppings: string[];
  ice: string;
  sugar: string;
  note: string;
  quantity: number;
}

interface ProductModalProps {
  product: Product | null;
  isOpen: boolean;
  loadingDetail?: boolean;
  detailError?: string;
  cartCount?: number;
  onClose: () => void;
  onAddToCart: (customization: CustomizationOption) => void;
}

const SIZES: { id: "SMALL" | "MEDIUM" | "LARGE"; label: string; name: string; surcharge: number }[] = [
  { id: "SMALL", label: "S", name: "Nhỏ (S)", surcharge: 0 },
  { id: "MEDIUM", label: "M", name: "Vừa (M)", surcharge: 5000 },
  { id: "LARGE", label: "L", name: "Lớn (L)", surcharge: 10000 },
];

const TOPPINGS: { id: string; name: string; price: number }[] = [
  { id: "cheese", name: "Kem cheese", price: 10000 },
  { id: "pearl", name: "Trân châu trắng", price: 8000 },
  { id: "peach", name: "Thạch đào", price: 8000 },
  { id: "caramel", name: "Sốt caramel", price: 6000 },
  { id: "jelly", name: "Thạch sương sáo", price: 6000 },
];

const ICE_LEVELS = ["Không đá", "Ít đá", "Đá đầy"];
const SUGAR_LEVELS = [
  { id: "0%", label: "0%" },
  { id: "30%", label: "30%" },
  { id: "50%", label: "50% đường" },
  { id: "70%", label: "70%" },
  { id: "100%", label: "100%" },
];

function ProductModalInner({
  product,
  loadingDetail,
  detailError,
  cartCount = 0,
  onClose,
  onAddToCart,
}: {
  product: Product;
  loadingDetail?: boolean;
  detailError?: string;
  cartCount?: number;
  onClose: () => void;
  onAddToCart: (customization: CustomizationOption) => void;
}) {
  const [size, setSize] = useState<"SMALL" | "MEDIUM" | "LARGE">("SMALL");
  const [toppings, setToppings] = useState<string[]>([]);
  const [ice, setIce] = useState<string>("Đá đầy");
  const [sugar, setSugar] = useState<string>("100%");
  const [note, setNote] = useState<string>("");
  const [qty, setQty] = useState<number>(1);
  const [imgLoaded, setImgLoaded] = useState(false);

  const badgeInfo = getStockBadgeInfo(product);
  const isOutOfStock = badgeInfo.isOutOfStock;
  const availableToAdd =
    product.stock !== undefined
      ? Math.max(0, product.stock - cartCount)
      : 999;
  const isMaxInCart = product.stock !== undefined && cartCount >= product.stock;

  const basePrice = Number(product.price);
  const sizeSurcharge = SIZES.find((s) => s.id === size)?.surcharge || 0;
  const toppingTotal = toppings.reduce((sum, topName) => {
    const item = TOPPINGS.find((t) => t.name === topName);
    return sum + (item?.price || 0);
  }, 0);
  const unitPrice = basePrice + sizeSurcharge + toppingTotal;
  const totalPrice = unitPrice * qty;

  const toggleTopping = (name: string) => {
    setToppings((prev) =>
      prev.includes(name) ? prev.filter((t) => t !== name) : [...prev, name]
    );
  };

  const handleAdd = () => {
    if (isOutOfStock || isMaxInCart || availableToAdd <= 0) return;
    onAddToCart({
      size,
      toppings,
      ice,
      sugar,
      note,
      quantity: Math.min(qty, availableToAdd),
    });
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Tùy chỉnh ${product.name}`}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-[#3D261D]/50 backdrop-blur-sm" />

      {/* Modal Dialog Content */}
      <div
        className="relative bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] overflow-y-auto animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          aria-label="Đóng cửa sổ"
          className="absolute top-4 right-4 z-10 w-8 h-8 bg-black/20 hover:bg-black/30 rounded-full flex items-center justify-center text-white transition-colors"
        >
          <X size={16} />
        </button>

        {/* Product Image */}
        <div className="relative w-full h-48 sm:h-56 bg-[#EFE8DF] overflow-hidden">
          {!imgLoaded && <div className="absolute inset-0 skeleton" />}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={getProductImage(product)}
            alt={product.name}
            className={`w-full h-full object-cover transition-opacity duration-500 ${
              imgLoaded ? "opacity-100" : "opacity-0"
            } ${isOutOfStock ? "grayscale opacity-50" : ""}`}
            onLoad={() => setImgLoaded(true)}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#3D261D]/50 to-transparent" />

          {/* Badges on Modal Image */}
          <div className="absolute top-4 left-4 flex flex-wrap gap-2 z-10">
            <span
              className={`stockBadge text-[10px] sm:text-xs font-bold px-2.5 py-0.5 rounded-full shadow backdrop-blur-sm tracking-wide ${badgeInfo.className}`}
            >
              {badgeInfo.text}
            </span>

            {cartCount > 0 && (
              <span
                className="cartBadge bg-[#3D261D]/90 text-[#FAF6F0] text-[10px] sm:text-xs font-bold px-2.5 py-0.5 rounded-full border border-white/20 shadow backdrop-blur-sm flex items-center gap-1"
              >
                <ShoppingBag size={11} className="text-[#C28D58]" />
                <span>Trong giỏ: {cartCount}</span>
              </span>
            )}
          </div>
        </div>

        {/* Form Body */}
        <div className="p-5 sm:p-6 space-y-5">
          {/* Title & Price Header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-extrabold text-[#3D261D] leading-tight">
                {product.name}
              </h2>
              <p className="text-xs sm:text-sm text-[#6B4235] mt-1 leading-relaxed">
                {product.description || "Đồ uống đặc biệt pha chế từ nguyên liệu tươi mới."}
              </p>
              {loadingDetail && (
                <span className="text-[10px] text-[#C28D58] font-bold mt-1 inline-block">
                  Đang đồng bộ dữ liệu mới nhất...
                </span>
              )}
              {detailError && (
                <span className="text-[10px] text-[#EF4444] font-bold mt-1 block">
                  {detailError}
                </span>
              )}
            </div>
            <div className="text-right shrink-0">
              <span className="text-xl sm:text-2xl font-black text-[#C28D58]">
                {formatVND(unitPrice)}
              </span>
              <p className="text-[10px] text-[#6B4235]">/ ly</p>
            </div>
          </div>

          {/* Size Selection */}
          <div>
            <p className="text-xs font-bold text-[#3D261D] uppercase tracking-wider mb-2">
              Kích cỡ ly
            </p>
            <div role="radiogroup" aria-label="Chọn kích cỡ ly" className="grid grid-cols-3 gap-2">
              {SIZES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  role="radio"
                  aria-checked={size === s.id}
                  aria-label={s.name}
                  onClick={() => setSize(s.id)}
                  className={`py-2.5 rounded-2xl border-2 transition-all duration-200 text-center ${
                    size === s.id
                      ? "border-[#3D261D] bg-[#3D261D] text-[#FAF6F0] shadow-sm"
                      : "border-[#EFE8DF] bg-white text-[#3D261D] hover:border-[#C28D58]"
                  }`}
                >
                  <div className="font-black text-base">{s.label}</div>
                  <div className="text-[10px] font-semibold opacity-80">{s.name}</div>
                  {s.surcharge > 0 && (
                    <div className="text-[10px] font-bold mt-0.5 text-[#C28D58]">
                      +{formatVND(s.surcharge)}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Toppings Selection */}
          <div>
            <p className="text-xs font-bold text-[#3D261D] uppercase tracking-wider mb-2">
              Topping thêm
            </p>
            <div className="flex flex-col gap-2">
              {TOPPINGS.map((top) => {
                const checked = toppings.includes(top.name);
                return (
                  <label
                    key={top.id}
                    className={`flex items-center justify-between p-2.5 sm:p-3 rounded-2xl border-2 cursor-pointer transition-all ${
                      checked
                        ? "border-[#C28D58] bg-[#FAF6F0]"
                        : "border-[#EFE8DF] bg-white hover:border-[#C28D58]/50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleTopping(top.name)}
                        className="w-4 h-4 rounded text-[#C28D58] focus:ring-[#C28D58] cursor-pointer"
                        aria-label={top.name}
                      />
                      <span className="text-xs sm:text-sm font-semibold text-[#3D261D]">
                        {top.name}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-[#C28D58]">
                      +{formatVND(top.price)}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Ice Level Selection */}
          <div>
            <p className="text-xs font-bold text-[#3D261D] uppercase tracking-wider mb-2">
              Mức đá
            </p>
            <div role="radiogroup" aria-label="Chọn mức đá" className="grid grid-cols-3 gap-1.5 sm:gap-2">
              {ICE_LEVELS.map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  role="radio"
                  aria-checked={ice === lvl}
                  aria-label={lvl}
                  onClick={() => setIce(lvl)}
                  className={`py-2 rounded-xl border-2 text-xs font-bold transition-all ${
                    ice === lvl
                      ? "border-[#3D261D] bg-[#3D261D] text-[#FAF6F0]"
                      : "border-[#EFE8DF] text-[#6B4235] hover:border-[#C28D58]"
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          {/* Sugar Level Selection */}
          <div>
            <p className="text-xs font-bold text-[#3D261D] uppercase tracking-wider mb-2">
              Mức đường
            </p>
            <div role="radiogroup" aria-label="Chọn mức đường" className="grid grid-cols-5 gap-1.5 sm:gap-2">
              {SUGAR_LEVELS.map((lvl) => (
                <button
                  key={lvl.id}
                  type="button"
                  role="radio"
                  aria-checked={sugar === lvl.id}
                  aria-label={lvl.id}
                  onClick={() => setSugar(lvl.id)}
                  className={`py-2 rounded-xl border-2 text-xs font-bold transition-all text-center ${
                    sugar === lvl.id
                      ? "border-[#3D261D] bg-[#3D261D] text-[#FAF6F0]"
                      : "border-[#EFE8DF] text-[#6B4235] hover:border-[#C28D58]"
                  }`}
                >
                  {lvl.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Note */}
          <div>
            <label
              htmlFor="modal-item-note"
              className="text-xs font-bold text-[#3D261D] uppercase tracking-wider block mb-1.5"
            >
              Ghi chú bổ sung
            </label>
            <input
              id="modal-item-note"
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ví dụ: Uống nóng, ít ngọt, mang đá riêng..."
              maxLength={150}
              className="w-full border-2 border-[#EFE8DF] focus:border-[#C28D58] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#3D261D] placeholder:text-[#C28D58]/50 focus:outline-none transition-colors"
            />
          </div>

          {/* Quantity Stepper & Add to Cart button */}
          <div className="flex items-center gap-3 pt-2">
            {/* Stepper */}
            <div className="flex items-center gap-1.5 bg-[#FAF6F0] border border-[#EFE8DF] rounded-2xl px-2 py-1.5">
              <button
                type="button"
                disabled={qty <= 1 || isOutOfStock || isMaxInCart}
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                aria-label="Giảm số lượng"
                className="w-8 h-8 rounded-xl bg-white border border-[#EFE8DF] flex items-center justify-center hover:bg-[#3D261D] hover:text-white transition-colors text-sm font-bold leading-none select-none disabled:opacity-40 disabled:cursor-not-allowed"
              >
                -
              </button>
              <span className="text-base font-black text-[#3D261D] w-7 text-center">
                {qty}
              </span>
              <button
                type="button"
                disabled={isOutOfStock || isMaxInCart || qty >= availableToAdd}
                onClick={() => setQty((q) => Math.min(availableToAdd, q + 1))}
                aria-label="Tăng số lượng"
                className="w-8 h-8 rounded-xl bg-[#3D261D] text-white flex items-center justify-center hover:bg-[#C28D58] transition-colors text-sm font-bold leading-none select-none disabled:opacity-40 disabled:cursor-not-allowed"
              >
                +
              </button>
            </div>

            {/* Add to cart action button */}
            <button
              type="button"
              disabled={isOutOfStock || isMaxInCart || availableToAdd <= 0}
              onClick={handleAdd}
              className={`flex-1 py-3 px-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all duration-200 shadow-md ${
                isOutOfStock || isMaxInCart || availableToAdd <= 0
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-[#C28D58] hover:bg-[#3D261D] text-white active:scale-95"
              }`}
            >
              <Plus size={16} strokeWidth={2.5} />
              <span>
                {isOutOfStock
                  ? "Hết hàng"
                  : isMaxInCart || availableToAdd <= 0
                  ? "Đã đạt giới hạn tồn kho"
                  : `Thêm vào giỏ hàng — ${formatVND(totalPrice)}`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProductModal({
  product,
  isOpen,
  loadingDetail,
  detailError,
  cartCount = 0,
  onClose,
  onAddToCart,
}: ProductModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !product) return null;

  return (
    <ProductModalInner
      key={product.id}
      product={product}
      loadingDetail={loadingDetail}
      detailError={detailError}
      cartCount={cartCount}
      onClose={onClose}
      onAddToCart={onAddToCart}
    />
  );
}
