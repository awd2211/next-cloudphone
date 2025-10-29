# SMS/OTP 业务流程集成示例

本文档展示如何将 SMS 和 OTP 服务集成到实际业务流程中。

## 目录

1. [用户注册验证](#1-用户注册验证)
2. [登录二次验证](#2-登录二次验证)
3. [支付通知](#3-支付通知)
4. [设备告警](#4-设备告警)
5. [密码重置](#5-密码重置)
6. [完整流程示例](#6-完整流程示例)

---

## 1. 用户注册验证

### 场景描述

用户注册时需要验证手机号，确保用户拥有该手机号的所有权。

### 实现步骤

#### Step 1: 在 User Service 中注入 OtpService

```typescript
// backend/user-service/src/auth/auth.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OtpService, OtpType } from '@cloudphone/notification-service'; // 假设已共享
import { User } from '../entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly otpService: OtpService,
  ) {}

  /**
   * 发送注册验证码
   */
  async sendRegistrationOtp(phoneNumber: string): Promise<{ success: boolean; error?: string }> {
    // 1. 检查手机号是否已注册
    const existingUser = await this.userRepository.findOne({ where: { phoneNumber } });
    if (existingUser) {
      throw new BadRequestException('Phone number already registered');
    }

    // 2. 发送验证码
    const result = await this.otpService.sendOtp(phoneNumber, OtpType.REGISTRATION);

    return result;
  }

  /**
   * 验证验证码并注册用户
   */
  async registerWithOtp(
    phoneNumber: string,
    code: string,
    userData: { username: string; email: string; password: string },
  ): Promise<User> {
    // 1. 验证验证码
    const verifyResult = await this.otpService.verifyOtp(phoneNumber, code, OtpType.REGISTRATION);

    if (!verifyResult.valid) {
      throw new BadRequestException(verifyResult.error || 'Invalid verification code');
    }

    // 2. 创建用户
    const user = this.userRepository.create({
      ...userData,
      phoneNumber,
      phoneVerified: true, // 验证码通过即认为手机号已验证
    });

    await this.userRepository.save(user);

    return user;
  }
}
```

#### Step 2: 创建控制器端点

```typescript
// backend/user-service/src/auth/auth.controller.ts
import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { IsPhoneNumber, IsString, IsEmail, IsNotEmpty, MinLength } from 'class-validator';

export class SendRegistrationOtpDto {
  @IsPhoneNumber(null)
  phoneNumber: string;
}

export class RegisterWithOtpDto {
  @IsPhoneNumber(null)
  phoneNumber: string;

  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @MinLength(3)
  username: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * 发送注册验证码
   * POST /auth/register/send-otp
   */
  @Post('register/send-otp')
  async sendRegistrationOtp(@Body() dto: SendRegistrationOtpDto) {
    const result = await this.authService.sendRegistrationOtp(dto.phoneNumber);
    return result;
  }

  /**
   * 验证码注册
   * POST /auth/register/with-otp
   */
  @Post('register/with-otp')
  async registerWithOtp(@Body() dto: RegisterWithOtpDto) {
    const user = await this.authService.registerWithOtp(
      dto.phoneNumber,
      dto.code,
      {
        username: dto.username,
        email: dto.email,
        password: dto.password,
      },
    );

    return {
      success: true,
      userId: user.id,
      message: 'Registration successful',
    };
  }
}
```

#### Step 3: 前端集成示例

```typescript
// frontend/user/src/services/auth.ts
import axios from 'axios';

export const authService = {
  /**
   * 发送注册验证码
   */
  async sendRegistrationOtp(phoneNumber: string) {
    const response = await axios.post('/auth/register/send-otp', {
      phoneNumber,
    });
    return response.data;
  },

  /**
   * 使用验证码注册
   */
  async registerWithOtp(data: {
    phoneNumber: string;
    code: string;
    username: string;
    email: string;
    password: string;
  }) {
    const response = await axios.post('/auth/register/with-otp', data);
    return response.data;
  },
};
```

```tsx
// frontend/user/src/pages/Register.tsx
import React, { useState } from 'react';
import { Form, Input, Button, message } from 'antd';
import { authService } from '../services/auth';

export const RegisterPage: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // 发送验证码
  const handleSendOtp = async () => {
    try {
      const phoneNumber = form.getFieldValue('phoneNumber');
      if (!phoneNumber) {
        message.error('Please enter your phone number');
        return;
      }

      setLoading(true);
      const result = await authService.sendRegistrationOtp(phoneNumber);

      if (result.success) {
        message.success('Verification code sent successfully');
        setOtpSent(true);
        setCountdown(60);

        // 倒计时
        const timer = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(timer);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        message.error(result.error || 'Failed to send verification code');
      }
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Failed to send verification code');
    } finally {
      setLoading(false);
    }
  };

  // 注册
  const handleRegister = async (values: any) => {
    try {
      setLoading(true);
      const result = await authService.registerWithOtp(values);

      if (result.success) {
        message.success('Registration successful! Please login.');
        // 跳转到登录页
        window.location.href = '/login';
      }
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-page">
      <h1>Create Account</h1>
      <Form form={form} onFinish={handleRegister} layout="vertical">
        <Form.Item
          label="Phone Number"
          name="phoneNumber"
          rules={[{ required: true, message: 'Please enter your phone number' }]}
        >
          <Input placeholder="+1234567890" />
        </Form.Item>

        <Form.Item>
          <Button
            type="default"
            onClick={handleSendOtp}
            loading={loading}
            disabled={countdown > 0}
            block
          >
            {countdown > 0 ? `Resend in ${countdown}s` : 'Send Verification Code'}
          </Button>
        </Form.Item>

        <Form.Item
          label="Verification Code"
          name="code"
          rules={[{ required: true, message: 'Please enter verification code' }]}
        >
          <Input placeholder="6-digit code" maxLength={6} />
        </Form.Item>

        <Form.Item
          label="Username"
          name="username"
          rules={[{ required: true, message: 'Please enter username' }]}
        >
          <Input />
        </Form.Item>

        <Form.Item
          label="Email"
          name="email"
          rules={[{ required: true, type: 'email', message: 'Please enter valid email' }]}
        >
          <Input />
        </Form.Item>

        <Form.Item
          label="Password"
          name="password"
          rules={[{ required: true, min: 8, message: 'Password must be at least 8 characters' }]}
        >
          <Input.Password />
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading} block>
            Register
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
};
```

---

## 2. 登录二次验证

### 场景描述

用户登录时，除了密码验证外，还需要手机验证码二次验证（2FA）。

### 实现步骤

```typescript
// backend/user-service/src/auth/auth.service.ts
@Injectable()
export class AuthService {
  /**
   * 第一步：密码登录
   */
  async loginWithPassword(username: string, password: string): Promise<{ requiresOtp: boolean; sessionToken?: string }> {
    // 1. 验证用户名密码
    const user = await this.userRepository.findOne({ where: { username } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // 2. 如果用户启用了 2FA，返回临时会话令牌
    if (user.twoFactorEnabled) {
      const sessionToken = this.generateTempSessionToken(user.id);

      // 发送登录验证码
      await this.otpService.sendOtp(user.phoneNumber, OtpType.LOGIN);

      return {
        requiresOtp: true,
        sessionToken,
      };
    }

    // 3. 没有启用 2FA，直接返回 JWT
    return {
      requiresOtp: false,
      token: this.generateJwtToken(user),
    };
  }

  /**
   * 第二步：验证 OTP 并完成登录
   */
  async verifyLoginOtp(sessionToken: string, code: string): Promise<{ token: string }> {
    // 1. 验证临时会话令牌
    const userId = this.verifyTempSessionToken(sessionToken);
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('Invalid session');
    }

    // 2. 验证 OTP
    const verifyResult = await this.otpService.verifyOtp(user.phoneNumber, code, OtpType.LOGIN);
    if (!verifyResult.valid) {
      throw new UnauthorizedException(verifyResult.error || 'Invalid verification code');
    }

    // 3. 返回最终的 JWT
    return {
      token: this.generateJwtToken(user),
    };
  }
}
```

---

## 3. 支付通知

### 场景描述

用户支付成功后，通过短信通知用户支付结果。

### 实现步骤

#### Step 1: 在 Billing Service 中使用 SmsService

```typescript
// backend/billing-service/src/payments/payments.service.ts
import { Injectable } from '@nestjs/common';
import { EventBusService } from '@cloudphone/shared';
import { SmsService } from '@cloudphone/notification-service'; // 假设已共享或通过 HTTP 调用

@Injectable()
export class PaymentsService {
  constructor(
    private readonly eventBus: EventBusService,
    private readonly smsService: SmsService, // 或者通过 HTTP 客户端调用 notification-service
  ) {}

  /**
   * 处理支付成功
   */
  async handlePaymentSuccess(paymentId: string, userId: string, amount: number, currency: string) {
    // 1. 更新数据库
    const payment = await this.paymentRepository.findOne({ where: { id: paymentId } });
    payment.status = 'completed';
    await this.paymentRepository.save(payment);

    // 2. 发布事件
    await this.eventBus.publishBillingEvent('payment_success', {
      paymentId,
      userId,
      amount,
      currency,
    });

    // 3. 发送短信通知
    const user = await this.getUserPhoneNumber(userId);
    if (user.phoneNumber) {
      await this.smsService.sendPaymentSuccess(user.phoneNumber, amount, currency);
    }

    return payment;
  }

  /**
   * 处理支付失败
   */
  async handlePaymentFailure(paymentId: string, userId: string, reason: string) {
    const payment = await this.paymentRepository.findOne({ where: { id: paymentId } });
    payment.status = 'failed';
    payment.failureReason = reason;
    await this.paymentRepository.save(payment);

    // 发送失败通知
    const user = await this.getUserPhoneNumber(userId);
    if (user.phoneNumber) {
      await this.smsService.send({
        to: user.phoneNumber,
        message: `CloudPhone Payment Failed\n\nYour payment of $${payment.amount} has failed.\nReason: ${reason}\n\nPlease try again or contact support.`,
      });
    }

    return payment;
  }

  private async getUserPhoneNumber(userId: string): Promise<{ phoneNumber: string }> {
    // 从 user-service 获取用户信息
    // 可以通过 HTTP 调用或者直接查询数据库（如果共享）
    return { phoneNumber: '+1234567890' }; // 示例
  }
}
```

#### Step 2: 通过 HTTP 调用 notification-service（如果不共享模块）

```typescript
// backend/billing-service/src/common/notification.client.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class NotificationClient {
  private readonly baseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = this.configService.get('NOTIFICATION_SERVICE_URL', 'http://localhost:30006');
  }

  /**
   * 发送支付成功短信
   */
  async sendPaymentSuccessSms(phoneNumber: string, amount: number, currency: string): Promise<void> {
    try {
      await axios.post(`${this.baseUrl}/sms/send`, {
        phoneNumber,
        message: `CloudPhone Payment Successful\n\nYour payment of ${currency} ${amount.toFixed(2)} has been processed successfully.\n\nThank you for your business!`,
      });
    } catch (error) {
      console.error('Failed to send payment success SMS:', error);
    }
  }

  /**
   * 发送 OTP 验证码（如果需要支付验证）
   */
  async sendPaymentOtp(phoneNumber: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await axios.post(`${this.baseUrl}/sms/otp/send`, {
        phoneNumber,
        type: 'payment',
      });
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to send OTP',
      };
    }
  }

  /**
   * 验证支付 OTP
   */
  async verifyPaymentOtp(phoneNumber: string, code: string): Promise<{ valid: boolean; error?: string }> {
    try {
      const response = await axios.post(`${this.baseUrl}/sms/otp/verify`, {
        phoneNumber,
        code,
        type: 'payment',
      });
      return response.data;
    } catch (error: any) {
      return {
        valid: false,
        error: error.response?.data?.message || 'Verification failed',
      };
    }
  }
}
```

#### Step 3: 支付流程中集成 OTP 验证

```typescript
// backend/billing-service/src/payments/payments.service.ts
@Injectable()
export class PaymentsService {
  constructor(
    private readonly notificationClient: NotificationClient,
  ) {}

  /**
   * 发起支付（需要 OTP 验证）
   */
  async initiatePayment(userId: string, amount: number, currency: string): Promise<{ paymentId: string; requiresOtp: boolean }> {
    // 1. 创建支付记录
    const payment = await this.paymentRepository.save({
      userId,
      amount,
      currency,
      status: 'pending',
    });

    // 2. 如果金额超过阈值，需要 OTP 验证
    const requiresOtp = amount > 100; // 超过 $100 需要验证

    if (requiresOtp) {
      const user = await this.getUserPhoneNumber(userId);
      await this.notificationClient.sendPaymentOtp(user.phoneNumber);
    }

    return {
      paymentId: payment.id,
      requiresOtp,
    };
  }

  /**
   * 确认支付（验证 OTP）
   */
  async confirmPayment(paymentId: string, code: string): Promise<{ success: boolean }> {
    const payment = await this.paymentRepository.findOne({ where: { id: paymentId } });
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    const user = await this.getUserPhoneNumber(payment.userId);

    // 验证 OTP
    const verifyResult = await this.notificationClient.verifyPaymentOtp(user.phoneNumber, code);
    if (!verifyResult.valid) {
      throw new BadRequestException(verifyResult.error || 'Invalid verification code');
    }

    // 处理支付
    await this.processPayment(payment);

    return { success: true };
  }
}
```

---

## 4. 设备告警

### 场景描述

云手机设备出现异常时（如 CPU 过高、内存不足、离线等），通知用户。

### 实现步骤

#### Step 1: 在 Device Service 中使用 NotificationClient

```typescript
// backend/device-service/src/monitoring/alert.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

interface AlertRule {
  type: 'cpu' | 'memory' | 'offline' | 'error';
  threshold: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

@Injectable()
export class AlertService {
  private readonly logger = new Logger(AlertService.name);
  private readonly notificationServiceUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.notificationServiceUrl = this.configService.get(
      'NOTIFICATION_SERVICE_URL',
      'http://localhost:30006',
    );
  }

  /**
   * 发送设备告警短信
   */
  async sendDeviceAlert(deviceId: string, userId: string, issue: string, severity: string) {
    try {
      // 1. 获取用户手机号
      const phoneNumber = await this.getUserPhoneNumber(userId);
      if (!phoneNumber) {
        this.logger.warn(`No phone number for user ${userId}, skipping SMS alert`);
        return;
      }

      // 2. 构建告警消息
      const message = this.buildAlertMessage(deviceId, issue, severity);

      // 3. 发送短信
      await axios.post(`${this.notificationServiceUrl}/sms/send`, {
        phoneNumber,
        message,
      });

      this.logger.log(`Alert SMS sent to user ${userId} for device ${deviceId}`);
    } catch (error) {
      this.logger.error(`Failed to send alert SMS: ${error.message}`);
    }
  }

  /**
   * 检查设备健康状态并发送告警
   */
  async checkDeviceHealthAndAlert(deviceId: string) {
    const device = await this.getDeviceStatus(deviceId);
    const alerts: string[] = [];

    // CPU 告警
    if (device.cpuUsage > 90) {
      alerts.push(`CPU usage is critically high (${device.cpuUsage}%)`);
    }

    // 内存告警
    if (device.memoryUsage > 95) {
      alerts.push(`Memory usage is critically high (${device.memoryUsage}%)`);
    }

    // 离线告警
    if (device.status === 'offline') {
      alerts.push('Device is offline');
    }

    // 错误告警
    if (device.errorCount > 10) {
      alerts.push(`Multiple errors detected (${device.errorCount} errors in the last hour)`);
    }

    // 发送告警
    if (alerts.length > 0) {
      const severity = this.determineSeverity(device);
      await this.sendDeviceAlert(
        deviceId,
        device.userId,
        alerts.join('; '),
        severity,
      );
    }
  }

  private buildAlertMessage(deviceId: string, issue: string, severity: string): string {
    const severityEmoji = {
      low: '⚠️',
      medium: '⚠️',
      high: '🚨',
      critical: '🔴',
    };

    return `${severityEmoji[severity] || '⚠️'} CloudPhone Device Alert

Device ID: ${deviceId}
Severity: ${severity.toUpperCase()}

Issue: ${issue}

Please check your device dashboard for more details.

Time: ${new Date().toLocaleString()}`;
  }

  private determineSeverity(device: any): string {
    if (device.cpuUsage > 95 || device.memoryUsage > 98 || device.status === 'error') {
      return 'critical';
    }
    if (device.cpuUsage > 90 || device.memoryUsage > 95 || device.status === 'offline') {
      return 'high';
    }
    if (device.cpuUsage > 80 || device.memoryUsage > 90) {
      return 'medium';
    }
    return 'low';
  }

  private async getUserPhoneNumber(userId: string): Promise<string | null> {
    // 从 user-service 获取
    // 可以通过服务发现 (Consul) 或者直接 HTTP 调用
    return '+1234567890'; // 示例
  }

  private async getDeviceStatus(deviceId: string): Promise<any> {
    // 获取设备状态
    return {
      deviceId,
      userId: 'user123',
      cpuUsage: 92,
      memoryUsage: 96,
      status: 'running',
      errorCount: 15,
    };
  }
}
```

#### Step 2: 定时检查设备健康状态

```typescript
// backend/device-service/src/monitoring/health-check.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AlertService } from './alert.service';

@Injectable()
export class HealthCheckService {
  private readonly logger = new Logger(HealthCheckService.name);

  constructor(private readonly alertService: AlertService) {}

  /**
   * 每 5 分钟检查一次所有设备
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async checkAllDevicesHealth() {
    this.logger.log('Running device health check...');

    try {
      const devices = await this.getAllActiveDevices();

      for (const device of devices) {
        await this.alertService.checkDeviceHealthAndAlert(device.id);
      }

      this.logger.log(`Health check completed for ${devices.length} devices`);
    } catch (error) {
      this.logger.error(`Health check failed: ${error.message}`);
    }
  }

  private async getAllActiveDevices(): Promise<any[]> {
    // 获取所有运行中的设备
    return [
      { id: 'device1' },
      { id: 'device2' },
    ];
  }
}
```

#### Step 3: 用户告警设置（可选）

```typescript
// backend/device-service/src/monitoring/alert-preferences.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AlertPreference } from '../entities/alert-preference.entity';

@Injectable()
export class AlertPreferencesService {
  constructor(
    @InjectRepository(AlertPreference)
    private readonly alertPrefRepository: Repository<AlertPreference>,
  ) {}

  /**
   * 获取用户告警设置
   */
  async getUserPreferences(userId: string): Promise<AlertPreference> {
    let prefs = await this.alertPrefRepository.findOne({ where: { userId } });

    if (!prefs) {
      // 创建默认设置
      prefs = await this.alertPrefRepository.save({
        userId,
        smsEnabled: true,
        emailEnabled: true,
        minSeverity: 'medium', // 只发送 medium 及以上级别
        quietHoursStart: '22:00',
        quietHoursEnd: '08:00',
      });
    }

    return prefs;
  }

  /**
   * 检查是否应该发送告警
   */
  async shouldSendAlert(userId: string, severity: string): Promise<boolean> {
    const prefs = await this.getUserPreferences(userId);

    // 检查是否启用短信告警
    if (!prefs.smsEnabled) {
      return false;
    }

    // 检查严重级别
    const severityLevels = ['low', 'medium', 'high', 'critical'];
    const minIndex = severityLevels.indexOf(prefs.minSeverity);
    const currentIndex = severityLevels.indexOf(severity);

    if (currentIndex < minIndex) {
      return false;
    }

    // 检查是否在静默时段
    if (this.isInQuietHours(prefs.quietHoursStart, prefs.quietHoursEnd)) {
      return severity === 'critical'; // 只有 critical 才打破静默
    }

    return true;
  }

  private isInQuietHours(start: string, end: string): boolean {
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    return currentTime >= start || currentTime <= end;
  }
}
```

---

## 5. 密码重置

### 场景描述

用户忘记密码时，通过手机验证码验证身份后重置密码。

### 实现步骤

```typescript
// backend/user-service/src/auth/auth.service.ts
@Injectable()
export class AuthService {
  /**
   * 发送密码重置验证码
   */
  async sendPasswordResetOtp(phoneNumber: string): Promise<{ success: boolean; error?: string }> {
    // 1. 检查手机号是否已注册
    const user = await this.userRepository.findOne({ where: { phoneNumber } });
    if (!user) {
      // 不暴露用户是否存在，统一返回成功
      return { success: true };
    }

    // 2. 发送验证码
    const result = await this.otpService.sendOtp(phoneNumber, OtpType.PASSWORD_RESET);

    return result;
  }

  /**
   * 验证 OTP 并重置密码
   */
  async resetPasswordWithOtp(
    phoneNumber: string,
    code: string,
    newPassword: string,
  ): Promise<{ success: boolean }> {
    // 1. 验证验证码
    const verifyResult = await this.otpService.verifyOtp(phoneNumber, code, OtpType.PASSWORD_RESET);

    if (!verifyResult.valid) {
      throw new BadRequestException(verifyResult.error || 'Invalid verification code');
    }

    // 2. 更新密码
    const user = await this.userRepository.findOne({ where: { phoneNumber } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await this.userRepository.save(user);

    return { success: true };
  }
}
```

---

## 6. 完整流程示例

### 完整的用户注册流程（带前后端交互）

#### 后端 API

```typescript
// backend/user-service/src/auth/auth.controller.ts
import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * 1. 发送注册验证码
   */
  @Post('register/send-otp')
  @HttpCode(HttpStatus.OK)
  async sendRegistrationOtp(@Body() dto: { phoneNumber: string }) {
    return this.authService.sendRegistrationOtp(dto.phoneNumber);
  }

  /**
   * 2. 验证码注册
   */
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: {
    phoneNumber: string;
    code: string;
    username: string;
    email: string;
    password: string;
  }) {
    const user = await this.authService.registerWithOtp(
      dto.phoneNumber,
      dto.code,
      {
        username: dto.username,
        email: dto.email,
        password: dto.password,
      },
    );

    return {
      success: true,
      userId: user.id,
    };
  }

  /**
   * 3. 密码登录
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: { username: string; password: string }) {
    return this.authService.loginWithPassword(dto.username, dto.password);
  }

  /**
   * 4. 验证登录 OTP（如果启用了 2FA）
   */
  @Post('login/verify-otp')
  @HttpCode(HttpStatus.OK)
  async verifyLoginOtp(@Body() dto: { sessionToken: string; code: string }) {
    return this.authService.verifyLoginOtp(dto.sessionToken, dto.code);
  }

  /**
   * 5. 发送密码重置验证码
   */
  @Post('password/reset/send-otp')
  @HttpCode(HttpStatus.OK)
  async sendPasswordResetOtp(@Body() dto: { phoneNumber: string }) {
    return this.authService.sendPasswordResetOtp(dto.phoneNumber);
  }

  /**
   * 6. 重置密码
   */
  @Post('password/reset')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: {
    phoneNumber: string;
    code: string;
    newPassword: string;
  }) {
    return this.authService.resetPasswordWithOtp(
      dto.phoneNumber,
      dto.code,
      dto.newPassword,
    );
  }
}
```

#### 前端完整流程

```typescript
// frontend/user/src/services/api.ts
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:30000/api', // API Gateway
});

export const authAPI = {
  // 注册流程
  async sendRegistrationOtp(phoneNumber: string) {
    const { data } = await api.post('/auth/register/send-otp', { phoneNumber });
    return data;
  },

  async register(payload: {
    phoneNumber: string;
    code: string;
    username: string;
    email: string;
    password: string;
  }) {
    const { data } = await api.post('/auth/register', payload);
    return data;
  },

  // 登录流程
  async login(username: string, password: string) {
    const { data } = await api.post('/auth/login', { username, password });
    return data;
  },

  async verifyLoginOtp(sessionToken: string, code: string) {
    const { data } = await api.post('/auth/login/verify-otp', { sessionToken, code });
    return data;
  },

  // 密码重置流程
  async sendPasswordResetOtp(phoneNumber: string) {
    const { data } = await api.post('/auth/password/reset/send-otp', { phoneNumber });
    return data;
  },

  async resetPassword(phoneNumber: string, code: string, newPassword: string) {
    const { data } = await api.post('/auth/password/reset', { phoneNumber, code, newPassword });
    return data;
  },
};
```

```tsx
// frontend/user/src/pages/Register.tsx
import React, { useState } from 'react';
import { Form, Input, Button, message, Steps } from 'antd';
import { authAPI } from '../services/api';

export const RegisterPage: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Step 1: 发送验证码
  const handleSendOtp = async () => {
    try {
      const phoneNumber = form.getFieldValue('phoneNumber');
      await form.validateFields(['phoneNumber']);

      setLoading(true);
      const result = await authAPI.sendRegistrationOtp(phoneNumber);

      if (result.success) {
        message.success('Verification code sent!');
        setCurrentStep(1);
        startCountdown();
      } else {
        message.error(result.error || 'Failed to send code');
      }
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Error sending code');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: 提交注册
  const handleSubmit = async (values: any) => {
    try {
      setLoading(true);
      const result = await authAPI.register(values);

      if (result.success) {
        message.success('Registration successful!');
        setCurrentStep(2);
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
      }
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const startCountdown = () => {
    setCountdown(60);
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: 50 }}>
      <h1>Register</h1>

      <Steps current={currentStep} style={{ marginBottom: 30 }}>
        <Steps.Step title="Phone Verification" />
        <Steps.Step title="Account Details" />
        <Steps.Step title="Complete" />
      </Steps>

      <Form form={form} onFinish={handleSubmit} layout="vertical">
        {/* Step 1: 手机号验证 */}
        {currentStep === 0 && (
          <>
            <Form.Item
              name="phoneNumber"
              label="Phone Number"
              rules={[{ required: true, message: 'Required' }]}
            >
              <Input placeholder="+1234567890" size="large" />
            </Form.Item>

            <Button
              type="primary"
              onClick={handleSendOtp}
              loading={loading}
              size="large"
              block
            >
              Send Verification Code
            </Button>
          </>
        )}

        {/* Step 2: 填写详细信息 */}
        {currentStep === 1 && (
          <>
            <Form.Item
              name="code"
              label="Verification Code"
              rules={[{ required: true, message: 'Required' }]}
            >
              <Input placeholder="6-digit code" maxLength={6} size="large" />
            </Form.Item>

            <Button
              type="link"
              onClick={handleSendOtp}
              disabled={countdown > 0}
              style={{ marginBottom: 20 }}
            >
              {countdown > 0 ? `Resend in ${countdown}s` : 'Resend Code'}
            </Button>

            <Form.Item
              name="username"
              label="Username"
              rules={[{ required: true, min: 3, message: 'At least 3 characters' }]}
            >
              <Input size="large" />
            </Form.Item>

            <Form.Item
              name="email"
              label="Email"
              rules={[{ required: true, type: 'email', message: 'Valid email required' }]}
            >
              <Input size="large" />
            </Form.Item>

            <Form.Item
              name="password"
              label="Password"
              rules={[{ required: true, min: 8, message: 'At least 8 characters' }]}
            >
              <Input.Password size="large" />
            </Form.Item>

            <Button type="primary" htmlType="submit" loading={loading} size="large" block>
              Register
            </Button>
          </>
        )}

        {/* Step 3: 完成 */}
        {currentStep === 2 && (
          <div style={{ textAlign: 'center', padding: 50 }}>
            <h2>🎉 Registration Successful!</h2>
            <p>Redirecting to login page...</p>
          </div>
        )}
      </Form>
    </div>
  );
};
```

---

## 环境变量配置

### notification-service

```bash
# .env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_OTP_DB=2

# SMS 提供商配置（参考 .env.sms.example）
SMS_PRIMARY_PROVIDER=twilio
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_FROM_NUMBER=+1234567890
```

### user-service / billing-service / device-service

```bash
# .env
NOTIFICATION_SERVICE_URL=http://localhost:30006
```

---

## 测试 API

### 测试注册验证码

```bash
# 1. 发送验证码
curl -X POST http://localhost:30006/sms/otp/send \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+1234567890",
    "type": "registration"
  }'

# 响应:
# {"success": true}

# 2. 验证验证码
curl -X POST http://localhost:30006/sms/otp/verify \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+1234567890",
    "code": "123456",
    "type": "registration"
  }'

# 响应:
# {"valid": true}
```

### 测试支付通知

```bash
curl -X POST http://localhost:30006/sms/send \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+1234567890",
    "message": "CloudPhone Payment Successful\n\nYour payment of USD 29.99 has been processed.\n\nThank you!"
  }'
```

### 测试设备告警

```bash
curl -X POST http://localhost:30006/sms/send \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+1234567890",
    "message": "🚨 CloudPhone Device Alert\n\nDevice ID: device-123\nSeverity: HIGH\n\nIssue: CPU usage is critically high (92%)\n\nPlease check your dashboard."
  }'
```

---

## 最佳实践

### 1. 速率限制

使用 OtpService 的内置速率限制（每小时 3-10 次请求）。

### 2. 重试限制

验证码最多验证 3 次，失败后需要重新发送。

### 3. 过期时间

- 注册验证码: 10 分钟
- 登录验证码: 5 分钟
- 密码重置: 15 分钟
- 支付验证码: 5 分钟
- 设备操作: 10 分钟

### 4. 安全建议

- 不暴露用户是否存在（密码重置时）
- 验证码长度: 6 位数字
- 使用 HTTPS 传输验证码
- 记录所有 OTP 发送和验证日志
- 异常行为监控（短时间大量请求）

### 5. 用户体验

- 显示倒计时（重发冷却）
- 显示剩余重试次数
- 清晰的错误提示
- 多语言支持

---

## 总结

本文档展示了如何将 SMS/OTP 服务集成到以下业务流程：

1. ✅ **用户注册验证** - 手机号验证身份
2. ✅ **登录二次验证** - 2FA 增强安全性
3. ✅ **支付通知** - 支付成功/失败通知
4. ✅ **设备告警** - 设备异常实时通知
5. ✅ **密码重置** - 验证身份后重置密码

所有示例都包含：
- 后端服务实现
- 前端集成代码
- API 测试命令
- 最佳实践建议

您可以根据实际业务需求调整配置和实现细节。
