import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';
export declare class ProductsService {
    private readonly productRepository;
    constructor(productRepository: Repository<Product>);
    findAll(): Promise<Product[]>;
    findOne(id: number): Promise<Product>;
    create(data: Partial<Product>): Promise<Product>;
    update(id: number, data: Partial<Product>): Promise<Product>;
    remove(id: number): Promise<{
        message: string;
    }>;
}
