import {
  CallHandler,
  ExecutionContext,
  HttpStatus,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { map, Observable } from 'rxjs';
import { FastifyRequest, FastifyReply } from 'fastify';
import { AuthError } from '../common/const';
import ms from 'ms';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TransformInterceptor implements NestInterceptor {
  private readonly logger = new Logger(TransformInterceptor.name);
  // constructor(private readonly configService: ConfigService) {}
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest<FastifyRequest>();
    const res = context.switchToHttp().getResponse<FastifyReply>();
    // this.logger.log('req.user: ' + JSON.stringify(req['user']));
    // console.log(req.raw.url, req.context.config.url, req.url);
    // change post response with 200, so that all success response codes are the same.
    if (req.method === 'POST') res.statusCode = HttpStatus.OK;
    return next.handle().pipe(
      map((data) => {
        // set auth info in cookie for safty
        if (req['user'] && req['user'].data) {
          this.logger.debug('setting token: ' + JSON.stringify(req['user']))
          // this.logger.debug('refresh maxAge: ' + Math.floor(ms('15d') / 1000) )
          // this.logger.debug('access maxAge: ' + Math.floor(ms('5s') / 1000) )
          // res.log.info('updating tokens', req['user']);
          res.cookie('__tt__', req['user'].data.refresh_token, {
            maxAge: Math.floor(ms('15d') / 1000),
            httpOnly: true,
            secure: true,
            path: '/',
          });
          res.cookie('__xc__', req['user'].data.access_token, {
            maxAge: Math.floor(ms('30s') / 1000), // same with refresh token
            httpOnly: true,
            secure: true,
            path: '/',
          });
        }
        return {
          auth: req['user']?.code, //! can be null!
          data,
          code: res.statusCode,
          statusCode: res.statusCode,
          message: (data && data.message) ?? `request ${req.url} success`,
        };
      }),
    );
  }
}
