"use client";

import { useState } from "react";
import { Search, Plus, ChevronRight, Flame, AlertCircle, RefreshCw, ShoppingBag } from "lucide-react";
import { formatVND } from "./Header";

export interface Product {
  id: number;
  name: string;
  description: string;
  price: number | string;
  imageUrl?: string | null;
  isAvailable: boolean;
  stock?: number;
  version?: number;
}

export const CATEGORIES = [
  "Tất cả",
  "Cà phê truyền thống",
  "Espresso & Cold Brew",
  "Matcha & Cacao",
  "Trà trái cây",
  "Bánh ngọt",
];

export const fallbackImages = {
  coffee: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=800&q=80",
  tea: "https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=800&q=80",
  matcha: "https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&w=800&q=80",
  cacao: "https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=800&q=80",
  pastry: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=800&q=80",
  water: "https://images.unsplash.com/photo-1548839140-29a749e1cf4d?auto=format&fit=crop&w=800&q=80",
};

export function getProductImage(product: Product): string {
  if (product.imageUrl && product.imageUrl.startsWith("http")) {
    return product.imageUrl;
  }
  const details = `${product.name} ${product.description}`.toLowerCase();
  if (/matcha|trà xanh/.test(details)) return fallbackImages.matcha;
  if (/croissant|bánh|pastry|cake|cookie/.test(details)) return fallbackImages.pastry;
  if (/trà|tea|đào|vải|chanh|cam/.test(details)) return fallbackImages.tea;
  if (/cacao|chocolate/.test(details)) return fallbackImages.cacao;
  if (/nước|water/.test(details)) return fallbackImages.water;
  return fallbackImages.coffee;
}

export interface StockBadgeInfo {
  text: string;
  className: string;
  isOutOfStock: boolean;
}

/**
 * Display logic for product inventory badges:
 * - stock > 10 and isAvailable=true: "Còn X ly", neutral green styling.
 * - stock from 1 to 10: "Sắp hết · Còn X ly", amber styling.
 * - stock === 0 or isAvailable=false: "Hết hàng", red styling and subdued image.
 * - Missing or invalid stock: show "Chưa rõ tồn kho" and do not invent an available quantity.
 */
export function getStockBadgeInfo(product: Product): StockBadgeInfo {
  if (
    product.stock === undefined ||
    product.stock === null ||
    typeof product.stock !== "number" ||
    isNaN(product.stock) ||
    product.stock < 0
  ) {
    return {
      text: "Chưa rõ tồn kho",
      className: "bg-stone-800/85 text-stone-200 border border-stone-600/40",
      isOutOfStock: false,
    };
  }

  if (!product.isAvailable || product.stock === 0) {
    return {
      text: "Hết hàng",
      className: "bg-[#DC2626]/95 text-white border border-red-400/50",
      isOutOfStock: true,
    };
  }

  if (product.stock >= 1 && product.stock <= 10) {
    return {
      text: `Sắp hết · Còn ${product.stock} ly`,
      className: "bg-[#D97706]/95 text-white border border-amber-400/50",
      isOutOfStock: false,
    };
  }

  return {
    text: `Còn ${product.stock} ly`,
    className: "bg-[#059669]/90 text-white border border-emerald-400/40",
    isOutOfStock: false,
  };
}

export interface ProductCardProps {
  product: Product;
  onOpenDetail: (product: Product) => void;
  onQuickAdd: (product: Product) => void;
  cartCount?: number;
}

export function ProductCard({
  product,
  onOpenDetail,
  onQuickAdd,
  cartCount = 0,
}: ProductCardProps) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const badgeInfo = getStockBadgeInfo(product);
  const isOutOfStock = badgeInfo.isOutOfStock;
  const isMaxInCart =
    product.stock !== undefined && cartCount > 0 && cartCount >= product.stock;
  const imgSrc = getProductImage(product);
  const numPrice = Number(product.price);

  return (
    <article
      className="productCard group bg-white border border-[#EFE8DF] rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex flex-col relative"
    >
      {/* Image Container */}
      <div
        className="relative overflow-hidden bg-[#EFE8DF] aspect-[4/3] cursor-pointer"
        onClick={() => onOpenDetail(product)}
      >
        {!imgLoaded && !imgError && <div className="absolute inset-0 skeleton" />}
        {imgError ? (
          <div className="w-full h-full flex flex-col items-center justify-center bg-[#FAF6F0] text-[#6B4235] p-3 text-center">
            <span className="text-xs font-bold leading-snug">{product.name}</span>
          </div>
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={imgSrc}
            alt={product.name}
            className={`w-full h-full object-cover transition-all duration-500 group-hover:scale-105 ${
              imgLoaded ? "opacity-100" : "opacity-0"
            } ${isOutOfStock ? "grayscale opacity-50" : ""}`}
            onLoad={() => setImgLoaded(true)}
            onError={() => {
              setImgError(true);
              setImgLoaded(true);
            }}
          />
        )}

        {/* Stock Badge - Top Left */}
        <span
          className={`stockBadge absolute top-2.5 left-2.5 z-10 text-[10px] sm:text-[11px] font-bold px-2.5 py-0.5 rounded-full shadow backdrop-blur-sm tracking-wide ${badgeInfo.className}`}
        >
          {badgeInfo.text}
        </span>

        {/* Cart Quantity Badge - Top Right (When item is in cart) */}
        {cartCount > 0 && (
          <span
            className="cartBadge absolute top-2.5 right-2.5 z-10 bg-[#3D261D]/90 text-[#FAF6F0] text-[10px] sm:text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-white/20 shadow backdrop-blur-sm flex items-center gap-1"
          >
            <ShoppingBag size={11} className="text-[#C28D58]" />
            <span>Trong giỏ: {cartCount}</span>
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-3.5 sm:p-4 flex flex-col gap-2 flex-1">
        <div
          className="cursor-pointer"
          onClick={() => onOpenDetail(product)}
        >
          <h3 className="font-bold text-[#3D261D] text-sm sm:text-base leading-tight line-clamp-1 group-hover:text-[#C28D58] transition-colors">
            {product.name}
          </h3>
          <p className="text-[#6B4235] text-xs mt-1 line-clamp-2 leading-relaxed">
            {product.description || "Hương vị thơm ngon hảo hạng từ nguồn nguyên liệu chọn lọc của BrewLite."}
          </p>
        </div>

        {/* Pricing & Actions */}
        <div className="flex items-center justify-between mt-auto pt-2 border-t border-[#FAF6F0]">
          <div>
            <span className="font-extrabold text-[#C28D58] text-base sm:text-lg">
              {formatVND(numPrice)}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Detail button */}
            <button
              type="button"
              onClick={() => onOpenDetail(product)}
              className="flex items-center gap-0.5 text-[#3D261D] text-xs font-bold hover:text-[#C28D58] px-2 py-1 rounded-xl hover:bg-[#FAF6F0] transition-colors"
            >
              <span>Chi tiết</span>
              <ChevronRight size={13} />
            </button>

            {/* Quick add button */}
            <button
              type="button"
              disabled={isOutOfStock || isMaxInCart}
              onClick={(e) => {
                e.stopPropagation();
                onQuickAdd(product);
              }}
              title={
                isOutOfStock
                  ? "Hết hàng"
                  : isMaxInCart
                  ? "Đã chọn tối đa số lượng tồn kho"
                  : "Thêm nhanh"
              }
              aria-label={
                isOutOfStock
                  ? `${product.name} đã hết hàng`
                  : isMaxInCart
                  ? `Đã đạt giới hạn tồn kho của ${product.name}`
                  : `Thêm nhanh ${product.name} vào giỏ`
              }
              className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200 shrink-0 shadow-sm ${
                isOutOfStock || isMaxInCart
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                  : "bg-[#3D261D] hover:bg-[#C28D58] text-white active:scale-90"
              }`}
            >
              <Plus size={16} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

interface MenuScreenProps {
  products: Product[];
  loading: boolean;
  error?: string;
  onRetry: () => void;
  search: string;
  onSearchChange: (value: string) => void;
  selectedCategory: string;
  onCategoryChange: (cat: string) => void;
  onOpenProduct: (product: Product) => void;
  onQuickAdd: (product: Product) => void;
  cartCounts?: Record<number, number>;
  isHomeView?: boolean;
  onExploreMenu?: () => void;
}

export default function MenuScreen({
  products,
  loading,
  error,
  onRetry,
  search,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  onOpenProduct,
  onQuickAdd,
  cartCounts = {},
  isHomeView = false,
  onExploreMenu,
}: MenuScreenProps) {
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      {/* Hero Banner (Only shown if isHomeView or as Menu header) */}
      <div className={`relative rounded-3xl overflow-hidden bg-[#3D261D] mb-8 ${isHomeView ? "p-8 sm:p-12" : "p-6 sm:p-8"} flex flex-col sm:flex-row items-center justify-between gap-6 shadow-md transition-all`}>
        <div className="text-[#FAF6F0] z-10 max-w-xl">
          <div className="flex items-center gap-2 text-[#C28D58] text-xs font-bold uppercase tracking-widest mb-2.5">
            <Flame size={14} fill="currentColor" /> Hôm nay tại BrewLite
          </div>
          <h1 className={`${isHomeView ? "text-3xl sm:text-5xl lg:text-6xl" : "text-2xl sm:text-4xl"} font-extrabold leading-tight mb-3.5 tracking-tight`}>
            Mỗi ly cà phê,<br />
            <span className="text-[#C28D58]">một khoảnh khắc.</span>
          </h1>
          <p className="text-[#E8C99A] text-sm sm:text-base leading-relaxed mb-5">
            Cashierless · Cashless · Cà phê thật ngon. Tận hưởng trải nghiệm gọi món hiện đại và thanh toán không tiền mặt.
          </p>
          {isHomeView && onExploreMenu && (
            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={onExploreMenu}
                className="bg-[#C28D58] hover:bg-white hover:text-[#3D261D] text-white px-6 py-3 rounded-2xl font-bold text-sm sm:text-base transition-all duration-200 shadow-md inline-flex items-center gap-2 active:scale-95"
              >
                <span>Khám phá thực đơn</span>
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </div>

        {/* Stat badges */}
        <div className="hidden sm:flex items-center gap-4 z-10 bg-[#FAF6F0]/10 backdrop-blur-sm border border-white/10 rounded-2xl px-5 py-4">
          <div className="text-center">
            <div className="text-3xl font-black text-[#C28D58]">
              {products.length > 0 ? products.length : "—"}
            </div>
            <div className="text-[10px] text-[#E8C99A] font-semibold uppercase tracking-wider">Món thực đơn</div>
          </div>
          <div className="w-px h-10 bg-[#6B4235]" />
          <div className="text-center">
            <div className="text-3xl font-black text-[#C28D58]">100%</div>
            <div className="text-[10px] text-[#E8C99A] font-semibold uppercase tracking-wider">Cashless</div>
          </div>
        </div>

        {/* Decorative background shapes */}
        <div className="absolute right-0 top-0 w-72 h-72 bg-[#C28D58]/10 rounded-full -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="absolute right-12 bottom-0 w-36 h-36 bg-[#C28D58]/10 rounded-full translate-y-1/2 pointer-events-none" />
      </div>

      {/* Search & Filters */}
      {!isHomeView && (
        <>
          {/* Search Bar with searchbox role */}
          <div className={`relative mb-5 transition-all duration-200 ${isSearchFocused ? "scale-[1.01]" : ""}`}>
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-[#C28D58] pointer-events-none"
              strokeWidth={2.5}
            />
            <input
              type="text"
              role="searchbox"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
              placeholder="Tìm cà phê, cold brew, trà, matcha..."
              aria-label="Tìm kiếm đồ uống"
              className="w-full bg-white border border-[#EFE8DF] rounded-2xl pl-11 pr-10 py-3 text-sm text-[#3D261D] placeholder:text-[#C28D58]/60 shadow-sm focus:outline-none focus:border-[#C28D58] focus:shadow-md transition-all duration-200"
            />
            {search && (
              <button
                onClick={() => onSearchChange("")}
                aria-label="Xóa tìm kiếm"
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6B4235] hover:text-[#EF4444] transition-colors text-xl leading-none w-6 h-6 flex items-center justify-center rounded-full hover:bg-[#FAF6F0]"
              >
                ×
              </button>
            )}
          </div>

          {/* Category Pills */}
          <div className="flex gap-2 overflow-x-auto pb-2 mb-6 no-scrollbar">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => onCategoryChange(cat)}
                className={`shrink-0 px-4 py-2 rounded-full text-xs font-bold transition-all duration-200 ${
                  selectedCategory === cat
                    ? "bg-[#3D261D] text-[#FAF6F0] shadow-sm scale-105"
                    : "bg-white border border-[#EFE8DF] text-[#6B4235] hover:border-[#C28D58] hover:text-[#3D261D]"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white border border-[#EFE8DF] rounded-2xl overflow-hidden shadow-sm flex flex-col">
              <div className="aspect-[4/3] skeleton" />
              <div className="p-4 space-y-3">
                <div className="h-4 bg-[#EFE8DF] rounded-md skeleton w-3/4" />
                <div className="h-3 bg-[#EFE8DF] rounded-md skeleton w-full" />
                <div className="h-5 bg-[#EFE8DF] rounded-md skeleton w-1/3 pt-2" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div className="bg-white border border-[#EF4444]/20 rounded-3xl p-8 text-center max-w-md mx-auto my-8 shadow-sm">
          <AlertCircle size={40} className="text-[#EF4444] mx-auto mb-3" />
          <h3 className="font-extrabold text-[#3D261D] text-lg mb-1">Không thể tải thực đơn</h3>
          <p className="text-[#6B4235] text-sm mb-5 leading-relaxed">{error}</p>
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-2 bg-[#3D261D] hover:bg-[#C28D58] text-white px-5 py-2.5 rounded-2xl font-bold text-xs transition-colors shadow"
          >
            <RefreshCw size={14} />
            <span>Thử lại</span>
          </button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && products.length === 0 && (
        <div className="bg-white border border-[#EFE8DF] rounded-3xl p-10 text-center max-w-md mx-auto my-8 shadow-sm">
          <div className="w-16 h-16 bg-[#FAF6F0] rounded-full flex items-center justify-center mx-auto mb-3 text-[#C28D58]">
            <Search size={28} />
          </div>
          <h3 className="font-extrabold text-[#3D261D] text-lg mb-1">Không tìm thấy đồ uống phù hợp</h3>
          <p className="text-[#6B4235] text-xs leading-relaxed mb-4">
            Vui lòng thử tìm kiếm với từ khóa khác hoặc chọn lại danh mục đồ uống.
          </p>
          <button
            onClick={() => {
              onSearchChange("");
              onCategoryChange("Tất cả");
            }}
            className="text-xs font-bold text-[#C28D58] hover:underline"
          >
            Xóa bộ lọc tìm kiếm
          </button>
        </div>
      )}

      {/* Product Grid */}
      {!loading && !error && products.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onOpenDetail={onOpenProduct}
              onQuickAdd={onQuickAdd}
              cartCount={cartCounts[product.id] || 0}
            />
          ))}
        </div>
      )}
    </div>
  );
}
