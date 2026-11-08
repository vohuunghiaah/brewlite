'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Header } from '../../../components/Header';
import { Product, fetchProductById } from '../../../lib/api-client';
import { formatVND } from '../../../components/ProductCard';
import { useAppStore, ProductSize } from '../../../lib/store';
import {
  ArrowLeft,
  Check,
  Plus,
  Minus,
  AlertCircle,
  ShoppingBag,
  Sparkles,
} from 'lucide-react';

const SIZE_OPTIONS: Array<{ size: ProductSize; label: string; priceDiff: number }> = [
  { size: 'SMALL', label: 'Size S (Nhỏ)', priceDiff: -5000 },
  { size: 'MEDIUM', label: 'Size M (Vừa - Chuẩn)', priceDiff: 0 },
  { size: 'LARGE', label: 'Size L (Lớn)', priceDiff: 10000 },
];

const TOPPING_OPTIONS: Array<{ name: string; price: number }> = [
  { name: 'Kem cheese', price: 10000 },
  { name: 'Trân châu trắng', price: 8000 },
  { name: 'Thạch đào', price: 8000 },
  { name: 'Sốt caramel', price: 6000 },
];

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params?.id as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedSize, setSelectedSize] = useState<ProductSize>('MEDIUM');
  const [selectedToppings, setSelectedToppings] = useState<string[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [addedToast, setAddedToast] = useState(false);

  const addToCart = useAppStore((state) => state.addToCart);

  useEffect(() => {
    if (!productId) return;
    setLoading(true);
    fetchProductById(productId)
      .then((data) => {
        setProduct(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Không thể tải chi tiết sản phẩm.');
        setLoading(false);
      });
  }, [productId]);

  const toggleTopping = (toppingName: string) => {
    setSelectedToppings((prev) =>
      prev.includes(toppingName)
        ? prev.filter((t) => t !== toppingName)
        : [...prev, toppingName],
    );
  };

  const isOutOfStock = !product || product.stock <= 0 || !product.isAvailable;

  const basePriceNum = product ? Number(product.basePrice) : 0;
  const sizeDiff =
    SIZE_OPTIONS.find((s) => s.size === selectedSize)?.priceDiff || 0;
  const toppingsTotal = selectedToppings.reduce((sum, top) => {
    const found = TOPPING_OPTIONS.find((t) => t.name === top);
    return sum + (found ? found.price : 5000);
  }, 0);

  const unitPrice = Math.max(0, basePriceNum + sizeDiff + toppingsTotal);
  const lineTotal = unitPrice * quantity;

  const handleAddToCart = () => {
    if (!product || isOutOfStock) return;

    addToCart({
      productId: product.id,
      name: product.name,
      imageUrl: product.imageUrl,
      basePrice: basePriceNum,
      size: selectedSize,
      toppings: selectedToppings,
      unitPrice,
      quantity,
    });

    setAddedToast(true);
    setTimeout(() => setAddedToast(false), 3000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50">
        <Header />
        <main className="max-w-md mx-auto p-4 space-y-4 animate-pulse">
          <div className="aspect-square bg-stone-200 rounded-2xl w-full" />
          <div className="h-6 bg-stone-200 rounded w-2/3" />
          <div className="h-4 bg-stone-200 rounded w-1/3" />
          <div className="h-20 bg-stone-200 rounded-xl" />
        </main>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-stone-50">
        <Header />
        <main className="max-w-md mx-auto p-6 text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
          <h2 className="text-lg font-bold text-stone-800">Không tìm thấy sản phẩm</h2>
          <p className="text-xs text-stone-500">{error || 'Sản phẩm không tồn tại.'}</p>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-brand-500 text-white rounded-xl text-xs font-semibold"
          >
            Quay lại thực đơn
          </button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 pb-24">
      <Header />

      <main className="max-w-md mx-auto px-4 py-3 space-y-4">
        {/* Nút quay lại */}
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-800 hover:text-brand-900"
        >
          <ArrowLeft className="w-4 h-4" />
          Quay lại Menu
        </button>

        {/* Ảnh và Thông tin cơ bản */}
        <div className="bg-white rounded-2xl border border-brand-100 overflow-hidden shadow-sm">
          <div className="relative aspect-video w-full bg-brand-50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-full h-full object-cover"
            />
            <span className="absolute top-2 left-2 px-2.5 py-0.5 rounded-full text-xs font-medium bg-black/60 text-white backdrop-blur">
              {product.category}
            </span>
            {isOutOfStock && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <span className="px-3 py-1 bg-rose-600 text-white rounded-full text-xs font-bold shadow">
                  Tạm hết hàng (Còn 0 ly)
                </span>
              </div>
            )}
          </div>

          <div className="p-4 space-y-2">
            <h1 className="text-xl font-bold text-brand-900">{product.name}</h1>
            <p className="text-xs text-stone-600 leading-relaxed">
              {product.description || 'Hương vị cà phê nguyên bản đậm đà.'}
            </p>
            <div className="pt-2 flex items-center justify-between border-t border-brand-50">
              <span className="text-xs text-stone-500 font-medium">Tồn kho khả dụng:</span>
              <span className={`text-xs font-bold ${product.stock > 10 ? 'text-emerald-600' : 'text-amber-600'}`}>
                {product.stock} ly
              </span>
            </div>
          </div>
        </div>

        {/* Tùy chọn Kích cỡ (Size S/M/L) */}
        <div className="bg-white p-4 rounded-2xl border border-brand-100 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-brand-900">Chọn kích cỡ (Bắt buộc)</h2>
            <span className="text-[11px] text-stone-400">Chọn 1</span>
          </div>

          <div className="space-y-2">
            {SIZE_OPTIONS.map((opt) => (
              <button
                key={opt.size}
                type="button"
                onClick={() => setSelectedSize(opt.size)}
                className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                  selectedSize === opt.size
                    ? 'border-brand-500 bg-brand-50/50 text-brand-900 shadow-sm'
                    : 'border-stone-200 hover:border-brand-200 text-stone-700'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      selectedSize === opt.size
                        ? 'border-brand-500 bg-brand-500 text-white'
                        : 'border-stone-300'
                    }`}
                  >
                    {selectedSize === opt.size && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                  </div>
                  <span className="text-xs font-semibold">{opt.label}</span>
                </div>
                <span className="text-xs font-medium text-stone-500">
                  {opt.priceDiff === 0
                    ? '+0đ'
                    : opt.priceDiff > 0
                    ? `+${formatVND(opt.priceDiff)}`
                    : `-${formatVND(Math.abs(opt.priceDiff))}`}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Tùy chọn Toppings */}
        <div className="bg-white p-4 rounded-2xl border border-brand-100 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-brand-900">Topping thêm (Tùy chọn)</h2>
            <span className="text-[11px] text-stone-400">Nhiều lựa chọn</span>
          </div>

          <div className="space-y-2">
            {TOPPING_OPTIONS.map((top) => {
              const isChecked = selectedToppings.includes(top.name);
              return (
                <button
                  key={top.name}
                  type="button"
                  onClick={() => toggleTopping(top.name)}
                  className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                    isChecked
                      ? 'border-brand-500 bg-brand-50/50 text-brand-900 shadow-sm'
                      : 'border-stone-200 hover:border-brand-200 text-stone-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-4 h-4 rounded border flex items-center justify-center ${
                        isChecked
                          ? 'border-brand-500 bg-brand-500 text-white'
                          : 'border-stone-300'
                      }`}
                    >
                      {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <span className="text-xs font-semibold">{top.name}</span>
                  </div>
                  <span className="text-xs font-medium text-stone-500">
                    +{formatVND(top.price)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Bộ đếm số lượng */}
        <div className="bg-white p-4 rounded-2xl border border-brand-100 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-brand-900 block">Số lượng ly</span>
            <span className="text-[11px] text-stone-400">Đơn giá: {formatVND(unitPrice)}</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={quantity <= 1 || isOutOfStock}
              className="w-8 h-8 rounded-xl border border-stone-200 flex items-center justify-center text-stone-700 hover:bg-stone-50 disabled:opacity-40"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="text-sm font-bold text-brand-900 w-6 text-center">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
              disabled={isOutOfStock || quantity >= product.stock}
              className="w-8 h-8 rounded-xl border border-stone-200 flex items-center justify-center text-stone-700 hover:bg-stone-50 disabled:opacity-40"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Thông báo đã thêm giỏ hàng (Toast) */}
        {addedToast && (
          <div className="p-3 bg-emerald-600 text-white rounded-xl text-xs font-semibold flex items-center justify-between shadow-lg animate-bounce">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" />
              Đã thêm {quantity} ly vào giỏ hàng!
            </span>
            <button
              onClick={() => router.push('/cart')}
              className="underline hover:text-emerald-100 font-bold"
            >
              Xem giỏ
            </button>
          </div>
        )}
      </main>

      {/* Thanh hành động cố định chân trang (Sticky Bottom Bar) */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-brand-100 p-3 z-30 shadow-lg">
        <div className="max-w-md mx-auto flex items-center justify-between gap-3">
          <div>
            <span className="text-[10px] text-stone-400 block font-medium">Tổng tạm tính</span>
            <span className="text-base font-bold text-brand-800">
              {formatVND(lineTotal)}
            </span>
          </div>

          <button
            type="button"
            disabled={isOutOfStock}
            onClick={handleAddToCart}
            className="flex-grow py-3 px-4 rounded-xl bg-brand-500 text-white font-bold text-xs hover:bg-brand-600 active:scale-95 transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ShoppingBag className="w-4 h-4" />
            {isOutOfStock ? 'Sản phẩm tạm hết' : 'Thêm vào giỏ hàng'}
          </button>
        </div>
      </footer>
    </div>
  );
}

