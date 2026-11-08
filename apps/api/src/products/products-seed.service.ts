
import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
} from '@nestjs/common';

import { DataSource } from 'typeorm';
import { seedProducts } from './products.seed';

@Injectable()
export class ProductsSeedService
  implements OnApplicationBootstrap {

  private readonly logger = new Logger(ProductsSeedService.name);

  constructor(
    private readonly dataSource: DataSource,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    try {
      await seedProducts(this.dataSource);

      this.logger.log(
        'Khởi tạo dữ liệu sản phẩm thành công!',
      );
    } catch (error) {
      this.logger.error(
        'Không thể khởi tạo dữ liệu sản phẩm',
        error instanceof Error ? error.stack : String(error),
      );

      throw error;
    }
  }
}
