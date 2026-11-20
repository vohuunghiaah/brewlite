import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from './auth.service';
import { UserRole } from '../users/entities/user.entity';

@Injectable()
export class StaffGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { user } = context.switchToHttp().getRequest<{ user: AuthenticatedUser }>();
    return user.role === UserRole.STAFF || user.role === UserRole.ADMIN;
  }
}
