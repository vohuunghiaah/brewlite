import { ProductsService } from './products.service';
import { Product } from './entities/product.entity';
export declare class ProductsController {
    private readonly productsService;
    constructor(productsService: ProductsService);
    findAll(): Promise<Product[]>;
    findOne(id: number): Promise<Product>;
    create(data: Partial<Product>): Promise<Product>;
    update(id: number, data: Partial<Product>): Promise<Product>;
    remove(id: number): Promise<{
        message: string;
    }>;
}
