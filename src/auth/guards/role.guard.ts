import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RoleGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const role = this.reflector.get<string>('role', context.getHandler());
    // console.log(role);
    if (!role) {
      return true;
    }
    const request = context.switchToHttp().getRequest();
    // console.log(request.user.payload);
    if (request.user && !request.user.role) {
      return false;
    }
    const matched = role === request.user.role;
    console.log('RoleGuard', matched, role, request.user.role);
    return matched;
  }
}
