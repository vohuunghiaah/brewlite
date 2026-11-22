import { User } from '../../users/entities/user.entity';
import { OrderItem } from './order-item.entity';
export declare enum OrderStatus {
    PENDING = "PENDING",
    PAID = "PAID",
    PAYMENT_FAILED = "PAYMENT_FAILED",
    PREPARING = "PREPARING",
    READY = "READY",
    COMPLETED = "COMPLETED",
    CANCELLED = "CANCELLED"
}
export declare class Order {
    id: number;
    orderCode: string | null;
    pickupMethod: string;
    tableNumber: string | null;
    userId: number | null;
    user: User | null;
    customerName: string;
    customerPhone: string;
    note: string;
    totalAmount: string;
    status: string;
    createdAt: Date;
    items: OrderItem[];
}
