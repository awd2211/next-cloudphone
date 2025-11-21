/**
 * 测试环境全局配置
 *
 * 在所有测试运行前执行一次，设置全局测试环境
 */

import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeAll, afterAll } from 'vitest';
import { server } from './mocks/server';

// 在所有测试前启动 MSW server
beforeAll(() => {
  server.listen({
    onUnhandledRequest: 'warn', // 警告未处理的请求
  });
});

// 每个测试后清理
afterEach(() => {
  cleanup(); // 清理 React Testing Library
  server.resetHandlers(); // 重置 MSW handlers
});

// 所有测试后关闭 MSW server
afterAll(() => {
  server.close();
});

// 模拟 window.matchMedia (Ant Design 需要)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {}, // deprecated
    removeListener: () => {}, // deprecated
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

// 模拟 IntersectionObserver (虚拟滚动需要)
class IntersectionObserverMock {
  observe = () => null;
  unobserve = () => null;
  disconnect = () => null;
}

Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  value: IntersectionObserverMock,
});

// 模拟 ResizeObserver (Ant Design 需要)
class ResizeObserverMock {
  observe = () => null;
  unobserve = () => null;
  disconnect = () => null;
}

Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  value: ResizeObserverMock,
});

// 模拟 console 方法（避免测试输出过多日志）
global.console = {
  ...console,
  error: () => {}, // 静默错误日志
  warn: () => {},  // 静默警告日志
};

// ========== axios-mock-adapter 配置 ==========
// 使用 axios-mock-adapter 拦截所有 axios 请求
import { setupAxiosMock, cleanupAxiosMock } from './mocks/axios-mock';

// 在所有测试前配置 axios mock
beforeAll(() => {
  setupAxiosMock();
});

// 注意：不在 afterEach 中重置 axios mock
// 原因：resetAxiosMock() 会清除 replyOnce() 配置的临时处理器
// replyOnce() 会在使用一次后自动清除，无需手动重置

// 所有测试后清理 axios mock
afterAll(() => {
  cleanupAxiosMock();
});
