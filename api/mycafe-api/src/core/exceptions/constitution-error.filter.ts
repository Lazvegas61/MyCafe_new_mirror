import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class ConstitutionErrorFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let code = 'INTERNAL_ERROR';
    let rule = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const response = exception.getResponse() as any;
      
      if (typeof response === 'string') {
        message = response;
      } else if (response.message) {
        message = response.message;
      }
      
      if (message.includes('K01')) rule = 'K01';
      if (message.includes('K02')) rule = 'K02';
      if (message.includes('K03')) rule = 'K03';
      if (message.includes('K13')) rule = 'K13';
      if (message.includes('K17')) rule = 'K17';
      if (message.includes('K18')) rule = 'K18';
    }

    if (exception instanceof Error) {
      const err = exception as any;
      
      if (err.code === '23505') {
        message = 'Veri tekrarı: Bu kayıt zaten var';
        status = HttpStatus.CONFLICT;
        code = 'DUPLICATE_ENTRY';
      }
      if (err.code === '23503') {
        message = 'Referans hatası: İlgili kayıt bulunamadı';
        status = HttpStatus.BAD_REQUEST;
        code = 'FOREIGN_KEY_VIOLATION';
      }
      if (err.code === '23514') {
        message = 'Veri kural ihlali: ' + (err.detail || 'Kural ihlali');
        status = HttpStatus.BAD_REQUEST;
        code = 'CONSTRAINT_VIOLATION';
        
        if (err.detail?.includes('stock_non_negative')) rule = 'K05.3';
        if (err.detail?.includes('one_open_invoice_per_table')) rule = 'K05.1';
        if (err.detail?.includes('amount_non_negative')) rule = 'K05.4';
      }
    }

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message,
      code,
      ...(rule && { constitutionRule: rule }),
      ...(process.env.NODE_ENV === 'development' && { stack: exception instanceof Error ? exception.stack : null }),
    };

    console.error('📛 Anayasa Hatası:', errorResponse);
    
    response.status(status).json(errorResponse);
  }
}
