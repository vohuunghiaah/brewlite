import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'BrewLite — Đặt cà phê không dùng tiền mặt',
  description: 'Nền tảng đặt đồ uống cà phê trực tuyến nhanh chóng, thanh toán không tiền mặt hiện đại.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body className="antialiased selection:bg-brand-500 selection:text-white">
        <main className="min-h-screen pb-16">{children}</main>
      </body>
    </html>
  );
}

