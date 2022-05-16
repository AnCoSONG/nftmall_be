import {
  CallHandler,
  ExecutionContext,
  HttpStatus,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { map, Observable } from 'rxjs';
import { FastifyRequest, FastifyReply } from 'fastify';

@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest<FastifyRequest>();
    const res = context.switchToHttp().getResponse<FastifyReply>();
    console.log('req.user', req['user']);
    // console.log(req.raw.url, req.context.config.url, req.url);
    // change post response with 200, so that all success response codes are the same.
    if (req.method === 'POST') res.statusCode = HttpStatus.OK;
    return next.handle().pipe(
      map((data) => {
        // set auth info in cookie for safty
        if (req['user'] && req['user'].data) {
          res.log.info('updating tokens', req['user']);
          res.cookie('tt', req['user'].data.refresh_token, {
            maxAge: 1000 * 60 * 60 * 24 * 15,
            httpOnly: true,
            secure: true,
            path: '/',
          });
          res.cookie('xc', req['user'].data.access_token, {
            maxAge: 1000 * 60 * 60 * 24 * 2, // 2 day ... larger than redis expire time
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
          message: data.message ?? `request ${req.url} success`,
        };
      }),
    );
  }
}
