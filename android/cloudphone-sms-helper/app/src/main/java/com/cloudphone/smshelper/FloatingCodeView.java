package com.cloudphone.smshelper;

import android.app.Activity;
import android.graphics.Color;
import android.graphics.PixelFormat;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Button;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.widget.Toast;
import android.util.Log;
import android.util.TypedValue;

/**
 * 悬浮窗显示验证码
 *
 * 功能：
 * 1. 以悬浮窗形式显示验证码
 * 2. 提供复制按钮
 * 3. 5秒后自动关闭
 * 4. 点击关闭按钮立即关闭
 */
public class FloatingCodeView extends Activity {
    private static final String TAG = "FloatingCodeView";
    private View floatingView;
    private WindowManager windowManager;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        String code = getIntent().getStringExtra("code");
        String phone = getIntent().getStringExtra("phone");
        String service = getIntent().getStringExtra("service");

        Log.i(TAG, String.format("Creating floating window for code=%s, phone=%s, service=%s",
            code, phone, service));

        if (code == null || code.isEmpty()) {
            Log.w(TAG, "Empty code, finishing");
            finish();
            return;
        }

        try {
            // 创建悬浮窗
            windowManager = (WindowManager) getSystemService(WINDOW_SERVICE);
            floatingView = createFloatingView(code, phone, service);

            // 添加悬浮窗
            WindowManager.LayoutParams params = createLayoutParams();
            windowManager.addView(floatingView, params);

            // 5秒后自动关闭
            floatingView.postDelayed(this::closeFloatingWindow, 5000);

            Log.i(TAG, "Floating window created successfully");
        } catch (Exception e) {
            Log.e(TAG, "Failed to create floating window", e);
            finish();
        }
    }

    /**
     * 创建悬浮窗视图
     */
    private View createFloatingView(String code, String phone, String service) {
        // 主容器
        LinearLayout mainLayout = new LinearLayout(this);
        mainLayout.setOrientation(LinearLayout.VERTICAL);
        mainLayout.setPadding(dpToPx(16), dpToPx(16), dpToPx(16), dpToPx(16));
        mainLayout.setBackgroundColor(Color.WHITE);
        mainLayout.setLayoutParams(new ViewGroup.LayoutParams(
            dpToPx(280),
            ViewGroup.LayoutParams.WRAP_CONTENT
        ));

        // 标题
        TextView titleText = new TextView(this);
        titleText.setText("验证码已到达");
        titleText.setTextSize(TypedValue.COMPLEX_UNIT_SP, 16);
        titleText.setTextColor(Color.BLACK);
        titleText.setPadding(0, 0, 0, dpToPx(8));
        mainLayout.addView(titleText);

        // 验证码
        TextView codeText = new TextView(this);
        codeText.setText(code);
        codeText.setTextSize(TypedValue.COMPLEX_UNIT_SP, 32);
        codeText.setTextColor(Color.parseColor("#4CAF50"));
        codeText.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams codeParams = new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.WRAP_CONTENT
        );
        codeParams.setMargins(0, dpToPx(12), 0, dpToPx(12));
        codeText.setLayoutParams(codeParams);
        mainLayout.addView(codeText);

        // 手机号和服务
        String infoText = "";
        if (phone != null && !phone.isEmpty()) {
            infoText += phone;
        }
        if (service != null && !service.isEmpty()) {
            if (!infoText.isEmpty()) infoText += " • ";
            infoText += service;
        }

        if (!infoText.isEmpty()) {
            TextView phoneText = new TextView(this);
            phoneText.setText(infoText);
            phoneText.setTextSize(TypedValue.COMPLEX_UNIT_SP, 14);
            phoneText.setTextColor(Color.parseColor("#666666"));
            phoneText.setGravity(Gravity.CENTER);
            phoneText.setPadding(0, 0, 0, dpToPx(16));
            mainLayout.addView(phoneText);
        }

        // 按钮容器
        LinearLayout buttonLayout = new LinearLayout(this);
        buttonLayout.setOrientation(LinearLayout.HORIZONTAL);
        buttonLayout.setLayoutParams(new ViewGroup.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.WRAP_CONTENT
        ));

        // 复制按钮
        Button copyButton = new Button(this);
        copyButton.setText("复制");
        LinearLayout.LayoutParams copyParams = new LinearLayout.LayoutParams(
            0,
            ViewGroup.LayoutParams.WRAP_CONTENT,
            1.0f
        );
        copyParams.setMargins(0, 0, dpToPx(8), 0);
        copyButton.setLayoutParams(copyParams);
        copyButton.setOnClickListener(v -> {
            ClipboardManager clipboard = (ClipboardManager) getSystemService(CLIPBOARD_SERVICE);
            if (clipboard != null) {
                clipboard.setPrimaryClip(ClipData.newPlainText("Code", code));
                Toast.makeText(this, "已复制: " + code, Toast.LENGTH_SHORT).show();
                Log.i(TAG, "Code copied via button: " + code);
            }
        });
        buttonLayout.addView(copyButton);

        // 关闭按钮
        Button closeButton = new Button(this);
        closeButton.setText("关闭");
        LinearLayout.LayoutParams closeParams = new LinearLayout.LayoutParams(
            0,
            ViewGroup.LayoutParams.WRAP_CONTENT,
            1.0f
        );
        closeButton.setLayoutParams(closeParams);
        closeButton.setOnClickListener(v -> closeFloatingWindow());
        buttonLayout.addView(closeButton);

        mainLayout.addView(buttonLayout);

        return mainLayout;
    }

    /**
     * 创建窗口布局参数
     */
    private WindowManager.LayoutParams createLayoutParams() {
        int layoutFlag;
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            layoutFlag = WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY;
        } else {
            layoutFlag = WindowManager.LayoutParams.TYPE_SYSTEM_ALERT;
        }

        WindowManager.LayoutParams params = new WindowManager.LayoutParams(
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            layoutFlag,
            WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL |
            WindowManager.LayoutParams.FLAG_WATCH_OUTSIDE_TOUCH,
            PixelFormat.TRANSLUCENT
        );

        params.gravity = Gravity.CENTER;
        return params;
    }

    /**
     * 关闭悬浮窗
     */
    private void closeFloatingWindow() {
        try {
            if (floatingView != null && floatingView.getParent() != null) {
                windowManager.removeView(floatingView);
                Log.i(TAG, "Floating window removed");
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to remove floating window", e);
        } finally {
            finish();
        }
    }

    /**
     * dp转px
     */
    private int dpToPx(int dp) {
        return (int) (dp * getResources().getDisplayMetrics().density);
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        try {
            if (floatingView != null && floatingView.getParent() != null) {
                windowManager.removeView(floatingView);
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to remove view in onDestroy", e);
        }
    }

    @Override
    public void onBackPressed() {
        closeFloatingWindow();
    }
}
