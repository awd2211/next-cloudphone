/**
 * 全局搜索模态框组件
 *
 * 功能:
 * 1. Cmd/Ctrl + K 快捷键唤起
 * 2. 支持搜索多种资源类型(设备、用户、应用等)
 * 3. 实时搜索结果
 * 4. 键盘导航
 */

import { useState, useCallback, useEffect, useRef, memo } from 'react';
import { Modal, Input, List, Empty, Tag, Space, Typography, Spin , } from 'antd';
import {
  SearchOutlined,
  MobileOutlined,
  UserOutlined,
  AppstoreOutlined,

  LoadingOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useDebounce } from '@/hooks/useDebounce';

const { Text } = Typography;

export interface SearchResult {
  id: string;
  type: 'device' | 'user' | 'app' | 'log';
  title: string;
  subtitle?: string;
  path: string;
  icon?: React.ReactNode;
}

export interface GlobalSearchModalProps {
  visible: boolean;
  onClose: () => void;
}

// 模拟搜索函数 (实际应调用 API)
const mockSearch = async (query: string): Promise<SearchResult[]> => {
  await new Promise(resolve => setTimeout(resolve, 300)); // 模拟网络延迟

  if (!query) return [];

  const results: SearchResult[]  = [];

  // 模拟设备搜索
  if (query.includes('设备') || query.toLowerCase().includes('device')) {
    results.push({
      id: '1',
      type: 'device',
      title: `测试设备-${query}`,
      subtitle: 'Android 11 • 运行中',
      path: '/devices/1',
      icon: <MobileOutlined />,
    });
  }

  // 模拟用户搜索
  if (query.includes('用户') || query.toLowerCase().includes('user')) {
    results.push({
      id: '2',
      type: 'user',
      title: `用户-${query}`,
      subtitle: 'admin@example.com',
      path: '/users/2',
      icon: <UserOutlined />,
    });
  }

  // 模拟应用搜索
  if (query.includes('应用') || query.toLowerCase().includes('app')) {
    results.push({
      id: '3',
      type: 'app',
      title: `应用-${query}`,
      subtitle: '版本 1.0.0',
      path: '/apps/3',
      icon: <AppstoreOutlined />,
    });
  }

  return results;
};

const getTypeColor = (type: SearchResult['type']) => {
  const colors = {
    device: 'blue',
    user: 'green',
    app: 'orange',
    log: 'purple',
  };
  return colors[type];
};

const getTypeName = (type: SearchResult['type']) => {
  const names = {
    device: '设备',
    user: '用户',
    app: '应用',
    log: '日志',
  };
  return names[type];
};

/**
 * 全局搜索模态框组件
 *
 * @example
 * ```tsx
 * const [searchVisible, setSearchVisible] = useState(false);
 *
 * // 在 useEffect 中监听快捷键
 * useEffect(() => {
 *   const handleKeyDown = (e: KeyboardEvent) => {
 *     if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
 *       e.preventDefault();
 *       setSearchVisible(true);
 *     }
 *   };
 *   window.addEventListener('keydown', handleKeyDown);
 *   return () => window.removeEventListener('keydown', handleKeyDown);
 * }, []);
 *
 * return <GlobalSearchModal visible={searchVisible} onClose={() => setSearchVisible(false)} />;
 * ```
 */
// ✅ 使用 memo 包装组件，避免不必要的重渲染
export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = memo(({ visible, onClose }) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const inputRef = useRef<any>(null);
  const navigate = useNavigate();

  // 防抖搜索
  const debouncedQuery = useDebounce(query, 300);

  // 执行搜索
  useEffect(() => {
    if (!debouncedQuery) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    mockSearch(debouncedQuery)
      .then(data => {
        setResults(data);
        setSelectedIndex(0);
      })
      .finally(() => setLoading(false));
  }, [debouncedQuery]);

  // 重置状态
  useEffect(() => {
    if (visible) {
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
      // 自动聚焦输入框
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [visible]);

  // 键盘导航
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (results.length === 0) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => (prev + 1) % results.length);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => (prev - 1 + results.length) % results.length);
          break;
        case 'Enter':
          e.preventDefault();
          if (results[selectedIndex]) {
            navigate(results[selectedIndex].path);
            onClose();
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    },
    [results, selectedIndex, navigate, onClose]
  );

  // 点击结果项
  const handleItemClick = useCallback(
    (result: SearchResult) => {
      navigate(result.path);
      onClose();
    },
    [navigate, onClose]
  );

  return (
    <Modal
      title={null}
      open={visible}
      onCancel={onClose}
      footer={null}
      width={600}
      centered
      styles={{ body: { padding: 0 } }}
      closeIcon={null}
    >
      <div style={{ padding: '16px 16px 0' }}>
        <Input
          ref={inputRef}
          size="large"
          placeholder="搜索设备、用户、应用... (输入关键词)"
          prefix={<SearchOutlined style={{ color: '#999' }} />}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          suffix={
            loading ? <Spin indicator={<LoadingOutlined spin />} size="small" /> : null
          }
        />
      </div>

      <div style={{ maxHeight: 400, overflow: 'auto', marginTop: 8 }}>
        {results.length > 0 ? (
          <List
            dataSource={results}
            renderItem={(item, index) => (
              <List.Item
                key={item.id}
                onClick={() => handleItemClick(item)}
                style={{
                  padding: '12px 24px',
                  cursor: 'pointer',
                  backgroundColor: index === selectedIndex ? '#f0f0f0' : 'transparent',
                  borderLeft: index === selectedIndex ? '3px solid token.colorPrimary' : '3px solid transparent',
                }}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <List.Item.Meta
                  avatar={
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 4,
                        backgroundColor: '#f5f5f5',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 16,
                      }}
                    >
                      {item.icon}
                    </div>
                  }
                  title={
                    <Space>
                      <Text strong>{item.title}</Text>
                      <Tag color={getTypeColor(item.type)} style={{ fontSize: 11 }}>
                        {getTypeName(item.type)}
                      </Tag>
                    </Space>
                  }
                  description={item.subtitle}
                />
              </List.Item>
            )}
          />
        ) : query && !loading ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="未找到匹配结果"
            style={{ padding: '40px 0' }}
          />
        ) : (
          <div style={{ padding: '40px 24px', textAlign: 'center', color: '#999' }}>
            <Text type="secondary">
              {!query ? '输入关键词开始搜索...' : '搜索中...'}
            </Text>
          </div>
        )}
      </div>

      {/* 快捷键提示 */}
      <div
        style={{
          padding: '8px 16px',
          borderTop: '1px solid #f0f0f0',
          backgroundColor: '#fafafa',
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 12,
          color: '#999',
        }}
      >
        <Space size={16}>
          <span>↑↓ 导航</span>
          <span>Enter 选择</span>
          <span>Esc 关闭</span>
        </Space>
      </div>
    </Modal>
  );
});

GlobalSearchModal.displayName = 'GlobalSearchModal';
