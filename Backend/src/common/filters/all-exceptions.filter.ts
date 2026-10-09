import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

interface ErrorBody {
  statusCode: number;
  message: string | string[];
  error: string;
  path: string;
  timestamp: string;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    // Los errores de WebSocket los resuelve el propio gateway (respuesta ack); aquí solo HTTP.
    if (host.getType() !== 'http') {
      return;
    }
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Error interno del servidor';
    let error = 'Internal Server Error';

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const body = exceptionResponse as Record<string, unknown>;
        if (typeof body.message === 'string' || Array.isArray(body.message)) {
          message = body.message as string | string[];
        }
        if (typeof body.error === 'string') {
          error = body.error;
        } else {
          error = exception.name;
        }
      }
    }

    if (statusCode >= 500) {
      const detail =
        exception instanceof Error
          ? `${exception.message}\n${exception.stack ?? ''}`
          : String(exception);
      this.logger.error(`HTTP ${statusCode} ${request.method} ${request.url}: ${detail}`);
    }

    const payload: ErrorBody = {
      statusCode,
      message,
      error,
      path: request.url,
      timestamp: new Date().toISOString(),
    };

    response.status(statusCode).json(payload);
  }
}
