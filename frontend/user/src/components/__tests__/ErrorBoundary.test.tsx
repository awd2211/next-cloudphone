import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ErrorBoundary from '../ErrorBoundary';

// 创建一个会抛出错误的组件
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('测试错误');
  }
  return <div>正常内容</div>;
};

describe('ErrorBoundary 组件', () => {
  // 禁止控制台错误输出，避免测试输出混乱
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

  it('应该渲染子组件当没有错误时', () => {
    render(
      <ErrorBoundary>
        <div>测试子组件</div>
      </ErrorBoundary>
    );

    const element = screen.getByText('测试子组件');
    expect(element).toBeTruthy();
  });

  it('应该捕获并显示错误信息', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    // 验证错误UI被渲染
    const errorElement = screen.queryByText(/页面出错了/);
    expect(errorElement).toBeTruthy();
  });

  it('应该显示错误标题', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    const titleElement = screen.getByText('页面出错了');
    expect(titleElement).toBeTruthy();
  });

  it('应该显示友好的错误提示', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    const messageElement = screen.queryByText(/抱歉，页面遇到了一些问题/);
    expect(messageElement).toBeTruthy();
  });

  it('应该在没有错误时正常工作', () => {
    const { container } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(container.textContent).toContain('正常内容');
  });

  // 清理 mock
  consoleError.mockRestore();
});
