import { Order } from './order.entity';
import { Product } from '../../products/entities/product.entity';
export declare class OrderItem {
    id: number;
    productName: string;
    quantity: number;
    unitPrice: string;
    subtotal: string;
    order: Order;
    product: Product;
}
