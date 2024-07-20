import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const message = exception.getResponse() || exception.message;
      const json = {
        success: false,
        message,
      };
      console.error(message);
      response.status(status).json(json);
    } else {
      const message = exception.message;
      const json = {
        success: false,
        message,
      };
      console.error(message);
      response.status(500).json(json);
    }
  }
}
