import { CreateOrderItemDto } from './create-order-item.dto';
export declare class CreateOrderDto {
    customerName: string;
    customerPhone: string;
    note?: string;
    items: CreateOrderItemDto[];
}
