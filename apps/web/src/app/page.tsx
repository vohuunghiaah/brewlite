'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { Header } from '../components/Header';
import { ProductCard } from '../components/ProductCard';
import { MenuSkeleton } from '../components/MenuSkeleton';
import { Product, fetchProducts } from '../lib/api-client';
import { Search, Sparkles, RefreshCcw, Coffee, Frown } from 'lucide-react';

const CATEGORIES = ['Tất cả', 'Cà phê', 'Trà', 'Đá xay'];

export default function MenuPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('Tất cả');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async (cat?: string, search?: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchProducts(cat, search);
      setProducts(data);
    } catch (err: any) {
      setError(err?.message || 'Đã có lỗi xảy ra khi tải thực đơn.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(selectedCategory, searchQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData(selectedCategory, searchQuery);
  };

  return (
    <div className="min-h-screen bg-stone-50">
      <Header />

      <main className="max-w-md mx-auto px-4 py-4 space-y-4">
        {/* Banner Chào Mừng */}
        <section className="bg-gradient-to-r from-brand-800 to-brand-600 rounded-2xl p-4 text-white shadow-sm relative overflow-hidden">
          <div className="relative z-10">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-xs font-medium backdrop-blur mb-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Cà phê không tiền mặt</span>
            </div>
            <h1 className="text-xl font-bold">BrewLite Xin Chào!</h1>
            <p className="text-xs text-white/80 mt-1">
              Đặt món nhanh, nhận tại quầy sau 5 phút.
            </p>
          </div>
          <Coffee className="absolute -bottom-2 -right-2 w-24 h-24 text-white/10" />
        </section>

        {/* Thanh Tìm Kiếm */}
        <form onSubmit={handleSearchSubmit} className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm cà phê, trà đào, đá xay..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-brand-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-sm"
          />
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
        </form>

        {/* Bộ Lọc Danh Mục */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-brand-500 text-white shadow-sm scale-105'
                  : 'bg-white text-stone-600 hover:bg-brand-50 border border-stone-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Trạng Thái Đang Tải (Loading Skeleton) */}
        {loading && <MenuSkeleton />}

        {/* Trạng Thái Lỗi (Error State) */}
        {error && !loading && (
          <div
            data-testid="error-state"
            className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-center space-y-3"
          >
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
              <Frown className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-rose-900 text-sm">
                Không thể kết nối đến máy chủ
              </h3>
              <p className="text-xs text-rose-700 mt-1">{error}</p>
            </div>
            <button
              onClick={() => loadData(selectedCategory, searchQuery)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 transition"
            >
              <RefreshCcw className="w-3.5 h-3.5" />
              Thử lại
            </button>
          </div>
        )}

        {/* Trạng Thái Trống (Empty State) */}
        {!loading && !error && products.length === 0 && (
          <div
            data-testid="empty-state"
            className="p-8 bg-white border border-stone-100 rounded-2xl text-center space-y-3"
          >
            <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto">
              <Coffee className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-stone-800 text-sm">
              Không tìm thấy món phù hợp
            </h3>
            <p className="text-xs text-stone-500">
              Vui lòng thử tìm kiếm với từ khóa khác hoặc chọn danh mục khác.
            </p>
          </div>
        )}

        {/* Danh Sách Món Ăn (Product Grid) */}
        {!loading && !error && products.length > 0 && (
          <div
            data-testid="product-grid"
            className="grid grid-cols-2 gap-3.5 pb-8"
          >
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
