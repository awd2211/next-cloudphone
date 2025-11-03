package com.cloudphone.smshelper;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.view.Gravity;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;
import android.util.Log;
import android.util.TypedValue;
import android.graphics.Color;

/**
 * 主界面 - 权限申请和状态显示
 *
 * 功能：
 * 1. 显示应用状态和权限状态
 * 2. 申请悬浮窗权限
 * 3. 引导用户开启辅助功能
 * 4. 测试验证码接收
 */
public class MainActivity extends Activity {
    private static final String TAG = "MainActivity";
    private static final int REQUEST_OVERLAY_PERMISSION = 1001;
    private static final int REQUEST_ACCESSIBILITY_PERMISSION = 1002;

    private TextView statusText;
    private Button overlayButton;
    private Button accessibilityButton;
    private Button testButton;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // 动态创建UI
        ScrollView scrollView = new ScrollView(this);
        LinearLayout mainLayout = createMainLayout();
        scrollView.addView(mainLayout);
        setContentView(scrollView);

        // 初始化视图
        initViews(mainLayout);

        // 更新状态
        updateStatus();

        Log.i(TAG, "MainActivity created");
    }

    /**
     * 创建主布局
     */
    private LinearLayout createMainLayout() {
        LinearLayout layout = new LinearLayout(this);
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setPadding(dpToPx(20), dpToPx(20), dpToPx(20), dpToPx(20));
        layout.setBackgroundColor(Color.WHITE);
        return layout;
    }

    /**
     * 初始化视图
     */
    private void initViews(LinearLayout mainLayout) {
        // 标题
        TextView titleText = new TextView(this);
        titleText.setText("CloudPhone SMS Helper");
        titleText.setTextSize(TypedValue.COMPLEX_UNIT_SP, 24);
        titleText.setTextColor(Color.BLACK);
        LinearLayout.LayoutParams titleParams = new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.WRAP_CONTENT,
            ViewGroup.LayoutParams.WRAP_CONTENT
        );
        titleParams.setMargins(0, 0, 0, dpToPx(20));
        titleText.setLayoutParams(titleParams);
        mainLayout.addView(titleText);

        // 版本信息
        TextView versionText = new TextView(this);
        versionText.setText("Version 1.0.0");
        versionText.setTextSize(TypedValue.COMPLEX_UNIT_SP, 14);
        versionText.setTextColor(Color.parseColor("#666666"));
        LinearLayout.LayoutParams versionParams = new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.WRAP_CONTENT,
            ViewGroup.LayoutParams.WRAP_CONTENT
        );
        versionParams.setMargins(0, 0, 0, dpToPx(30));
        versionText.setLayoutParams(versionParams);
        mainLayout.addView(versionText);

        // 状态文本
        statusText = new TextView(this);
        statusText.setText("检查中...");
        statusText.setTextSize(TypedValue.COMPLEX_UNIT_SP, 16);
        statusText.setTextColor(Color.BLACK);
        LinearLayout.LayoutParams statusParams = new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.WRAP_CONTENT
        );
        statusParams.setMargins(0, 0, 0, dpToPx(20));
        statusText.setLayoutParams(statusParams);
        mainLayout.addView(statusText);

        // 悬浮窗权限按钮
        overlayButton = new Button(this);
        overlayButton.setText("申请悬浮窗权限");
        LinearLayout.LayoutParams overlayParams = new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.WRAP_CONTENT
        );
        overlayParams.setMargins(0, 0, 0, dpToPx(10));
        overlayButton.setLayoutParams(overlayParams);
        overlayButton.setOnClickListener(v -> requestOverlayPermission());
        mainLayout.addView(overlayButton);

        // 辅助功能权限按钮
        accessibilityButton = new Button(this);
        accessibilityButton.setText("开启辅助功能");
        LinearLayout.LayoutParams accessParams = new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.WRAP_CONTENT
        );
        accessParams.setMargins(0, 0, 0, dpToPx(10));
        accessibilityButton.setLayoutParams(accessParams);
        accessibilityButton.setOnClickListener(v -> requestAccessibilityPermission());
        mainLayout.addView(accessibilityButton);

        // 测试按钮
        testButton = new Button(this);
        testButton.setText("测试验证码接收");
        LinearLayout.LayoutParams testParams = new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.WRAP_CONTENT
        );
        testParams.setMargins(0, 0, 0, dpToPx(20));
        testButton.setLayoutParams(testParams);
        testButton.setOnClickListener(v -> testSmsReceiver());
        mainLayout.addView(testButton);

        // 说明文本
        TextView descText = new TextView(this);
        descText.setText(
            "功能说明：\n\n" +
            "• 悬浮窗权限：显示验证码悬浮窗\n" +
            "• 辅助功能权限：自动填充验证码到输入框\n\n" +
            "使用方法：\n\n" +
            "1. 授予悬浮窗权限（推荐）\n" +
            "2. 开启辅助功能（可选，用于自动填充）\n" +
            "3. 验证码到达后会自动显示\n" +
            "4. 验证码已自动复制到剪贴板\n\n" +
            "注意：无论是否授予权限，验证码都会自动复制到剪贴板"
        );
        descText.setTextSize(TypedValue.COMPLEX_UNIT_SP, 14);
        descText.setTextColor(Color.parseColor("#666666"));
        descText.setLineSpacing(dpToPx(4), 1.0f);
        mainLayout.addView(descText);
    }

    /**
     * 申请悬浮窗权限
     */
    private void requestOverlayPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            if (!Settings.canDrawOverlays(this)) {
                Intent intent = new Intent(
                    Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                    Uri.parse("package:" + getPackageName())
                );
                startActivityForResult(intent, REQUEST_OVERLAY_PERMISSION);
                Log.i(TAG, "Requesting overlay permission");
            } else {
                Toast.makeText(this, "已有悬浮窗权限", Toast.LENGTH_SHORT).show();
            }
        } else {
            Toast.makeText(this, "当前系统版本默认有悬浮窗权限", Toast.LENGTH_SHORT).show();
        }
    }

    /**
     * 申请辅助功能权限
     */
    private void requestAccessibilityPermission() {
        try {
            Intent intent = new Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS);
            startActivityForResult(intent, REQUEST_ACCESSIBILITY_PERMISSION);
            Toast.makeText(this,
                "请在辅助功能列表中找到并开启 \"CloudPhone SMS Helper\"",
                Toast.LENGTH_LONG).show();
            Log.i(TAG, "Opening accessibility settings");
        } catch (Exception e) {
            Log.e(TAG, "Failed to open accessibility settings", e);
            Toast.makeText(this, "无法打开辅助功能设置", Toast.LENGTH_SHORT).show();
        }
    }

    /**
     * 测试验证码接收
     */
    private void testSmsReceiver() {
        try {
            Intent intent = new Intent("com.cloudphone.SMS_RECEIVED");
            intent.putExtra("code", "123456");
            intent.putExtra("phone", "+79123456789");
            intent.putExtra("service", "test");
            intent.putExtra("timestamp", System.currentTimeMillis());

            sendBroadcast(intent);

            Toast.makeText(this, "测试广播已发送", Toast.LENGTH_SHORT).show();
            Log.i(TAG, "Test broadcast sent");
        } catch (Exception e) {
            Log.e(TAG, "Failed to send test broadcast", e);
            Toast.makeText(this, "测试失败: " + e.getMessage(), Toast.LENGTH_SHORT).show();
        }
    }

    /**
     * 更新状态显示
     */
    private void updateStatus() {
        boolean hasOverlay = hasOverlayPermission();
        boolean hasAccessibility = AutofillService.isEnabled(this);

        StringBuilder status = new StringBuilder();
        status.append("应用状态\n\n");
        status.append("悬浮窗权限: ").append(hasOverlay ? "✓ 已授予" : "✗ 未授予").append("\n");
        status.append("辅助功能: ").append(hasAccessibility ? "✓ 已启用" : "✗ 未启用").append("\n\n");

        if (hasOverlay && hasAccessibility) {
            status.append("状态: 所有功能已就绪 ✓");
            statusText.setTextColor(Color.parseColor("#4CAF50"));
        } else if (hasOverlay || hasAccessibility) {
            status.append("状态: 部分功能可用");
            statusText.setTextColor(Color.parseColor("#FF9800"));
        } else {
            status.append("状态: 建议授予权限以获得最佳体验");
            statusText.setTextColor(Color.parseColor("#F44336"));
        }

        statusText.setText(status.toString());

        // 更新按钮状态
        overlayButton.setEnabled(!hasOverlay);
        overlayButton.setText(hasOverlay ? "悬浮窗权限已授予 ✓" : "申请悬浮窗权限");

        Log.i(TAG, "Status updated: overlay=" + hasOverlay + ", accessibility=" + hasAccessibility);
    }

    /**
     * 检查悬浮窗权限
     */
    private boolean hasOverlayPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            return Settings.canDrawOverlays(this);
        }
        return true;
    }

    /**
     * dp转px
     */
    private int dpToPx(int dp) {
        return (int) (dp * getResources().getDisplayMetrics().density);
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        updateStatus();
        Log.i(TAG, "onActivityResult: requestCode=" + requestCode);
    }

    @Override
    protected void onResume() {
        super.onResume();
        updateStatus();
        Log.i(TAG, "onResume");
    }
}
