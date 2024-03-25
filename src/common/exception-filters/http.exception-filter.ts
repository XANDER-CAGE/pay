import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: Error, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const { message } = (exception.getResponse() as any) || exception;
      const json = {
        succes: false,
        message,
      };
      response.status(status).json(json);
    } else {
      const message = exception.message;
      const json = {
        succes: false,
        message,
      };
      console.error(message);
      response.status(500).json(json);
    }
  }
}
