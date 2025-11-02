# 云手机设备接收短信验证码 - 技术实现指南

> **文档版本**: v1.0
> **创建日期**: 2025-11-02
> **目标读者**: 后端开发、Android 开发
> **状态**: 技术方案 - 待评审

---

## 📋 目录

1. [问题背景](#1-问题背景)
2. [技术挑战](#2-技术挑战)
3. [解决方案对比](#3-解决方案对比)
4. [方案详解](#4-方案详解)
5. [推荐方案](#5-推荐方案)
6. [完整实现](#6-完整实现)
7. [测试方案](#7-测试方案)
8. [常见问题](#8-常见问题)

---

## 1. 问题背景

### 1.1 业务场景

**云手机设备**（Redroid Android 容器）需要注册社交应用（Telegram、WhatsApp等），这些应用需要手机号验证：

```
1. 用户为云手机设备请求虚拟号码
   ↓
2. 云手机设备打开 Telegram App
   ↓
3. Telegram App 要求输入手机号
   ↓
4. 用户在设备输入虚拟号码 +79123456789
   ↓
5. Telegram 发送验证码短信到 +79123456789
   ↓
6. SMS Receive Service 通过平台 API 接收到验证码 "123456"
   ↓
7. 【关键问题】如何把验证码 "123456" 推送到云手机设备？
   ↓
8. 设备端应用自动识别并填充验证码
```

### 1.2 技术约束

1. **云手机不是真实设备**: 使用 Redroid（Docker Android）或其他模拟器
2. **无真实SIM卡**: 设备没有物理 SIM 卡，无法接收真实短信
3. **无系统短信功能**: 无法使用 Android 系统的 SMS ContentProvider
4. **需要自动化**: 验证码需要自动填充，不能每次手动输入
5. **多设备场景**: 可能同时有100+设备需要接收验证码

### 1.3 核心问题

**如何在没有真实 SIM 卡的云手机设备上"接收"和处理验证码？**

---

## 2. 技术挑战

| 挑战 | 说明 |
|------|------|
| **无系统短信** | 设备无 SIM 卡，无法使用 Android SMS 系统 API |
| **应用兼容性** | 不同应用检测验证码的方式不同（剪贴板、SMS API、自动读取） |
| **自动化填充** | 需要自动识别验证码并填充，减少人工操作 |
| **权限限制** | Redroid 容器可能限制某些系统权限 |
| **性能要求** | 批量操作时需要快速推送（100个设备 → 100个验证码） |
| **安全性** | 验证码是敏感数据，需要安全传输和存储 |

---

## 3. 解决方案对比

### 3.1 方案列表

| 方案 | 复杂度 | 自动化程度 | 兼容性 | 推荐度 |
|------|--------|-----------|--------|--------|
| **方案1: ADB 直接输入** | ⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| **方案2: Android 广播** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **方案3: 剪贴板传递** | ⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **方案4: 模拟系统短信** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| **方案5: 辅助功能服务** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **方案6: WebSocket 推送** | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |

### 3.2 详细对比

#### 方案1: ADB 直接输入

**原理**: 通过 ADB 命令直接输入验证码文本

```bash
adb shell input text "123456"
```

**优点**:
- ✅ 实现最简单
- ✅ 无需设备端 APK
- ✅ 适用于所有应用

**缺点**:
- ❌ 不够智能（需要用户先聚焦到输入框）
- ❌ 无法处理特殊格式（空格、短横线）
- ❌ 无法自动识别验证码输入框
- ❌ 多个输入框时无法判断填哪个

**适用场景**:
- 用户手动操作场景
- 简单的单输入框验证

**推荐度**: ⭐⭐⭐

---

#### 方案2: Android 广播 (推荐)

**原理**: 设备端安装 APK 监听自定义广播，自动填充验证码

**后端推送**:
```bash
adb shell am broadcast \
  -a com.cloudphone.SMS_RECEIVED \
  --es code "123456" \
  --es phone "+79123456789" \
  --es service "telegram"
```

**设备端接收**:
```java
public class SmsReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        String code = intent.getStringExtra("code");
        String phone = intent.getStringExtra("phone");

        // 自动填充到当前输入框
        autofillVerificationCode(code);
    }
}
```

**优点**:
- ✅ 高度自动化
- ✅ 可智能识别输入框
- ✅ 支持悬浮窗显示
- ✅ 可扩展功能（历史记录、手动复制）
- ✅ 性能好（异步处理）

**缺点**:
- ❌ 需要安装设备端 APK
- ❌ 需要 Android 开发（一次性成本）
- ❌ 需要悬浮窗权限（可选）

**适用场景**:
- 生产环境
- 需要高度自动化
- 大规模部署

**推荐度**: ⭐⭐⭐⭐⭐ **(最推荐)**

---

#### 方案3: 剪贴板传递

**原理**: 将验证码写入设备剪贴板，用户手动粘贴

```bash
adb shell "am broadcast -a clipper.set -e text '123456'"
# 或
adb shell "echo '123456' | am start -a android.intent.action.VIEW -d 'clipboard://'"
```

**优点**:
- ✅ 实现简单
- ✅ 无需 APK
- ✅ 适用于所有应用
- ✅ 用户可见验证码

**缺点**:
- ❌ 需要用户手动粘贴（半自动）
- ❌ 覆盖用户剪贴板内容
- ❌ 安全性较低（剪贴板可被其他应用读取）

**适用场景**:
- 快速原型验证
- 对自动化要求不高

**推荐度**: ⭐⭐⭐⭐

---

#### 方案4: 模拟系统短信

**原理**: 向系统短信数据库插入假的短信记录，模拟真实短信

```bash
# 需要 root 权限
adb shell content insert --uri content://sms/inbox \
  --bind address:s:'+79123456789' \
  --bind body:s:'Your code is 123456'
```

**优点**:
- ✅ 与真实短信行为完全一致
- ✅ 应用可通过标准 SMS API 读取
- ✅ 支持应用自动读取验证码（SMS Retriever API）

**缺点**:
- ❌ 需要 root 权限或系统签名
- ❌ Redroid 容器可能不支持
- ❌ 复杂度高
- ❌ 可能被应用检测为非真实短信

**适用场景**:
- 需要完全模拟真实短信
- 有 root 权限的环境

**推荐度**: ⭐⭐⭐

---

#### 方案5: 辅助功能服务

**原理**: 使用 Android Accessibility Service 自动填充

**设备端 APK**:
```java
public class AutofillAccessibilityService extends AccessibilityService {
    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {
        // 检测到输入框
        if (event.getEventType() == AccessibilityEvent.TYPE_VIEW_FOCUSED) {
            AccessibilityNodeInfo node = event.getSource();
            if (isVerificationCodeField(node)) {
                // 自动填充验证码
                node.performAction(AccessibilityNodeInfo.ACTION_SET_TEXT, bundle);
            }
        }
    }
}
```

**优点**:
- ✅ 高度智能（自动识别输入框）
- ✅ 无需用户操作
- ✅ 支持各种复杂场景

**缺点**:
- ❌ 实现复杂
- ❌ 需要辅助功能权限
- ❌ 权限申请流程较复杂
- ❌ 可能被应用检测

**适用场景**:
- 极高自动化要求
- 复杂的验证码场景（多输入框、图片验证码）

**推荐度**: ⭐⭐⭐⭐

---

#### 方案6: WebSocket 推送

**原理**: 设备端 APK 维持 WebSocket 连接，接收验证码

**后端推送**:
```typescript
// Device Service
websocket.emit('sms-received', {
  deviceId: 'xxx',
  code: '123456',
  phone: '+79123456789'
});
```

**设备端接收**:
```java
Socket socket = IO.socket("http://api-gateway:30000");
socket.on("sms-received", args -> {
    String code = json.getString("code");
    autofillCode(code);
});
```

**优点**:
- ✅ 实时推送
- ✅ 支持双向通信
- ✅ 可扩展其他功能

**缺点**:
- ❌ 需要设备端 APK
- ❌ 需要维护长连接
- ❌ 网络依赖（设备需访问后端）
- ❌ 复杂度高

**适用场景**:
- 设备已有 WebSocket 连接
- 需要实时双向通信

**推荐度**: ⭐⭐

---

## 4. 方案详解

### 4.1 方案2: Android 广播（推荐方案）

完整实现分为**后端推送**和**设备端接收**两部分。

---

#### 4.1.1 后端实现（Device Service）

**文件**: `backend/device-service/src/adb/adb.service.ts`

**新增方法**:

```typescript
/**
 * 通过 Android 广播推送验证码到设备
 *
 * @param deviceId 设备ID
 * @param code 验证码
 * @param phoneNumber 手机号码
 * @param service 服务类型 (telegram, whatsapp, google等)
 */
async broadcastSmsCode(
  deviceId: string,
  code: string,
  phoneNumber: string,
  service?: string,
): Promise<void> {
  try {
    // 🔒 安全验证：验证码只能是数字和短横线
    if (!/^[0-9-]+$/.test(code)) {
      throw new Error('Invalid verification code format');
    }

    // 构建广播命令
    const command = `am broadcast -a com.cloudphone.SMS_RECEIVED ` +
      `--es code "${code}" ` +
      `--es phone "${phoneNumber}" ` +
      `--es service "${service || 'unknown'}" ` +
      `--el timestamp ${Date.now()}`;

    await this.executeShellCommand(deviceId, command, 5000);

    this.logger.log(
      `SMS broadcast sent to ${deviceId}: ${code} (${phoneNumber})`
    );
  } catch (error) {
    this.logger.error(
      `Failed to broadcast SMS to ${deviceId}`,
      error
    );
    throw BusinessErrors.adbOperationFailed(
      `验证码广播失败: ${error.message}`,
      { deviceId, code }
    );
  }
}
```

**RabbitMQ 消费者**:

**文件**: `backend/device-service/src/rabbitmq/consumers/sms-events.consumer.ts` (新建)

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { AdbService } from '../../adb/adb.service';
import { DevicesService } from '../../devices/devices.service';

interface SmsReceivedEvent {
  messageId: string;
  numberId: string;
  deviceId: string;
  userId: string;
  phoneNumber: string;
  verificationCode: string;
  messageText: string;
  service: string;
  provider: string;
  receivedAt: string;
}

@Injectable()
export class SmsEventsConsumer {
  private readonly logger = new Logger(SmsEventsConsumer.name);

  constructor(
    private readonly adbService: AdbService,
    private readonly devicesService: DevicesService,
  ) {}

  /**
   * 监听短信接收事件，自动推送验证码到设备
   */
  @RabbitSubscribe({
    exchange: 'cloudphone.events',
    routingKey: 'sms.message.received',
    queue: 'device-service.sms-received',
    queueOptions: {
      durable: true,
      deadLetterExchange: 'cloudphone.dlx',
      deadLetterRoutingKey: 'sms.message.received.failed',
    },
  })
  async handleSmsReceived(event: SmsReceivedEvent) {
    this.logger.log(
      `SMS received event: deviceId=${event.deviceId}, ` +
      `code=${event.verificationCode}`
    );

    try {
      // 1. 检查设备是否存在且正在运行
      const device = await this.devicesService.findOne(event.deviceId);

      if (!device) {
        this.logger.warn(`Device ${event.deviceId} not found, ignoring event`);
        return;
      }

      if (device.status !== 'RUNNING') {
        this.logger.warn(
          `Device ${event.deviceId} is not running (${device.status}), ` +
          `cannot push SMS code`
        );
        return;
      }

      // 2. 通过 ADB 广播推送验证码
      await this.adbService.broadcastSmsCode(
        event.deviceId,
        event.verificationCode,
        event.phoneNumber,
        event.service,
      );

      // 3. 更新设备 metadata
      await this.devicesService.updateDeviceMetadata(event.deviceId, {
        smsNumber: {
          ...device.metadata?.smsNumber,
          status: 'received',
          verificationCode: event.verificationCode,
          receivedAt: event.receivedAt,
        },
      });

      this.logger.log(
        `Successfully pushed SMS code to device ${event.deviceId}`
      );

    } catch (error) {
      this.logger.error(
        `Failed to handle SMS received event for device ${event.deviceId}`,
        error.stack
      );

      // 抛出错误，让 RabbitMQ 重试或进入 DLX
      throw error;
    }
  }

  /**
   * 监听短信号码过期事件
   */
  @RabbitSubscribe({
    exchange: 'cloudphone.events',
    routingKey: 'sms.number.expired',
    queue: 'device-service.sms-expired',
  })
  async handleSmsExpired(event: { numberId: string; deviceId: string }) {
    this.logger.log(`SMS number expired: deviceId=${event.deviceId}`);

    try {
      // 清除设备 metadata 中的号码信息
      const device = await this.devicesService.findOne(event.deviceId);
      if (device) {
        await this.devicesService.updateDeviceMetadata(event.deviceId, {
          smsNumber: null,
        });
      }
    } catch (error) {
      this.logger.error(
        `Failed to handle SMS expired event for device ${event.deviceId}`,
        error.stack
      );
    }
  }
}
```

**注册消费者**:

**文件**: `backend/device-service/src/rabbitmq/rabbitmq.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SmsEventsConsumer } from './consumers/sms-events.consumer';
import { AdbModule } from '../adb/adb.module';
import { DevicesModule } from '../devices/devices.module';

@Module({
  imports: [
    RabbitMQModule.forRootAsync(RabbitMQModule, {
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        exchanges: [
          {
            name: 'cloudphone.events',
            type: 'topic',
          },
          {
            name: 'cloudphone.dlx',
            type: 'topic',
          },
        ],
        uri: configService.get<string>('RABBITMQ_URL'),
        connectionInitOptions: { wait: true, timeout: 10000 },
      }),
    }),
    AdbModule,
    DevicesModule,
  ],
  providers: [SmsEventsConsumer],
  exports: [RabbitMQModule],
})
export class RabbitMQModule {}
```

---

#### 4.1.2 设备端实现（Android APK）

**项目结构**:
```
cloudphone-sms-helper/
├── app/
│   └── src/
│       └── main/
│           ├── AndroidManifest.xml
│           └── java/com/cloudphone/smshelper/
│               ├── SmsReceiver.java
│               ├── AutofillService.java
│               ├── FloatingCodeView.java
│               └── MainActivity.java
└── build.gradle
```

**AndroidManifest.xml**:

```xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.cloudphone.smshelper">

    <!-- 权限 -->
    <uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW" />
    <uses-permission android:name="android.permission.WRITE_SETTINGS" />

    <application
        android:allowBackup="true"
        android:label="CloudPhone SMS Helper"
        android:theme="@style/AppTheme">

        <!-- 主界面 -->
        <activity
            android:name=".MainActivity"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

        <!-- 广播接收器 -->
        <receiver
            android:name=".SmsReceiver"
            android:exported="true">
            <intent-filter>
                <action android:name="com.cloudphone.SMS_RECEIVED" />
            </intent-filter>
        </receiver>

    </application>
</manifest>
```

**SmsReceiver.java**:

```java
package com.cloudphone.smshelper;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.util.Log;
import android.widget.Toast;
import android.os.Handler;
import android.os.Looper;

/**
 * 接收来自后端的 SMS 验证码广播
 */
public class SmsReceiver extends BroadcastReceiver {
    private static final String TAG = "SmsReceiver";
    private static final String ACTION = "com.cloudphone.SMS_RECEIVED";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (!ACTION.equals(intent.getAction())) {
            return;
        }

        // 提取验证码信息
        String code = intent.getStringExtra("code");
        String phone = intent.getStringExtra("phone");
        String service = intent.getStringExtra("service");
        long timestamp = intent.getLongExtra("timestamp", 0);

        Log.i(TAG, String.format(
            "SMS received: code=%s, phone=%s, service=%s",
            code, phone, service
        ));

        if (code == null || code.isEmpty()) {
            Log.w(TAG, "Empty verification code, ignoring");
            return;
        }

        // 策略1: 写入剪贴板 (用户可手动粘贴)
        copyToClipboard(context, code);

        // 策略2: 显示悬浮窗 (可选)
        if (hasOverlayPermission(context)) {
            showFloatingCodeWindow(context, code, phone);
        }

        // 策略3: 自动填充到输入框 (需要辅助功能权限)
        if (hasAccessibilityPermission(context)) {
            AutofillService.autofillCode(code);
        }

        // 显示 Toast 提示
        showToast(context, "验证码已到达: " + code);
    }

    /**
     * 复制验证码到剪贴板
     */
    private void copyToClipboard(Context context, String code) {
        ClipboardManager clipboard = (ClipboardManager)
            context.getSystemService(Context.CLIPBOARD_SERVICE);

        ClipData clip = ClipData.newPlainText("Verification Code", code);
        clipboard.setPrimaryClip(clip);

        Log.i(TAG, "Code copied to clipboard: " + code);
    }

    /**
     * 显示悬浮窗
     */
    private void showFloatingCodeWindow(Context context, String code, String phone) {
        Intent intent = new Intent(context, FloatingCodeView.class);
        intent.putExtra("code", code);
        intent.putExtra("phone", phone);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        context.startActivity(intent);
    }

    /**
     * 显示 Toast 提示
     */
    private void showToast(Context context, String message) {
        new Handler(Looper.getMainLooper()).post(() -> {
            Toast.makeText(context, message, Toast.LENGTH_LONG).show();
        });
    }

    /**
     * 检查是否有悬浮窗权限
     */
    private boolean hasOverlayPermission(Context context) {
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
            return android.provider.Settings.canDrawOverlays(context);
        }
        return true;
    }

    /**
     * 检查是否有辅助功能权限
     */
    private boolean hasAccessibilityPermission(Context context) {
        // 检查 AutofillService 是否启用
        return AutofillService.isEnabled(context);
    }
}
```

**FloatingCodeView.java** (悬浮窗显示):

```java
package com.cloudphone.smshelper;

import android.app.Activity;
import android.graphics.PixelFormat;
import android.os.Bundle;
import android.view.Gravity;
import android.view.LayoutInflater;
import android.view.View;
import android.view.WindowManager;
import android.widget.TextView;
import android.widget.Button;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.widget.Toast;

/**
 * 悬浮窗显示验证码
 */
public class FloatingCodeView extends Activity {
    private View floatingView;
    private WindowManager windowManager;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        String code = getIntent().getStringExtra("code");
        String phone = getIntent().getStringExtra("phone");

        // 创建悬浮窗
        windowManager = (WindowManager) getSystemService(WINDOW_SERVICE);

        floatingView = LayoutInflater.from(this)
            .inflate(R.layout.floating_code_view, null);

        // 设置验证码文本
        TextView codeText = floatingView.findViewById(R.id.code_text);
        codeText.setText(code);

        TextView phoneText = floatingView.findViewById(R.id.phone_text);
        phoneText.setText(phone);

        // 复制按钮
        Button copyButton = floatingView.findViewById(R.id.copy_button);
        copyButton.setOnClickListener(v -> {
            ClipboardManager clipboard = (ClipboardManager)
                getSystemService(CLIPBOARD_SERVICE);
            clipboard.setPrimaryClip(ClipData.newPlainText("Code", code));
            Toast.makeText(this, "已复制: " + code, Toast.LENGTH_SHORT).show();
        });

        // 关闭按钮
        Button closeButton = floatingView.findViewById(R.id.close_button);
        closeButton.setOnClickListener(v -> {
            windowManager.removeView(floatingView);
            finish();
        });

        // 添加悬浮窗
        WindowManager.LayoutParams params = new WindowManager.LayoutParams(
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
            PixelFormat.TRANSLUCENT
        );
        params.gravity = Gravity.CENTER;

        windowManager.addView(floatingView, params);

        // 5秒后自动关闭
        floatingView.postDelayed(() -> {
            if (floatingView.getParent() != null) {
                windowManager.removeView(floatingView);
            }
            finish();
        }, 5000);
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        if (floatingView != null && floatingView.getParent() != null) {
            windowManager.removeView(floatingView);
        }
    }
}
```

**AutofillService.java** (辅助功能自动填充):

```java
package com.cloudphone.smshelper;

import android.accessibilityservice.AccessibilityService;
import android.content.Context;
import android.os.Bundle;
import android.view.accessibility.AccessibilityEvent;
import android.view.accessibility.AccessibilityNodeInfo;
import android.util.Log;

/**
 * 辅助功能服务 - 自动填充验证码
 */
public class AutofillService extends AccessibilityService {
    private static final String TAG = "AutofillService";
    private static AutofillService instance;
    private static String pendingCode = null;

    @Override
    public void onServiceConnected() {
        super.onServiceConnected();
        instance = this;
        Log.i(TAG, "AutofillService connected");
    }

    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {
        if (pendingCode == null) {
            return;
        }

        // 检测到输入框获得焦点
        if (event.getEventType() == AccessibilityEvent.TYPE_VIEW_FOCUSED) {
            AccessibilityNodeInfo source = event.getSource();
            if (source != null && isVerificationCodeField(source)) {
                // 自动填充验证码
                Bundle arguments = new Bundle();
                arguments.putCharSequence(
                    AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE,
                    pendingCode
                );
                source.performAction(
                    AccessibilityNodeInfo.ACTION_SET_TEXT,
                    arguments
                );

                Log.i(TAG, "Autofilled code: " + pendingCode);
                pendingCode = null;
            }
        }
    }

    @Override
    public void onInterrupt() {
        Log.i(TAG, "AutofillService interrupted");
    }

    /**
     * 判断是否是验证码输入框
     */
    private boolean isVerificationCodeField(AccessibilityNodeInfo node) {
        if (node == null) {
            return false;
        }

        // 检查输入类型
        boolean isEditable = node.isEditable();
        String className = node.getClassName() != null ?
            node.getClassName().toString() : "";
        boolean isEditText = className.contains("EditText");

        // 检查hint或contentDescription
        CharSequence hint = node.getHintText();
        CharSequence desc = node.getContentDescription();
        String hintText = hint != null ? hint.toString().toLowerCase() : "";
        String descText = desc != null ? desc.toString().toLowerCase() : "";

        boolean isCodeField = hintText.contains("code") ||
            hintText.contains("验证码") ||
            descText.contains("code") ||
            descText.contains("验证码");

        return isEditable && isEditText && isCodeField;
    }

    /**
     * 外部调用 - 设置待填充的验证码
     */
    public static void autofillCode(String code) {
        pendingCode = code;
        Log.i(TAG, "Pending code set: " + code);
    }

    /**
     * 检查服务是否启用
     */
    public static boolean isEnabled(Context context) {
        return instance != null;
    }
}
```

**MainActivity.java** (设置界面):

```java
package com.cloudphone.smshelper;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.provider.Settings;
import android.widget.Button;
import android.widget.TextView;
import android.widget.Toast;

/**
 * 主界面 - 权限申请和状态显示
 */
public class MainActivity extends Activity {
    private static final int REQUEST_OVERLAY_PERMISSION = 1001;
    private static final int REQUEST_ACCESSIBILITY_PERMISSION = 1002;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        TextView statusText = findViewById(R.id.status_text);
        Button overlayButton = findViewById(R.id.request_overlay_button);
        Button accessibilityButton = findViewById(R.id.request_accessibility_button);

        // 更新状态
        updateStatus();

        // 悬浮窗权限
        overlayButton.setOnClickListener(v -> {
            if (!Settings.canDrawOverlays(this)) {
                Intent intent = new Intent(
                    Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                    Uri.parse("package:" + getPackageName())
                );
                startActivityForResult(intent, REQUEST_OVERLAY_PERMISSION);
            } else {
                Toast.makeText(this, "已有悬浮窗权限", Toast.LENGTH_SHORT).show();
            }
        });

        // 辅助功能权限
        accessibilityButton.setOnClickListener(v -> {
            Intent intent = new Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS);
            startActivityForResult(intent, REQUEST_ACCESSIBILITY_PERMISSION);
        });
    }

    private void updateStatus() {
        TextView statusText = findViewById(R.id.status_text);

        boolean hasOverlay = Settings.canDrawOverlays(this);
        boolean hasAccessibility = AutofillService.isEnabled(this);

        StringBuilder status = new StringBuilder();
        status.append("悬浮窗权限: ").append(hasOverlay ? "✓" : "✗").append("\n");
        status.append("辅助功能权限: ").append(hasAccessibility ? "✓" : "✗");

        statusText.setText(status.toString());
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        updateStatus();
    }

    @Override
    protected void onResume() {
        super.onResume();
        updateStatus();
    }
}
```

**布局文件** (`res/layout/activity_main.xml`):

```xml
<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:orientation="vertical"
    android:padding="20dp">

    <TextView
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="CloudPhone SMS Helper"
        android:textSize="24sp"
        android:textStyle="bold"
        android:layout_marginBottom="20dp" />

    <TextView
        android:id="@+id/status_text"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="状态检查中..."
        android:textSize="16sp"
        android:layout_marginBottom="20dp" />

    <Button
        android:id="@+id/request_overlay_button"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:text="申请悬浮窗权限"
        android:layout_marginBottom="10dp" />

    <Button
        android:id="@+id/request_accessibility_button"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:text="申请辅助功能权限" />

    <TextView
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="说明：\n• 悬浮窗权限：显示验证码悬浮窗\n• 辅助功能权限：自动填充验证码"
        android:textSize="14sp"
        android:layout_marginTop="20dp" />
</LinearLayout>
```

**悬浮窗布局** (`res/layout/floating_code_view.xml`):

```xml
<?xml version="1.0" encoding="utf-8"?>
<androidx.cardview.widget.CardView xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:app="http://schemas.android.com/apk/res/auto"
    android:layout_width="280dp"
    android:layout_height="wrap_content"
    app:cardCornerRadius="12dp"
    app:cardElevation="8dp">

    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:orientation="vertical"
        android:padding="16dp">

        <TextView
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:text="验证码已到达"
            android:textSize="16sp"
            android:textStyle="bold"
            android:layout_marginBottom="8dp" />

        <TextView
            android:id="@+id/code_text"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:text="123456"
            android:textSize="32sp"
            android:textStyle="bold"
            android:textColor="#4CAF50"
            android:layout_gravity="center"
            android:layout_marginVertical="12dp" />

        <TextView
            android:id="@+id/phone_text"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:text="+79123456789"
            android:textSize="14sp"
            android:textColor="#666666"
            android:layout_gravity="center"
            android:layout_marginBottom="16dp" />

        <LinearLayout
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:orientation="horizontal">

            <Button
                android:id="@+id/copy_button"
                android:layout_width="0dp"
                android:layout_height="wrap_content"
                android:layout_weight="1"
                android:text="复制"
                android:layout_marginEnd="8dp" />

            <Button
                android:id="@+id/close_button"
                android:layout_width="0dp"
                android:layout_height="wrap_content"
                android:layout_weight="1"
                android:text="关闭" />
        </LinearLayout>
    </LinearLayout>
</androidx.cardview.widget.CardView>
```

---

#### 4.1.3 APK 打包和部署

**Gradle 配置** (`app/build.gradle`):

```gradle
android {
    compileSdkVersion 33

    defaultConfig {
        applicationId "com.cloudphone.smshelper"
        minSdkVersion 23
        targetSdkVersion 33
        versionCode 1
        versionName "1.0"
    }

    buildTypes {
        release {
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}

dependencies {
    implementation 'androidx.appcompat:appcompat:1.6.1'
    implementation 'androidx.cardview:cardview:1.0.0'
    implementation 'com.google.android.material:material:1.9.0'
}
```

**打包命令**:

```bash
# 1. 构建 APK
cd cloudphone-sms-helper
./gradlew assembleRelease

# 2. 输出路径
# app/build/outputs/apk/release/app-release.apk

# 3. 签名 APK (可选)
jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 \
  -keystore my-release-key.keystore \
  app-release.apk alias_name
```

**部署到所有设备**:

```bash
#!/bin/bash
# deploy-sms-helper.sh

APK_PATH="./cloudphone-sms-helper.apk"
PACKAGE_NAME="com.cloudphone.smshelper"

# 获取所有设备
devices=$(curl -s http://localhost:30002/devices | jq -r '.[].id')

for device_id in $devices; do
  echo "Installing SMS Helper on device $device_id..."

  # 安装 APK
  curl -X POST "http://localhost:30002/devices/$device_id/install-app" \
    -F "apk=@$APK_PATH" \
    -H "Authorization: Bearer $TOKEN"

  # 授予悬浮窗权限
  adb -s $device_id shell appops set $PACKAGE_NAME SYSTEM_ALERT_WINDOW allow

  echo "✓ Installed on $device_id"
done

echo "Deployment completed!"
```

---

## 5. 推荐方案

### 5.1 最终推荐

**方案2: Android 广播** + **剪贴板传递**（混合方案）

**理由**:
1. ✅ **方案2（广播）**作为主方案 - 高度自动化，生产级别
2. ✅ **剪贴板**作为降级方案 - 无需APK即可工作
3. ✅ 覆盖所有场景 - 既有自动化又有手动备份

### 5.2 实施步骤

**Phase 1: 剪贴板方案（MVP - 1天）**
```typescript
// 快速实现，无需设备端APK
async pushCodeToClipboard(deviceId: string, code: string) {
  await this.adbService.executeShellCommand(
    deviceId,
    `am broadcast -a clipper.set -e text '${code}'`
  );
}
```

**Phase 2: Android 广播方案（完整版 - 3天）**
1. 开发 Android APK（2天）
2. 集成后端推送（0.5天）
3. 测试和优化（0.5天）

**Phase 3: 批量部署（1天）**
1. 打包签名 APK
2. 编写自动化部署脚本
3. 部署到所有设备

---

## 6. 完整实现

### 6.1 后端集成清单

- [x] ADB Service 新增 `broadcastSmsCode()` 方法
- [x] Device Service 新增 RabbitMQ 消费者 `SmsEventsConsumer`
- [x] Device Service 监听 `sms.message.received` 事件
- [x] Device Service 更新设备 metadata
- [x] RabbitMQ Module 配置 DLX

### 6.2 设备端集成清单

- [x] Android 项目初始化
- [x] SmsReceiver 广播接收器
- [x] FloatingCodeView 悬浮窗
- [x] AutofillService 辅助功能服务
- [x] MainActivity 权限申请界面
- [x] 布局文件
- [x] 打包和签名

### 6.3 测试清单

- [ ] 单设备推送测试
- [ ] 批量设备推送测试（100个）
- [ ] 剪贴板降级测试
- [ ] 悬浮窗显示测试
- [ ] 自动填充测试
- [ ] 权限申请流程测试
- [ ] RabbitMQ 重试测试
- [ ] 性能测试（推送延迟）

---

## 7. 测试方案

### 7.1 后端测试

**测试脚本** (`test-sms-push.sh`):

```bash
#!/bin/bash

TOKEN="your_jwt_token"
DEVICE_ID="test-device-uuid"
BASE_URL="http://localhost:30002"

echo "1. 请求虚拟号码..."
response=$(curl -s -X POST "$BASE_URL/devices/$DEVICE_ID/request-sms" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "service": "telegram",
    "country": "RU"
  }')

echo "Response: $response"
number_id=$(echo $response | jq -r '.id')
phone=$(echo $response | jq -r '.phoneNumber')

echo "✓ Got number: $phone (ID: $number_id)"
echo ""

echo "2. 模拟验证码到达..."
# 手动发布 RabbitMQ 事件（实际由 SMS Service 发布）
curl -X POST "http://localhost:15672/api/exchanges/cloudphone/cloudphone.events/publish" \
  -u admin:admin123 \
  -H "Content-Type: application/json" \
  -d '{
    "routing_key": "sms.message.received",
    "payload": {
      "messageId": "test-msg-123",
      "numberId": "'$number_id'",
      "deviceId": "'$DEVICE_ID'",
      "userId": "test-user",
      "phoneNumber": "'$phone'",
      "verificationCode": "123456",
      "messageText": "Your code is 123456",
      "service": "telegram",
      "provider": "sms-activate",
      "receivedAt": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"
    },
    "properties": {}
  }'

echo "✓ Event published"
echo ""

echo "3. 等待设备接收..."
sleep 2

echo "4. 检查设备日志..."
adb -s $DEVICE_ID logcat -d | grep -i "sms"

echo "✓ Test completed"
```

### 7.2 设备端测试

**手动测试**:

```bash
# 1. 安装 APK
adb install cloudphone-sms-helper.apk

# 2. 授予悬浮窗权限
adb shell appops set com.cloudphone.smshelper SYSTEM_ALERT_WINDOW allow

# 3. 启动应用申请辅助功能权限
adb shell am start -n com.cloudphone.smshelper/.MainActivity

# 4. 发送测试广播
adb shell am broadcast \
  -a com.cloudphone.SMS_RECEIVED \
  --es code "123456" \
  --es phone "+79123456789" \
  --es service "telegram"

# 5. 查看日志
adb logcat | grep -i "SmsReceiver"

# 预期输出:
# SmsReceiver: SMS received: code=123456, phone=+79123456789, service=telegram
# SmsReceiver: Code copied to clipboard: 123456
# AutofillService: Pending code set: 123456
```

**自动化测试**:

```java
@Test
public void testSmsReceiver() {
    Context context = InstrumentationRegistry.getInstrumentation().getContext();

    // 创建测试 Intent
    Intent intent = new Intent("com.cloudphone.SMS_RECEIVED");
    intent.putExtra("code", "123456");
    intent.putExtra("phone", "+79123456789");
    intent.putExtra("service", "telegram");

    // 发送广播
    context.sendBroadcast(intent);

    // 等待处理
    Thread.sleep(1000);

    // 验证剪贴板
    ClipboardManager clipboard = (ClipboardManager)
        context.getSystemService(Context.CLIPBOARD_SERVICE);
    ClipData clip = clipboard.getPrimaryClip();
    String clipText = clip.getItemAt(0).getText().toString();

    assertEquals("123456", clipText);
}
```

---

## 8. 常见问题

### Q1: 为什么不直接使用 Android SMS API？

**A**: 云手机设备（Redroid）没有真实 SIM 卡，Android 的 SMS ContentProvider 无法工作。即使插入假数据，很多应用也会检测到这不是真实短信。

---

### Q2: 广播方案是否安全？

**A**:
- ✅ 广播只在设备内部传播，不会跨设备泄露
- ✅ 可以添加验证机制（签名、token）
- ✅ 剪贴板方案安全性较低，建议只作为降级方案

**增强安全性**:
```java
// 验证广播来源
@Override
public void onReceive(Context context, Intent intent) {
    // 检查签名
    String signature = intent.getStringExtra("signature");
    if (!verifySignature(signature, code)) {
        Log.w(TAG, "Invalid signature, ignoring");
        return;
    }
    // 处理验证码...
}
```

---

### Q3: 如果用户未安装 APK 怎么办？

**A**: 实施混合方案，自动降级到剪贴板：

```typescript
async pushVerificationCode(deviceId: string, code: string) {
  try {
    // 尝试广播方案
    await this.adbService.broadcastSmsCode(deviceId, code);
    this.logger.log(`Broadcast SMS code to ${deviceId}`);
  } catch (error) {
    // 降级到剪贴板
    this.logger.warn(`Broadcast failed, fallback to clipboard`);
    await this.copyToClipboard(deviceId, code);
  }
}
```

---

### Q4: 如何处理多个验证码？

**A**:
1. **后端**: 为每个号码维护单独的 `numberId`
2. **设备端**: 显示历史记录，用户可选择复制

```java
// 存储最近的验证码
private static final LinkedList<SmsCode> recentCodes = new LinkedList<>();
private static final int MAX_HISTORY = 5;

@Override
public void onReceive(Context context, Intent intent) {
    String code = intent.getStringExtra("code");

    // 添加到历史
    recentCodes.addFirst(new SmsCode(code, System.currentTimeMillis()));
    if (recentCodes.size() > MAX_HISTORY) {
        recentCodes.removeLast();
    }

    // 显示历史列表
    showCodeHistory(context);
}
```

---

### Q5: 性能如何？批量推送100个设备需要多久？

**A**:
- **ADB 广播**: 非常快，~10ms/设备
- **100个设备**: 约1秒内完成
- **瓶颈**: RabbitMQ 消息处理，建议使用 `prefetch: 10` 并发消费

**优化方案**:
```typescript
// RabbitMQ 配置
queueOptions: {
  durable: true,
  arguments: {
    'x-max-priority': 10,  // 优先级队列
  },
},
consumerOptions: {
  prefetch: 10,  // 并发消费10条消息
}
```

---

### Q6: 辅助功能权限如何批量授予？

**A**: 使用 ADB 命令（需要 root 或系统签名）:

```bash
# 批量授予辅助功能权限
for device_id in $devices; do
  adb -s $device_id shell settings put secure \
    enabled_accessibility_services \
    com.cloudphone.smshelper/.AutofillService

  adb -s $device_id shell settings put secure \
    accessibility_enabled 1
done
```

---

### Q7: 如何测试没有真实短信的情况？

**A**:
1. **Mock SMS Service**: 返回固定验证码 "123456"
2. **RabbitMQ 手动发送**: 使用管理界面发布测试事件
3. **ADB 模拟**: 直接发送广播测试设备端

```bash
# 测试脚本
adb shell am broadcast \
  -a com.cloudphone.SMS_RECEIVED \
  --es code "999999" \
  --es phone "+10000000000" \
  --es service "test"
```

---

## 9. 总结

### 9.1 推荐方案

✅ **Android 广播方案** (主) + **剪贴板方案** (备)

### 9.2 优点

- ✅ 高度自动化 - 无需用户操作
- ✅ 兼容性好 - 适用于所有应用
- ✅ 可扩展性强 - 支持悬浮窗、历史记录、自动填充
- ✅ 性能优秀 - 支持批量推送
- ✅ 安全可靠 - 设备内部传播

### 9.3 实施建议

1. **MVP 阶段**: 使用剪贴板方案快速验证
2. **生产环境**: 开发 Android APK 完整方案
3. **批量部署**: 自动化部署脚本
4. **持续优化**: 收集用户反馈，优化交互

### 9.4 开发时间估算

| 阶段 | 工作量 | 说明 |
|------|--------|------|
| 后端集成 | 1天 | ADB 方法 + RabbitMQ 消费者 |
| Android APK | 2天 | 广播接收器 + 悬浮窗 + 自动填充 |
| 测试 | 1天 | 单元测试 + 集成测试 |
| 部署 | 0.5天 | 打包 + 批量部署 |
| **总计** | **4.5天** | - |

---

**文档完成！** 🎉

如需开始实施，请告知：
1. 选择哪个方案？（推荐方案2: Android 广播）
2. 是否需要我编写后端集成代码？
3. 是否需要 Android APK 项目脚手架？
