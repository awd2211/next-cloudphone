import { useState, useCallback } from 'react';
import { Card, Table, message, Modal } from 'antd';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import request from '@/utils/request';
import {
  ProxyStatsCards,
  ProxySearchBar,
  useProxyColumns,
  type ProxyRecord,
  type ProxySearchParams,
} from '@/components/Proxy';

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

  const queryClient = useQueryClient();

  // 查询代理列表
  const { data, isLoading } = useQuery({
    queryKey: ['proxy-list', searchParams],
    queryFn: async () => {
      const params: any = {
        page: searchParams.page,
        limit: searchParams.limit,
      };

      if (searchParams.status) params.status = searchParams.status;
      if (searchParams.protocol) params.protocol = searchParams.protocol;
      if (searchParams.provider) params.provider = searchParams.provider;
      if (searchParams.country) params.country = searchParams.country;
      if (searchParams.minQuality) params.minQuality = searchParams.minQuality;
      if (searchParams.maxLatency) params.maxLatency = searchParams.maxLatency;

      const response = await request.get('/proxy/list', { params });
      return response;
    },
  });

  // 查询统计数据
  const { data: stats } = useQuery({
    queryKey: ['proxy-stats'],
    queryFn: async () => {
      const response = await request.get('/proxy/stats/pool');
      return response;
    },
    refetchInterval: 30000, // 每30秒自动刷新
  });

  // 释放代理
  const releaseMutation = useMutation({
    mutationFn: async (proxyId: string) => {
      return await request.post(`/proxy/release/${proxyId}`);
    },
    onSuccess: () => {
      message.success('代理释放成功');
      queryClient.invalidateQueries({ queryKey: ['proxy-list'] });
      queryClient.invalidateQueries({ queryKey: ['proxy-stats'] });
    },
    onError: () => {
      message.error('代理释放失败');
    },
  });

  // 测试代理
  const testMutation = useMutation({
    mutationFn: async (proxyId: string) => {
      return await request.post(`/proxy/test/${proxyId}`);
    },
    onSuccess: (data) => {
      if (data.success) {
        message.success(`代理测试成功，延迟: ${data.latency}ms`);
      } else {
        message.error('代理测试失败');
      }
      queryClient.invalidateQueries({ queryKey: ['proxy-list'] });
    },
    onError: () => {
      message.error('代理测试失败');
    },
  });

  // 刷新代理池
  const refreshPoolMutation = useMutation({
    mutationFn: async () => {
      return await request.post('/proxy/admin/refresh-pool');
    },
    onSuccess: (data) => {
      message.success(`成功刷新代理池，新增 ${data.added || 0} 个代理`);
      queryClient.invalidateQueries({ queryKey: ['proxy-list'] });
      queryClient.invalidateQueries({ queryKey: ['proxy-stats'] });
    },
    onError: () => {
      message.error('刷新代理池失败');
    },
  });

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
          setSearchParams({ ...searchParams, minQuality: value })
        }
        onMaxLatencyChange={(value) =>
          setSearchParams({ ...searchParams, maxLatency: value })
        }
        onSearch={handleSearch}
        onReset={handleReset}
        onRefreshPool={handleRefreshPool}
      />

      {/* 表格 */}
      <Card>
        <Table
          columns={columns}
          dataSource={data?.data || []}
          rowKey="id"
          loading={isLoading}
          scroll={{ x: 1600 }}
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
          }}
        />
      </Card>
    </div>
  );
};

export default ProxyManagement;
