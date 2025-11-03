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
 *
 * 功能：
 * 1. 接收ADB广播的验证码
 * 2. 自动复制到剪贴板
 * 3. 显示悬浮窗（如果有权限）
 * 4. 触发自动填充（如果启用辅助功能）
 */
public class SmsReceiver extends BroadcastReceiver {
    private static final String TAG = "SmsReceiver";
    private static final String ACTION = "com.cloudphone.SMS_RECEIVED";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (!ACTION.equals(intent.getAction())) {
            Log.d(TAG, "Received intent with wrong action: " + intent.getAction());
            return;
        }

        // 提取验证码信息
        String code = intent.getStringExtra("code");
        String phone = intent.getStringExtra("phone");
        String service = intent.getStringExtra("service");
        long timestamp = intent.getLongExtra("timestamp", 0);

        Log.i(TAG, String.format(
            "SMS received: code=%s, phone=%s, service=%s, timestamp=%d",
            code, phone, service, timestamp
        ));

        if (code == null || code.isEmpty()) {
            Log.w(TAG, "Empty verification code, ignoring");
            return;
        }

        // 策略1: 写入剪贴板 (用户可手动粘贴) - 总是执行
        copyToClipboard(context, code);

        // 策略2: 显示悬浮窗 (如果有权限)
        if (hasOverlayPermission(context)) {
            showFloatingCodeWindow(context, code, phone, service);
        } else {
            Log.i(TAG, "No overlay permission, skipping floating window");
        }

        // 策略3: 自动填充到输入框 (如果启用辅助功能)
        if (hasAccessibilityPermission(context)) {
            AutofillService.autofillCode(code);
        } else {
            Log.i(TAG, "Accessibility service not enabled, skipping autofill");
        }

        // 显示 Toast 提示
        showToast(context, "验证码已到达: " + code);
    }

    /**
     * 复制验证码到剪贴板
     */
    private void copyToClipboard(Context context, String code) {
        try {
            ClipboardManager clipboard = (ClipboardManager)
                context.getSystemService(Context.CLIPBOARD_SERVICE);

            if (clipboard != null) {
                ClipData clip = ClipData.newPlainText("Verification Code", code);
                clipboard.setPrimaryClip(clip);
                Log.i(TAG, "Code copied to clipboard: " + code);
            } else {
                Log.w(TAG, "Clipboard service not available");
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to copy to clipboard", e);
        }
    }

    /**
     * 显示悬浮窗
     */
    private void showFloatingCodeWindow(Context context, String code, String phone, String service) {
        try {
            Intent intent = new Intent(context, FloatingCodeView.class);
            intent.putExtra("code", code);
            intent.putExtra("phone", phone);
            intent.putExtra("service", service);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(intent);
            Log.i(TAG, "Floating window launched");
        } catch (Exception e) {
            Log.e(TAG, "Failed to show floating window", e);
        }
    }

    /**
     * 显示 Toast 提示
     */
    private void showToast(Context context, String message) {
        try {
            new Handler(Looper.getMainLooper()).post(() -> {
                Toast.makeText(context, message, Toast.LENGTH_LONG).show();
            });
        } catch (Exception e) {
            Log.e(TAG, "Failed to show toast", e);
        }
    }

    /**
     * 检查是否有悬浮窗权限
     */
    private boolean hasOverlayPermission(Context context) {
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
            return android.provider.Settings.canDrawOverlays(context);
        }
        return true; // Android 6.0以下默认有权限
    }

    /**
     * 检查是否有辅助功能权限
     */
    private boolean hasAccessibilityPermission(Context context) {
        try {
            return AutofillService.isEnabled(context);
        } catch (Exception e) {
            Log.e(TAG, "Failed to check accessibility permission", e);
            return false;
        }
    }
}
