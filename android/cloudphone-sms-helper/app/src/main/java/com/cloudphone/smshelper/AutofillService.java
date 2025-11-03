package com.cloudphone.smshelper;

import android.accessibilityservice.AccessibilityService;
import android.content.Context;
import android.os.Bundle;
import android.provider.Settings;
import android.text.TextUtils;
import android.view.accessibility.AccessibilityEvent;
import android.view.accessibility.AccessibilityNodeInfo;
import android.util.Log;

/**
 * 辅助功能服务 - 自动填充验证码
 *
 * 功能：
 * 1. 监听输入框获得焦点事件
 * 2. 识别验证码输入框
 * 3. 自动填充待填充的验证码
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
            if (source != null) {
                try {
                    if (isVerificationCodeField(source)) {
                        // 自动填充验证码
                        Bundle arguments = new Bundle();
                        arguments.putCharSequence(
                            AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE,
                            pendingCode
                        );
                        boolean success = source.performAction(
                            AccessibilityNodeInfo.ACTION_SET_TEXT,
                            arguments
                        );

                        if (success) {
                            Log.i(TAG, "Autofilled code: " + pendingCode);
                            pendingCode = null; // 填充成功后清除
                        } else {
                            Log.w(TAG, "Failed to autofill code");
                        }
                    }
                } finally {
                    source.recycle();
                }
            }
        }
    }

    @Override
    public void onInterrupt() {
        Log.i(TAG, "AutofillService interrupted");
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        instance = null;
        Log.i(TAG, "AutofillService destroyed");
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
        boolean isEditText = className.contains("EditText") || className.contains("TextInputEditText");

        if (!isEditable || !isEditText) {
            return false;
        }

        // 检查hint或contentDescription是否包含验证码相关关键词
        String hint = getNodeText(node.getHintText());
        String desc = getNodeText(node.getContentDescription());
        String text = getNodeText(node.getText());

        String allText = (hint + " " + desc + " " + text).toLowerCase();

        boolean isCodeField = allText.contains("code") ||
            allText.contains("验证码") ||
            allText.contains("verification") ||
            allText.contains("verify") ||
            allText.contains("otp") ||
            allText.contains("pin");

        Log.d(TAG, String.format(
            "Field check: editable=%b, isEditText=%b, isCodeField=%b, hint=%s, desc=%s",
            isEditable, isEditText, isCodeField, hint, desc
        ));

        return isCodeField;
    }

    /**
     * 安全地获取CharSequence文本
     */
    private String getNodeText(CharSequence charSeq) {
        if (charSeq == null) {
            return "";
        }
        return charSeq.toString();
    }

    /**
     * 外部调用 - 设置待填充的验证码
     */
    public static void autofillCode(String code) {
        pendingCode = code;
        Log.i(TAG, "Pending code set: " + code);

        // 如果服务未运行，记录警告
        if (instance == null) {
            Log.w(TAG, "AutofillService is not running, code will not be autofilled");
        }
    }

    /**
     * 检查服务是否启用
     */
    public static boolean isEnabled(Context context) {
        if (instance != null) {
            return true;
        }

        // 检查辅助功能设置
        try {
            String enabledServices = Settings.Secure.getString(
                context.getContentResolver(),
                Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
            );

            if (TextUtils.isEmpty(enabledServices)) {
                return false;
            }

            String packageName = context.getPackageName();
            String serviceName = packageName + "/" + AutofillService.class.getName();

            return enabledServices.contains(serviceName);
        } catch (Exception e) {
            Log.e(TAG, "Failed to check if service is enabled", e);
            return false;
        }
    }

    /**
     * 获取当前服务实例
     */
    public static AutofillService getInstance() {
        return instance;
    }
}
