import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../../src/app.module';
import * as request from 'supertest';
import { JwtAuthGuard } from '../../src/auth/jwt-auth.guard';
import { PermissionsGuard } from '../../src/auth/guards/permissions.guard';
import { RolesGuard } from '../../src/auth/roles.guard';
import { mockJwtAuthGuard, mockPermissionsGuard, mockRolesGuard, generateTestToken } from '../mocks/auth-mock.module';

/**
 * E2E 测试辅助类
 */
export class E2ETestHelper {
  private app: INestApplication;
  private authToken: string;

  /**
   * 创建测试应用实例
   */
  async createApp(): Promise<INestApplication> {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      // Override guards with mocks to bypass authentication
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtAuthGuard)
      .overrideGuard(PermissionsGuard)
      .useValue(mockPermissionsGuard)
      .overrideGuard(RolesGuard)
      .useValue(mockRolesGuard)
      .compile();

    this.app = moduleFixture.createNestApplication();

    // 应用全局验证管道 (与实际应用一致)
    this.app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );

    await this.app.init();
    return this.app;
  }

  /**
   * 获取应用实例
   */
  getApp(): INestApplication {
    return this.app;
  }

  /**
   * 获取 HTTP server
   */
  getServer() {
    return this.app.getHttpServer();
  }

  /**
   * 设置认证 token
   */
  setAuthToken(token: string) {
    this.authToken = token;
  }

  /**
   * 获取认证 token
   */
  getAuthToken(): string {
    return this.authToken;
  }

  /**
   * 生成测试用的 JWT token
   */
  generateMockToken(userId: string = 'test-user-id', permissions: string[] = []): string {
    const token = generateTestToken(userId, permissions);
    return `Bearer ${token}`;
  }

  /**
   * 创建带认证的 GET 请求
   */
  get(path: string) {
    const req = request(this.getServer()).get(path);
    if (this.authToken) {
      req.set('Authorization', this.authToken);
    }
    return req;
  }

  /**
   * 创建带认证的 POST 请求
   */
  post(path: string) {
    const req = request(this.getServer()).post(path);
    if (this.authToken) {
      req.set('Authorization', this.authToken);
    }
    return req;
  }

  /**
   * 创建带认证的 PATCH 请求
   */
  patch(path: string) {
    const req = request(this.getServer()).patch(path);
    if (this.authToken) {
      req.set('Authorization', this.authToken);
    }
    return req;
  }

  /**
   * 创建带认证的 DELETE 请求
   */
  delete(path: string) {
    const req = request(this.getServer()).delete(path);
    if (this.authToken) {
      req.set('Authorization', this.authToken);
    }
    return req;
  }

  /**
   * 创建带认证的 PUT 请求
   */
  put(path: string) {
    const req = request(this.getServer()).put(path);
    if (this.authToken) {
      req.set('Authorization', this.authToken);
    }
    return req;
  }

  /**
   * 关闭应用
   */
  async closeApp() {
    if (this.app) {
      await this.app.close();
    }
  }
}

/**
 * 创建 E2E 测试助手实例
 */
export async function createE2ETestHelper(): Promise<E2ETestHelper> {
  const helper = new E2ETestHelper();
  await helper.createApp();
  return helper;
}
