import { Injectable, Logger, NestMiddleware } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private logger = new Logger("HTTP");

  use(req: Request, res: Response, next: NextFunction): void {
    const { method, originalUrl, ip } = req;
    const userAgent = req.get("user-agent") || "";
    const startTime = Date.now();

    // 记录请求信息
    this.logger.log(
      `[Request] ${method} ${originalUrl} - ${ip} - ${userAgent}`,
    );

    // 监听响应完成
    res.on("finish", () => {
      const { statusCode } = res;
      const responseTime = Date.now() - startTime;

      // 根据状态码选择日志级别
      const message = `[Response] ${method} ${originalUrl} ${statusCode} - ${responseTime}ms`;

      if (statusCode >= 500) {
        this.logger.error(message);
      } else if (statusCode >= 400) {
        this.logger.warn(message);
      } else {
        this.logger.log(message);
      }
    });

    next();
  }
}
