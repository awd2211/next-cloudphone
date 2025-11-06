/**
 * ErrorAlert 组件单元测试
 * 测试错误提示组件的各种场景
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '../../tests/test-utils';
import {
  ErrorAlert,
  InlineError,
  SuccessAlert,
  WarningAlert,
  type ErrorDetail,
} from '../ErrorAlert';

describe('ErrorAlert Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('基础渲染', () => {
    it('应该渲染字符串错误', () => {
      render(<ErrorAlert error="测试错误信息" />);
      expect(screen.getByText('测试错误信息')).toBeInTheDocument();
      expect(screen.getByText('操作失败')).toBeInTheDocument();
    });

    it('应该渲染 Error 对象', () => {
      const error = new Error('系统错误');
      render(<ErrorAlert error={error} />);
      expect(screen.getByText('系统错误')).toBeInTheDocument();
    });

    it('应该渲染 ErrorDetail 对象', () => {
      const errorDetail: ErrorDetail = {
        code: 'NETWORK_ERROR',
        message: '网络连接失败',
        requestId: 'req-123',
      };
      render(<ErrorAlert error={errorDetail} />);
      expect(screen.getByText('网络连接失败')).toBeInTheDocument();
      expect(screen.getByText('错误 [NETWORK_ERROR]')).toBeInTheDocument();
    });
  });

  describe('错误代码和建议', () => {
    it('应该显示 NETWORK_ERROR 的建议', () => {
      const error: ErrorDetail = {
        code: 'NETWORK_ERROR',
        message: '网络错误',
      };
      render(<ErrorAlert error={error} />);
      expect(screen.getByText('请检查您的网络连接，然后重试')).toBeInTheDocument();
    });

    it('应该显示 TIMEOUT 的建议', () => {
      const error: ErrorDetail = {
        code: 'TIMEOUT',
        message: '请求超时',
      };
      render(<ErrorAlert error={error} />);
      expect(screen.getByText('请求超时，请检查网络或稍后重试')).toBeInTheDocument();
    });

    it('应该显示 UNAUTHORIZED 的建议', () => {
      const error: ErrorDetail = {
        code: 'UNAUTHORIZED',
        message: '未授权',
      };
      render(<ErrorAlert error={error} />);
      expect(screen.getByText('登录已过期，请重新登录')).toBeInTheDocument();
    });

    it('应该显示 QUOTA_EXCEEDED 的建议', () => {
      const error: ErrorDetail = {
        code: 'QUOTA_EXCEEDED',
        message: '配额超限',
      };
      render(<ErrorAlert error={error} />);
      expect(screen.getByText('配额已用完，请升级套餐或联系管理员')).toBeInTheDocument();
    });

    it('不应该显示未知错误代码的建议', () => {
      const error: ErrorDetail = {
        code: 'UNKNOWN_ERROR',
        message: '未知错误',
      };
      render(<ErrorAlert error={error} />);
      expect(screen.queryByText('建议')).not.toBeInTheDocument();
    });
  });

  describe('操作按钮', () => {
    it('应该渲染重试按钮并处理点击', () => {
      const onRetry = vi.fn();
      render(<ErrorAlert error="错误信息" onRetry={onRetry} />);

      const retryButton = screen.getByRole('button', { name: /重试/i });
      expect(retryButton).toBeInTheDocument();

      fireEvent.click(retryButton);
      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it('应该渲染报告问题按钮并处理点击', () => {
      const onReport = vi.fn();
      render(<ErrorAlert error="错误信息" onReport={onReport} />);

      const reportButton = screen.getByRole('button', { name: /报告问题/i });
      expect(reportButton).toBeInTheDocument();

      fireEvent.click(reportButton);
      expect(onReport).toHaveBeenCalledTimes(1);
    });

    it('应该同时渲染重试和报告按钮', () => {
      const onRetry = vi.fn();
      const onReport = vi.fn();
      render(<ErrorAlert error="错误信息" onRetry={onRetry} onReport={onReport} />);

      expect(screen.getByRole('button', { name: /重试/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /报告问题/i })).toBeInTheDocument();
    });

    it('不传回调时不应该渲染按钮', () => {
      render(<ErrorAlert error="错误信息" />);

      expect(screen.queryByRole('button', { name: /重试/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /报告问题/i })).not.toBeInTheDocument();
    });
  });

  describe('详细信息', () => {
    it('showDetails=false 时不应该显示详细信息', () => {
      const error: ErrorDetail = {
        message: '错误',
        stack: 'Error stack trace',
        requestId: 'req-123',
      };
      render(<ErrorAlert error={error} showDetails={false} />);

      expect(screen.queryByText('查看详细信息')).not.toBeInTheDocument();
    });

    it('showDetails=true 时应该显示详细信息面板', () => {
      const error: ErrorDetail = {
        message: '错误',
        stack: 'Error stack trace',
        requestId: 'req-123',
      };
      render(<ErrorAlert error={error} showDetails={true} />);

      expect(screen.getByText('查看详细信息')).toBeInTheDocument();
    });

    it('应该显示请求 ID', () => {
      const error: ErrorDetail = {
        message: '错误',
        requestId: 'req-abc-123',
      };
      render(<ErrorAlert error={error} showDetails={true} />);

      // 展开详细信息面板
      const detailsHeader = screen.getByText('查看详细信息');
      fireEvent.click(detailsHeader);

      // 现在应该能看到请求 ID
      expect(screen.getByText(/req-abc-123/i)).toBeInTheDocument();
    });

    it('应该显示时间戳', () => {
      const timestamp = new Date('2025-01-01T12:00:00Z').toISOString();
      const error: ErrorDetail = {
        message: '错误',
        timestamp,
        requestId: 'req-123', // 添加 requestId 以显示详细信息面板
      };
      render(<ErrorAlert error={error} showDetails={true} />);

      // 展开详细信息面板
      const detailsHeader = screen.getByText('查看详细信息');
      fireEvent.click(detailsHeader);

      // 验证时间文本存在 (格式可能因时区而异)
      expect(screen.getByText(/时间:/i)).toBeInTheDocument();
    });

    it('应该显示详细描述', () => {
      const error: ErrorDetail = {
        message: '错误',
        details: '这是详细的错误描述',
      };
      render(<ErrorAlert error={error} showDetails={true} />);

      // 展开详细信息面板
      const detailsHeader = screen.getByText('查看详细信息');
      fireEvent.click(detailsHeader);

      expect(screen.getByText('详细信息:')).toBeInTheDocument();
      expect(screen.getByText('这是详细的错误描述')).toBeInTheDocument();
    });

    it('应该显示堆栈跟踪', () => {
      const error: ErrorDetail = {
        message: '错误',
        stack: 'Error: Test\n  at testFunction (test.js:10:15)',
      };
      render(<ErrorAlert error={error} showDetails={true} />);

      // 展开详细信息面板
      const detailsHeader = screen.getByText('查看详细信息');
      fireEvent.click(detailsHeader);

      expect(screen.getByText('堆栈跟踪:')).toBeInTheDocument();
      expect(screen.getByText(/at testFunction/i)).toBeInTheDocument();
    });
  });

  describe('错误类型', () => {
    it('应该渲染 error 类型的 Alert', () => {
      const { container } = render(<ErrorAlert error="错误" type="error" />);
      expect(container.querySelector('.ant-alert-error')).toBeInTheDocument();
    });

    it('应该渲染 warning 类型的 Alert', () => {
      const { container } = render(<ErrorAlert error="警告" type="warning" />);
      expect(container.querySelector('.ant-alert-warning')).toBeInTheDocument();
    });

    it('默认应该是 error 类型', () => {
      const { container } = render(<ErrorAlert error="错误" />);
      expect(container.querySelector('.ant-alert-error')).toBeInTheDocument();
    });
  });
});

describe('InlineError Component', () => {
  it('应该渲染内联错误消息', () => {
    render(<InlineError message="内联错误信息" />);
    expect(screen.getByText('内联错误信息')).toBeInTheDocument();
  });

  it('应该是 error 类型', () => {
    const { container } = render(<InlineError message="错误" />);
    expect(container.querySelector('.ant-alert-error')).toBeInTheDocument();
  });

  it('应该显示关闭图标', () => {
    render(<InlineError message="错误" />);
    // 验证关闭按钮存在 (Ant Design 用 close icon 实现)
    const closeButton = document.querySelector('.ant-alert-close-icon');
    expect(closeButton).toBeInTheDocument();
  });
});

describe('SuccessAlert Component', () => {
  it('应该渲染成功消息', () => {
    render(<SuccessAlert message="操作成功" />);
    expect(screen.getByText('操作成功')).toBeInTheDocument();
  });

  it('应该渲染成功消息和描述', () => {
    render(<SuccessAlert message="操作成功" description="数据已保存" />);
    expect(screen.getByText('操作成功')).toBeInTheDocument();
    expect(screen.getByText('数据已保存')).toBeInTheDocument();
  });

  it('应该是 success 类型', () => {
    const { container } = render(<SuccessAlert message="成功" />);
    expect(container.querySelector('.ant-alert-success')).toBeInTheDocument();
  });

  it('应该显示关闭图标', () => {
    render(<SuccessAlert message="成功" />);
    // 验证关闭按钮存在
    const closeButton = document.querySelector('.ant-alert-close-icon');
    expect(closeButton).toBeInTheDocument();
  });
});

describe('WarningAlert Component', () => {
  it('应该渲染警告消息', () => {
    render(<WarningAlert message="警告信息" />);
    expect(screen.getByText('警告信息')).toBeInTheDocument();
  });

  it('应该渲染警告消息和描述', () => {
    render(<WarningAlert message="警告" description="请注意数据变化" />);
    expect(screen.getByText('警告')).toBeInTheDocument();
    expect(screen.getByText('请注意数据变化')).toBeInTheDocument();
  });

  it('应该是 warning 类型', () => {
    const { container } = render(<WarningAlert message="警告" />);
    expect(container.querySelector('.ant-alert-warning')).toBeInTheDocument();
  });

  it('应该显示关闭图标', () => {
    render(<WarningAlert message="警告" />);
    // 验证关闭按钮存在
    const closeButton = document.querySelector('.ant-alert-close-icon');
    expect(closeButton).toBeInTheDocument();
  });
});
