"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var ProductsSeedService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductsSeedService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("typeorm");
const products_seed_1 = require("./products.seed");
let ProductsSeedService = ProductsSeedService_1 = class ProductsSeedService {
    dataSource;
    logger = new common_1.Logger(ProductsSeedService_1.name);
    constructor(dataSource) {
        this.dataSource = dataSource;
    }
    async onApplicationBootstrap() {
        try {
            await (0, products_seed_1.seedProducts)(this.dataSource);
            this.logger.log('Khởi tạo dữ liệu sản phẩm thành công!');
        }
        catch (error) {
            this.logger.error('Không thể khởi tạo dữ liệu sản phẩm', error instanceof Error ? error.stack : String(error));
            throw error;
        }
    }
};
exports.ProductsSeedService = ProductsSeedService;
exports.ProductsSeedService = ProductsSeedService = ProductsSeedService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeorm_1.DataSource])
], ProductsSeedService);
//# sourceMappingURL=products-seed.service.js.map