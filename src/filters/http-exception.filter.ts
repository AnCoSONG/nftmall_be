import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
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
      if (!message.startsWith('admin')) {
        this.logger.debug('auth error, clear cookie')
        // 如果401 且不是以admin开头的message => 直接clearcookie
        response.clearCookie('tt', { path: '/' });
        response.clearCookie('xc', { path: '/' });
      }
    }

    response.status(exception.getStatus()).send(errorResponse);
  }
}
