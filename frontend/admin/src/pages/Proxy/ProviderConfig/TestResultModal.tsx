/**
 * 代理供应商测试结果详情对话框
 *
 * 显示测试连接的详细结果，包括：
 * - 测试状态（成功/失败）
 * - 代理IP地址
 * - 响应时间/延迟
 * - 错误信息
 * - 测试历史记录
 */

import React, { useState, useEffect } from 'react';
import { Modal, Result, Descriptions, Tag, Timeline, Empty, Spin, Alert } from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  GlobalOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import type { ProxyProvider } from '@/hooks/queries/useProxy';
import { SEMANTIC, NEUTRAL_LIGHT } from '@/theme';

export interface TestResult {
  success: boolean;
  message?: string;
  proxyCount?: number;
  timestamp?: string;
  duration?: number; // 测试耗时（ms）
  proxyIp?: string; // 代理IP
  responseTime?: number; // 响应时间（ms）
  error?: string; // 错误详情
}

export interface TestHistory extends TestResult {
  id: string;
  testedAt: string;
}

interface TestResultModalProps {
  visible: boolean;
  onCancel: () => void;
  provider: ProxyProvider | null;
  testResult: TestResult | null;
  loading: boolean;
}

const TestResultModal: React.FC<TestResultModalProps> = ({
  visible,
  onCancel,
  provider,
  testResult,
  loading,
}) => {
  // 本地存储的测试历史（每个供应商最多保存10条）
  const [testHistory, setTestHistory] = useState<TestHistory[]>([]);

  // 从 localStorage 加载测试历史
  useEffect(() => {
    if (provider?.id && visible) {
      const storageKey = `test-history-${provider.id}`;
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        try {
          setTestHistory(JSON.parse(stored));
        } catch (error) {
          console.error('Failed to parse test history:', error);
        }
      }
    }
  }, [provider?.id, visible]);

  // 保存新的测试结果到历史
  useEffect(() => {
    if (testResult && provider?.id && !loading) {
      const newHistoryItem: TestHistory = {
        ...testResult,
        id: `test-${Date.now()}`,
        testedAt: new Date().toISOString(),
        timestamp: new Date().toISOString(),
      };

      const storageKey = `test-history-${provider.id}`;
      const newHistory = [newHistoryItem, ...testHistory].slice(0, 10); // 最多保存10条
      setTestHistory(newHistory);
      localStorage.setItem(storageKey, JSON.stringify(newHistory));
    }
  }, [testResult, provider?.id, loading]);

  if (!provider) return null;

  return (
    <Modal
      title={`测试连接 - ${provider.name}`}
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={700}
      destroyOnClose
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Spin size="large" tip="正在测试连接..." />
        </div>
      ) : testResult ? (
        <>
          {/* 测试结果概览 */}
          <Result
            status={testResult.success ? 'success' : 'error'}
            title={testResult.success ? '连接测试成功' : '连接测试失败'}
            subTitle={testResult.message || (testResult.success ? '代理服务器响应正常' : '请检查配置或网络')}
            icon={
              testResult.success ? (
                <CheckCircleOutlined style={{ color: SEMANTIC.success.main }} />
              ) : (
                <CloseCircleOutlined style={{ color: SEMANTIC.error.main }} />
              )
            }
          />

          {/* 详细信息 */}
          <Descriptions bordered size="small" column={2} style={{ marginTop: 16 }}>
            <Descriptions.Item label="测试状态" span={2}>
              <Tag color={testResult.success ? 'success' : 'error'} icon={testResult.success ? <CheckCircleOutlined /> : <CloseCircleOutlined />}>
                {testResult.success ? '成功' : '失败'}
              </Tag>
            </Descriptions.Item>

            <Descriptions.Item label="供应商类型">
              <Tag color="blue">{provider.type.toUpperCase()}</Tag>
            </Descriptions.Item>

            <Descriptions.Item label="测试时间">
              <ClockCircleOutlined style={{ marginRight: 4 }} />
              {testResult.timestamp ? new Date(testResult.timestamp).toLocaleString('zh-CN') : new Date().toLocaleString('zh-CN')}
            </Descriptions.Item>

            {testResult.proxyIp && (
              <Descriptions.Item label="代理 IP" span={2}>
                <GlobalOutlined style={{ marginRight: 4 }} />
                {testResult.proxyIp}
              </Descriptions.Item>
            )}

            {testResult.proxyCount !== undefined && (
              <Descriptions.Item label="可用代理数">
                {testResult.proxyCount}
              </Descriptions.Item>
            )}

            {testResult.responseTime !== undefined && (
              <Descriptions.Item label="响应时间">
                <ThunderboltOutlined style={{ marginRight: 4 }} />
                {testResult.responseTime} ms
              </Descriptions.Item>
            )}

            {testResult.duration !== undefined && (
              <Descriptions.Item label="测试耗时">
                <ClockCircleOutlined style={{ marginRight: 4 }} />
                {testResult.duration} ms
              </Descriptions.Item>
            )}

            {testResult.error && (
              <Descriptions.Item label="错误详情" span={2}>
                <Alert
                  message="错误信息"
                  description={testResult.error}
                  type="error"
                  showIcon
                  style={{ marginTop: 8 }}
                />
              </Descriptions.Item>
            )}
          </Descriptions>

          {/* 测试历史 */}
          {testHistory.length > 1 && (
            <div style={{ marginTop: 24 }}>
              <h4 style={{ marginBottom: 16 }}>最近测试记录 ({testHistory.length - 1} 条历史)</h4>
              <Timeline
                items={testHistory.slice(1).map((item, index) => ({
                  color: item.success ? 'green' : 'red',
                  dot: item.success ? <CheckCircleOutlined /> : <CloseCircleOutlined />,
                  children: (
                    <div>
                      <div style={{ marginBottom: 4 }}>
                        <Tag color={item.success ? 'success' : 'error'}>{item.success ? '成功' : '失败'}</Tag>
                        <span style={{ color: NEUTRAL_LIGHT.text.tertiary, fontSize: 12 }}>
                          {new Date(item.testedAt).toLocaleString('zh-CN')}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: NEUTRAL_LIGHT.text.secondary }}>{item.message}</div>
                      {item.proxyIp && (
                        <div style={{ fontSize: 12, color: NEUTRAL_LIGHT.text.tertiary, marginTop: 4 }}>
                          IP: {item.proxyIp}
                        </div>
                      )}
                    </div>
                  ),
                }))}
              />
            </div>
          )}
        </>
      ) : (
        <Empty description="暂无测试结果" />
      )}
    </Modal>
  );
};

export default TestResultModal;
