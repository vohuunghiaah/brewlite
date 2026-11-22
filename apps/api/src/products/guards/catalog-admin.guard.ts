import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { timingSafeEqual } from 'crypto';
import type { Request } from 'express';

@Injectable()
export class CatalogAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const isProduction = process.env.NODE_ENV === 'production';
    const adminKey =
      process.env.CATALOG_ADMIN_KEY ||
      (!isProduction ? 'brewlite-dev-catalog-secret' : undefined);

    if (!adminKey) {
      throw new ForbiddenException(
        'Catalog mutation endpoints are disabled because CATALOG_ADMIN_KEY is not configured (fail-closed).',
      );
    }

    const authHeader = request.headers['authorization'];
    const customHeader = request.headers['x-catalog-admin-key'] as string | undefined;

    let providedKey: string | undefined;
    if (customHeader) {
      providedKey = customHeader.trim();
    } else if (authHeader && authHeader.startsWith('Bearer ')) {
      providedKey = authHeader.slice(7).trim();
    }

    if (!providedKey) {
      throw new UnauthorizedException(
        'Yêu cầu xác thực quản trị viên danh mục (X-Catalog-Admin-Key hoặc Bearer token).',
      );
    }

    const expectedBuf = Buffer.from(adminKey);
    const providedBuf = Buffer.from(providedKey);

    if (
      expectedBuf.length !== providedBuf.length ||
      !timingSafeEqual(expectedBuf, providedBuf)
    ) {
      throw new ForbiddenException('Khóa quản trị danh mục không hợp lệ.');
    }

    return true;
  }
}
