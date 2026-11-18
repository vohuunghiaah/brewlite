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
    quantity: number;
    unitPrice: string;
    subtotal: string;
    order: Order;
    product: Product;
}
