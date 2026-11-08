import { OrderItem } from './order-item.entity';
export declare class Order {
    id: number;
    customerName: string;
    customerPhone: string;
    note: string;
    totalAmount: string;
    status: string;
    createdAt: Date;
    items: OrderItem[];
}
