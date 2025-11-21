import { useState, useCallback } from 'react';
import { Card, Modal, message } from 'antd';
import AccessibleTable from '@/components/Accessible/AccessibleTable';
import {
  ProxyStatsCards,
  ProxySearchBar,
  useProxyColumns,
  type ProxyRecord,
  type ProxySearchParams,
} from '@/components/Proxy';
import {
  useProxyList,
  useProxyStats,
  useReleaseProxy,
  useTestProxy,
  useRefreshProxyPool,
} from '@/hooks/queries/useProxy';

/**
 * 代理IP管理页面
 *
 * 功能：
 * 1. ✅ 代理池统计展示
 * 2. ✅ 代理列表查询和筛选
 * 3. ✅ 代理质量监控
 * 4. ✅ 代理释放操作
 * 5. ✅ 代理测试功能
 * 6. ✅ 刷新代理池
 */
const ProxyManagement: React.FC = () => {
  const [searchParams, setSearchParams] = useState<ProxySearchParams>({
    status: undefined,
    protocol: undefined,
    provider: undefined,
    country: undefined,
    minQuality: undefined,
    maxLatency: undefined,
    page: 1,
    limit: 10,
  });

  // 使用自定义 React Query Hooks
  const { data, isLoading } = useProxyList(searchParams);
  const { data: stats } = useProxyStats(); // 自动30秒刷新
  const releaseMutation = useReleaseProxy();
  const testMutation = useTestProxy();
  const refreshPoolMutation = useRefreshProxyPool();

  // ✅ useCallback 优化事件处理
  const handleRelease = useCallback((record: ProxyRecord) => {
    Modal.confirm({
      title: '确认释放',
      content: `确定要释放代理 ${record.host}:${record.port} 吗？`,
      onOk: () => releaseMutation.mutate(record.id),
    });
  }, [releaseMutation]);

  const handleTest = useCallback((record: ProxyRecord) => {
    message.loading({ content: '正在测试代理...', key: 'test' });
    testMutation.mutate(record.id);
  }, [testMutation]);

  const handleSearch = useCallback(() => {
    setSearchParams({ ...searchParams, page: 1 });
  }, [searchParams]);

  const handleReset = useCallback(() => {
    setSearchParams({
      status: undefined,
      protocol: undefined,
      provider: undefined,
      country: undefined,
      minQuality: undefined,
      maxLatency: undefined,
      page: 1,
      limit: 10,
    });
  }, []);

  const handleRefreshPool = useCallback(() => {
    Modal.confirm({
      title: '确认刷新代理池',
      content: '这将从供应商获取新的代理。确定要刷新吗？',
      onOk: () => refreshPoolMutation.mutate(),
    });
  }, [refreshPoolMutation]);

  // ✅ 使用提取的表格列定义
  const columns = useProxyColumns({
    onRelease: handleRelease,
    onTest: handleTest,
  });

  return (
    <div>
      {/* 统计卡片 */}
      <ProxyStatsCards
        total={stats?.total || 0}
        available={stats?.available || 0}
        inUse={stats?.inUse || 0}
        unavailable={stats?.unavailable || 0}
        avgQuality={stats?.avgQuality || 0}
        avgLatency={stats?.avgLatency || 0}
        totalBandwidth={stats?.totalBandwidth || 0}
        totalCost={stats?.totalCost || 0}
      />

      {/* 搜索区域 */}
      <ProxySearchBar
        status={searchParams.status}
        protocol={searchParams.protocol}
        provider={searchParams.provider}
        country={searchParams.country}
        minQuality={searchParams.minQuality}
        maxLatency={searchParams.maxLatency}
        onStatusChange={(value) =>
          setSearchParams({ ...searchParams, status: value })
        }
        onProtocolChange={(value) =>
          setSearchParams({ ...searchParams, protocol: value })
        }
        onProviderChange={(value) =>
          setSearchParams({ ...searchParams, provider: value })
        }
        onCountryChange={(value) =>
          setSearchParams({ ...searchParams, country: value })
        }
        onMinQualityChange={(value) =>
          setSearchParams({ ...searchParams, minQuality: value ?? undefined })
        }
        onMaxLatencyChange={(value) =>
          setSearchParams({ ...searchParams, maxLatency: value ?? undefined })
        }
        onSearch={handleSearch}
        onReset={handleReset}
        onRefreshPool={handleRefreshPool}
      />

      {/* 表格 */}
      <Card>
        <AccessibleTable<ProxyRecord>
          ariaLabel="代理IP列表"
          loadingText="正在加载代理IP列表"
          emptyText="暂无代理IP数据"
          columns={columns}
          dataSource={(data?.data || []) as unknown as readonly ProxyRecord[]}
          rowKey="id"
          loading={isLoading}
          scroll={{ x: 1600, y: 600 }}
          virtual
          pagination={{
            current: searchParams.page,
            pageSize: searchParams.limit,
            total: data?.meta?.total || 0,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`,
            onChange: (page, pageSize) => {
              setSearchParams({ ...searchParams, page, limit: pageSize });
            },
            pageSizeOptions: ['10', '20', '50', '100', '200'],
          }}
        />
      </Card>
    </div>
  );
};

export default ProxyManagement;
