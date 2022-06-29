import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { FastifyRequest } from 'fastify';
import { AuthService } from '../auth.service';
import { ConfigService } from '@nestjs/config';
import * as AES from 'crypto-js/aes';
import * as Utf8 from 'crypto-js/enc-utf8';
import * as Latin1 from 'crypto-js/enc-latin1'
import * as Hex from 'crypto-js/enc-hex';
import * as ECB from 'crypto-js/mode-ecb';
import * as PKCS7 from 'crypto-js/pad-pkcs7';
import { randomBytes } from 'crypto';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    if (!request.cookies['Admin-Token']) {
      throw new UnauthorizedException('no auth token provided')
    }
    const adminToken = request.cookies['Admin-Token'];
    // * encrypt demo
    // console.log(`${Date.now()}-admin-${randomBytes(8).toString('hex')}-${this.configService.get('admin.secret')}`)
    // const encrypted = AES.encrypt(`${Date.now()}-admin-${randomBytes(8).toString('hex')}-${this.configService.get('admin.secret')}`, Utf8.parse(this.configService.get('admin.secret')), {
    //   mode: ECB,
    //   padding: PKCS7
    // }).toString()
    // console.log(encrypted)
    // admintoken = aes(timestamp-admin-nonce-secret)
    const decryptedToken = AES.decrypt(
      adminToken, 
      Utf8.parse(this.configService.get('admin.secret')),
      {
        mode: ECB,
        padding: PKCS7,
      },
    ).toString(Utf8);
    // console.log(decryptedToken)
    const tempArr = decryptedToken.split('-');
    // 验证格式
    if (tempArr.length !== 4) {
      throw new UnauthorizedException('invalid token');
    }
    const [timestamp, fixedStr, nonce, secret] = tempArr;
    if (Math.abs(parseInt(timestamp) - Date.now()) > 30000) {
      throw new UnauthorizedException('invalid timestamp');
    }
    if (fixedStr !== 'admin') {
      throw new UnauthorizedException('invalid fixed str');
    }
    if (secret !== this.configService.get('admin.secret')) {
      throw new UnauthorizedException('invalid secret');
    }
    return true;
  }
}
