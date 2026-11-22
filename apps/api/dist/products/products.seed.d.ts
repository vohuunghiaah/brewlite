import { DataSource } from 'typeorm';
export declare const DEMO_PRODUCTS: {
    name: string;
    description: string;
    price: string;
    imageUrl: string;
    isAvailable: boolean;
    stock: number;
}[];
export declare function seedProducts(dataSource: DataSource): Promise<void>;
