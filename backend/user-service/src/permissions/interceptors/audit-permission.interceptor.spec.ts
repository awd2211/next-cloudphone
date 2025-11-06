import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { of, throwError } from 'rxjs';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AuditPermissionInterceptor,
  AuditLevel,
  AUDIT_PERMISSION_KEY,
  SKIP_AUDIT_KEY,
  AUDIT_RESOURCE_KEY,
  AUDIT_ACTION_KEY,
} from './audit-permission.interceptor';
import { AuditLog } from '../../entities/audit-log.entity';
import { AlertService } from '../../common/services/alert/alert.service';

describe('AuditPermissionInterceptor', () => {
  let interceptor: AuditPermissionInterceptor;
  let reflector: Reflector;
  let auditLogRepository: jest.Mocked<Repository<AuditLog>>;
  let alertService: jest.Mocked<AlertService>;

  // Mock services
  const mockAuditLogRepository = {
    save: jest.fn(),
  };

  const mockAlertService = {
    sendCriticalAlert: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditPermissionInterceptor,
        Reflector,
        {
          provide: getRepositoryToken(AuditLog),
          useValue: mockAuditLogRepository,
        },
        {
          provide: AlertService,
          useValue: mockAlertService,
        },
      ],
    }).compile();

    // Suppress logger output during tests
    Logger.prototype.log = jest.fn();
    Logger.prototype.error = jest.fn();
    Logger.prototype.warn = jest.fn();

    interceptor = module.get<AuditPermissionInterceptor>(AuditPermissionInterceptor);
    reflector = module.get<Reflector>(Reflector);
    auditLogRepository = module.get(getRepositoryToken(AuditLog));
    alertService = module.get(AlertService);
  });

  /**
   * Helper function to create mock ExecutionContext
   */
  function createMockContext(
    user: any,
    metadata: Record<string, any> = {},
    requestData: any = {}
  ): ExecutionContext {
    const mockRequest = {
      user,
      body: requestData.body || {},
      params: requestData.params || {},
      query: requestData.query || {},
      url: requestData.url || '/test',
      method: requestData.method || 'GET',
      headers: requestData.headers || {},
      connection: { remoteAddress: '127.0.0.1' },
      get: jest.fn((header: string) => {
        if (header === 'user-agent') return requestData.userAgent || 'test-agent';
        return null;
      }),
    };

    const mockResponse = {
      statusCode: 200,
    };

    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
        getResponse: () => mockResponse,
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as unknown as ExecutionContext;

    // Setup reflector to return metadata
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key: string) => {
      return metadata[key];
    });

    return mockContext;
  }

  /**
   * Helper function to create mock CallHandler
   */
  function createMockCallHandler(result: any, shouldError = false): CallHandler {
    return {
      handle: jest.fn(() => {
        if (shouldError) {
          return throwError(() => result);
        }
        return of(result);
      }),
    } as any;
  }

  describe('@SkipAudit', () => {
    it('should skip audit when skipAudit is true', (done) => {
      const context = createMockContext(
        { id: 'user-123' },
        { [SKIP_AUDIT_KEY]: true, [AUDIT_PERMISSION_KEY]: true }
      );
      const next = createMockCallHandler({ success: true });

      interceptor.intercept(context, next).subscribe({
        next: (data) => {
          expect(data).toEqual({ success: true });
          expect(auditLogRepository.save).not.toHaveBeenCalled();
          done();
        },
      });
    });

    it('should continue audit when skipAudit is false', (done) => {
      const context = createMockContext(
        { id: 'user-123', username: 'testuser' },
        { [SKIP_AUDIT_KEY]: false, [AUDIT_PERMISSION_KEY]: true }
      );
      const next = createMockCallHandler({ success: true });

      // Mock save to resolve immediately
      mockAuditLogRepository.save.mockResolvedValue({} as any);

      interceptor.intercept(context, next).subscribe({
        next: () => {
          // Use setTimeout to allow async operations to complete
          setTimeout(() => {
            expect(auditLogRepository.save).toHaveBeenCalled();
            done();
          }, 10);
        },
      });
    });
  });

  describe('@AuditPermission', () => {
    it('should not audit when auditPermission is false', (done) => {
      const context = createMockContext({ id: 'user-123' }, { [AUDIT_PERMISSION_KEY]: false });
      const next = createMockCallHandler({ success: true });

      interceptor.intercept(context, next).subscribe({
        next: (data) => {
          expect(data).toEqual({ success: true });
          expect(auditLogRepository.save).not.toHaveBeenCalled();
          done();
        },
      });
    });

    it('should not audit when auditPermission is undefined', (done) => {
      const context = createMockContext({ id: 'user-123' }, {});
      const next = createMockCallHandler({ success: true });

      interceptor.intercept(context, next).subscribe({
        next: (data) => {
          expect(data).toEqual({ success: true });
          expect(auditLogRepository.save).not.toHaveBeenCalled();
          done();
        },
      });
    });

    it('should audit when auditPermission is true', (done) => {
      const context = createMockContext(
        { id: 'user-123', username: 'testuser' },
        { [AUDIT_PERMISSION_KEY]: true }
      );
      const next = createMockCallHandler({ success: true });

      mockAuditLogRepository.save.mockResolvedValue({} as any);

      interceptor.intercept(context, next).subscribe({
        next: () => {
          setTimeout(() => {
            expect(auditLogRepository.save).toHaveBeenCalled();
            done();
          }, 10);
        },
      });
    });
  });

  describe('Successful Requests', () => {
    it('should log successful request with default resource and action', (done) => {
      const context = createMockContext(
        { id: 'user-123', username: 'testuser', tenantId: 'tenant-1' },
        { [AUDIT_PERMISSION_KEY]: true },
        {
          url: '/users/123',
          method: 'POST',
          body: { name: 'test' },
        }
      );
      const next = createMockCallHandler({ id: '123', name: 'test' });

      mockAuditLogRepository.save.mockResolvedValue({} as any);

      interceptor.intercept(context, next).subscribe({
        next: () => {
          setTimeout(() => {
            expect(auditLogRepository.save).toHaveBeenCalledWith(
              expect.objectContaining({
                userId: 'user-123',
                action: 'post',
                resourceType: 'unknown',
                success: true,
                method: 'POST',
                path: '/users/123',
              })
            );
            done();
          }, 10);
        },
      });
    });

    it('should log successful request with custom resource and action', (done) => {
      const context = createMockContext(
        { id: 'user-123', username: 'testuser' },
        {
          [AUDIT_PERMISSION_KEY]: true,
          [AUDIT_RESOURCE_KEY]: 'user',
          [AUDIT_ACTION_KEY]: 'create',
        }
      );
      const next = createMockCallHandler({ success: true });

      mockAuditLogRepository.save.mockResolvedValue({} as any);

      interceptor.intercept(context, next).subscribe({
        next: () => {
          setTimeout(() => {
            expect(auditLogRepository.save).toHaveBeenCalledWith(
              expect.objectContaining({
                userId: 'user-123',
                action: 'create',
                resourceType: 'user',
                success: true,
              })
            );
            done();
          }, 10);
        },
      });
    });

    it('should handle anonymous user', (done) => {
      const context = createMockContext(null, { [AUDIT_PERMISSION_KEY]: true });
      const next = createMockCallHandler({ success: true });

      mockAuditLogRepository.save.mockResolvedValue({} as any);

      interceptor.intercept(context, next).subscribe({
        next: () => {
          setTimeout(() => {
            expect(auditLogRepository.save).toHaveBeenCalledWith(
              expect.objectContaining({
                userId: 'anonymous',
                success: true,
              })
            );
            done();
          }, 10);
        },
      });
    });
  });

  describe('Failed Requests', () => {
    it('should log failed request with error message', (done) => {
      const context = createMockContext(
        { id: 'user-123', username: 'testuser' },
        { [AUDIT_PERMISSION_KEY]: true }
      );
      const error = { status: 403, message: 'Access denied' };
      const next = createMockCallHandler(error, true);

      mockAuditLogRepository.save.mockResolvedValue({} as any);

      interceptor.intercept(context, next).subscribe({
        error: (err) => {
          setTimeout(() => {
            expect(auditLogRepository.save).toHaveBeenCalledWith(
              expect.objectContaining({
                userId: 'user-123',
                success: false,
                errorMessage: 'Access denied',
                responseStatus: 403,
              })
            );
            expect(err).toEqual(error);
            done();
          }, 10);
        },
      });
    });

    it('should use 500 status for errors without status', (done) => {
      const context = createMockContext({ id: 'user-123' }, { [AUDIT_PERMISSION_KEY]: true });
      const error = { message: 'Internal error' };
      const next = createMockCallHandler(error, true);

      mockAuditLogRepository.save.mockResolvedValue({} as any);

      interceptor.intercept(context, next).subscribe({
        error: () => {
          setTimeout(() => {
            expect(auditLogRepository.save).toHaveBeenCalledWith(
              expect.objectContaining({
                responseStatus: 500,
                success: false,
              })
            );
            done();
          }, 10);
        },
      });
    });
  });

  describe('Audit Levels', () => {
    it('should use WARN level for delete actions', (done) => {
      const context = createMockContext(
        { id: 'user-123' },
        {
          [AUDIT_PERMISSION_KEY]: true,
          [AUDIT_ACTION_KEY]: 'delete',
        }
      );
      const next = createMockCallHandler({ success: true });

      mockAuditLogRepository.save.mockResolvedValue({} as any);

      interceptor.intercept(context, next).subscribe({
        next: () => {
          setTimeout(() => {
            expect(auditLogRepository.save).toHaveBeenCalledWith(
              expect.objectContaining({
                level: AuditLevel.WARN,
              })
            );
            done();
          }, 10);
        },
      });
    });

    it('should use WARN level for permission actions', (done) => {
      const context = createMockContext(
        { id: 'user-123' },
        {
          [AUDIT_PERMISSION_KEY]: true,
          [AUDIT_ACTION_KEY]: 'grant-permission',
        }
      );
      const next = createMockCallHandler({ success: true });

      mockAuditLogRepository.save.mockResolvedValue({} as any);

      interceptor.intercept(context, next).subscribe({
        next: () => {
          setTimeout(() => {
            expect(auditLogRepository.save).toHaveBeenCalledWith(
              expect.objectContaining({
                level: AuditLevel.WARN,
              })
            );
            done();
          }, 10);
        },
      });
    });

    it('should use INFO level for read actions', (done) => {
      const context = createMockContext(
        { id: 'user-123' },
        {
          [AUDIT_PERMISSION_KEY]: true,
          [AUDIT_ACTION_KEY]: 'read',
        }
      );
      const next = createMockCallHandler({ success: true });

      mockAuditLogRepository.save.mockResolvedValue({} as any);

      interceptor.intercept(context, next).subscribe({
        next: () => {
          setTimeout(() => {
            expect(auditLogRepository.save).toHaveBeenCalledWith(
              expect.objectContaining({
                level: AuditLevel.INFO,
              })
            );
            done();
          }, 10);
        },
      });
    });

    it('should use ERROR level for failed requests', (done) => {
      const context = createMockContext({ id: 'user-123' }, { [AUDIT_PERMISSION_KEY]: true });
      const error = { status: 500, message: 'Server error' };
      const next = createMockCallHandler(error, true);

      mockAuditLogRepository.save.mockResolvedValue({} as any);

      interceptor.intercept(context, next).subscribe({
        error: () => {
          setTimeout(() => {
            expect(auditLogRepository.save).toHaveBeenCalledWith(
              expect.objectContaining({
                level: AuditLevel.ERROR,
              })
            );
            done();
          }, 10);
        },
      });
    });
  });

  describe('Sensitive Field Sanitization', () => {
    it('should redact password fields', (done) => {
      const context = createMockContext(
        { id: 'user-123' },
        { [AUDIT_PERMISSION_KEY]: true },
        {
          body: {
            username: 'testuser',
            password: 'secret123',
          },
        }
      );
      const next = createMockCallHandler({ success: true });

      mockAuditLogRepository.save.mockResolvedValue({} as any);

      interceptor.intercept(context, next).subscribe({
        next: () => {
          setTimeout(() => {
            expect(auditLogRepository.save).toHaveBeenCalledWith(
              expect.objectContaining({
                requestBody: {
                  username: 'testuser',
                  password: '***REDACTED***',
                },
              })
            );
            done();
          }, 10);
        },
      });
    });

    it('should redact multiple sensitive fields', (done) => {
      const context = createMockContext(
        { id: 'user-123' },
        { [AUDIT_PERMISSION_KEY]: true },
        {
          body: {
            auth_token: 'token123',
            api_secret: 'secret456',
            data: 'public',
          },
        }
      );
      const next = createMockCallHandler({ success: true });

      mockAuditLogRepository.save.mockResolvedValue({} as any);

      interceptor.intercept(context, next).subscribe({
        next: () => {
          setTimeout(() => {
            const call = auditLogRepository.save.mock.calls[0][0] as any;
            expect(call.requestBody.auth_token).toBe('***REDACTED***');
            expect(call.requestBody.api_secret).toBe('***REDACTED***');
            expect(call.requestBody.data).toBe('public');
            done();
          }, 10);
        },
      });
    });

    it('should redact nested sensitive fields', (done) => {
      const context = createMockContext(
        { id: 'user-123' },
        { [AUDIT_PERMISSION_KEY]: true },
        {
          body: {
            user: {
              name: 'test',
              password: 'secret',
            },
          },
        }
      );
      const next = createMockCallHandler({ success: true });

      mockAuditLogRepository.save.mockResolvedValue({} as any);

      interceptor.intercept(context, next).subscribe({
        next: () => {
          setTimeout(() => {
            expect(auditLogRepository.save).toHaveBeenCalledWith(
              expect.objectContaining({
                requestBody: {
                  user: {
                    name: 'test',
                    password: '***REDACTED***',
                  },
                },
              })
            );
            done();
          }, 10);
        },
      });
    });

    it('should handle non-object request bodies', (done) => {
      const context = createMockContext(
        { id: 'user-123' },
        { [AUDIT_PERMISSION_KEY]: true },
        {
          body: 'plain text body',
        }
      );
      const next = createMockCallHandler({ success: true });

      mockAuditLogRepository.save.mockResolvedValue({} as any);

      interceptor.intercept(context, next).subscribe({
        next: () => {
          setTimeout(() => {
            expect(auditLogRepository.save).toHaveBeenCalledWith(
              expect.objectContaining({
                requestBody: 'plain text body',
              })
            );
            done();
          }, 10);
        },
      });
    });
  });

  describe('IP Address Extraction', () => {
    it('should extract IP from x-forwarded-for header', (done) => {
      const context = createMockContext(
        { id: 'user-123' },
        { [AUDIT_PERMISSION_KEY]: true },
        {
          headers: {
            'x-forwarded-for': '192.168.1.1, 10.0.0.1',
          },
        }
      );
      const next = createMockCallHandler({ success: true });

      mockAuditLogRepository.save.mockResolvedValue({} as any);

      interceptor.intercept(context, next).subscribe({
        next: () => {
          setTimeout(() => {
            expect(auditLogRepository.save).toHaveBeenCalledWith(
              expect.objectContaining({
                ipAddress: '192.168.1.1',
              })
            );
            done();
          }, 10);
        },
      });
    });

    it('should extract IP from x-real-ip header', (done) => {
      const context = createMockContext(
        { id: 'user-123' },
        { [AUDIT_PERMISSION_KEY]: true },
        {
          headers: {
            'x-real-ip': '192.168.1.100',
          },
        }
      );
      const next = createMockCallHandler({ success: true });

      mockAuditLogRepository.save.mockResolvedValue({} as any);

      interceptor.intercept(context, next).subscribe({
        next: () => {
          setTimeout(() => {
            expect(auditLogRepository.save).toHaveBeenCalledWith(
              expect.objectContaining({
                ipAddress: '192.168.1.100',
              })
            );
            done();
          }, 10);
        },
      });
    });

    it('should extract IP from connection.remoteAddress', (done) => {
      const context = createMockContext(
        { id: 'user-123' },
        { [AUDIT_PERMISSION_KEY]: true },
        {
          headers: {},
        }
      );
      const next = createMockCallHandler({ success: true });

      mockAuditLogRepository.save.mockResolvedValue({} as any);

      interceptor.intercept(context, next).subscribe({
        next: () => {
          setTimeout(() => {
            expect(auditLogRepository.save).toHaveBeenCalledWith(
              expect.objectContaining({
                ipAddress: '127.0.0.1',
              })
            );
            done();
          }, 10);
        },
      });
    });
  });

  describe('Database and Alerting', () => {
    it('should handle database save errors gracefully', (done) => {
      const context = createMockContext({ id: 'user-123' }, { [AUDIT_PERMISSION_KEY]: true });
      const next = createMockCallHandler({ success: true });

      mockAuditLogRepository.save.mockRejectedValue(new Error('DB error'));

      interceptor.intercept(context, next).subscribe({
        next: (data) => {
          // Should still complete successfully even if DB save fails
          expect(data).toEqual({ success: true });
          setTimeout(() => {
            expect(Logger.prototype.error).toHaveBeenCalledWith(
              expect.stringContaining('Failed to save audit log')
            );
            done();
          }, 10);
        },
      });
    });

    it('should not send alert for non-critical actions', (done) => {
      const context = createMockContext(
        { id: 'user-123' },
        {
          [AUDIT_PERMISSION_KEY]: true,
          [AUDIT_ACTION_KEY]: 'read',
        }
      );
      const next = createMockCallHandler({ success: true });

      mockAuditLogRepository.save.mockResolvedValue({} as any);

      interceptor.intercept(context, next).subscribe({
        next: () => {
          setTimeout(() => {
            expect(alertService.sendCriticalAlert).not.toHaveBeenCalled();
            done();
          }, 10);
        },
      });
    });

    it('should include duration in audit log', (done) => {
      const context = createMockContext({ id: 'user-123' }, { [AUDIT_PERMISSION_KEY]: true });
      const next = createMockCallHandler({ success: true });

      mockAuditLogRepository.save.mockResolvedValue({} as any);

      interceptor.intercept(context, next).subscribe({
        next: () => {
          setTimeout(() => {
            expect(auditLogRepository.save).toHaveBeenCalledWith(
              expect.objectContaining({
                duration: expect.any(Number),
              })
            );
            const duration = (auditLogRepository.save.mock.calls[0][0] as any).duration;
            expect(duration).toBeGreaterThanOrEqual(0);
            done();
          }, 10);
        },
      });
    });
  });
});
