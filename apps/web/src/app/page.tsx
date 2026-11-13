
'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Header } from '../components/Header';
import { ProductCard } from '../components/ProductCard';
import { MenuSkeleton } from '../components/MenuSkeleton';
import { Product, fetchProducts } from '../lib/api-client';

import {
  Coffee,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Crown,
  AlertCircle,
  Heart,
  Leaf,
  Zap,
  Phone,
  Mail,
  MapPin,
  Facebook,
  Instagram,
  ChevronDown,
  Clock,
  MessageCircle,
} from 'lucide-react';

const CATEGORIES = ['Tất cả', 'Cà phê', 'Trà', 'Đá xay'];

const FAQS = [
  {
    question: 'BrewLite có những loại thức uống nào?',
    answer:
      'BrewLite cung cấp nhiều lựa chọn thức uống như cà phê, trà và đá xay. Bạn có thể khám phá danh mục sản phẩm ngay trên thực đơn.',
  },
  {
    question: 'Làm thế nào để tìm thức uống yêu thích?',
    answer:
      'Bạn có thể sử dụng ô tìm kiếm trên Header để tìm sản phẩm theo tên hoặc chọn danh mục phù hợp.',
  },
  {
    question: 'Tôi có thể xem thông tin chi tiết sản phẩm ở đâu?',
    answer:
      'Nhấn vào nút chọn món trên từng sản phẩm để truy cập trang chi tiết và xem thêm thông tin.',
  },
  {
    question: 'Tôi liên hệ BrewLite bằng cách nào?',
    answer:
      'Bạn có thể liên hệ qua các kênh hỗ trợ được hiển thị ở phần Liên hệ bên dưới trang.',
  },
];

const BENEFITS = [
  {
    icon: Coffee,
    title: 'Hương vị đặc biệt',
    description: 'Đa dạng lựa chọn thức uống.',
  },
  {
    icon: Leaf,
    title: 'Chất lượng',
    description: 'Chú trọng nguyên liệu và hương vị.',
  },
  {
    icon: Zap,
    title: 'Tiện lợi',
    description: 'Khám phá và chọn món dễ dàng.',
  },
  {
    icon: Heart,
    title: 'Tận tâm',
    description: 'Quan tâm đến trải nghiệm khách hàng.',
  },
];

export default function MenuPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('Tất cả');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const requestId = useRef(0);

  // Fetch products from Backend
  const loadData = async (category?: string, search?: string) => {
    const currentRequest = ++requestId.current;

    try {
      setLoading(true);
      setError(null);

      const data = await fetchProducts(category, search);

      if (currentRequest === requestId.current) {
        setProducts(data);
      }
    } catch (err: unknown) {
      if (currentRequest === requestId.current) {
        setError(
          err instanceof Error
            ? err.message
            : 'Đã có lỗi xảy ra khi tải thực đơn.',
        );
      }
    } finally {
      if (currentRequest === requestId.current) {
        setLoading(false);
      }
    }
  };

  // Load products when category changes
  useEffect(() => {
    loadData(selectedCategory, searchQuery);

    return () => {
      requestId.current++;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory]);

  // Search
  const handleSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    loadData(selectedCategory, searchQuery);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    loadData(selectedCategory, '');
  };

  // Reset filters
  const resetFilters = () => {
    setSearchQuery('');

    if (selectedCategory === 'Tất cả') {
      loadData('Tất cả', '');
    } else {
      setSelectedCategory('Tất cả');
    }
  };

  // Scroll to menu
  const scrollToMenu = () => {
    document.getElementById('menu')?.scrollIntoView({
      behavior: 'smooth',
    });
  };

  const availableCount = products.filter(
    (product) => product.stock > 0 && product.isAvailable,
  ).length;

  return (
    <div className="min-h-screen bg-[#FAF7F3] text-[#42291D]">

      {/* HEADER */}
      <Header
        cartItemCount={0}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSearchSubmit={handleSearchSubmit}
        onClearSearch={handleClearSearch}
      />

      <main className="mx-auto w-full max-w-[1600px] px-4 pb-12 pt-5 sm:px-6 sm:pt-8 md:px-8 lg:px-10 lg:pt-10 2xl:px-14">

        {/* HERO BANNER */}
        <section className="relative isolate min-h-[230px] overflow-hidden rounded-[28px] bg-gradient-to-br from-[#3B2117] via-[#63391F] to-[#8C4B25] px-6 py-8 text-white shadow-lg sm:min-h-[270px] sm:px-10 sm:py-10 md:min-h-[300px] md:px-12 md:py-12 lg:min-h-[340px] lg:px-16 lg:py-14 xl:rounded-[36px]">

          <div className="pointer-events-none absolute -right-12 -top-20 h-64 w-64 rounded-full border-[28px] border-white/[0.06] md:h-80 md:w-80" />

          <div className="pointer-events-none absolute -bottom-32 right-20 h-64 w-64 rounded-full bg-[#D99A60]/10 blur-3xl md:h-80 md:w-80" />

          <div className="relative z-10 max-w-[760px]">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#F3C99E] sm:text-xs md:mb-6">
              <Sparkles size={13} />
              Your daily coffee moment
            </div>

            <h1 className="text-[30px] font-extrabold leading-[1.15] tracking-tight sm:text-4xl md:text-5xl lg:text-[56px]">
              Một chút cà phê,
              <br />
              <span className="text-[#F0B276]">
                một ngày tuyệt vời.
              </span>
            </h1>

            <p className="mt-4 max-w-[460px] text-sm leading-6 text-[#F1E3D7] sm:text-base md:mt-5 md:text-lg md:leading-7">
              Khám phá những thức uống yêu thích được pha chế dành riêng cho
              từng khoảnh khắc của bạn.
            </p>

            <button
              type="button"
              onClick={scrollToMenu}
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#E5A36A] px-5 py-3 text-sm font-bold text-[#3D291F] transition hover:bg-[#F0B77F] active:scale-95 md:mt-8 md:px-7 md:py-3.5 md:text-base"
            >
              Khám phá thực đơn
              <ArrowRight size={17} />
            </button>
          </div>

          <Coffee
            className="pointer-events-none absolute -bottom-8 -right-5 hidden h-52 w-52 rotate-[-15deg] text-white/[0.07] sm:block md:h-64 md:w-64 lg:h-80 lg:w-80"
            strokeWidth={1}
          />
        </section>

        {/* MENU */}
        <section id="menu" className="scroll-mt-28 pt-9 sm:pt-12 lg:pt-16">

          <div className="mb-5">
            <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-[#A45A2A]">
              <span className="h-px w-7 bg-[#A45A2A]" />
              Discover our menu
            </div>

            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl lg:text-4xl">
                  Thực đơn của chúng tôi
                </h2>

                <p className="mt-2 text-sm text-[#947D6D] sm:text-base">
                  Chọn thức uống yêu thích của bạn hôm nay.
                </p>
              </div>

              {!loading && !error && (
                <span className="text-sm font-semibold text-[#A45A2A]">
                  {products.length} thức uống
                </span>
              )}
            </div>
          </div>

          {/* CATEGORY FILTER */}
          <div className="mb-7 flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:gap-3">
            {CATEGORIES.map((category) => {
              const active = selectedCategory === category;

              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => setSelectedCategory(category)}
                  aria-pressed={active}
                  className={`shrink-0 rounded-full border px-5 py-2.5 text-xs font-semibold transition-all sm:text-sm md:px-6 md:py-3 ${
                    active
                      ? 'border-[#914D27] bg-[#914D27] text-white shadow-md shadow-[#914D27]/20'
                      : 'border-[#EDE1D7] bg-white text-[#765B49] hover:border-[#C28B63] hover:bg-[#F8EFE8]'
                  }`}
                >
                  {category}
                </button>
              );
            })}
          </div>

          {/* PRODUCT HEADING */}
          <div className="mb-5 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-base font-bold sm:text-lg lg:text-xl">
              <Crown size={19} className="text-[#C28A36]" />
              Thức uống dành cho bạn
            </h3>

            {!loading && !error && (
              <span className="text-xs text-[#947D6D] sm:text-sm">
                {availableCount} món có sẵn
              </span>
            )}
          </div>

          {/* LOADING */}
          {loading && <MenuSkeleton />}

          {/* ERROR */}
          {error && !loading && (
            <div className="rounded-2xl border border-red-100 bg-white px-5 py-10 text-center md:py-14">
              <AlertCircle className="mx-auto mb-3 h-9 w-9 text-red-400" />

              <h3 className="font-bold">
                Không thể tải thực đơn
              </h3>

              <p className="mt-2 text-sm text-[#947D6D]">
                {error}
              </p>

              <button
                type="button"
                onClick={() => loadData(selectedCategory, searchQuery)}
                className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#914D27] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#713A1C]"
              >
                <RefreshCw size={15} />
                Thử lại
              </button>
            </div>
          )}

          {/* EMPTY */}
          {!loading && !error && products.length === 0 && (
            <div className="rounded-2xl border border-[#EFE4D9] bg-white px-5 py-14 text-center md:py-20">
              <Coffee size={32} className="mx-auto text-[#C5A68E]" />

              <h3 className="mt-3 font-bold">
                Không tìm thấy thức uống
              </h3>

              <p className="mt-2 text-sm text-[#947D6D]">
                Thử tìm kiếm với từ khóa khác hoặc chọn danh mục khác nhé.
              </p>

              <button
                type="button"
                onClick={resetFilters}
                className="mt-5 rounded-full bg-[#914D27] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#713A1C]"
              >
                Xem tất cả sản phẩm
              </button>
            </div>
          )}

          {/* PRODUCT GRID */}
          {!loading && !error && products.length > 0 && (
            <div
              data-testid="product-grid"
              className="grid grid-cols-1 gap-4 pb-8 md:grid-cols-3 md:gap-4 lg:grid-cols-4 lg:gap-5"
            >
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </section>

        {/* WHY BREWLITE */}
        <section className="border-t border-[#EDE1D7] py-12 sm:py-16 lg:py-20">

          <div className="mb-7 text-center lg:mb-10">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#A45A2A]">
              The BrewLite difference
            </p>

            <h2 className="mt-2 text-2xl font-extrabold sm:text-3xl lg:text-4xl">
              Vì sao chọn BrewLite?
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#947D6D] sm:text-base">
              Chúng tôi muốn mỗi thức uống đều mang đến cho bạn một trải nghiệm
              thật dễ chịu.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5 lg:gap-6">
            {BENEFITS.map((item) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.title}
                  className="rounded-2xl border border-[#EFE4D9] bg-white p-4 transition hover:-translate-y-1 hover:shadow-md sm:p-5 lg:p-7"
                >
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[#F7EEE6] text-[#914D27] lg:h-14 lg:w-14">
                    <Icon size={22} />
                  </div>

                  <h3 className="text-sm font-bold lg:text-base">
                    {item.title}
                  </h3>

                  <p className="mt-2 text-xs leading-5 text-[#947D6D] sm:text-sm">
                    {item.description}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* FAQ */}
        <section className="border-t border-[#EDE1D7] py-12 sm:py-16 lg:py-20">

          <div className="mb-7 lg:mb-9">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#A45A2A]">
              Frequently asked questions
            </p>

            <h2 className="mt-2 text-2xl font-extrabold sm:text-3xl lg:text-4xl">
              Câu hỏi thường gặp
            </h2>

            <p className="mt-2 text-sm text-[#947D6D] sm:text-base">
              Một vài thông tin có thể bạn đang quan tâm.
            </p>
          </div>

          <div className="max-w-4xl space-y-3">
            {FAQS.map((faq, index) => {
              const isOpen = openFaq === index;

              return (
                <div
                  key={faq.question}
                  className="overflow-hidden rounded-2xl border border-[#EFE4D9] bg-white"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                    aria-expanded={isOpen}
                    className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left sm:px-5 md:py-5"
                  >
                    <span className="text-sm font-semibold text-[#42291D] sm:text-base">
                      {faq.question}
                    </span>

                    <ChevronDown
                      size={18}
                      className={`shrink-0 text-[#A45A2A] transition-transform ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {isOpen && (
                    <div className="border-t border-[#F1E8E0] px-4 py-4 text-sm leading-6 text-[#947D6D] sm:px-5">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* CONTACT */}
        <section
          id="contact"
          className="overflow-hidden rounded-[28px] bg-[#422719] px-5 py-8 text-white sm:px-9 sm:py-10 lg:rounded-[36px] lg:px-12 lg:py-14"
        >
          <div className="grid gap-8 md:grid-cols-2 md:gap-12 lg:items-center lg:gap-16">

            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#E5AD76]">
                Get in touch
              </p>

              <h2 className="mt-3 text-2xl font-extrabold sm:text-3xl lg:text-4xl">
                Chúng tôi luôn
                <span className="block text-[#E5AD76]">
                  sẵn sàng lắng nghe.
                </span>
              </h2>

              <p className="mt-3 max-w-sm text-sm leading-6 text-white/70 sm:text-base">
                Bạn có câu hỏi hoặc cần hỗ trợ? Hãy kết nối với BrewLite qua
                các kênh liên hệ bên dưới.
              </p>

              <a
                href="mailto:hello@brewlite.example"
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#E5AD76] px-5 py-3 text-sm font-bold text-[#422719] transition hover:bg-[#F0C18F]"
              >
                <MessageCircle size={17} />
                Gửi email cho chúng tôi
              </a>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">

              <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.06] p-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 text-[#E5AD76]">
                  <Phone size={21} />
                </div>

                <div>
                  <p className="text-xs text-white/60">Hotline demo</p>
                  <p className="mt-1 text-sm font-bold">0900 000 000</p>
                </div>
              </div>

              <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.06] p-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 text-[#E5AD76]">
                  <Mail size={21} />
                </div>

                <div className="min-w-0">
                  <p className="text-xs text-white/60">Email demo</p>
                  <p className="mt-1 break-all text-sm font-bold">
                    hello@brewlite.example
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.06] p-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 text-[#E5AD76]">
                  <MapPin size={21} />
                </div>

                <div>
                  <p className="text-xs text-white/60">Địa chỉ demo</p>
                  <p className="mt-1 text-sm font-bold">
                    123 Đường Coffee, TP. Hồ Chí Minh
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.06] p-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 text-[#E5AD76]">
                  <Clock size={21} />
                </div>

                <div>
                  <p className="text-xs text-white/60">Giờ hỗ trợ demo</p>
                  <p className="mt-1 text-sm font-bold">
                    08:00 – 22:00 mỗi ngày
                  </p>
                </div>
              </div>
            </div>
          </div>

          <p className="mt-6 border-t border-white/10 pt-4 text-[10px] leading-5 text-white/40">
            * Các thông tin liên hệ trong khu vực này là dữ liệu minh họa cho
            giao diện dự án, chưa phải thông tin liên hệ chính thức.
          </p>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-[#EFE4D9] bg-white">
        <div className="mx-auto max-w-[1600px] px-4 py-9 sm:px-6 md:px-8 lg:px-10 lg:py-12 2xl:px-14">

          <div className="grid grid-cols-2 gap-8 md:grid-cols-3 lg:gap-12">

            {/* BRAND */}
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 text-lg font-extrabold text-[#42291D]">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#914D27] text-white">
                  <Coffee size={18} />
                </div>

                BrewLite<span className="text-[#C47A42]">.</span>
              </div>

              <p className="mt-3 max-w-xs text-xs leading-6 text-[#947D6D] sm:text-sm">
                Một chút cà phê, một ngày tuyệt vời. Cảm ơn bạn đã lựa chọn
                BrewLite.
              </p>

              <p className="mt-3 text-[10px] text-[#A89586]">
                Thông tin liên hệ trong dự án là dữ liệu demo.
              </p>
            </div>

            {/* EXPLORE */}
            <div>
              <h3 className="text-sm font-bold text-[#42291D]">
                Khám phá
              </h3>

              <div className="mt-4 flex flex-col gap-3 text-xs text-[#947D6D] sm:text-sm">
                <a href="#menu" className="hover:text-[#914D27]">
                  Thực đơn
                </a>

                <a href="#contact" className="hover:text-[#914D27]">
                  Liên hệ
                </a>

                <a href="#menu" className="hover:text-[#914D27]">
                  Sản phẩm
                </a>
              </div>
            </div>

            {/* CONNECT */}
            <div>
              <h3 className="text-sm font-bold text-[#42291D]">
                Kết nối
              </h3>

              <div className="mt-4 flex flex-col gap-3 text-xs text-[#947D6D] sm:text-sm">
                <a
                  href="mailto:hello@brewlite.example"
                  className="flex items-center gap-2 hover:text-[#914D27]"
                >
                  <Mail size={15} />
                  Email
                </a>

                <span className="flex items-center gap-2">
                  <Facebook size={15} />
                  Facebook
                </span>

                <span className="flex items-center gap-2">
                  <Instagram size={15} />
                  Instagram
                </span>
              </div>
            </div>
          </div>

          <div className="mt-8 border-t border-[#EFE4D9] pt-5 text-center text-[11px] text-[#A89586]">
            © 2026 BrewLite. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
