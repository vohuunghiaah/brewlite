import { Repository, DataSource } from 'typeorm';
import { Order } from './entities/order.entity';
import { Product } from '../products/entities/product.entity';
import { CreateOrderDto } from './dto/create-order.dto';
export declare class OrdersService {
    private readonly orderRepository;
    private readonly productRepository;
    private readonly dataSource;
    constructor(orderRepository: Repository<Order>, productRepository: Repository<Product>, dataSource: DataSource);
    findAll(): Promise<Order[]>;
    findOne(id: number): Promise<Order>;
    create(createOrderDto: CreateOrderDto): Promise<Order>;
}
