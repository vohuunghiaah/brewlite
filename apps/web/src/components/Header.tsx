import React from 'react';
import Link from 'next/link';
import { Coffee, ShoppingBag, User } from 'lucide-react';

interface HeaderProps {
  cartItemCount?: number;
}

export function Header({ cartItemCount = 0 }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-brand-100 shadow-sm">
      <div className="max-w-md mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-brand-800 text-lg">
          <div className="w-8 h-8 rounded-full bg-brand-500 text-white flex items-center justify-center">
            <Coffee className="w-4 h-4" />
          </div>
          <span>BrewLite</span>
        </Link>

        <div className="flex items-center gap-3">
          <Link
            href="/cart"
            className="relative p-2 text-brand-700 hover:text-brand-900 transition-colors"
            aria-label="Giỏ hàng"
          >
            <ShoppingBag className="w-5 h-5" />
            {cartItemCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-amber-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                {cartItemCount}
              </span>
            )}
          </Link>
          <Link
            href="/login"
            className="p-2 text-brand-700 hover:text-brand-900 transition-colors"
            aria-label="Tài khoản"
          >
            <User className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </header>
  );
}
