import React from 'react';
import Link from 'next/link';
import { Product } from '../lib/api-client';
import { Plus, AlertCircle } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  onSelect?: (product: Product) => void;
}

export function formatVND(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(num);
}

export function ProductCard({ product, onSelect }: ProductCardProps) {
  const isOutOfStock = product.stock <= 0 || !product.isAvailable;

  return (
    <div
      data-testid={`product-card-${product.id}`}
      className={`group relative bg-white rounded-2xl overflow-hidden border border-brand-100 shadow-sm transition-all hover:shadow-md flex flex-col ${
        isOutOfStock ? 'opacity-70 grayscale-[0.3]' : ''
      }`}
    >
      <div className="relative aspect-square w-full bg-brand-50 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={product.imageUrl}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
        <span className="absolute top-2 left-2 px-2.5 py-0.5 rounded-full text-xs font-medium bg-black/60 text-white backdrop-blur">
          {product.category}
        </span>
        {isOutOfStock && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-[1px]">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-600 text-white flex items-center gap-1 shadow">
              <AlertCircle className="w-3.5 h-3.5" />
              Tạm hết hàng
            </span>
          </div>
        )}
      </div>

      <div className="p-3.5 flex flex-col flex-grow justify-between">
        <div>
          <h3 className="font-semibold text-brand-900 text-base line-clamp-1">
            {product.name}
          </h3>
          <p className="text-xs text-stone-500 mt-1 line-clamp-2 leading-relaxed">
            {product.description || 'Hương vị cà phê nguyên bản thơm lừng.'}
          </p>
        </div>

        <div className="mt-3 pt-2.5 border-t border-brand-50 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-stone-400 block font-medium">Giá từ</span>
            <span className="text-brand-700 font-bold text-sm">
              {formatVND(product.basePrice)}
            </span>
          </div>

          {isOutOfStock ? (
            <button
              disabled
              className="p-2 rounded-xl bg-stone-100 text-stone-400 cursor-not-allowed"
              title="Sản phẩm tạm hết hàng"
            >
              <Plus className="w-4 h-4" />
            </button>
          ) : (
            <Link
              href={`/products/${product.id}`}
              onClick={(e) => {
                if (onSelect) {
                  e.preventDefault();
                  onSelect(product);
                }
              }}
              className="p-2 rounded-xl bg-brand-500 text-white hover:bg-brand-600 active:scale-95 transition-all shadow-sm flex items-center justify-center"
              aria-label={`Chọn món ${product.name}`}
            >
              <Plus className="w-4 h-4" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
