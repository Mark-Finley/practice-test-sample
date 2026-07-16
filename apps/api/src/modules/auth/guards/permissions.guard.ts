import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredPermissions) {
      return true;
    }
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    
    if (!user || !user.role || !user.role.permissions) {
      return false;
    }

    const userPermissions: string[] = user.role.permissions.map(
      (rp: any) => `${rp.permission.action}:${rp.permission.subject}`,
    );

    return requiredPermissions.every((perm) => userPermissions.includes(perm));
  }
}
