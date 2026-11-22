import { Repository, DataSource } from 'typeorm';
import { Order } from './entities/order.entity';
import { ProductSize } from './entities/order-item.entity';
import { Product } from '../products/entities/product.entity';
import { CreateOrderDto } from './dto/create-order.dto';
export declare const SIZE_PRICE_MODIFIERS: Record<ProductSize, number>;
export declare const TOPPING_PRICES: Record<string, number>;
export declare class OrdersService {
    private readonly orderRepository;
    private readonly productRepository;
    private readonly dataSource;
    constructor(orderRepository: Repository<Order>, productRepository: Repository<Product>, dataSource: DataSource);
    findAll(userId: number): Promise<Order[]>;
    findOne(id: number, userId: number): Promise<Order>;
    create(createOrderDto: CreateOrderDto, userId: number): Promise<Order>;
}
