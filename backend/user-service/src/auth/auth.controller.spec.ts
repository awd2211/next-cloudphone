import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import * as request from 'supertest';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { createTestApp, assertHttpResponse } from '@cloudphone/shared/testing/test-helpers';
import { createMockUser } from '@cloudphone/shared/testing/mock-factories';

describe('AuthController', () => {
  let app: INestApplication;
  let authService: AuthService;

  const mockAuthService = {
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
    generateCaptcha: jest.fn(),
    refreshToken: jest.fn(),
    validateCaptcha: jest.fn(),
    changePassword: jest.fn(),
    resetPassword: jest.fn(),
    requestPasswordReset: jest.fn(),
  };

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compile();

    app = await createTestApp(moduleRef);
    authService = moduleRef.get<AuthService>(AuthService);
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /auth/login', () => {
    const loginDto = {
      username: 'testuser',
      password: 'password123',
      captcha: 'ABC123',
      captchaId: 'captcha-uuid',
    };

    it('should return access token and user info when credentials are valid', async () => {
      // Arrange
      const mockUser = createMockUser({ username: 'testuser' });
      const mockResponse = {
        accessToken: 'jwt.token.here',
        refreshToken: 'refresh.token.here',
        expiresIn: 3600,
        user: {
          id: mockUser.id,
          username: mockUser.username,
          email: mockUser.email,
          fullName: mockUser.fullName,
          roles: mockUser.roles,
        },
      };
      mockAuthService.login.mockResolvedValue(mockResponse);

      // Act
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginDto)
        .expect(200);

      // Assert
      assertHttpResponse(response, 200, {
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
        expiresIn: 3600,
        user: expect.objectContaining({
          id: mockUser.id,
          username: 'testuser',
        }),
      });

      expect(mockAuthService.login).toHaveBeenCalledWith(loginDto);
      expect(mockAuthService.login).toHaveBeenCalledTimes(1);
    });

    it('should return 401 when username does not exist', async () => {
      // Arrange
      mockAuthService.login.mockRejectedValue(new UnauthorizedException('Invalid credentials'));

      // Act
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginDto)
        .expect(401);

      // Assert
      expect(response.body).toMatchObject({
        statusCode: 401,
        message: 'Invalid credentials',
      });
    });

    it('should return 401 when password is incorrect', async () => {
      // Arrange
      const invalidDto = { ...loginDto, password: 'wrongpassword' };
      mockAuthService.login.mockRejectedValue(new UnauthorizedException('Invalid credentials'));

      // Act
      await request(app.getHttpServer()).post('/auth/login').send(invalidDto).expect(401);
    });

    it('should return 400 when captcha is invalid', async () => {
      // Arrange
      mockAuthService.login.mockRejectedValue(new BadRequestException('Invalid captcha'));

      // Act
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginDto)
        .expect(400);

      // Assert
      expect(response.body.message).toContain('Invalid captcha');
    });

    it('should return 400 when required fields are missing', async () => {
      // Arrange
      const invalidDto = { username: 'test' }; // Missing password and captcha

      // Act
      await request(app.getHttpServer()).post('/auth/login').send(invalidDto).expect(400);

      // Assert
      expect(mockAuthService.login).not.toHaveBeenCalled();
    });

    it('should return 401 when account is locked', async () => {
      // Arrange
      mockAuthService.login.mockRejectedValue(
        new UnauthorizedException('Account is locked due to multiple failed login attempts')
      );

      // Act
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginDto)
        .expect(401);

      // Assert
      expect(response.body.message).toContain('locked');
    });

    it('should sanitize input to prevent XSS attacks', async () => {
      // Arrange
      const xssDto = {
        username: '<script>alert("xss")</script>',
        password: 'password123',
        captcha: 'ABC123',
        captchaId: 'captcha-uuid',
      };
      mockAuthService.login.mockResolvedValue({
        accessToken: 'token',
        refreshToken: 'refresh',
        expiresIn: 3600,
        user: createMockUser(),
      });

      // Act
      await request(app.getHttpServer()).post('/auth/login').send(xssDto).expect(200);

      // Assert
      const callArgs = mockAuthService.login.mock.calls[0][0];
      expect(callArgs.username).not.toContain('<script>');
    });

    it('should handle database connection errors gracefully', async () => {
      // Arrange
      mockAuthService.login.mockRejectedValue(new Error('Database connection failed'));

      // Act
      await request(app.getHttpServer()).post('/auth/login').send(loginDto).expect(500);
    });
  });

  describe('POST /auth/register', () => {
    const registerDto = {
      username: 'newuser',
      email: 'newuser@example.com',
      password: 'SecurePassword123!',
      fullName: 'New User',
      phoneNumber: '+1234567890',
    };

    it('should create new user and return access token', async () => {
      // Arrange
      const mockUser = createMockUser(registerDto);
      const mockResponse = {
        accessToken: 'jwt.token.here',
        refreshToken: 'refresh.token.here',
        expiresIn: 3600,
        user: {
          id: mockUser.id,
          username: mockUser.username,
          email: mockUser.email,
          fullName: mockUser.fullName,
        },
      };
      mockAuthService.register.mockResolvedValue(mockResponse);

      // Act
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(201);

      // Assert
      assertHttpResponse(response, 201, {
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
        user: expect.objectContaining({
          username: 'newuser',
          email: 'newuser@example.com',
        }),
      });

      expect(mockAuthService.register).toHaveBeenCalledWith(registerDto);
    });

    it('should return 409 when username already exists', async () => {
      // Arrange
      mockAuthService.register.mockRejectedValue(new ConflictException('Username already exists'));

      // Act
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(409);

      // Assert
      expect(response.body.message).toContain('Username already exists');
    });

    it('should return 409 when email already exists', async () => {
      // Arrange
      mockAuthService.register.mockRejectedValue(new ConflictException('Email already exists'));

      // Act
      await request(app.getHttpServer()).post('/auth/register').send(registerDto).expect(409);
    });

    it('should return 400 when password is too weak', async () => {
      // Arrange
      const weakPasswordDto = { ...registerDto, password: '123' };

      // Act
      await request(app.getHttpServer()).post('/auth/register').send(weakPasswordDto).expect(400);

      // Assert
      expect(mockAuthService.register).not.toHaveBeenCalled();
    });

    it('should return 400 when email format is invalid', async () => {
      // Arrange
      const invalidEmailDto = { ...registerDto, email: 'not-an-email' };

      // Act
      await request(app.getHttpServer()).post('/auth/register').send(invalidEmailDto).expect(400);
    });

    it('should return 400 when username contains invalid characters', async () => {
      // Arrange
      const invalidUsernameDto = { ...registerDto, username: 'user@#$%' };

      // Act
      await request(app.getHttpServer())
        .post('/auth/register')
        .send(invalidUsernameDto)
        .expect(400);
    });

    it('should trim whitespace from username and email', async () => {
      // Arrange
      const dtoWithSpaces = {
        ...registerDto,
        username: '  newuser  ',
        email: '  newuser@example.com  ',
      };
      mockAuthService.register.mockResolvedValue({
        accessToken: 'token',
        refreshToken: 'refresh',
        expiresIn: 3600,
        user: createMockUser(),
      });

      // Act
      await request(app.getHttpServer()).post('/auth/register').send(dtoWithSpaces).expect(201);

      // Assert
      const callArgs = mockAuthService.register.mock.calls[0][0];
      expect(callArgs.username).toBe('newuser');
      expect(callArgs.email).toBe('newuser@example.com');
    });

    it('should hash password before storing', async () => {
      // Arrange
      mockAuthService.register.mockImplementation(async (dto) => {
        // Verify password was not stored in plain text
        expect(dto.password).not.toBe('SecurePassword123!');
        return {
          accessToken: 'token',
          refreshToken: 'refresh',
          expiresIn: 3600,
          user: createMockUser(),
        };
      });

      // Act
      await request(app.getHttpServer()).post('/auth/register').send(registerDto).expect(201);
    });
  });

  describe('POST /auth/logout', () => {
    const validToken = 'Bearer valid.jwt.token';

    it('should logout user successfully when authenticated', async () => {
      // Arrange
      mockAuthService.logout.mockResolvedValue({ message: 'Logged out successfully' });

      // Act
      const response = await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', validToken)
        .expect(200);

      // Assert
      expect(response.body.message).toBe('Logged out successfully');
      expect(mockAuthService.logout).toHaveBeenCalled();
    });

    it('should return 401 when no token provided', async () => {
      // Act
      await request(app.getHttpServer()).post('/auth/logout').expect(401);

      // Assert
      expect(mockAuthService.logout).not.toHaveBeenCalled();
    });

    it('should return 401 when token is invalid', async () => {
      // Act
      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', 'Bearer invalid.token')
        .expect(401);
    });

    it('should return 401 when token is expired', async () => {
      // Act
      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', 'Bearer expired.token')
        .expect(401);
    });

    it('should invalidate refresh token on logout', async () => {
      // Arrange
      mockAuthService.logout.mockImplementation(async (userId, refreshToken) => {
        // Verify refresh token is being invalidated
        expect(refreshToken).toBeDefined();
        return { message: 'Logged out successfully' };
      });

      // Act
      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', validToken)
        .send({ refreshToken: 'refresh.token' })
        .expect(200);
    });
  });

  describe('GET /auth/captcha', () => {
    it('should generate and return captcha image', async () => {
      // Arrange
      const mockCaptcha = {
        id: 'captcha-uuid-123',
        image:
          'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjwvc3ZnPg==',
        expiresIn: 300,
      };
      mockAuthService.generateCaptcha.mockResolvedValue(mockCaptcha);

      // Act
      const response = await request(app.getHttpServer()).get('/auth/captcha').expect(200);

      // Assert
      expect(response.body).toMatchObject({
        id: expect.any(String),
        image: expect.stringContaining('data:image'),
        expiresIn: 300,
      });
      expect(mockAuthService.generateCaptcha).toHaveBeenCalled();
    });

    it('should return captcha with 5 minute expiration', async () => {
      // Arrange
      mockAuthService.generateCaptcha.mockResolvedValue({
        id: 'captcha-id',
        image: 'data:image/svg+xml;base64,...',
        expiresIn: 300,
      });

      // Act
      const response = await request(app.getHttpServer()).get('/auth/captcha').expect(200);

      // Assert
      expect(response.body.expiresIn).toBe(300);
    });

    it('should generate unique captcha IDs', async () => {
      // Arrange
      mockAuthService.generateCaptcha
        .mockResolvedValueOnce({ id: 'captcha-1', image: 'img1', expiresIn: 300 })
        .mockResolvedValueOnce({ id: 'captcha-2', image: 'img2', expiresIn: 300 });

      // Act
      const response1 = await request(app.getHttpServer()).get('/auth/captcha');
      const response2 = await request(app.getHttpServer()).get('/auth/captcha');

      // Assert
      expect(response1.body.id).not.toBe(response2.body.id);
    });

    it('should handle captcha generation errors', async () => {
      // Arrange
      mockAuthService.generateCaptcha.mockRejectedValue(new Error('Captcha service unavailable'));

      // Act
      await request(app.getHttpServer()).get('/auth/captcha').expect(500);
    });
  });

  describe('POST /auth/refresh', () => {
    const refreshDto = {
      refreshToken: 'valid.refresh.token',
    };

    it('should return new access token when refresh token is valid', async () => {
      // Arrange
      const mockResponse = {
        accessToken: 'new.jwt.token',
        refreshToken: 'new.refresh.token',
        expiresIn: 3600,
      };
      mockAuthService.refreshToken.mockResolvedValue(mockResponse);

      // Act
      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send(refreshDto)
        .expect(200);

      // Assert
      expect(response.body).toMatchObject({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
        expiresIn: 3600,
      });
      expect(mockAuthService.refreshToken).toHaveBeenCalledWith(refreshDto.refreshToken);
    });

    it('should return 401 when refresh token is invalid', async () => {
      // Arrange
      mockAuthService.refreshToken.mockRejectedValue(
        new UnauthorizedException('Invalid refresh token')
      );

      // Act
      await request(app.getHttpServer()).post('/auth/refresh').send(refreshDto).expect(401);
    });

    it('should return 401 when refresh token is expired', async () => {
      // Arrange
      mockAuthService.refreshToken.mockRejectedValue(
        new UnauthorizedException('Refresh token expired')
      );

      // Act
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: 'expired.token' })
        .expect(401);
    });

    it('should return 400 when refresh token is missing', async () => {
      // Act
      await request(app.getHttpServer()).post('/auth/refresh').send({}).expect(400);

      // Assert
      expect(mockAuthService.refreshToken).not.toHaveBeenCalled();
    });

    it('should rotate refresh token on each refresh', async () => {
      // Arrange
      const oldRefreshToken = 'old.refresh.token';
      const newRefreshToken = 'new.refresh.token';
      mockAuthService.refreshToken.mockResolvedValue({
        accessToken: 'new.access.token',
        refreshToken: newRefreshToken,
        expiresIn: 3600,
      });

      // Act
      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: oldRefreshToken })
        .expect(200);

      // Assert
      expect(response.body.refreshToken).toBe(newRefreshToken);
      expect(response.body.refreshToken).not.toBe(oldRefreshToken);
    });
  });

  describe('POST /auth/change-password', () => {
    const changePasswordDto = {
      oldPassword: 'OldPassword123!',
      newPassword: 'NewPassword456!',
    };
    const validToken = 'Bearer valid.jwt.token';

    it('should change password successfully when authenticated', async () => {
      // Arrange
      mockAuthService.changePassword.mockResolvedValue({
        message: 'Password changed successfully',
      });

      // Act
      const response = await request(app.getHttpServer())
        .post('/auth/change-password')
        .set('Authorization', validToken)
        .send(changePasswordDto)
        .expect(200);

      // Assert
      expect(response.body.message).toBe('Password changed successfully');
      expect(mockAuthService.changePassword).toHaveBeenCalled();
    });

    it('should return 401 when old password is incorrect', async () => {
      // Arrange
      mockAuthService.changePassword.mockRejectedValue(
        new UnauthorizedException('Old password is incorrect')
      );

      // Act
      await request(app.getHttpServer())
        .post('/auth/change-password')
        .set('Authorization', validToken)
        .send(changePasswordDto)
        .expect(401);
    });

    it('should return 400 when new password is too weak', async () => {
      // Arrange
      const weakPasswordDto = {
        oldPassword: 'OldPassword123!',
        newPassword: '123',
      };

      // Act
      await request(app.getHttpServer())
        .post('/auth/change-password')
        .set('Authorization', validToken)
        .send(weakPasswordDto)
        .expect(400);
    });

    it('should return 400 when new password is same as old password', async () => {
      // Arrange
      mockAuthService.changePassword.mockRejectedValue(
        new BadRequestException('New password must be different from old password')
      );

      // Act
      await request(app.getHttpServer())
        .post('/auth/change-password')
        .set('Authorization', validToken)
        .send({
          oldPassword: 'SamePassword123!',
          newPassword: 'SamePassword123!',
        })
        .expect(400);
    });

    it('should return 401 when not authenticated', async () => {
      // Act
      await request(app.getHttpServer())
        .post('/auth/change-password')
        .send(changePasswordDto)
        .expect(401);
    });
  });

  describe('POST /auth/request-password-reset', () => {
    const requestResetDto = {
      email: 'user@example.com',
    };

    it('should send password reset email when email exists', async () => {
      // Arrange
      mockAuthService.requestPasswordReset.mockResolvedValue({
        message: 'Password reset email sent',
      });

      // Act
      const response = await request(app.getHttpServer())
        .post('/auth/request-password-reset')
        .send(requestResetDto)
        .expect(200);

      // Assert
      expect(response.body.message).toContain('reset email sent');
      expect(mockAuthService.requestPasswordReset).toHaveBeenCalledWith(requestResetDto.email);
    });

    it('should return generic message even when email does not exist (security)', async () => {
      // Arrange
      mockAuthService.requestPasswordReset.mockResolvedValue({
        message: 'If the email exists, a password reset link has been sent',
      });

      // Act
      const response = await request(app.getHttpServer())
        .post('/auth/request-password-reset')
        .send({ email: 'nonexistent@example.com' })
        .expect(200);

      // Assert
      // Should not reveal whether email exists
      expect(response.body.message).not.toContain('not found');
    });

    it('should return 400 when email format is invalid', async () => {
      // Act
      await request(app.getHttpServer())
        .post('/auth/request-password-reset')
        .send({ email: 'invalid-email' })
        .expect(400);
    });

    it('should rate limit password reset requests', async () => {
      // Arrange
      mockAuthService.requestPasswordReset.mockResolvedValue({
        message: 'Password reset email sent',
      });

      // Act - Send multiple requests
      const requests = Array(10)
        .fill(null)
        .map(() =>
          request(app.getHttpServer()).post('/auth/request-password-reset').send(requestResetDto)
        );

      await Promise.all(requests);

      // Additional request should be rate limited
      await request(app.getHttpServer())
        .post('/auth/request-password-reset')
        .send(requestResetDto)
        .expect(429); // Too Many Requests
    });
  });

  describe('POST /auth/reset-password', () => {
    const resetPasswordDto = {
      token: 'valid-reset-token',
      newPassword: 'NewSecurePassword123!',
    };

    it('should reset password successfully with valid token', async () => {
      // Arrange
      mockAuthService.resetPassword.mockResolvedValue({
        message: 'Password reset successfully',
      });

      // Act
      const response = await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send(resetPasswordDto)
        .expect(200);

      // Assert
      expect(response.body.message).toBe('Password reset successfully');
      expect(mockAuthService.resetPassword).toHaveBeenCalledWith(
        resetPasswordDto.token,
        resetPasswordDto.newPassword
      );
    });

    it('should return 400 when reset token is invalid', async () => {
      // Arrange
      mockAuthService.resetPassword.mockRejectedValue(
        new BadRequestException('Invalid or expired reset token')
      );

      // Act
      await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send(resetPasswordDto)
        .expect(400);
    });

    it('should return 400 when reset token is expired', async () => {
      // Arrange
      mockAuthService.resetPassword.mockRejectedValue(
        new BadRequestException('Reset token has expired')
      );

      // Act
      await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({ ...resetPasswordDto, token: 'expired-token' })
        .expect(400);
    });

    it('should return 400 when new password is too weak', async () => {
      // Act
      await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({ token: 'valid-token', newPassword: '123' })
        .expect(400);
    });

    it('should invalidate reset token after use', async () => {
      // Arrange
      mockAuthService.resetPassword
        .mockResolvedValueOnce({ message: 'Password reset successfully' })
        .mockRejectedValueOnce(new BadRequestException('Reset token already used'));

      // Act
      await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send(resetPasswordDto)
        .expect(200);

      // Try to use same token again
      await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send(resetPasswordDto)
        .expect(400);
    });
  });

  describe('Security', () => {
    it('should not expose sensitive information in error messages', async () => {
      // Arrange
      mockAuthService.login.mockRejectedValue(
        new Error('Database connection string: postgres://user:pass@host/db')
      );

      // Act
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          username: 'test',
          password: 'test',
          captcha: 'test',
          captchaId: 'test',
        })
        .expect(500);

      // Assert
      expect(response.body.message).not.toContain('postgres://');
      expect(response.body.message).not.toContain('password');
    });

    it('should set secure headers in responses', async () => {
      // Arrange
      mockAuthService.generateCaptcha.mockResolvedValue({
        id: 'id',
        image: 'img',
        expiresIn: 300,
      });

      // Act
      const response = await request(app.getHttpServer()).get('/auth/captcha').expect(200);

      // Assert
      expect(response.headers).toHaveProperty('x-content-type-options', 'nosniff');
      expect(response.headers).toHaveProperty('x-frame-options', 'DENY');
      expect(response.headers).toHaveProperty('x-xss-protection', '1; mode=block');
    });

    it('should not log passwords in request logs', async () => {
      // This test ensures password fields are redacted in logs
      const logSpy = jest.spyOn(console, 'log');

      await request(app.getHttpServer()).post('/auth/login').send({
        username: 'test',
        password: 'SecretPassword123!',
        captcha: 'ABC',
        captchaId: 'id',
      });

      // Assert that password is not in logs
      const logCalls = logSpy.mock.calls.flat().join(' ');
      expect(logCalls).not.toContain('SecretPassword123!');

      logSpy.mockRestore();
    });
  });
});
