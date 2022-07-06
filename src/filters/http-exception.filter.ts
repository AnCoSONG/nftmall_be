import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FastifyReply, FastifyRequest } from 'fastify';
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name)
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();
    const statusCode = exception.getStatus();
    const message = exception.message;

    if (statusCode === 401) {
      const msgArr = message.split('--')
      const operation = msgArr[msgArr.length - 1]
      if (operation === 'CLR') {
        this.logger.debug('CLR OPERATION DETECT')
        // 如果401 且不是以admin开头的message => 直接clearcookie
        response.clearCookie('__tt__', { path: '/' });
        response.clearCookie('__xc__', { path: '/' });
      }
    }
    const errorResponse = {
      statusCode,
      code: statusCode,
      message: exception.message,
      error: exception.name,
      url: request.url,
    };
    if (exception.message === 'user:offline[MISMATCH]--CLR') {
      errorResponse.message = '您在其他设备完成过登录，本设备自动下线'
    }
    else if (exception.message === 'user:offline[NOCACHE]--CLR') {
      errorResponse.message = '您已被下线'
    } else if (exception.message === 'user:refresh_token_expired--CLR') {
      errorResponse.message = '登录态已过期'
    }
    response.status(exception.getStatus()).send(errorResponse);
  }
}
