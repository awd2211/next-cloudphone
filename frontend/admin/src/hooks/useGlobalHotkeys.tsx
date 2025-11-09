/**
 * 全局快捷键 Hook
 *
 * 功能：
 * 1. 提供全局导航快捷键（跳转到各个页面）
 * 2. 提供通用操作快捷键（搜索、保存等）
 * 3. 显示快捷键帮助对话框
 */

import { useHotkeys } from 'react-hotkeys-hook';
import { useNavigate } from 'react-router-dom';
import { message, Modal, Descriptions } from 'antd';
import { useCallback } from 'react';

/**
 * 显示快捷键帮助对话框
 */
const showHotkeysHelp = () => {
  Modal.info({
    title: '⌨️ 键盘快捷键',
    width: 700,
    content: (
      <div style={{ marginTop: 16 }}>
        <Descriptions column={2} size="small" bordered>
          <Descriptions.Item label="导航快捷键" span={2}>
            <strong>使用 G + 字母键快速跳转</strong>
          </Descriptions.Item>
          <Descriptions.Item label="G + D">跳转到设备列表</Descriptions.Item>
          <Descriptions.Item label="G + U">跳转到用户列表</Descriptions.Item>
          <Descriptions.Item label="G + A">跳转到应用列表</Descriptions.Item>
          <Descriptions.Item label="G + B">跳转到账单列表</Descriptions.Item>
          <Descriptions.Item label="G + P">跳转到代理管理</Descriptions.Item>
          <Descriptions.Item label="G + S">跳转到短信管理</Descriptions.Item>
          <Descriptions.Item label="G + N">跳转到通知中心</Descriptions.Item>
          <Descriptions.Item label="G + H">跳转到首页</Descriptions.Item>

          <Descriptions.Item label="通用快捷键" span={2}>
            <strong>常用操作</strong>
          </Descriptions.Item>
          <Descriptions.Item label="Ctrl/Cmd + K">全局搜索（即将推出）</Descriptions.Item>
          <Descriptions.Item label="Esc">关闭模态框/取消操作</Descriptions.Item>
          <Descriptions.Item label="?">显示快捷键帮助</Descriptions.Item>
          <Descriptions.Item label="Ctrl/Cmd + /">显示快捷键帮助</Descriptions.Item>
        </Descriptions>

        <div style={{ marginTop: 16, padding: 12, background: '#f6ffed', borderRadius: 4 }}>
          <strong>💡 提示：</strong>
          <ul style={{ marginTop: 8, marginBottom: 0, paddingLeft: 20 }}>
            <li>按 G 键后立即按目标键，无需同时按下</li>
            <li>快捷键在输入框聚焦时会被禁用，避免干扰正常输入</li>
            <li>所有快捷键不区分大小写</li>
          </ul>
        </div>
      </div>
    ),
  });
};

/**
 * 全局快捷键 Hook
 *
 * 在应用根组件中调用此 Hook 以启用全局快捷键
 *
 * @example
 * ```tsx
 * // src/layouts/BasicLayout.tsx
 * import { useGlobalHotkeys } from '@/hooks/useGlobalHotkeys';
 *
 * const BasicLayout = () => {
 *   useGlobalHotkeys();
 *
 *   return <Layout>...</Layout>;
 * };
 * ```
 */
export const useGlobalHotkeys = () => {
  const navigate = useNavigate();

  // 显示帮助的回调（用于 useHotkeys）
  const showHelp = useCallback(() => {
    showHotkeysHelp();
  }, []);

  // === 导航快捷键 ===

  // G + H: 跳转到首页
  useHotkeys('g h', () => {
    navigate('/');
    message.success('快捷键：首页');
  });

  // G + D: 跳转到设备列表
  useHotkeys('g d', () => {
    navigate('/devices');
    message.success('快捷键：设备列表');
  });

  // G + U: 跳转到用户列表
  useHotkeys('g u', () => {
    navigate('/users');
    message.success('快捷键：用户列表');
  });

  // G + A: 跳转到应用列表
  useHotkeys('g a', () => {
    navigate('/apps');
    message.success('快捷键：应用列表');
  });

  // G + B: 跳转到账单列表
  useHotkeys('g b', () => {
    navigate('/billing/transactions');
    message.success('快捷键：账单列表');
  });

  // G + P: 跳转到代理管理
  useHotkeys('g p', () => {
    navigate('/proxy/management');
    message.success('快捷键：代理管理');
  });

  // G + S: 跳转到短信管理
  useHotkeys('g s', () => {
    navigate('/sms/management');
    message.success('快捷键：短信管理');
  });

  // G + N: 跳转到通知中心
  useHotkeys('g n', () => {
    navigate('/notifications');
    message.success('快捷键：通知中心');
  });

  // === 通用快捷键 ===

  // Shift + /: 显示快捷键帮助
  useHotkeys('shift+/', showHelp, {
    preventDefault: true,
  });

  // Ctrl/Cmd + /: 显示快捷键帮助
  useHotkeys('mod+/', showHelp, {
    preventDefault: true,
  });

  // ? (Shift + /): 显示快捷键帮助（备用）
  useHotkeys('?', showHelp, {
    preventDefault: true,
  });

  // Ctrl/Cmd + K: 全局搜索（预留，功能待实现）
  useHotkeys(
    'mod+k',
    (e) => {
      e.preventDefault();
      message.info('全局搜索功能即将推出');
      // TODO: 实现全局搜索功能
      // openGlobalSearch();
    },
    {
      preventDefault: true,
    }
  );
};

/**
 * 页面级快捷键 Hook
 *
 * 为特定页面提供专用快捷键
 *
 * @example
 * ```tsx
 * // 在列表页面中使用
 * usePageHotkeys({
 *   'mod+n': () => setCreateModalVisible(true), // 新建
 *   'mod+r': () => refetch(), // 刷新
 *   'mod+f': () => focusSearchInput(), // 聚焦搜索框
 * });
 * ```
 */
export const usePageHotkeys = (
  hotkeys: Record<string, (e: KeyboardEvent) => void>,
  deps: any[] = []
) => {
  Object.entries(hotkeys).forEach(([key, handler]) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useHotkeys(key, handler, { preventDefault: true }, deps);
  });
};
