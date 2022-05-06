import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();
    const statusCode = exception.getStatus();

    const errorResponse = {
      statusCode,
      code: statusCode,
      message: exception.message,
      error: exception.name,
      url: request.url,
    };

    response.status(exception.getStatus()).send(errorResponse);
  }
}
