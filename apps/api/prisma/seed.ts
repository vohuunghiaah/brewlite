import { PrismaClient, UserRole, DiscountType } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const databaseUrl = process.env.DATABASE_URL || 'postgresql://brewlite:brewlite@127.0.0.1:5432/brewlite?schema=public';
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: databaseUrl,
    },
  },
});

async function main() {
  console.log('[SEED] Bắt đầu gieo mầm dữ liệu BrewLite...');

  // 1. Tạo người dùng mẫu
  const passwordHash = await bcrypt.hash('Password123!', 10);

  const customer = await prisma.user.upsert({
    where: { email: 'customer@brewlite.com' },
    update: {},
    create: {
      email: 'customer@brewlite.com',
      passwordHash,
      fullName: 'Nguyễn Văn Khách',
      role: UserRole.CUSTOMER,
      loyaltyPoints: 120,
    },
  });

  const staff = await prisma.user.upsert({
    where: { email: 'staff@brewlite.com' },
    update: {},
    create: {
      email: 'staff@brewlite.com',
      passwordHash,
      fullName: 'Trần Thị Thu Ngân (Barista)',
      role: UserRole.STAFF,
      loyaltyPoints: 0,
    },
  });

  console.log(`[SEED] Người dùng đã tạo: ${customer.email}, ${staff.email}`);

  // 2. Danh mục & Sản phẩm đồ uống
  const products = [
    {
      name: 'Cappuccino',
      description: 'Cà phê Espresso đậm đà kết hợp với lớp bọt sữa tươi mềm mịn, phủ nhẹ bột ca cao.',
      category: 'Cà phê',
      basePrice: 45000,
      imageUrl: 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=600&auto=format&fit=crop&q=80',
      stock: 150,
      isAvailable: true,
    },
    {
      name: 'Espresso',
      description: 'Chiết xuất nguyên bản tinh túy từ hạt Robusta và Arabica rang mộc chuẩn vị.',
      category: 'Cà phê',
      basePrice: 35000,
      imageUrl: 'https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?w=600&auto=format&fit=crop&q=80',
      stock: 200,
      isAvailable: true,
    },
    {
      name: 'Cà phê Sữa Đá',
      description: 'Hương vị cà phê truyền thống Việt Nam pha phin đậm đà hòa quyện cùng sữa đặc ngọt béo.',
      category: 'Cà phê',
      basePrice: 38000,
      imageUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&auto=format&fit=crop&q=80',
      stock: 180,
      isAvailable: true,
    },
    {
      name: 'Cold Brew Cam Sả',
      description: 'Cà phê ủ lạnh 16 tiếng thanh mát kết hợp lát cam tươi và hương sả sảng khoái ngày hè.',
      category: 'Cà phê',
      basePrice: 48000,
      imageUrl: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=600&auto=format&fit=crop&q=80',
      stock: 90,
      isAvailable: true,
    },
    {
      name: 'Caramel Macchiato',
      description: 'Sự hòa quyện ngọt ngào giữa sữa nóng, espresso nồng nàn và sốt sốt sốt caramel óng ánh.',
      category: 'Cà phê',
      basePrice: 52000,
      imageUrl: 'https://images.unsplash.com/photo-1485808191679-5f86510681a2?w=600&auto=format&fit=crop&q=80',
      stock: 120,
      isAvailable: true,
    },
    {
      name: 'Trà Đào Cam Sả',
      description: 'Hương trà đen dịu nhẹ điểm xuyết vị đào giòn ngọt ngào, cam tươi mọng nước và hương thơm sả.',
      category: 'Trà',
      basePrice: 45000,
      imageUrl: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=600&auto=format&fit=crop&q=80',
      stock: 140,
      isAvailable: true,
    },
    {
      name: 'Trà Sữa Oolong Nướng',
      description: 'Trà Oolong rang thơm lừng quyện cùng dòng sữa béo ngậy, ngọt dịu vừa vặn không ngấy.',
      category: 'Trà',
      basePrice: 42000,
      imageUrl: 'https://images.unsplash.com/photo-1558857563-b37cf5a86d26?w=600&auto=format&fit=crop&q=80',
      stock: 160,
      isAvailable: true,
    },
    {
      name: 'Matcha Đá Xay',
      description: 'Bột trà xanh Uji Nhật Bản nguyên chất xay cùng đá tuyết và sữa tươi, phủ bông kem béo ngậy.',
      category: 'Đá xay',
      basePrice: 55000,
      imageUrl: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=600&auto=format&fit=crop&q=80',
      stock: 80,
      isAvailable: true,
    },
    {
      name: 'Chocolate Đá Xay Hạnh Nhân',
      description: 'Socola Bỉ nguyên chất đậm vị xay tuyết cùng hạt hạnh nhân giòn rụm bùi thơm.',
      category: 'Đá xay',
      basePrice: 58000,
      imageUrl: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=600&auto=format&fit=crop&q=80',
      stock: 100,
      isAvailable: true,
    },
    {
      name: 'Cà phê Muối Huê',
      description: 'Đặc sản cà phê muối béo mặn tinh tế, lớp kem muối biển độc quyền mịn màng.',
      category: 'Cà phê',
      basePrice: 42000,
      imageUrl: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=600&auto=format&fit=crop&q=80',
      stock: 0, // Dùng để test trường hợp Hết Hàng (Out of stock)
      isAvailable: false,
    },
  ];

  for (const item of products) {
    const existing = await prisma.product.findFirst({ where: { name: item.name } });
    if (!existing) {
      await prisma.product.create({ data: item });
    }
  }
  console.log(`[SEED] Đã gieo ${products.length} sản phẩm thực tế.`);

  // 3. Khuyến mãi mẫu
  await prisma.promotion.upsert({
    where: { code: 'BREW20' },
    update: {},
    create: {
      code: 'BREW20',
      description: 'Giảm giá 20% cho toàn bộ đồ uống trên đơn từ 50.000đ',
      discountType: DiscountType.PERCENTAGE,
      discountValue: 20,
      minOrderValue: 50000,
      validFrom: new Date('2026-01-01'),
      validUntil: new Date('2027-12-31'),
      usageLimit: 1000,
      isActive: true,
    },
  });

  console.log('[SEED] Hoàn tất gieo mầm dữ liệu cơ sở!');
}

main()
  .catch((e) => {
    console.error('[SEED_ERROR]', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
