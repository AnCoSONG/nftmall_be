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

    const errorResponse = {
      statusCode,
      code: statusCode,
      message: exception.message,
      error: exception.name,
      url: request.url,
    };
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

    response.status(exception.getStatus()).send(errorResponse);
  }
}
