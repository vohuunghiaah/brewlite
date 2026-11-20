import { ProductSize } from '../entities/order-item.entity';
export { ProductSize };
export declare class CreateOrderItemDto {
    productId: number;
    size?: ProductSize;
    toppings?: string[];
    note?: string;
    quantity: number;
}
