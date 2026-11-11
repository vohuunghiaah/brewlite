
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Product } from '../lib/api-client';
import { Plus, AlertCircle, Coffee } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  onSelect?: (product: Product) => void;
}

export function formatVND(amount: number | string): string {
  const num = typeof amount === 'string' ? Number.parseFloat(amount) : amount;

  if (!Number.isFinite(num)) return 'Liên hệ';

  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(num);
}

export function ProductCard({ product, onSelect }: ProductCardProps) {
  const [imageError, setImageError] = useState(false);

  const isOutOfStock = product.stock <= 0 || !product.isAvailable;

  return (
    <article
      data-testid={`product-card-${product.id}`}
      className={`group flex min-h-[156px] overflow-hidden rounded-2xl border border-[#EFE4D9] bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg md:min-h-0 md:flex-col ${
        isOutOfStock ? 'opacity-80' : ''
      }`}
    >
      {/* PRODUCT IMAGE */}
      <div className="relative aspect-square w-[36%] shrink-0 overflow-hidden bg-[#F1E7DC] md:w-full">
        {!imageError && product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            loading="lazy"
            onError={() => setImageError(true)}
            className={`h-full w-full object-cover transition duration-500 group-hover:scale-105 ${
              isOutOfStock ? 'grayscale-[0.35]' : ''
            }`}
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-[#F3E7DB] to-[#E8D2BF] text-[#A77B5C]">
            <Coffee size={34} strokeWidth={1.3} />
            <span className="text-[10px] font-semibold">BrewLite</span>
          </div>
        )}

        {/* CATEGORY */}
        <span className="absolute left-2 top-2 max-w-[85%] truncate rounded-full bg-[#42291D]/80 px-3 py-1.5 text-[10px] font-bold text-white backdrop-blur-sm md:left-3 md:top-3 md:text-xs">
          {product.category}
        </span>

        {/* OUT OF STOCK */}
        {isOutOfStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 p-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-500 px-3 py-1.5 text-[10px] font-bold text-white sm:text-xs">
              <AlertCircle size={13} />
              Hết hàng
            </span>
          </div>
        )}
      </div>

      {/* PRODUCT INFORMATION */}
      <div className="flex min-w-0 flex-1 flex-col justify-between p-3 sm:p-4 md:p-4 lg:p-5">
        <div className="min-w-0">
          <h3 className="line-clamp-1 text-sm font-extrabold text-[#42291D] transition group-hover:text-[#A45A2A] sm:text-base md:min-h-6 lg:text-lg">
            {product.name}
          </h3>

          <p className="mt-1.5 line-clamp-2 text-[11px] leading-relaxed text-[#947D6D] sm:text-sm md:min-h-10">
            {product.description || 'Hương vị thơm ngon dành cho bạn.'}
          </p>
        </div>

        {/* PRICE AND ACTION */}
        <div className="mt-3 flex items-end justify-between gap-2 md:mt-5">
          <div className="min-w-0">
            <span className="block text-[10px] text-[#A68D7A] sm:text-xs">
              Giá từ
            </span>

            <span className="mt-1 block truncate text-sm font-extrabold text-[#713A1C] sm:text-base lg:text-lg">
              {formatVND(product.basePrice)}
            </span>
          </div>

          {isOutOfStock ? (
            <button
              type="button"
              disabled
              title="Sản phẩm tạm hết hàng"
              className="flex shrink-0 cursor-not-allowed items-center gap-1 rounded-full bg-stone-100 px-3 py-2 text-[10px] font-semibold text-stone-400 sm:text-xs"
            >
              <Plus size={14} />
              <span>Hết hàng</span>
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
              aria-label={`Chọn món ${product.name}`}
              className="flex shrink-0 items-center gap-1.5 rounded-full bg-gradient-to-r from-[#A85D32] to-[#85421F] px-3 py-2 text-[10px] font-bold text-white shadow-sm transition hover:brightness-110 active:scale-95 sm:px-4 sm:text-xs"
            >
              <Plus size={15} />
              Thêm
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
