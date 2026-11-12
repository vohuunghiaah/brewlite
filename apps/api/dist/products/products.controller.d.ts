import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
export declare class ProductsController {
    private readonly productsService;
    constructor(productsService: ProductsService);
    findAll(): Promise<import("./entities/product.entity").Product[]>;
    findOne(id: number): Promise<import("./entities/product.entity").Product>;
    create(data: CreateProductDto): Promise<import("./entities/product.entity").Product>;
    update(id: number, data: UpdateProductDto): Promise<import("./entities/product.entity").Product>;
    remove(id: number): Promise<{
        message: string;
    }>;
}
