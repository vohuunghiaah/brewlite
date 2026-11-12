"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedProducts = seedProducts;
const product_entity_1 = require("./entities/product.entity");
async function seedProducts(dataSource) {
    const productRepository = dataSource.getRepository(product_entity_1.Product);
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
    for (const item of products) {
        const existingProduct = await productRepository.findOne({
            where: { name: item.name },
        });
        if (!existingProduct) {
            const product = productRepository.create(item);
            await productRepository.save(product);
        }
    }
    console.log('Đã kiểm tra và khởi tạo dữ liệu Products Seed!');
}
//# sourceMappingURL=products.seed.js.map