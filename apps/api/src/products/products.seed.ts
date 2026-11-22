import { DataSource } from 'typeorm';
import { Product } from './entities/product.entity';

export const DEMO_PRODUCTS = [
  // 1-4: Preserve existing products exactly (FR-01/Historical baseline)
  {
    name: 'Cà phê Latte',
    description: 'Cà phê Espresso kết hợp sữa tươi',
    price: '45000',
    imageUrl: 'https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&w=800&q=80',
    isAvailable: true,
    stock: 50,
  },
  {
    name: 'Trà đào',
    description: 'Trà đào cam sả thanh mát',
    price: '35000',
    imageUrl: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=800&q=80',
    isAvailable: true,
    stock: 40,
  },
  {
    name: 'Cacao sữa',
    description: 'Cacao nguyên chất kết hợp sữa',
    price: '40000',
    imageUrl: 'https://images.unsplash.com/photo-1542990253-0d0f5be5f0ed?auto=format&fit=crop&w=800&q=80',
    isAvailable: true,
    stock: 35,
  },
  {
    name: 'Nước suối',
    description: 'Nước uống đóng chai',
    price: '10000',
    imageUrl: 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?auto=format&fit=crop&w=800&q=80',
    isAvailable: true,
    stock: 100,
  },
  // 5-7: Cà phê truyền thống Việt Nam
  {
    name: 'Cà phê đen đá',
    description: 'Cà phê Robusta Đắk Lắk pha phin truyền thống đậm đà, vị đắng thanh thoát',
    price: '28000',
    imageUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=800&q=80',
    isAvailable: true,
    stock: 45,
  },
  {
    name: 'Cà phê sữa đá',
    description: 'Cà phê phin đậm vị kết hợp sữa đặc ngọt béo hài hòa chuẩn gu Sài Gòn',
    price: '32000',
    imageUrl: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&w=800&q=80',
    isAvailable: true,
    stock: 50,
  },
  {
    name: 'Bạc xỉu',
    description: 'Nhiều sữa ít cà phê, vị béo ngọt thanh nhẹ thơm lừng buổi sáng',
    price: '35000',
    imageUrl: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=800&q=80',
    isAvailable: true,
    stock: 30,
  },
  // 8-12: Espresso & Cold Brew
  {
    name: 'Espresso',
    description: 'Chiết xuất áp suất cao từ hạt Arabica Cầu Đất nguyên chất, lớp crema sánh mịn',
    price: '30000',
    imageUrl: 'https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?auto=format&fit=crop&w=800&q=80',
    isAvailable: true,
    stock: 40,
  },
  {
    name: 'Americano đá',
    description: 'Espresso đậm đà pha loãng với nước tinh khiết và đá lạnh sảng khoái',
    price: '35000',
    imageUrl: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&w=800&q=80',
    isAvailable: true,
    stock: 25,
  },
  {
    name: 'Cappuccino',
    description: 'Tỉ lệ hoàn hảo giữa Espresso, sữa nóng và lớp bọt sữa bồng bềnh mịn màng',
    price: '48000',
    imageUrl: 'https://images.unsplash.com/photo-1534778101976-62847782c213?auto=format&fit=crop&w=800&q=80',
    isAvailable: true,
    stock: 20,
  },
  {
    name: 'Caramel Macchiato',
    description: 'Cà phê Espresso hòa quyện vani ngọt dịu, sữa tươi và sốt caramel hảo hạng',
    price: '52000',
    imageUrl: 'https://images.unsplash.com/photo-1485808191679-5f86510681a2?auto=format&fit=crop&w=800&q=80',
    isAvailable: true,
    stock: 15,
  },
  {
    name: 'Cold Brew cam',
    description: 'Cà phê ủ lạnh 16 giờ kết hợp nước cam vàng mọng nước, thanh mát sảng khoái',
    price: '49000',
    imageUrl: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&w=800&q=80',
    isAvailable: true,
    stock: 8, // Demonstrates LOW STOCK (1-10)
  },
  // 13: Matcha & Cacao
  {
    name: 'Matcha Latte',
    description: 'Bột trà xanh Uji Nhật Bản nguyên chất đánh bọt cùng sữa tươi thanh trùng',
    price: '45000',
    imageUrl: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&w=800&q=80',
    isAvailable: false,
    stock: 0, // Demonstrates OUT OF STOCK (0)
  },
  // 14-15: Trà trái cây
  {
    name: 'Trà vải',
    description: 'Trà lài thơm ngát kết hợp trái vải thiều ngọt lịm mọng nước giải nhiệt',
    price: '38000',
    imageUrl: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=800&q=80',
    isAvailable: true,
    stock: 20,
  },
  {
    name: 'Trà chanh mật ong',
    description: 'Trà đen ủ ấm pha cùng chanh tươi và mật ong hoa rừng ngọt dịu thanh cổ họng',
    price: '32000',
    imageUrl: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=800&q=80',
    isAvailable: false,
    stock: 0, // Demonstrates OUT OF STOCK (0)
  },
];

export async function seedProducts(
  dataSource: DataSource,
): Promise<void> {
  await dataSource.transaction(async manager => {
    // Standardized transaction-level advisory lock coordinates across seed and sync-catalog operations.
    await manager.query("SELECT pg_advisory_xact_lock(hashtext('brewlite.catalog.lock'))");
    const productRepository = manager.getRepository(Product);
    for (const item of DEMO_PRODUCTS) {
      const existingProduct = await productRepository.findOne({
        where: { name: item.name },
      });

      if (!existingProduct) {
        const product = productRepository.create(item);
        await productRepository.save(product);
      }
    }
  });

  console.log('Đã kiểm tra và khởi tạo dữ liệu Products Seed (15 sản phẩm)!');
}
