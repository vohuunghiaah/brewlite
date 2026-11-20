import type { AuthenticatedUser } from '../auth/auth.service';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
export declare class OrdersController {
    private readonly ordersService;
    constructor(ordersService: OrdersService);
    findAll(user: AuthenticatedUser): Promise<import("./entities/order.entity").Order[]>;
    findMyOrders(user: AuthenticatedUser): Promise<import("./entities/order.entity").Order[]>;
    findOne(id: number, user: AuthenticatedUser): Promise<import("./entities/order.entity").Order>;
    create(createOrderDto: CreateOrderDto, user: AuthenticatedUser): Promise<import("./entities/order.entity").Order>;
}
