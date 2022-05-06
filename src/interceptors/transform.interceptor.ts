import {
  CallHandler,
  ExecutionContext,
  HttpStatus,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { map, Observable } from 'rxjs';

@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const res = context.switchToHttp().getResponse();
    // console.log(req.raw.url, req.context.config.url, req.url);
    // change post response with 200, so that all response codes are the same.
    if (req.method === 'POST') res.statusCode = HttpStatus.OK;
    return next.handle().pipe(
      map((data) => {
        return {
          data,
          code: res.statusCode - 200 < 100 ? 200 : res.statusCode,
          rawCode: res.statusCode,
          message: `request ${req.url} success`,
        };
      }),
    );
  }
}
