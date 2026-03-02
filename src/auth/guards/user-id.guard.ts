import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Request } from 'express';

/**
 * Ensures the authenticated user can only access their own resource (e.g. cart/:userId).
 * Use after JwtAuthGuard. Expects params.userId to match user.id.
 */
@Injectable()
export class UserIdGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request & { user?: { id: string } }>();
    const user = req.user;
    const paramUserId = req.params?.userId;
    if (!user) return false;
    if (paramUserId && paramUserId !== user.id) {
      throw new ForbiddenException('You can only access your own resources');
    }
    return true;
  }
}
