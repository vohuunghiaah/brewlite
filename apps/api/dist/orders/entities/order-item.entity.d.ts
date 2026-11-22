import { Order } from './order.entity';
import { Product } from '../../products/entities/product.entity';
export declare enum ProductSize {
    SMALL = "SMALL",
    MEDIUM = "MEDIUM",
    LARGE = "LARGE"
}
export declare class OrderItem {
    id: number;
    productName: string;
    size: ProductSize;
    toppings: string[];
    note?: string | null;
    quantity: number;
    unitPrice: string;
    subtotal: string;
    orderId: number;
    order: Order;
    productId: number;
    product: Product;
}
