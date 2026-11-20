"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrdersService = exports.TOPPING_PRICES = exports.SIZE_PRICE_MODIFIERS = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const order_entity_1 = require("./entities/order.entity");
const order_item_entity_1 = require("./entities/order-item.entity");
const product_entity_1 = require("../products/entities/product.entity");
exports.SIZE_PRICE_MODIFIERS = {
    [order_item_entity_1.ProductSize.SMALL]: 0,
    [order_item_entity_1.ProductSize.MEDIUM]: 5000,
    [order_item_entity_1.ProductSize.LARGE]: 10000,
};
exports.TOPPING_PRICES = {
    'Kem cheese': 10000,
    'Trân châu trắng': 8000,
    'Thạch đào': 8000,
    'Sốt caramel': 6000,
    'Thạch sương sáo': 6000,
};
let OrdersService = class OrdersService {
    orderRepository;
    productRepository;
    dataSource;
    constructor(orderRepository, productRepository, dataSource) {
        this.orderRepository = orderRepository;
        this.productRepository = productRepository;
        this.dataSource = dataSource;
    }
    async findAll(userId) {
        return this.orderRepository.find({
            where: { userId },
            relations: {
                items: {
                    product: true,
                },
            },
            order: {
                createdAt: 'DESC',
            },
        });
    }
    async findOne(id, userId) {
        const order = await this.orderRepository.findOne({
            where: { id, userId },
            relations: {
                items: {
                    product: true,
                },
            },
        });
        if (!order) {
            const hasOwner = await this.orderRepository.existsBy({
                id,
                userId: (0, typeorm_2.Not)((0, typeorm_2.IsNull)()),
            });
            if (hasOwner) {
                throw new common_1.ForbiddenException();
            }
            throw new common_1.NotFoundException(`Không tìm thấy đơn hàng ID ${id}`);
        }
        return order;
    }
    async create(createOrderDto, userId) {
        return this.dataSource.transaction(async (manager) => {
            const orderItems = [];
            let totalAmount = 0;
            for (const item of createOrderDto.items) {
                const product = await manager
                    .getRepository(product_entity_1.Product)
                    .findOne({
                    where: {
                        id: item.productId,
                    },
                });
                if (!product) {
                    throw new common_1.NotFoundException(`Không tìm thấy sản phẩm ID ${item.productId}`);
                }
                if (!product.isAvailable) {
                    throw new common_1.BadRequestException(`Sản phẩm ${product.name} hiện không có sẵn`);
                }
                const size = item.size ?? order_item_entity_1.ProductSize.SMALL;
                if (!Object.values(order_item_entity_1.ProductSize).includes(size)) {
                    throw new common_1.BadRequestException(`Kích cỡ '${size}' không hợp lệ. Cho phép: SMALL, MEDIUM, LARGE`);
                }
                const sizeModifier = exports.SIZE_PRICE_MODIFIERS[size] ?? 0;
                const toppings = Array.isArray(item.toppings) ? item.toppings : [];
                const uniqueToppings = new Set(toppings);
                if (uniqueToppings.size !== toppings.length) {
                    throw new common_1.BadRequestException('Danh sách topping không được chứa các phần tử trùng lặp');
                }
                let toppingsTotal = 0;
                for (const top of toppings) {
                    if (!Object.prototype.hasOwnProperty.call(exports.TOPPING_PRICES, top)) {
                        throw new common_1.BadRequestException(`Topping '${top}' không hợp lệ hoặc không có trong thực đơn`);
                    }
                    toppingsTotal += exports.TOPPING_PRICES[top];
                }
                const basePrice = Number(product.price);
                if (!Number.isFinite(basePrice) || basePrice < 0) {
                    throw new common_1.BadRequestException('Giá sản phẩm không hợp lệ');
                }
                const unitPrice = Math.max(0, basePrice + sizeModifier + toppingsTotal);
                const subtotal = unitPrice * item.quantity;
                totalAmount += subtotal;
                const orderItem = manager
                    .getRepository(order_item_entity_1.OrderItem)
                    .create({
                    productName: product.name,
                    size,
                    toppings,
                    note: item.note?.trim() || null,
                    quantity: item.quantity,
                    unitPrice: unitPrice.toFixed(2),
                    subtotal: subtotal.toFixed(2),
                    product,
                });
                orderItems.push(orderItem);
            }
            const order = manager
                .getRepository(order_entity_1.Order)
                .create({
                userId,
                customerName: createOrderDto.customerName,
                customerPhone: createOrderDto.customerPhone,
                note: createOrderDto.note,
                totalAmount: totalAmount.toFixed(2),
                status: 'PENDING',
                items: orderItems,
            });
            return manager
                .getRepository(order_entity_1.Order)
                .save(order);
        });
    }
};
exports.OrdersService = OrdersService;
exports.OrdersService = OrdersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(order_entity_1.Order)),
    __param(1, (0, typeorm_1.InjectRepository)(product_entity_1.Product)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.DataSource])
], OrdersService);
//# sourceMappingURL=orders.service.js.map