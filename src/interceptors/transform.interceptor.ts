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

@Injectable()
export class TransformInterceptor implements NestInterceptor {
  private readonly logger = new Logger(TransformInterceptor.name);
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
          // res.log.info('updating tokens', req['user']);
          res.cookie('tt', req['user'].data.refresh_token, {
            maxAge: 1000 * 60 * 60 * 24 * 15,
            httpOnly: true,
            secure: true,
            path: '/',
          });
          res.cookie('xc', req['user'].data.access_token, {
            maxAge: 1000 * 60 * 60 * 24 * 15, // same with refresh token
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
