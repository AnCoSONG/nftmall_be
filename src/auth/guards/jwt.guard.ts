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
import ms from 'ms';

@Injectable()
export class JwtGuard implements CanActivate {
  private readonly logger = new Logger(JwtGuard.name);
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  async canActivate2(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();

    if (!request.cookies['xc']) {
      this.logger.debug('access token not found');
      throw new UnauthorizedException('user: access token not found');
    }
    if (!request.cookies['tt']) {
      this.logger.debug('refresh token not found');
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
      throw new UnauthorizedException('user: undefined id');
    }
    // access token是否过期
    const access_verify_res = this.authService.jwtVerify(access_token, {
      secret: this.configService.get('JWT_SECRET'),
      ignoreExpiration: false,
    });
    if (access_verify_res === AuthError.OK) {
      // todo: 完善debug代码
      this.logger.debug(`user ${id}/${request.ip} auth: access token ok!`);
      request['user'] = {
        code: AuthError.OK,
      };
      return true;
    } else if (access_verify_res === AuthError.OUTDATED) {
      // * 检查refresh token是否过期
      this.logger.debug(
        `user ${id}/${request.ip} auth: access token outdated!`,
      );
      const refresh_verify_res = this.authService.jwtVerify(refresh_token, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
        ignoreExpiration: false,
      });
      if (refresh_verify_res === AuthError.OUTDATED) {
        // * refresh token过期，需要重新登录
        this.logger.debug(
          `user ${id}/${request.ip} auth: refresh token outdated!`,
        );
        throw new UnauthorizedException('user: refresh token expired');
      } else if (refresh_verify_res === AuthError.OK) {
        // * 检查refresh_token是否下线
        const cached = await redisExceptionCatcher(
          this.redis.get(`token_${id}`),
        );
        if (!cached) {
          // 已下线
          this.logger.debug(
            `user ${id}/${request.ip} auth: refresh token cache missed!`,
          );
          throw new UnauthorizedException('user: offline');
        }
        if (cached !== refresh_token) {
          // 检测到不匹配
          this.logger.debug(
            `user ${id}/${request.ip} auth: refresh token cache mismatched!`,
          );
          // todo: 清空redis导致正常登录也无法刷新token
          // await redisExceptionCatcher(this.redis.del(`token_${id}`)); // 自动下线
          throw new UnauthorizedException('user:token mismatch');
        }
        // * 刷新access token的同时更新refresh_token
        this.logger.debug(`user ${id}/${request.ip} auth: refresh and ok!`);
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
        this.logger.debug(
          `user ${id} auth: refresh token error: ${refresh_verify_res}`,
        );
        throw new UnauthorizedException('user: refresh token invalid');
      }
    } else {
      this.logger.debug(
        `user ${id} auth: access token error: ${access_verify_res}`,
      );
      throw new UnauthorizedException('user: access token invalid');
    }
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 重写鉴权
    // access token 时效 30m __xc__
    // refresh token 时效 15d __tt__
    const request = context.switchToHttp().getRequest<FastifyRequest>();

    // 检测Token在不在
    const access_token =
      request.cookies[this.configService.get('jwt.access_cookie_name')] ?? null;
    const refresh_token =
      request.cookies[this.configService.get('jwt.refresh_cookie_name')] ??
      null;
    this.logger.debug(`JWT Validate Begin for [${request.ip}]`);
    this.logger.debug(
      `\taccess_token: ${access_token}, refresh_token: ${refresh_token}`,
    );

    if ((!access_token && !refresh_token) || (access_token && !refresh_token)) {
      // 两token都过期了 或者 access token没过期，但是refresh token过期了
      throw new UnauthorizedException('user:offline[NO-REFRESH-TOKEN]');
    }

    const userdata = this.authService.jwtDecode(refresh_token) as {
      id: number;
      username: string;
      phone: string;
    };
    const id = userdata.id;
    this.logger.debug(
      `userid: ${userdata.id}, username: ${userdata.username}, userphone: ${userdata.phone}`,
    );
    if (!id) {
      throw new UnauthorizedException('user:unknown uid--CLR');
    }
    if (access_token && refresh_token) {
      // 俩token都还在
      // 走验证流程
      return await this.validateWhenBothExist(
        userdata,
        access_token,
        refresh_token,
        request,
      );
    }

    if (!access_token && refresh_token) {
      // access_token过期了，但是refresh token还在
      return await this.validateWhenOnlyRefresh(
        userdata,
        refresh_token,
        request,
      );
    }

    // 其他情况，兜底
    throw new UnauthorizedException('unknown');
  }

  async validateWhenBothExist(
    userdata: { id: number; username: string; phone: string },
    access_token: string,
    refresh_token: string,
    request: FastifyRequest,
  ): Promise<boolean> {
    this.logger.debug('\tvalidate mode: both exist');
    const access_verify_res = this.authService.jwtVerify(access_token, {
      secret: this.configService.get('jwt.access_secret'),
      algorithms: [this.configService.get('jwt.access_algorithm')],
      ignoreExpiration: false,
    });
    if (access_verify_res === AuthError.OK) {
      // access token 有效
      request['user'] = {
        code: AuthError.OK,
      };
      this.logger.debug(`\tuser ${userdata.id}/${request.ip} auth: access token ok!`)
      return true;
    } else if (access_verify_res === AuthError.OUTDATED) {
      this.logger.debug(`\tuser ${userdata.id}/${request.ip} auth: access token outdated!`)
      return await this.validateWhenOnlyRefresh(
        userdata,
        refresh_token,
        request,
      );
    } else {
      throw new UnauthorizedException(
        `user:access_token_error[${access_verify_res}]--CLR`,
      );
    }
  }

  async validateWhenOnlyRefresh(
    userdata: { id: number; username: string; phone: string },
    refresh_token: string,
    request: FastifyRequest,
  ): Promise<boolean> {
    this.logger.debug('\tvalidate mode: only refresh');
    const refresh_verify_res = this.authService.jwtVerify(refresh_token, {
      secret: this.configService.get('jwt.refresh_secret'),
      algorithms: [this.configService.get('jwt.refresh_algorithm')],
      ignoreExpiration: false,
    });
    if (refresh_verify_res === AuthError.OUTDATED) {
      // 过期
      this.logger.debug(
        `\tuser ${userdata.id}/${request.ip} auth: refresh token outdated!`,
      );
      throw new UnauthorizedException('user:refresh_token_expired--CLR');
    } else if (refresh_verify_res === AuthError.OK) {
      this.logger.debug(`\tuser ${userdata.id}/${request.ip} auth: access token outdated and refresh token ok!`)
      // 验证redis是否存在
      const cached = await redisExceptionCatcher(
        this.redis.get(`token_${userdata.id}`),
      );
      if (!cached) {
        // 已下线
        this.logger.debug(
          `\tuser ${userdata.id}/${request.ip} auth: refresh token cache missed!`,
        );
        throw new UnauthorizedException('user:offline[NOCACHE]--CLR');
      }
      if (cached !== refresh_token) {
        // 检测到不匹配
        this.logger.debug(
          `\tuser ${userdata.id}/${request.ip} auth: refresh token cache mismatched!`,
        );
        // todo: 清空redis导致正常登录也无法刷新token
        // await redisExceptionCatcher(this.redis.del(`token_${id}`)); // 自动下线
        throw new UnauthorizedException('user:offline[MISMATCH]--CLR');
      }

      // 匹配时，刷新access_token和refresh_token
      const gen_res = await this.authService.gen_tokens(userdata);
      this.logger.debug(`\tuser ${userdata.id}/${request.ip} auth: refreshed`);

      // 设置cookie更新数据
      request['user'] = {
        data: {
          access_token: gen_res.access_token,
          refresh_token: gen_res.refresh_token,
        },
        code: AuthError.REFRESHED,
      };
      return true;
    } else {
      // refresh token invalid or unknown
      this.logger.debug('refreshed token error: ' + refresh_verify_res)
      throw new UnauthorizedException('user:refresh_token_invalid--CLR')
    }
  }
}
