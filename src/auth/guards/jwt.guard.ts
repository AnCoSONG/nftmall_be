import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { ConfigService } from '@nestjs/config';
import { InjectRedis } from '@liaoliaots/nestjs-redis';
import Redis from 'ioredis';
import { redisExceptionCatcher } from '../../common/utils';
import { AuthService } from '../auth.service';
import { AuthError } from '../../common/const';

@Injectable()
export class JwtGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    // const response = context.switchToHttp().getRequest<FastifyReply>();

    // if (!request.headers['x-csrf-token']) {
    //   throw new UnauthorizedException('csrf token not found');
    // }
    if (!request.cookies['xc']) {
      throw new UnauthorizedException('access token not found');
    }
    if (!request.cookies['tt']) {
      throw new UnauthorizedException('refresh token not found');
    }
    const access_token = request.cookies['xc'];
    const refresh_token = request.cookies['tt'];
    // access token是否过期
    const access_verify_res = this.authService.jwtVerify(access_token, {
      secret: this.configService.get('JWT_SECRET'),
      ignoreExpiration: false,
    });
    if (access_verify_res === AuthError.OK) {
      request['user'] = {
        code: AuthError.OK,
      };
      return true;
    } else if (access_verify_res === AuthError.OUTDATED) {
      // * 检查refresh token是否过期
      const refresh_verify_res = this.authService.jwtVerify(refresh_token, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
        ignoreExpiration: false,
      });
      if (refresh_verify_res === AuthError.OUTDATED) {
        // * refresh token过期，需要重新登录
        throw new UnauthorizedException('refresh token expired');
      } else if (refresh_verify_res === AuthError.OK) {
        // * 检查refresh_token是否下线
        const decoded = this.authService.jwtDecode(access_token) as {
          id: number | string;
          username: string;
          phone: string;
        };
        const id = decoded['id'];
        const cached = await redisExceptionCatcher(
          this.redis.get(`token_${id}`),
        );
        if (!cached) {
          // 已下线
          throw new UnauthorizedException('offline');
        }
        if (cached !== refresh_token) {
          // 检测到不匹配
          await redisExceptionCatcher(this.redis.del(`token_${id}`)); // 自动下线
          throw new UnauthorizedException('token mismatch');
        }
        // * 刷新access token的同时更新refresh_token
        const new_access_token = this.authService.jwtSign(
          {
            id: decoded.id,
            username: decoded.username,
            phone: decoded.phone,
          },
          {
            secret: this.configService.get('jwt.access.secret'),
            expiresIn: this.configService.get('jwt.access_expires_in'),
            algorithm: this.configService.get('jwt.access_algorithm'),
          },
        );
        const new_refresh_token = this.authService.jwtSign(
          {
            id: decoded.id,
            username: decoded.username,
            phone: decoded.phone,
          },
          {
            secret: this.configService.get('jwt.refresh_secret'),
            expiresIn: this.configService.get('jwt.refresh_expires_in'),
            algorithm: this.configService.get('jwt.refresh_algorithm'),
          },
        );
        // * 更新redis refresh token
        await redisExceptionCatcher(
          this.redis.set(
            `token_${id}`,
            new_refresh_token,
            'EX',
            60 * 60 * 24 * 15,
          ),
        );

        // 设置返回值
        request['user'] = {
          data: {
            access_token: new_access_token,
            refresh_token: new_refresh_token,
          },
          code: AuthError.REFRESHED,
        };
        // 设置cookie
        // console.log(response);
        // response.setCookie('tt', new_refresh_token, {
        //   maxAge: 60 * 60 * 24 * 15,
        //   httpOnly: true,
        //   secure: true,
        // });
        // response.cookie('tt', new_refresh_token, {
        //   maxAge: 1000 * 60 * 60 * 24 * 15,
        //   httpOnly: true,
        //   secure: true,
        // });
        return true;
      } else {
        throw new UnauthorizedException('refresh token invalid');
      }
    } else {
      throw new UnauthorizedException('access token invalid');
    }
  }
}
