import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';

export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
}

interface LogEntry {
  level: LogLevel;
  message: string;
  context?: string;
  timestamp: string;
  service: string;
  environment: string;
  metadata?: any;
}

@Injectable()
export class AppLoggerService implements NestLoggerService {
  private serviceName: string;
  private environment: string;

  constructor() {
    this.serviceName = 'notification-service';
    this.environment = process.env.NODE_ENV || 'development';
  }

  private formatLog(
    level: LogLevel,
    message: string,
    context?: string,
    metadata?: any,
  ): string {
    const logEntry: LogEntry = {
      level,
      message,
      context,
      timestamp: new Date().toISOString(),
      service: this.serviceName,
      environment: this.environment,
      metadata,
    };

    return JSON.stringify(logEntry);
  }

  log(message: string, context?: string, metadata?: any) {
    console.log(this.formatLog(LogLevel.INFO, message, context, metadata));
  }

  error(message: string, trace?: string, context?: string, metadata?: any) {
    console.error(
      this.formatLog(LogLevel.ERROR, message, context, {
        ...metadata,
        trace,
      }),
    );
  }

  warn(message: string, context?: string, metadata?: any) {
    console.warn(this.formatLog(LogLevel.WARN, message, context, metadata));
  }

  debug(message: string, context?: string, metadata?: any) {
    if (this.environment === 'development') {
      console.debug(this.formatLog(LogLevel.DEBUG, message, context, metadata));
    }
  }

  verbose(message: string, context?: string, metadata?: any) {
    this.debug(message, context, metadata);
  }

  // 业务日志方法
  logUserAction(
    userId: string,
    action: string,
    resource: string,
    metadata?: any,
  ) {
    this.log(`User action: ${action} on ${resource}`, 'UserAction', {
      userId,
      action,
      resource,
      ...metadata,
    });
  }

  logApiCall(method: string, url: string, statusCode: number, duration: number) {
    this.log(`API Call: ${method} ${url}`, 'ApiCall', {
      method,
      url,
      statusCode,
      duration,
    });
  }

  logWebSocketEvent(event: string, userId: string, data?: any) {
    this.log(`WebSocket event: ${event}`, 'WebSocket', {
      event,
      userId,
      data,
    });
  }

  logEmailSent(to: string, subject: string, success: boolean) {
    this.log(`Email sent to ${to}`, 'Email', {
      to,
      subject,
      success,
    });
  }
}
