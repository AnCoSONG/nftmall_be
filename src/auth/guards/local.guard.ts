import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
// import { Observable } from 'rxjs';
import { AuthService } from '../auth.service';

@Injectable()
export class LocalGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    // todo: 加密实现
    const { phone, code } = request.body;
    return await this.authService.validateCode(phone, code);
  }
}
