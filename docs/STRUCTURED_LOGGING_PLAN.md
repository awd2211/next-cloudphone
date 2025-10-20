# 结构化日志系统实施计划

**日期**: 2025-10-20
**优先级**: P1 (高)
**预计工时**: 4-6小时

---

## 目标

为所有微服务实现统一的结构化日志系统，便于日志聚合、分析和故障排查。

---

## 技术方案

### 1. 日志库选择

**Winston** - Node.js 最流行的日志库
- ✅ 支持多种传输方式（Console, File, HTTP）
- ✅ 灵活的日志级别
- ✅ 支持自定义格式
- ✅ 与 NestJS 集成良好（nest-winston）

### 2. 日志级别

```typescript
enum LogLevel {
  ERROR = 0,   // 错误 - 需要立即关注
  WARN = 1,    // 警告 - 潜在问题
  INFO = 2,    // 信息 - 一般业务流程
  HTTP = 3,    // HTTP 请求/响应
  DEBUG = 4,   // 调试信息
}
```

### 3. 日志格式

**JSON 格式** (便于机器解析和日志聚合):

```json
{
  "timestamp": "2025-10-20T17:45:00.123Z",
  "level": "info",
  "service": "user-service",
  "message": "User registered successfully",
  "context": "UsersService",
  "trace_id": "abc123...",
  "user_id": "686f5a6e-3e6d-4ad7-9e21-8bab07fdcdc1",
  "method": "POST",
  "url": "/api/users/register",
  "ip": "172.22.0.1",
  "duration": 45,
  "metadata": {
    "username": "test user",
    "email": "test@example.com"
  }
}
```

---

## 实施步骤

### 阶段 1: 为 User Service 创建日志模块（模板）

#### 1.1 创建 Winston 配置

**文件**: `backend/user-service/src/config/winston.config.ts`

```typescript
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';

const { combine, timestamp, json, printf, colorize } = winston.format;

// 开发环境格式（可读性好）
const devFormat = printf(({ timestamp, level, message, context, ...meta }) => {
  return `${timestamp} [${level}] [${context || 'Application'}] ${message} ${
    Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''
  }`;
});

// 生产环境格式（JSON）
const prodFormat = combine(
  timestamp(),
  json()
);

export const winstonConfig = {
  transports: [
    new winston.transports.Console({
      level: process.env.LOG_LEVEL || 'info',
      format: process.env.NODE_ENV === 'production' ? prodFormat : combine(
        colorize(),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        devFormat
      ),
    }),
    // 生产环境：写入文件
    ...(process.env.NODE_ENV === 'production' ? [
      new winston.transports.File({
        filename: 'logs/error.log',
        level: 'error',
        format: prodFormat,
      }),
      new winston.transports.File({
        filename: 'logs/combined.log',
        format: prodFormat,
      }),
    ] : []),
  ],
};
```

#### 1.2 集成到 AppModule

**文件**: `backend/user-service/src/app.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { WinstonModule } from 'nest-winston';
import { winstonConfig } from './config/winston.config';

@Module({
  imports: [
    WinstonModule.forRoot(winstonConfig),
    // ... 其他模块
  ],
})
export class AppModule {}
```

#### 1.3 在 main.ts 中使用 Winston Logger

**文件**: `backend/user-service/src/main.ts`

```typescript
import { NestFactory } from '@nestjs/core';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 使用 Winston 作为全局 logger
  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));

  await app.listen(30001);
}
bootstrap();
```

#### 1.4 在服务中使用日志

**示例**: `backend/user-service/src/users/users.service.ts`

```typescript
import { Injectable, Inject, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';

@Injectable()
export class UsersService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: LoggerService,
  ) {}

  async createUser(createUserDto: CreateUserDto) {
    this.logger.log({
      message: 'Creating new user',
      context: 'UsersService.createUser',
      username: createUserDto.username,
      email: createUserDto.email,
    });

    try {
      const user = await this.usersRepository.save(createUserDto);

      this.logger.log({
        message: 'User created successfully',
        context: 'UsersService.createUser',
        userId: user.id,
      });

      return user;
    } catch (error) {
      this.logger.error({
        message: 'Failed to create user',
        context: 'UsersService.createUser',
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }
}
```

### 阶段 2: HTTP 请求/响应日志中间件

#### 2.1 创建日志拦截器

**文件**: `backend/user-service/src/common/interceptors/logging.interceptor.ts`

```typescript
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
  LoggerService,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: LoggerService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, body, ip, headers } = request;
    const userAgent = headers['user-agent'] || '';
    const startTime = Date.now();

    // 请求日志
    this.logger.log({
      message: `Incoming request`,
      context: 'HTTP',
      method,
      url,
      ip,
      userAgent,
      body: this.sanitizeBody(body),
    });

    return next.handle().pipe(
      tap({
        next: (data) => {
          const duration = Date.now() - startTime;
          const response = context.switchToHttp().getResponse();

          this.logger.log({
            message: `Request completed`,
            context: 'HTTP',
            method,
            url,
            statusCode: response.statusCode,
            duration: `${duration}ms`,
          });
        },
        error: (error) => {
          const duration = Date.now() - startTime;

          this.logger.error({
            message: `Request failed`,
            context: 'HTTP',
            method,
            url,
            error: error.message,
            duration: `${duration}ms`,
            stack: error.stack,
          });
        },
      }),
    );
  }

  // 移除敏感信息
  private sanitizeBody(body: any): any {
    if (!body) return {};
    const sanitized = { ...body };
    const sensitiveFields = ['password', 'token', 'secret', 'apiKey'];

    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '***REDACTED***';
      }
    });

    return sanitized;
  }
}
```

#### 2.2 全局应用拦截器

**文件**: `backend/user-service/src/main.ts`

```typescript
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));
  app.useGlobalInterceptors(new LoggingInterceptor(app.get(WINSTON_MODULE_PROVIDER)));

  await app.listen(30001);
}
```

### 阶段 3: 错误日志和异常过滤器

#### 3.1 创建全局异常过滤器

**文件**: `backend/user-service/src/common/filters/all-exceptions.filter.ts`

```typescript
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Inject,
  LoggerService,
} from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: LoggerService,
  ) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    // 记录错误日志
    this.logger.error({
      message: 'Exception occurred',
      context: 'AllExceptionsFilter',
      method: request.method,
      url: request.url,
      status,
      error: exception instanceof Error ? exception.message : String(exception),
      stack: exception instanceof Error ? exception.stack : undefined,
      user: request.user?.id,
    });

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
    });
  }
}
```

### 阶段 4: 日志聚合（可选）

#### 4.1 集成 ELK Stack (Elasticsearch + Logstash + Kibana)

```yaml
# docker-compose.logging.yml
version: '3.8'

services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.11.0
    environment:
      - discovery.type=single-node
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
    ports:
      - "9200:9200"
    volumes:
      - elasticsearch_data:/usr/share/elasticsearch/data

  logstash:
    image: docker.elastic.co/logstash/logstash:8.11.0
    volumes:
      - ./infrastructure/logstash/pipeline:/usr/share/logstash/pipeline
    ports:
      - "5044:5044"
    depends_on:
      - elasticsearch

  kibana:
    image: docker.elastic.co/kibana/kibana:8.11.0
    ports:
      - "5601:5601"
    depends_on:
      - elasticsearch

volumes:
  elasticsearch_data:
```

#### 4.2 Logstash 配置

**文件**: `infrastructure/logstash/pipeline/logstash.conf`

```conf
input {
  tcp {
    port => 5044
    codec => json
  }
}

filter {
  # 添加地理位置（如果有 IP）
  if [ip] {
    geoip {
      source => "ip"
    }
  }

  # 添加时间戳
  date {
    match => [ "timestamp", "ISO8601" ]
  }
}

output {
  elasticsearch {
    hosts => ["elasticsearch:9200"]
    index => "microservices-logs-%{+YYYY.MM.dd}"
  }

  # 开发环境：同时输出到 stdout
  stdout {
    codec => rubydebug
  }
}
```

#### 4.3 Winston 配置发送到 Logstash

```typescript
import * as winston from 'winston';
import 'winston-logstash';

const logstashTransport = new winston.transports.Logstash({
  port: 5044,
  node_name: 'user-service',
  host: process.env.LOGSTASH_HOST || 'localhost',
});

export const winstonConfig = {
  transports: [
    // ... 其他 transports
    ...(process.env.ENABLE_LOGSTASH === 'true' ? [logstashTransport] : []),
  ],
};
```

---

## 实施时间表

| 阶段 | 任务 | 预计时间 | 优先级 |
|-----|------|---------|--------|
| 1 | User Service 日志模块（模板） | 1-2h | P0 |
| 2 | 复制到其他 5 个 NestJS 服务 | 1h | P0 |
| 3 | HTTP 请求/响应日志 | 1h | P1 |
| 4 | 全局异常过滤器 | 0.5h | P1 |
| 5 | 环境变量配置 (.env.example) | 0.5h | P2 |
| 6 | ELK Stack 集成（可选） | 2-3h | P3 |
| 7 | 文档和测试 | 1h | P1 |

**总计**: 6-9小时

---

## 环境变量

在所有服务的 `.env` 文件中添加：

```bash
# 日志配置
LOG_LEVEL=info                    # error | warn | info | http | debug
LOG_FORMAT=json                   # json | simple
ENABLE_FILE_LOGGING=true          # 是否写入文件
ENABLE_LOGSTASH=false             # 是否发送到 Logstash
LOGSTASH_HOST=localhost
LOGSTASH_PORT=5044
```

---

## 测试方案

### 1. 单元测试

```typescript
describe('LoggingInterceptor', () => {
  it('should log incoming requests', () => {
    // ... 测试代码
  });

  it('should sanitize sensitive data', () => {
    // ... 测试代码
  });
});
```

### 2. 集成测试

```bash
# 1. 启动服务
docker compose up -d

# 2. 发送测试请求
curl -X POST http://localhost:30001/api/users/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test123"}'

# 3. 检查日志输出
docker logs cloudphone-user-service --tail 50

# 4. 验证 JSON 格式
docker logs cloudphone-user-service --tail 1 | jq .
```

### 3. 性能测试

```bash
# 使用 ab (Apache Bench) 测试日志对性能的影响
ab -n 1000 -c 10 http://localhost:30001/api/users
```

---

## 参考文档

- [Winston Documentation](https://github.com/winstonjs/winston)
- [nest-winston](https://github.com/gremo/nest-winston)
- [NestJS Logging](https://docs.nestjs.com/techniques/logger)
- [ELK Stack](https://www.elastic.co/elastic-stack)

---

**🤖 Generated with Claude Code**
