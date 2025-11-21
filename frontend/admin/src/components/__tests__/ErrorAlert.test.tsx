/**
 * ErrorAlert 组件单元测试
 * 测试错误提示组件的各种场景
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '../../test/test-utils';
import { ErrorAlert, SimpleErrorAlert, type ErrorInfo } from '../ErrorAlert';

describe('ErrorAlert Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('基础渲染', () => {
    it('应该渲染字符串错误', () => {
      render(<ErrorAlert error="测试错误信息" />);
      expect(screen.getByText('测试错误信息')).toBeInTheDocument();
    });

    it('应该渲染 Error 对象', () => {
      const error = new Error('系统错误');
      render(<ErrorAlert error={error} />);
      expect(screen.getByText('系统错误')).toBeInTheDocument();
    });

    it('应该渲染 ErrorInfo 对象', () => {
      const errorInfo: ErrorInfo = {
        message: '网络连接失败',
        code: 'NETWORK_ERROR',
        requestId: 'req-123',
      };
      render(<ErrorAlert error={errorInfo} />);
      expect(screen.getByText('网络连接失败')).toBeInTheDocument();
      expect(screen.getByText('错误代码: NETWORK_ERROR')).toBeInTheDocument();
      expect(screen.getByText('Request ID: req-123')).toBeInTheDocument();
    });

    it('应该优先显示 userMessage', () => {
      const errorInfo: ErrorInfo = {
        message: '技术错误信息',
        userMessage: '用户友好的错误信息',
      };
      render(<ErrorAlert error={errorInfo} />);
      expect(screen.getByText('用户友好的错误信息')).toBeInTheDocument();
    });

    it('visible=false 时不应该渲染', () => {
      const { container } = render(<ErrorAlert error="错误" visible={false} />);
      expect(container.firstChild).toBeNull();
    });

    it('error=null 时不应该渲染', () => {
      const { container } = render(<ErrorAlert error={null} />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('恢复建议', () => {
    it('应该显示恢复建议', () => {
      const errorInfo: ErrorInfo = {
        message: '操作失败',
        recoverySuggestions: [
          {
            action: '检查网络',
            description: '请确保网络连接正常',
          },
          {
            action: '重试',
            description: '稍后再试',
          },
        ],
      };
      render(<ErrorAlert error={errorInfo} />);

      expect(screen.getByText('解决方案：')).toBeInTheDocument();
      expect(screen.getByText('检查网络:')).toBeInTheDocument();
      expect(screen.getByText('请确保网络连接正常')).toBeInTheDocument();
      expect(screen.getByText('重试:')).toBeInTheDocument();
      expect(screen.getByText('稍后再试')).toBeInTheDocument();
    });

    it('应该显示恢复建议的跳转链接', () => {
      const errorInfo: ErrorInfo = {
        message: '配额超限',
        recoverySuggestions: [
          {
            action: '升级套餐',
            description: '升级到更高级的套餐',
            actionUrl: '/plans/upgrade',
          },
        ],
      };
      render(<ErrorAlert error={errorInfo} />);

      const link = screen.getByRole('link', { name: /前往/ });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', '/plans/upgrade');
    });

    it('showRecoverySuggestions=false 时不应该显示建议', () => {
      const errorInfo: ErrorInfo = {
        message: '错误',
        recoverySuggestions: [{ action: '重试', description: '请重试' }],
      };
      render(<ErrorAlert error={errorInfo} showRecoverySuggestions={false} />);

      expect(screen.queryByText('解决方案：')).not.toBeInTheDocument();
    });
  });

  describe('Request ID 和错误代码', () => {
    it('应该显示 Request ID', () => {
      const errorInfo: ErrorInfo = {
        message: '错误',
        requestId: 'req-abc-123',
      };
      render(<ErrorAlert error={errorInfo} />);

      expect(screen.getByText('Request ID: req-abc-123')).toBeInTheDocument();
    });

    it('应该显示错误代码', () => {
      const errorInfo: ErrorInfo = {
        message: '错误',
        code: 'ERR_TIMEOUT',
      };
      render(<ErrorAlert error={errorInfo} />);

      expect(screen.getByText('错误代码: ERR_TIMEOUT')).toBeInTheDocument();
    });

    it('showRequestId=false 时不应该显示 Request ID', () => {
      const errorInfo: ErrorInfo = {
        message: '错误',
        requestId: 'req-123',
      };
      render(<ErrorAlert error={errorInfo} showRequestId={false} />);

      expect(screen.queryByText(/Request ID/)).not.toBeInTheDocument();
    });
  });

  describe('技术详情', () => {
    it('应该显示技术详情面板', () => {
      const errorInfo: ErrorInfo = {
        message: '错误',
        technicalMessage: 'TypeError: Cannot read property',
      };
      render(<ErrorAlert error={errorInfo} />);

      expect(screen.getByText('查看技术详情')).toBeInTheDocument();
    });

    it('点击后应该展开技术详情', () => {
      const errorInfo: ErrorInfo = {
        message: '错误',
        technicalMessage: 'Stack trace details',
      };
      render(<ErrorAlert error={errorInfo} />);

      const detailsHeader = screen.getByText('查看技术详情');
      fireEvent.click(detailsHeader);

      expect(screen.getByText('技术消息：')).toBeInTheDocument();
      expect(screen.getByText('Stack trace details')).toBeInTheDocument();
    });

    it('应该显示详细信息', () => {
      const errorInfo: ErrorInfo = {
        message: '错误',
        details: { errorCode: 500, path: '/api/users' },
      };
      render(<ErrorAlert error={errorInfo} />);

      const detailsHeader = screen.getByText('查看技术详情');
      fireEvent.click(detailsHeader);

      expect(screen.getByText('详细信息：')).toBeInTheDocument();
      expect(screen.getByText(/"errorCode": 500/)).toBeInTheDocument();
    });

    it('showTechnicalDetails=false 时不应该显示技术详情', () => {
      const errorInfo: ErrorInfo = {
        message: '错误',
        technicalMessage: 'Technical error',
      };
      render(<ErrorAlert error={errorInfo} showTechnicalDetails={false} />);

      expect(screen.queryByText('查看技术详情')).not.toBeInTheDocument();
    });
  });

  describe('操作按钮和链接', () => {
    it('应该渲染重试按钮并处理点击', () => {
      const onRetry = vi.fn();
      const errorInfo: ErrorInfo = {
        message: '错误信息',
        retryable: true,
      };
      render(<ErrorAlert error={errorInfo} onRetry={onRetry} />);

      const retryButton = screen.getByRole('button', { name: /重试/i });
      expect(retryButton).toBeInTheDocument();

      fireEvent.click(retryButton);
      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it('retryable=false 时不应该显示重试按钮', () => {
      const onRetry = vi.fn();
      const errorInfo: ErrorInfo = {
        message: '错误',
        retryable: false,
      };
      render(<ErrorAlert error={errorInfo} onRetry={onRetry} />);

      expect(screen.queryByRole('button', { name: /重试/i })).not.toBeInTheDocument();
    });

    it('应该显示文档链接', () => {
      const errorInfo: ErrorInfo = {
        message: '错误',
        documentationUrl: 'https://docs.example.com/errors',
      };
      render(<ErrorAlert error={errorInfo} />);

      const docLink = screen.getByText('查看文档');
      expect(docLink.closest('a')).toHaveAttribute('href', 'https://docs.example.com/errors');
      expect(docLink.closest('a')).toHaveAttribute('target', '_blank');
    });

    it('应该显示技术支持链接', () => {
      const errorInfo: ErrorInfo = {
        message: '错误',
        supportUrl: '/support/tickets',
      };
      render(<ErrorAlert error={errorInfo} />);

      const supportLink = screen.getByText('联系技术支持');
      expect(supportLink.closest('a')).toHaveAttribute('href', '/support/tickets');
    });

    it('showDocumentation=false 时不应该显示文档链接', () => {
      const errorInfo: ErrorInfo = {
        message: '错误',
        documentationUrl: 'https://docs.example.com',
      };
      render(<ErrorAlert error={errorInfo} showDocumentation={false} />);

      expect(screen.queryByText('查看文档')).not.toBeInTheDocument();
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

    it('应该渲染 info 类型的 Alert', () => {
      const { container } = render(<ErrorAlert error="信息" type="info" />);
      expect(container.querySelector('.ant-alert-info')).toBeInTheDocument();
    });

    it('默认应该是 error 类型', () => {
      const { container } = render(<ErrorAlert error="错误" />);
      expect(container.querySelector('.ant-alert-error')).toBeInTheDocument();
    });
  });

  describe('关闭功能', () => {
    it('提供 onClose 时应该显示关闭按钮', () => {
      const onClose = vi.fn();
      const { container } = render(<ErrorAlert error="错误" onClose={onClose} />);

      const closeButton = container.querySelector('.ant-alert-close-icon');
      expect(closeButton).toBeInTheDocument();
    });

    it('点击关闭按钮应该触发 onClose', () => {
      const onClose = vi.fn();
      const { container } = render(<ErrorAlert error="错误" onClose={onClose} />);

      const closeButton = container.querySelector('.ant-alert-close-icon');
      if (closeButton) {
        fireEvent.click(closeButton);
        expect(onClose).toHaveBeenCalledTimes(1);
      }
    });

    it('不提供 onClose 时不应该显示关闭按钮', () => {
      const { container } = render(<ErrorAlert error="错误" />);

      const closeButton = container.querySelector('.ant-alert-close-icon');
      expect(closeButton).not.toBeInTheDocument();
    });
  });

  describe('自定义样式', () => {
    it('应该应用自定义 className', () => {
      const { container } = render(
        <ErrorAlert error="错误" className="custom-error-class" />
      );

      expect(container.querySelector('.custom-error-class')).toBeInTheDocument();
    });

    it('应该应用自定义 style', () => {
      const customStyle = { marginTop: '20px', padding: '10px' };
      const { container } = render(<ErrorAlert error="错误" style={customStyle} />);

      const alert = container.querySelector('.ant-alert');
      expect(alert).toHaveStyle({ marginTop: '20px', padding: '10px' });
    });
  });

  describe('自定义标题', () => {
    it('应该显示自定义标题', () => {
      render(<ErrorAlert error="错误详情" title="自定义错误标题" />);

      expect(screen.getByText('自定义错误标题')).toBeInTheDocument();
    });

    it('没有标题时应该显示错误消息', () => {
      render(<ErrorAlert error="默认错误消息" />);

      expect(screen.getByText('默认错误消息')).toBeInTheDocument();
    });
  });
});

describe('SimpleErrorAlert Component', () => {
  it('应该渲染字符串错误', () => {
    render(<SimpleErrorAlert error="简单错误信息" />);
    expect(screen.getByText('简单错误信息')).toBeInTheDocument();
  });

  it('应该渲染 Error 对象', () => {
    const error = new Error('Error 对象消息');
    render(<SimpleErrorAlert error={error} />);
    expect(screen.getByText('Error 对象消息')).toBeInTheDocument();
  });

  it('error=null 时不应该渲染', () => {
    const { container } = render(<SimpleErrorAlert error={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('应该是 error 类型', () => {
    const { container } = render(<SimpleErrorAlert error="错误" />);
    expect(container.querySelector('.ant-alert-error')).toBeInTheDocument();
  });

  it('应该显示关闭图标', () => {
    const onClose = vi.fn();
    const { container } = render(<SimpleErrorAlert error="错误" onClose={onClose} />);

    const closeButton = container.querySelector('.ant-alert-close-icon');
    expect(closeButton).toBeInTheDocument();
  });

  it('点击关闭应该触发回调', () => {
    const onClose = vi.fn();
    const { container } = render(<SimpleErrorAlert error="错误" onClose={onClose} />);

    const closeButton = container.querySelector('.ant-alert-close-icon');
    if (closeButton) {
      fireEvent.click(closeButton);
      expect(onClose).toHaveBeenCalledTimes(1);
    }
  });

  it('应该应用自定义 className', () => {
    const { container } = render(
      <SimpleErrorAlert error="错误" className="simple-custom-class" />
    );

    expect(container.querySelector('.simple-custom-class')).toBeInTheDocument();
  });
});
