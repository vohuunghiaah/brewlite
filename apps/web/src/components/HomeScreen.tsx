"use client";

import { useMemo } from "react";
import {
  ChevronRight,
  Flame,
  Coffee,
  Sparkles,
  Smartphone,
  BellRing,
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";
import { Product, ProductCard } from "./MenuScreen";

interface HomeScreenProps {
  products: Product[];
  loading?: boolean;
  onNavigateToMenu: (category?: string) => void;
  onOpenProduct: (product: Product) => void;
  onQuickAdd: (product: Product) => void;
  cartCounts?: Record<number, number>;
}

interface CategoryCardItem {
  id: string;
  name: string;
  categoryQuery: string;
  tagline: string;
  description: string;
  imageUrl: string;
}

const CATEGORY_CARDS: CategoryCardItem[] = [
  {
    id: "traditional-coffee",
    name: "Cà phê truyền thống",
    categoryQuery: "Cà phê truyền thống",
    tagline: "Đậm vị nguyên bản",
    description: "Robusta Đắk Lắk pha phin truyền thống thơm lừng, đen đá và sữa đá chuẩn gu Việt.",
    imageUrl: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "espresso-coldbrew",
    name: "Espresso & Cold Brew",
    categoryQuery: "Espresso & Cold Brew",
    tagline: "Tinh tế & Thanh mát",
    description: "Arabica Cầu Đất chiết xuất áp suất cao và ủ lạnh 16 giờ thanh khiết sảng khoái.",
    imageUrl: "https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "matcha-cacao",
    name: "Matcha & Cacao",
    categoryQuery: "Matcha & Cacao",
    tagline: "Béo ngậy ngọt ngào",
    description: "Trà xanh Uji Nhật Bản thanh mát kết hợp Cacao nguyên chất sánh mịn thơm béo.",
    imageUrl: "https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "fruit-tea",
    name: "Trà trái cây",
    categoryQuery: "Trà trái cây",
    tagline: "Thanh nhiệt tự nhiên",
    description: "Trà hoa quả nhiệt đới tươi mát cùng đào mọng, vải ngọt lịm và mật ong hoa rừng.",
    imageUrl: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=800&q=80",
  },
];

const WORKFLOW_STEPS = [
  {
    step: "01",
    title: "Chọn đồ uống",
    desc: "Khám phá danh mục món phong phú và xem tình trạng tồn kho thực tế của từng ly.",
    icon: Coffee,
  },
  {
    step: "02",
    title: "Tùy chỉnh khẩu vị",
    desc: "Cá nhân hóa kích cỡ ly, lượng đá, mức đường và các loại topping theo đúng sở thích.",
    icon: Sparkles,
  },
  {
    step: "03",
    title: "Mô phỏng thanh toán",
    desc: "Quét mã VietQR hoặc MoMo an toàn (mô phỏng không phát sinh giao dịch tiền tệ thực tế).",
    icon: Smartphone,
  },
  {
    step: "04",
    title: "Nhận vé chuông điện tử",
    desc: "Theo dõi số đơn và nhận thông báo Digital Buzzer rung chuông lấy đồ uống tại quầy.",
    icon: BellRing,
  },
];

export default function HomeScreen({
  products,
  loading = false,
  onNavigateToMenu,
  onOpenProduct,
  onQuickAdd,
  cartCounts = {},
}: HomeScreenProps) {
  // Curate 4 to 6 featured products from real catalog
  const featuredProducts = useMemo(() => {
    if (!products || products.length === 0) return [];
    return products.slice(0, 6);
  }, [products]);

  return (
    <div className="homeScreen flex flex-col w-full pb-16">
      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#2B1810] via-[#3D261D] to-[#4A2E23] text-[#FAF6F0] py-16 sm:py-24 px-4 sm:px-6 lg:px-8 border-b border-[#EFE8DF]/10">
        <div className="max-w-6xl mx-auto relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          {/* Hero text */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 bg-[#C28D58]/20 border border-[#C28D58]/40 px-3.5 py-1.5 rounded-full text-xs font-bold text-[#E8C99A] tracking-wider uppercase backdrop-blur-sm">
              <Flame size={14} className="text-[#C28D58]" fill="currentColor" />
              <span>Trải nghiệm Cà phê Đặc sản & Đặt món Thông minh</span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black leading-tight tracking-tight">
              Mỗi ly cà phê,<br />
              <span className="text-[#C28D58]">một khoảnh khắc.</span>
            </h1>

            <p className="text-sm sm:text-base text-[#FAF6F0]/80 max-w-xl leading-relaxed">
              Tận hưởng hương vị cà phê thủ công chọn lọc từ cao nguyên Việt Nam kết hợp cùng quy trình gọi món hiện đại, kiểm tra tồn kho thời gian thực và trải nghiệm vé chuông điện tử số hóa.
            </p>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-3.5 pt-2">
              <button
                type="button"
                onClick={() => onNavigateToMenu()}
                className="bg-[#C28D58] hover:bg-white hover:text-[#3D261D] text-white px-7 py-3.5 rounded-2xl font-bold text-sm sm:text-base transition-all duration-300 shadow-lg hover:shadow-xl inline-flex items-center gap-2 active:scale-95"
              >
                <span>Khám phá thực đơn</span>
                <ChevronRight size={18} strokeWidth={2.5} />
              </button>

              <button
                type="button"
                onClick={() => onNavigateToMenu()}
                className="bg-white/10 hover:bg-white/20 text-[#FAF6F0] border border-white/20 px-6 py-3.5 rounded-2xl font-bold text-sm sm:text-base transition-all duration-300 backdrop-blur-sm inline-flex items-center gap-2 active:scale-95"
              >
                <span>Đặt đồ uống</span>
                <ArrowRight size={16} />
              </button>
            </div>

            {/* Key feature attributes */}
            <div className="grid grid-cols-3 gap-3 pt-4 border-t border-white/10 max-w-lg">
              <div className="flex flex-col">
                <span className="text-2xl sm:text-3xl font-black text-[#C28D58]">
                  {products.length > 0 ? `${products.length}+` : "15"}
                </span>
                <span className="text-[11px] text-[#FAF6F0]/70 font-medium">Món đồ uống</span>
              </div>
              <div className="flex flex-col">
                <span className="text-2xl sm:text-3xl font-black text-[#C28D58]">100%</span>
                <span className="text-[11px] text-[#FAF6F0]/70 font-medium">Cashless & Chuông số</span>
              </div>
              <div className="flex flex-col">
                <span className="text-2xl sm:text-3xl font-black text-[#C28D58]">4</span>
                <span className="text-[11px] text-[#FAF6F0]/70 font-medium">Nhóm hương vị chọn lọc</span>
              </div>
            </div>
          </div>

          {/* Hero editorial image */}
          <div className="lg:col-span-5 relative">
            <div className="relative mx-auto max-w-md aspect-[4/5] rounded-3xl overflow-hidden shadow-2xl border-4 border-white/10 bg-[#3D261D]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1000&q=85"
                alt="BrewLite Specialty Coffee"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#2B1810]/80 via-transparent to-transparent" />

              {/* Floating feature card */}
              <div className="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur-md p-4 rounded-2xl border border-white/40 text-[#3D261D] shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={18} className="text-[#059669]" />
                    <span className="text-xs font-bold">Hạt cà phê nguyên bản</span>
                  </div>
                  <span className="text-[10px] font-black uppercase text-[#C28D58] bg-[#FAF6F0] px-2 py-0.5 rounded-full">
                    Specialty
                  </span>
                </div>
                <p className="text-[11px] text-[#6B4235] mt-1 leading-snug">
                  Rang mộc thủ công, lưu giữ trọn vẹn hương thơm tự nhiên và lớp crema óng ả.
                </p>
              </div>
            </div>

            {/* Ambient decorative glow */}
            <div className="absolute -top-10 -right-10 w-60 h-60 bg-[#C28D58]/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-60 h-60 bg-[#C28D58]/15 rounded-full blur-3xl pointer-events-none" />
          </div>
        </div>
      </section>

      {/* 2. DRINK CATEGORY DISCOVERY */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20 w-full">
        <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-12 space-y-2.5">
          <span className="text-xs font-bold text-[#C28D58] uppercase tracking-widest">
            Danh mục tuyển chọn
          </span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#3D261D] tracking-tight">
            Khám phá hương vị yêu thích
          </h2>
          <p className="text-xs sm:text-sm text-[#6B4235] leading-relaxed">
            Chọn nhóm đồ uống bạn quan tâm để chuyển ngay đến thực đơn với bộ lọc tương ứng.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {CATEGORY_CARDS.map((cat) => (
            <div
              key={cat.id}
              onClick={() => onNavigateToMenu(cat.categoryQuery)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onNavigateToMenu(cat.categoryQuery);
                }
              }}
              className="categoryCard group relative bg-white border border-[#EFE8DF] rounded-3xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col"
            >
              {/* Category Image */}
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#FAF6F0]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={cat.imageUrl}
                  alt={cat.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <span className="absolute bottom-2.5 left-3 text-[11px] font-bold text-[#FAF6F0] bg-[#3D261D]/75 backdrop-blur-sm px-2.5 py-0.5 rounded-full">
                  {cat.tagline}
                </span>
              </div>

              {/* Category Content */}
              <div className="p-4 sm:p-5 flex flex-col flex-1 justify-between gap-3">
                <div>
                  <h3 className="font-extrabold text-[#3D261D] text-base group-hover:text-[#C28D58] transition-colors flex items-center justify-between">
                    <span>{cat.name}</span>
                    <ChevronRight size={16} className="text-[#C28D58] transition-transform group-hover:translate-x-1" />
                  </h3>
                  <p className="text-xs text-[#6B4235] mt-1.5 line-clamp-2 leading-relaxed">
                    {cat.description}
                  </p>
                </div>

                <div className="pt-2 border-t border-[#FAF6F0] flex items-center text-xs font-bold text-[#C28D58] group-hover:underline">
                  <span>Xem các món</span>
                  <ArrowRight size={13} className="ml-1" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3. FEATURED DRINKS SECTION */}
      <section className="bg-[#FAF6F0]/70 py-14 sm:py-20 border-y border-[#EFE8DF]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 sm:mb-10">
            <div>
              <span className="text-xs font-bold text-[#C28D58] uppercase tracking-widest">
                Đặc sản BrewLite
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#3D261D] tracking-tight mt-1">
                Món nổi bật hôm nay
              </h2>
              <p className="text-xs sm:text-sm text-[#6B4235] mt-1">
                Các món đồ uống tuyển chọn với dữ liệu giá và tình trạng tồn kho thực tế.
              </p>
            </div>

            <button
              type="button"
              onClick={() => onNavigateToMenu()}
              className="text-xs sm:text-sm font-bold text-[#3D261D] hover:text-[#C28D58] inline-flex items-center gap-1.5 self-start sm:self-auto py-2 transition-colors"
            >
              <span>Xem toàn bộ thực đơn</span>
              <ArrowRight size={15} />
            </button>
          </div>

          {/* Grid of featured products using real ProductCard */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-white rounded-2xl p-4 border border-[#EFE8DF] space-y-3">
                  <div className="aspect-[4/3] skeleton rounded-xl" />
                  <div className="h-4 skeleton w-3/4" />
                  <div className="h-3 skeleton w-full" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
              {featuredProducts.map((product) => (
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

          <div className="text-center mt-10">
            <button
              type="button"
              onClick={() => onNavigateToMenu()}
              className="bg-[#3D261D] hover:bg-[#C28D58] text-white px-8 py-3.5 rounded-2xl font-bold text-sm transition-all duration-200 shadow-md inline-flex items-center gap-2 active:scale-95"
            >
              <span>Xem toàn bộ {products.length} món trong thực đơn</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </section>

      {/* 4. HOW BREWLITE WORKS SECTION */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 w-full">
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-2.5">
          <span className="text-xs font-bold text-[#C28D58] uppercase tracking-widest">
            Quy trình phục vụ
          </span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#3D261D] tracking-tight">
            Cách BrewLite hoạt động
          </h2>
          <p className="text-xs sm:text-sm text-[#6B4235] leading-relaxed">
            Mô hình gọi món tự phục vụ không thu ngân (Cashierless), thanh toán không tiền mặt và vé chuông điện tử số hóa.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {WORKFLOW_STEPS.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.step}
                className="bg-white border border-[#EFE8DF] rounded-3xl p-6 relative flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-[#FAF6F0] flex items-center justify-center text-[#C28D58]">
                      <Icon size={22} strokeWidth={2.2} />
                    </div>
                    <span className="text-3xl font-black text-[#EFE8DF]">
                      {item.step}
                    </span>
                  </div>

                  <h3 className="font-extrabold text-[#3D261D] text-base mb-2">
                    {item.title}
                  </h3>
                  <p className="text-xs text-[#6B4235] leading-relaxed">
                    {item.desc}
                  </p>
                </div>

                <div className="mt-5 pt-3 border-t border-[#FAF6F0] flex items-center gap-1 text-[11px] font-bold text-[#C28D58]">
                  <CheckCircle2 size={13} />
                  <span>Nhanh chóng & Tiện lợi</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Disclaimer banner */}
        <div className="mt-8 bg-[#FAF6F0] border border-[#EFE8DF] rounded-2xl p-4 flex items-center gap-3 text-xs text-[#6B4235]">
          <ShieldCheck size={20} className="text-[#C28D58] shrink-0" />
          <span>
            <strong>Lưu ý giao dịch:</strong> Tính năng thanh toán tại BrewLite hoạt động ở chế độ mô phỏng (Simulated Cashless), không trừ tiền thật từ tài khoản ngân hàng của bạn.
          </span>
        </div>
      </section>

      {/* 5. BRAND STORY & FINAL CTA */}
      <section className="bg-gradient-to-r from-[#3D261D] to-[#2B1810] text-[#FAF6F0] py-16 sm:py-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="max-w-4xl mx-auto text-center space-y-6 relative z-10">
          <div className="inline-block bg-[#C28D58]/20 border border-[#C28D58]/40 px-3.5 py-1 rounded-full text-xs font-bold text-[#E8C99A] uppercase tracking-wider">
            Câu chuyện BrewLite
          </div>

          <h2 className="text-2xl sm:text-4xl font-black leading-tight tracking-tight">
            Nơi công nghệ nâng niu hương vị cà phê mộc
          </h2>

          <p className="text-xs sm:text-sm text-[#FAF6F0]/80 leading-relaxed max-w-2xl mx-auto">
            Chúng tôi tin rằng việc gọi món nhanh chóng không làm mất đi sự ấm cúng của quán cà phê. BrewLite tối ưu hóa toàn bộ quá trình chọn món, kiểm soát tồn kho và nhận thông báo chuông điện tử, để mỗi ngụm cà phê của bạn đều là một trải nghiệm trọn vẹn.
          </p>

          <div className="pt-2">
            <button
              type="button"
              onClick={() => onNavigateToMenu()}
              className="bg-[#C28D58] hover:bg-white hover:text-[#3D261D] text-white px-8 py-4 rounded-2xl font-bold text-sm sm:text-base transition-all duration-300 shadow-xl inline-flex items-center gap-2 active:scale-95"
            >
              <span>Bắt đầu đặt món ngay</span>
              <ArrowRight size={18} strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute left-0 bottom-0 w-80 h-80 bg-[#C28D58]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-0 top-0 w-80 h-80 bg-[#C28D58]/10 rounded-full blur-3xl pointer-events-none" />
      </section>

      {/* 6. CLEAN FOOTER */}
      <footer className="bg-white border-t border-[#EFE8DF] pt-12 pb-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 pb-8 border-b border-[#EFE8DF]">
          {/* Brand */}
          <div className="space-y-1 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2">
              <div className="w-7 h-7 bg-[#3D261D] rounded-lg flex items-center justify-center text-white">
                <Coffee size={15} />
              </div>
              <span className="font-extrabold text-[#3D261D] text-lg tracking-tight">BrewLite</span>
            </div>
            <p className="text-xs text-[#6B4235]">
              Hệ thống đặt đồ uống tự phục vụ và chuông điện tử thông minh.
            </p>
          </div>

          {/* Functional navigation links */}
          <div className="flex items-center gap-6 text-xs font-bold text-[#6B4235]">
            <button
              type="button"
              onClick={() => {
                if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="hover:text-[#C28D58] transition-colors"
            >
              Trang chủ
            </button>
            <button
              type="button"
              onClick={() => onNavigateToMenu()}
              className="hover:text-[#C28D58] transition-colors"
            >
              Thực đơn
            </button>
            <button
              type="button"
              onClick={() => {
                if (typeof window !== "undefined") {
                  window.location.hash = "#orders";
                }
              }}
              className="hover:text-[#C28D58] transition-colors"
            >
              Lịch sử đơn hàng
            </button>
            <button
              type="button"
              onClick={() => {
                if (typeof window !== "undefined") {
                  window.location.hash = "#account";
                }
              }}
              className="hover:text-[#C28D58] transition-colors"
            >
              Tài khoản
            </button>
          </div>
        </div>

        {/* Legal & Educational copyright notice */}
        <div className="max-w-6xl mx-auto pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-[#6B4235]/70">
          <span>© 2026 BrewLite Coffee Ordering System. Đề tài Kiến trúc & Công nghệ Phần mềm (ASM2).</span>
          <span>Dữ liệu thực đơn và giao dịch mô phỏng an toàn.</span>
        </div>
      </footer>
    </div>
  );
}
