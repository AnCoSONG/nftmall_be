import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { FastifyRequest, FastifyReply } from 'fastify';
import { ConfigService } from '@nestjs/config';
import { InjectRedis } from '@liaoliaots/nestjs-redis';
import Redis from 'ioredis';
import { redisExceptionCatcher } from '../../common/utils';
import { AuthService } from '../auth.service';
import { AuthError } from '../../common/const';

@Injectable()
export class JwtGuard implements CanActivate {
  private readonly logger = new Logger(JwtGuard.name)
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();

    // console.log(request.headers);
    // if (!request.headers['x-csrf-token']) {
    //   throw new UnauthorizedException('csrf token not found');
    // }
    if (!request.cookies['xc']) {
      this.logger.debug('access token not found')
      throw new UnauthorizedException('user: access token not found');
    }
    if (!request.cookies['tt']) {
      this.logger.debug('refresh ptoken not found')
      throw new UnauthorizedException('user: refresh token not found');
    }
    const access_token = request.cookies['xc'];
    const refresh_token = request.cookies['tt'];
    const decoded = this.authService.jwtDecode(refresh_token) as {
      id: number | string;
      username: string;
      phone: string;
    };
    const id = decoded['id'];
    if (!id) {
      throw new UnauthorizedException("user: undefined id")
    }
    // access token是否过期
    const access_verify_res = this.authService.jwtVerify(access_token, {
      secret: this.configService.get('JWT_SECRET'),
      ignoreExpiration: false,
    });
    if (access_verify_res === AuthError.OK) {
      // todo: 完善debug代码
      this.logger.debug(`user ${id}/${request.ip} auth: access token ok!`)
      request['user'] = {
        code: AuthError.OK,
      };
      return true;
    } else if (access_verify_res === AuthError.OUTDATED) {
      // * 检查refresh token是否过期
      this.logger.debug(`user ${id}/${request.ip} auth: access token outdated!`)
      const refresh_verify_res = this.authService.jwtVerify(refresh_token, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
        ignoreExpiration: false,
      });
      if (refresh_verify_res === AuthError.OUTDATED) {
        // * refresh token过期，需要重新登录
        this.logger.debug(`user ${id}/${request.ip} auth: refresh token outdated!`)
        throw new UnauthorizedException('user: refresh token expired');
      } else if (refresh_verify_res === AuthError.OK) {
        // * 检查refresh_token是否下线
        const cached = await redisExceptionCatcher(
          this.redis.get(`token_${id}`),
        );
        if (!cached) {
          // 已下线
          this.logger.debug(`user ${id}/${request.ip} auth: refresh token cache missed!`)
          throw new UnauthorizedException('user: offline');
        }
        if (cached !== refresh_token) {
          // 检测到不匹配
          this.logger.debug(`user ${id}/${request.ip} auth: refresh token cache mismatched!`)
          // todo: 清空redis导致正常登录也无法刷新token
          // await redisExceptionCatcher(this.redis.del(`token_${id}`)); // 自动下线
          throw new UnauthorizedException('user:token mismatch');
        }
        // * 刷新access token的同时更新refresh_token
        this.logger.debug(`user ${id}/${request.ip} auth: refresh and ok!`)
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
        this.logger.debug(`user ${id} auth: refresh token error: ${refresh_verify_res}`)
        throw new UnauthorizedException('user: refresh token invalid');
      }
    } else {
      this.logger.debug(`user ${id} auth: access token error: ${access_verify_res}`)
      throw new UnauthorizedException('user: access token invalid');
    }
  }
}
