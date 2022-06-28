import { InjectRedis } from '@liaoliaots/nestjs-redis';
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService, JwtVerifyOptions, JwtSignOptions } from '@nestjs/jwt';
import Redis from 'ioredis';
import { CollectorsService } from '../collectors/collectors.service';
import {
  getIdepmotentValue,
  redisExceptionCatcher,
  sqlExceptionCatcher,
} from '../common/utils';
import { LoginDto } from './dto/login.dto';
import { SendCodeDto } from './dto/send-code.dto';
import { ConfigService } from '@nestjs/config';
import { Collector } from '../collectors/entities/collector.entity';
import { AuthError } from '../common/const';
import { AliService } from '../ali/ali.service';
import { randomBytes } from 'crypto';
import { CryptoJsService } from '../lib/crypto-js/crypto-js.service';
import { HttpService } from '@nestjs/axios';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  constructor(
    @InjectRedis() private redis: Redis,
    private readonly collectorService: CollectorsService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly aliService: AliService,
    private readonly cryptoJsService: CryptoJsService,
    private readonly httpService: HttpService,
  ) {}
  // 发送验证码
  async sendCode(sendCodeDto: SendCodeDto) {
    const code = Math.floor(Math.random() * 1000000)
      .toString()
      .padStart(6, '0');
    const res = await redisExceptionCatcher(
      this.redis.set(
        sendCodeDto.phone,
        code,
        'EX',
        this.configService.get('smscode.expires_in'),
      ), // default: 5分钟过期
    );
    if (res === 'OK') {
      const sendCodeRes = await this.aliService.sendCode(
        sendCodeDto.phone,
        code,
      );
      if (sendCodeRes.code.toLowerCase() === 'ok') {
        this.logger.log(`send code ${code} to ${sendCodeDto.phone} success.`);
        return 'send code success';
      } else {
        this.logger.error(
          `Send code error: ${sendCodeRes.code} - ${sendCodeRes.message}`,
        );
        throw new InternalServerErrorException(
          '[ERROR] SEND CODE: Ali Service ERROR',
        );
      }
    } else {
      throw new InternalServerErrorException('[ERROR] SEND CODE: Redis error');
    }
  }

  // 验证是否匹配
  async validateCode(phone: string, code: string) {
    const res = await redisExceptionCatcher(this.redis.get(phone));
    if (!res) {
      throw new UnauthorizedException('code does not exist');
    }
    if (res === code) {
      return true;
    } else {
      throw new UnauthorizedException('code does not match');
    }
  }

  // only be executed after validation
  // 注册或登录
  async login(loginDto: LoginDto) {
    // 登录成功逻辑
    // 0. 检查用户是否已经注册了账号，如果没注册，帮用户创建一个记录
    const data = await this.collectorService.findByPhone(loginDto.phone);
    let newCollector: Collector | null = null;
    if (data.length === 0) {
      // 创建一个
      newCollector = await this.collectorService.create({
        phone: loginDto.phone,
        // 后4位
        username: `藏家${loginDto.phone.substring(7)}${randomBytes(4).toString(
          'hex',
        )}`,
        avatar: `https://avatars.dicebear.com/api/pixel-art/${loginDto.phone}.svg`,
      });
    }
    // 拿到用户信息
    const collector = data.length === 1 ? data[0] : newCollector;
    this.logger.log('拿到用户信息');
    // 1. 生成access_token & refresh_token
    const access_token = this.jwtService.sign({
      id: collector.id,
      phone: collector.phone,
      username: collector.username,
    });
    const refresh_token = this.jwtService.sign(
      {
        id: collector.id,
        phone: loginDto.phone,
        username: collector.username,
      },
      {
        // 使用refresh config secret作refresh token
        secret: this.configService.get('jwt.refresh_secret'),
        expiresIn: this.configService.get('jwt.refresh_expires_in'),
        algorithm: this.configService.get('jwt.refresh_algorithm'),
      },
    );
    this.logger.log(
      '生成access_token & refresh_token',
      access_token,
      refresh_token,
    );
    // 删除redis中的验证码
    const del_res = await redisExceptionCatcher(
      this.redis.del(collector.phone),
    ); // 异步删除phone对应的code
    this.logger.log('删除redis中的验证码', del_res);
    // 3. redis中设置refresh_token，仅可使用一次，即refresh时删除旧的refreshToken
    const set_res = await redisExceptionCatcher(
      this.redis.set(
        `token_${collector.id}`,
        refresh_token,
        'EX',
        14 * 24 * 60 * 60, // 14天过期
      ),
    );
    this.logger.log('redis中设置refresh_token', set_res);
    return {
      access_token,
      refresh_token,
      collector,
    };
  }

  jwtVerify(token: string, option: JwtVerifyOptions): AuthError {
    try {
      this.jwtService.verify(token, option);
      return AuthError.OK; // 未过期
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return AuthError.OUTDATED; // 过期
      } else if (err.name === 'InvalidTokenError') {
        return AuthError.INVALID; // 无效
      } else {
        this.logger.error(err);
        return AuthError.UNKNOWN; // 未知错误
      }
    }
  }

  async logout(data: { id: number }) {
    const { id } = data;
    const del_res = await redisExceptionCatcher(this.redis.del(`token_${id}`));
    if (del_res === 1) {
      return 0;
    } else if (del_res === 0) {
      return 1;
    } else {
      return del_res;
    }
  }

  jwtDecode(token: string): any {
    return this.jwtService.decode(token);
  }

  jwtSign(payload: any, option: JwtSignOptions): string {
    return this.jwtService.sign(payload, option);
  }

  async fetchUserInfo(access_token: string) {
    const { id } = this.jwtDecode(access_token);
    const collector = await this.collectorService.findOne(id);
    return collector;
  }

  async refresh(refresh_token: string) {
    // 1. 检查refresh token
    const data = await redisExceptionCatcher(this.redis.get(refresh_token));
    if (!data) {
      // refresh token不存在，需要重新登录
      throw new UnauthorizedException('refresh token error');
    }
    // 2. 删除redis中的refresh token
    await redisExceptionCatcher(this.redis.del(refresh_token));
    // 3. 解析refresh_token获取payload
    const payload = this.jwtService.decode(refresh_token) as {
      phone: string;
      username: string;
    };
    // 4. 生成access_token 和 新的 refresh_token
    const access_token = this.jwtService.sign({
      phone: payload.phone,
      username: payload.username,
    });
    const refresh_token_new = this.jwtService.sign(
      {
        phone: payload.phone,
        username: payload.username,
      },
      {
        secret: this.configService.get('jwt.refresh_secret'),
        expiresIn: this.configService.get('jwt.refresh_expires_in'),
      },
    );
    // 5. 设置refresh_token到redis
    await redisExceptionCatcher(
      this.redis.set(
        refresh_token_new,
        1,
        'EX',
        15 * 24 * 60 * 60, // 14天过期
      ),
    );
    return {
      access_token,
      refresh_token: refresh_token_new,
    };
  }

  async fetchOpenid(encrypt_code: string) {
    const code = this.cryptoJsService.decrypt(encrypt_code);
    this.logger.debug('decrypt code: ' + code);
    this.logger.debug('appid: ' + this.configService.get('wxpay.appid'));
    this.logger.debug(
      'appsecret: ' + this.configService.get('wxpay.appsecret'),
    );
    const cached_openid = await this.redis.get(`wx_code:${code}`);
    this.logger.debug('cached openid: ' + cached_openid);
    if (cached_openid) {
      return cached_openid;
    }
    const fetchRes = await this.httpService
      .get<{
        access_token: string;
        expires_in: string;
        refresh_token: string;
        openid: string;
        scope: string;
        errcode: number;
        errmsg: string;
      }>(`https://api.weixin.qq.com/sns/oauth2/access_token`, {
        params: {
          appid: this.configService.get('wxpay.appid'),
          secret: this.configService.get('wxpay.appsecret'),
          code,
          grant_type: 'authorization_code',
        },
      })
      .toPromise();
    if (fetchRes.data.errcode) {
      throw new InternalServerErrorException(
        `${fetchRes.data.errcode}: ${fetchRes.data.errmsg}`,
      );
    } else {
      await this.redis.set(`wx_code:${code}`, fetchRes.data.openid, 'EX', 60 * 10); // 10分钟code失效
      return fetchRes.data.openid;
    }
  }

  async fetchSignature(url: string) {
    // 获取ticket
    let jsapi_ticket = await this.redis.get('jsapi_ticket');
    if (!jsapi_ticket) {
      // 获取access token
      let access_token = await this.redis.get('access_token');
      if (!access_token) {
        const res1 = await this.httpService
          .get<{
            access_token: string;
            expires_in: number;
            errcode: number;
            errmsg: string;
          }>('https://api.weixin.qq.com/cgi-bin/token', {
            params: {
              grant_type: 'client_credential',
              appid: this.configService.get('wxpay.appid'),
              secret: this.configService.get('wxpay.appsecret'),
            },
          })
          .toPromise();
        if (res1.data.access_token) {
          access_token = res1.data.access_token;
          this.redis.set(
            'access_token',
            access_token,
            'EX',
            res1.data.expires_in,
          );
        } else {
          throw new InternalServerErrorException(
            '请求微信接口出错: Access Token',
          );
        }
      }
      const res2 = await this.httpService
        .get<{
          errcode: number;
          errmsg: string;
          ticket: string;
          expires_in: number;
        }>('https://api.weixin.qq.com/cgi-bin/ticket/getticket', {
          params: {
            access_token,
            type: 'jsapi',
          },
        })
        .toPromise();
      if (res2.data.ticket) {
        jsapi_ticket = res2.data.ticket;
        this.redis.set(
          'jsapi_ticket',
          jsapi_ticket,
          'EX',
          res2.data.expires_in,
        );
      } else {
        throw new InternalServerErrorException(
          '请求微信接口出错: Jsapi Ticket',
        );
      }
    }
    const noncestr = getIdepmotentValue();
    const timestamp = Math.round(Date.now() / 1000);

    const concatenate_str = `jsapi_ticket=${jsapi_ticket}&noncestr=${noncestr}&timestamp=${timestamp}&url=${url}`;
    this.logger.debug(`concatenate_str: ${concatenate_str}`);
    const signature = this.cryptoJsService.sha1(concatenate_str);
    return {
      signature,
      timestamp,
      nonceStr: noncestr,
      appId: this.configService.get('wxpay.appid'),
    };
  }
}
