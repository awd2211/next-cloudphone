import React, { useMemo } from 'react';
import { Card, Radio, Space, Typography, Descriptions, Alert } from 'antd';
import { CloudServerOutlined, ThunderboltOutlined, DatabaseOutlined } from '@ant-design/icons';
import { PRIMARY } from '@/theme';

const { Text } = Typography;

/**
 * 华为云手机规格定义
 *
 * 规格映射关系:
 * - 小型: cloudphone.rx1.2xlarge (2核4G)
 * - 中型: cloudphone.rx1.4xlarge (4核8G)
 * - 大型: cloudphone.rx1.8xlarge (8核16G)
 */
export interface HuaweiSpec {
  id: string; // 规格 ID (后端 specId)
  name: string; // 显示名称
  cpuCores: number; // CPU 核心数
  memoryMB: number; // 内存 (MB)
  storageMB: number; // 存储 (MB)
  description: string; // 描述
  recommended?: boolean; // 是否推荐
}

// 华为云手机规格列表
const HUAWEI_SPECS: HuaweiSpec[] = [
  {
    id: 'cloudphone.rx1.2xlarge',
    name: '小型 (2核4G)',
    cpuCores: 2,
    memoryMB: 4096,
    storageMB: 16000,
    description: '适合轻量应用和测试环境',
    recommended: false,
  },
  {
    id: 'cloudphone.rx1.4xlarge',
    name: '中型 (4核8G)',
    cpuCores: 4,
    memoryMB: 8192,
    storageMB: 32000,
    description: '适合日常使用和中等负载',
    recommended: true,
  },
  {
    id: 'cloudphone.rx1.8xlarge',
    name: '大型 (8核16G)',
    cpuCores: 8,
    memoryMB: 16384,
    storageMB: 64000,
    description: '适合高性能应用和重度游戏',
    recommended: false,
  },
];

interface HuaweiSpecSelectorProps {
  value?: string; // 当前选中的规格 ID
  onChange?: (specId: string, spec: HuaweiSpec) => void; // 规格变更回调
  disabled?: boolean;
}

/**
 * 华为云手机规格选择器
 *
 * 使用场景: 设备创建流程中选择华为云手机规格
 *
 * @example
 * ```tsx
 * <HuaweiSpecSelector
 *   value={selectedSpecId}
 *   onChange={(specId, spec) => {
 *     setSelectedSpecId(specId);
 *     form.setFieldsValue({
 *       cpuCores: spec.cpuCores,
 *       memoryMB: spec.memoryMB,
 *     });
 *   }}
 * />
 * ```
 */
export const HuaweiSpecSelector: React.FC<HuaweiSpecSelectorProps> = React.memo(
  ({ value, onChange, disabled = false }) => {
    // 获取当前选中的规格详情
    const selectedSpec = useMemo(() => {
      return HUAWEI_SPECS.find((spec) => spec.id === value);
    }, [value]);

    // 处理规格变更
    const handleChange = (specId: string) => {
      const spec = HUAWEI_SPECS.find((s) => s.id === specId);
      if (spec && onChange) {
        onChange(specId, spec);
      }
    };

    return (
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* 提示信息 */}
        <Alert
          message="选择云手机规格"
          description="不同规格的云手机性能和价格不同,请根据实际需求选择。规格确定后不可更改。"
          type="info"
          showIcon
        />

        {/* 规格选择卡片组 */}
        <Radio.Group
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          disabled={disabled}
          style={{ width: '100%' }}
        >
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            {HUAWEI_SPECS.map((spec) => (
              <Radio key={spec.id} value={spec.id} style={{ width: '100%' }}>
                <Card
                  hoverable={!disabled}
                  style={{
                    marginLeft: '30px',
                    borderColor: value === spec.id ? PRIMARY.main : undefined,
                    borderWidth: value === spec.id ? 2 : 1,
                  }}
                  bodyStyle={{ padding: '16px' }}
                >
                  <Space direction="vertical" size="small" style={{ width: '100%' }}>
                    {/* 规格名称 */}
                    <Space>
                      <Text strong style={{ fontSize: '16px' }}>
                        {spec.name}
                      </Text>
                      {spec.recommended && (
                        <Text type="success" style={{ fontSize: '12px' }}>
                          (推荐)
                        </Text>
                      )}
                    </Space>

                    {/* 规格描述 */}
                    <Text type="secondary" style={{ fontSize: '13px' }}>
                      {spec.description}
                    </Text>

                    {/* 规格详情 */}
                    <Descriptions size="small" column={3} style={{ marginTop: '8px' }}>
                      <Descriptions.Item
                        label={
                          <Space>
                            <ThunderboltOutlined />
                            <span>CPU</span>
                          </Space>
                        }
                      >
                        <Text strong>{spec.cpuCores} 核</Text>
                      </Descriptions.Item>
                      <Descriptions.Item
                        label={
                          <Space>
                            <DatabaseOutlined />
                            <span>内存</span>
                          </Space>
                        }
                      >
                        <Text strong>{spec.memoryMB / 1024} GB</Text>
                      </Descriptions.Item>
                      <Descriptions.Item
                        label={
                          <Space>
                            <CloudServerOutlined />
                            <span>存储</span>
                          </Space>
                        }
                      >
                        <Text strong>{(spec.storageMB / 1024).toFixed(1)} GB</Text>
                      </Descriptions.Item>
                    </Descriptions>

                    {/* 规格 ID */}
                    <Text type="secondary" style={{ fontSize: '11px' }}>
                      规格 ID: {spec.id}
                    </Text>
                  </Space>
                </Card>
              </Radio>
            ))}
          </Space>
        </Radio.Group>

        {/* 显示当前选中的规格摘要 */}
        {selectedSpec && (
          <Alert
            message="已选择规格"
            description={
              <Space direction="vertical" size="small">
                <Text>
                  <Text strong>{selectedSpec.name}</Text> - {selectedSpec.cpuCores}核{' '}
                  {selectedSpec.memoryMB / 1024}GB内存 {(selectedSpec.storageMB / 1024).toFixed(1)}GB存储
                </Text>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  规格ID: {selectedSpec.id}
                </Text>
              </Space>
            }
            type="success"
            showIcon
          />
        )}
      </Space>
    );
  }
);

HuaweiSpecSelector.displayName = 'HuaweiSpecSelector';

// 导出规格列表供其他组件使用
export { HUAWEI_SPECS };
