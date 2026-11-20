
import { DataSource } from 'typeorm';
import { Product } from './entities/product.entity';

export async function seedProducts(
  dataSource: DataSource,
): Promise<void> {
  const products = [
    {
      name: 'Cà phê Latte',
      description: 'Cà phê Espresso kết hợp sữa tươi',
      price: '45000',
      imageUrl: null,
      isAvailable: true,
      stock: 50,
    },
    {
      name: 'Trà đào',
      description: 'Trà đào cam sả thanh mát',
      price: '35000',
      imageUrl: null,
      isAvailable: true,
      stock: 40,
    },
    {
      name: 'Cacao sữa',
      description: 'Cacao nguyên chất kết hợp sữa',
      price: '40000',
      imageUrl: null,
      isAvailable: true,
      stock: 35,
    },
    {
      name: 'Nước suối',
      description: 'Nước uống đóng chai',
      price: '10000',
      imageUrl: null,
      isAvailable: true,
      stock: 100,
    },
  ];

  await dataSource.transaction(async manager => {
    // Serialize simultaneous bootstraps without imposing uniqueness on catalog names.
    await manager.query("SELECT pg_advisory_xact_lock(hashtext('brewlite.seed.products'))");
    const productRepository = manager.getRepository(Product);
    for (const item of products) {
      const existingProduct = await productRepository.findOne({
        where: { name: item.name },
      });

      if (!existingProduct) {
        const product = productRepository.create(item);
        await productRepository.save(product);
      }
    }
  });

  console.log('Đã kiểm tra và khởi tạo dữ liệu Products Seed!');
}
