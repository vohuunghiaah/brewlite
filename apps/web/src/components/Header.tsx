
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Coffee,
  ShoppingBag,
  User,
  Search,
  X,
  ArrowRight,
} from 'lucide-react';

interface HeaderProps {
  cartItemCount?: number;
  searchQuery?: string;
  onSearchChange?: (value: string) => void;
  onSearchSubmit?: (e: React.FormEvent<HTMLFormElement>) => void;
  onClearSearch?: () => void;
}

export function Header({
  cartItemCount = 0,
  searchQuery = '',
  onSearchChange,
  onSearchSubmit,
  onClearSearch,
}: HeaderProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSearchSubmit?.(e);
  };

  return (
    <header className="sticky top-0 z-50 border-b border-[#EFE4D9] bg-[#FFFCF9]/95 shadow-sm backdrop-blur-xl">

      {/* MAIN HEADER */}
      <div className="mx-auto flex h-[64px] max-w-[1440px] items-center justify-between px-4 sm:px-6 md:h-[72px] lg:px-10 2xl:px-14">

        {/* LOGO */}
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2.5"
          aria-label="BrewLite Home"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#914D27] text-white">
            <Coffee size={19} />
          </div>

          <span className="text-xl font-extrabold tracking-tight text-[#42291D]">
            BrewLite<span className="text-[#C47A42]">.</span>
          </span>
        </Link>

        {/* DESKTOP & TABLET SEARCH */}
        <form
          onSubmit={handleSubmit}
          className="mx-6 hidden w-full max-w-[360px] items-center gap-2 rounded-full border border-[#EADCCF] bg-white px-3 py-1.5 shadow-sm md:flex lg:max-w-[420px] xl:max-w-[480px]"
        >
          <Search
            size={18}
            className="shrink-0 text-[#A78A75]"
          />

          <input
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange?.(e.target.value)}
            placeholder="Tìm cà phê, trà đào, đá xay..."
            aria-label="Tìm kiếm thức uống"
            className="min-w-0 flex-1 bg-transparent py-2 text-sm text-[#42291D] outline-none placeholder:text-[#B6A394]"
          />

          {searchQuery && (
            <button
              type="button"
              onClick={onClearSearch}
              aria-label="Xóa tìm kiếm"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[#A78A75] transition hover:bg-[#F5EAE0]"
            >
              <X size={15} />
            </button>
          )}

          <button
            type="submit"
            className="shrink-0 rounded-full bg-[#914D27] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#713A1C]"
          >
            Tìm
          </button>
        </form>

        {/* HEADER ACTIONS */}
        <div className="flex shrink-0 items-center gap-2">

          {/* MOBILE SEARCH ICON */}
          <button
            type="button"
            onClick={() => setIsSearchOpen((prev) => !prev)}
            aria-label={isSearchOpen ? 'Đóng tìm kiếm' : 'Mở tìm kiếm'}
            aria-expanded={isSearchOpen}
            className={`flex h-10 w-10 items-center justify-center rounded-full transition md:hidden ${
              isSearchOpen
                ? 'bg-[#F1E4D8] text-[#914D27]'
                : 'text-[#76513B] hover:bg-[#F5EAE0]'
            }`}
          >
            {isSearchOpen ? <X size={21} /> : <Search size={21} />}
          </button>

          {/* CART */}
          <Link
            href="/cart"
            aria-label="Giỏ hàng"
            className="relative flex h-10 w-10 items-center justify-center rounded-full text-[#76513B] transition hover:bg-[#F5EAE0]"
          >
            <ShoppingBag size={20} />

            {cartItemCount > 0 && (
              <span className="absolute right-0.5 top-0.5 flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-[#B85B35] px-1 text-[10px] font-bold text-white">
                {cartItemCount}
              </span>
            )}
          </Link>

          {/* ACCOUNT */}
          <Link
            href="/login"
            aria-label="Tài khoản"
            className="flex h-10 w-10 items-center justify-center rounded-full text-[#76513B] transition hover:bg-[#F5EAE0]"
          >
            <User size={21} />
          </Link>
        </div>
      </div>

      {/* MOBILE SEARCH INPUT */}
      <div
        className={`grid transition-all duration-300 ease-in-out md:hidden ${
          isSearchOpen
            ? 'grid-rows-[1fr] opacity-100'
            : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden">
          <div className="mx-auto max-w-[1440px] px-4 pb-4 sm:px-6">
            <form
              onSubmit={handleSubmit}
              className="flex items-center gap-2 rounded-2xl border border-[#EADCCF] bg-white p-1.5 shadow-sm"
            >
              <Search
                size={19}
                className="ml-2 shrink-0 text-[#A78A75]"
              />

              <input
                type="search"
                value={searchQuery}
                onChange={(e) => onSearchChange?.(e.target.value)}
                placeholder="Tìm cà phê, trà đào, đá xay..."
                aria-label="Tìm kiếm thức uống"
                className="min-w-0 flex-1 bg-transparent py-2 text-sm text-[#42291D] outline-none placeholder:text-[#B6A394]"
              />

              {searchQuery && (
                <button
                  type="button"
                  onClick={onClearSearch}
                  aria-label="Xóa tìm kiếm"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#A78A75] hover:bg-[#F5EAE0]"
                >
                  <X size={16} />
                </button>
              )}

              <button
                type="submit"
                className="flex shrink-0 items-center gap-1.5 rounded-xl bg-[#914D27] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#713A1C]"
              >
                Tìm
                <ArrowRight size={14} />
              </button>
            </form>
          </div>
        </div>
      </div>
    </header>
  );
}
