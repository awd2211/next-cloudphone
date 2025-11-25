/**
 * 代理供应商配置导入导出对话框
 *
 * 功能：
 * - 支持 JSON 和 Excel 格式
 * - 导入前预览和验证
 * - 批量导出配置用于备份
 * - 错误检测和提示
 */

import React, { useState, useMemo } from 'react';
import {
  Modal,
  Tabs,
  Upload,
  Button,
  Table,
  Alert,
  Space,
  Tag,
  message,
  Radio,
  Descriptions,
  Divider,
} from 'antd';
import {
  UploadOutlined,
  DownloadOutlined,
  FileExcelOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import type { UploadFile } from 'antd';
import type { ProxyProvider } from '@/hooks/queries/useProxy';
import type { ColumnsType } from 'antd/es/table';

const { TabPane } = Tabs;

interface ImportExportModalProps {
  visible: boolean;
  onCancel: () => void;
  providers: ProxyProvider[];
  onImport: (providers: Partial<ProxyProvider>[]) => Promise<void>;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

interface ImportPreviewItem extends Partial<ProxyProvider> {
  _validation: ValidationResult;
  _index: number;
}

const ImportExportModal: React.FC<ImportExportModalProps> = ({
  visible,
  onCancel,
  providers,
  onImport,
}) => {
  const [activeTab, setActiveTab] = useState<'import' | 'export'>('import');
  const [importFormat, setImportFormat] = useState<'json' | 'excel'>('json');
  const [exportFormat, setExportFormat] = useState<'json' | 'excel'>('json');
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [previewData, setPreviewData] = useState<ImportPreviewItem[]>([]);
  const [importing, setImporting] = useState(false);

  // 验证单个供应商配置
  const validateProvider = (provider: Partial<ProxyProvider>, index: number): ValidationResult => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 必填字段检查
    if (!provider.name || provider.name.trim() === '') {
      errors.push('供应商名称不能为空');
    }
    if (!provider.type) {
      errors.push('供应商类型不能为空');
    }
    if (!provider.config || typeof provider.config !== 'object') {
      errors.push('配置信息不能为空');
    }

    // 类型检查
    const validTypes = ['ipidea', 'kookeey', 'brightdata', 'oxylabs', 'iproyal', 'smartproxy'];
    if (provider.type && !validTypes.includes(provider.type)) {
      errors.push(`无效的供应商类型: ${provider.type}`);
    }

    // 配置字段检查（基础字段）
    if (provider.config) {
      const config = provider.config as any;

      // 通用字段检查
      if (!config.gateway || typeof config.gateway !== 'string') {
        errors.push('网关地址不能为空');
      } else {
        // 验证网关格式（基本的 host:port 格式）
        const gatewayPattern = /^.+:\d+$/;
        if (!gatewayPattern.test(config.gateway)) {
          warnings.push('网关地址格式可能不正确，应为 host:port 格式');
        }
      }

      // 针对不同类型的特定检查
      if (provider.type === 'ipidea') {
        if (!config.username) warnings.push('IPIDEA 供应商建议设置用户名');
        if (!config.password) warnings.push('IPIDEA 供应商建议设置密码');
      } else if (provider.type === 'kookeey') {
        if (!config.apiKey) errors.push('Kookeey 供应商必须设置 API Key');
      }
    }

    // 检查名称重复
    const existingProvider = providers.find(p =>
      p.name.toLowerCase() === provider.name?.toLowerCase()
    );
    if (existingProvider) {
      warnings.push(`存在同名供应商，导入后将创建新的配置`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  };

  // 解析 JSON 文件
  const parseJsonFile = async (file: File): Promise<Partial<ProxyProvider>[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const data = JSON.parse(content);

          // 支持单个对象或对象数组
          const providers = Array.isArray(data) ? data : [data];
          resolve(providers);
        } catch (error) {
          reject(new Error('JSON 格式错误：' + (error as Error).message));
        }
      };
      reader.onerror = () => reject(new Error('文件读取失败'));
      reader.readAsText(file);
    });
  };

  // 解析 Excel 文件（简化实现，实际应使用 xlsx 库）
  const parseExcelFile = async (file: File): Promise<Partial<ProxyProvider>[]> => {
    // 注意：这里需要安装 xlsx 库
    // pnpm add xlsx
    // import * as XLSX from 'xlsx';

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          // 这里是简化的实现示例
          // 实际使用时需要导入 XLSX 库并正确解析
          reject(new Error('Excel 导入功能需要安装 xlsx 库，请先运行: pnpm add xlsx'));

          // 完整实现示例（需要 xlsx 库）：
          /*
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(firstSheet);

          const providers = jsonData.map((row: any) => ({
            name: row['名称'],
            type: row['类型']?.toLowerCase(),
            enabled: row['启用'] === '是' || row['启用'] === true,
            config: {
              gateway: row['网关地址'],
              username: row['用户名'],
              password: row['密码'],
              // ... 其他配置字段
            },
          }));

          resolve(providers);
          */
        } catch (error) {
          reject(new Error('Excel 解析失败：' + (error as Error).message));
        }
      };
      reader.onerror = () => reject(new Error('文件读取失败'));
      reader.readAsArrayBuffer(file);
    });
  };

  // 处理文件上传
  const handleFileUpload = async (file: File) => {
    try {
      let providers: Partial<ProxyProvider>[];

      if (importFormat === 'json') {
        providers = await parseJsonFile(file);
      } else {
        providers = await parseExcelFile(file);
      }

      // 验证每个供应商配置
      const previewItems: ImportPreviewItem[] = providers.map((provider, index) => ({
        ...provider,
        _validation: validateProvider(provider, index),
        _index: index,
      }));

      setPreviewData(previewItems);
      message.success(`已解析 ${providers.length} 个供应商配置`);
    } catch (error) {
      message.error((error as Error).message);
      setPreviewData([]);
    }

    return false; // 阻止自动上传
  };

  // 执行导入
  const handleImport = async () => {
    const validProviders = previewData.filter(item => item._validation.valid);

    if (validProviders.length === 0) {
      message.error('没有有效的配置可以导入');
      return;
    }

    // 移除验证字段
    const providersToImport = validProviders.map(({ _validation, _index, ...provider }) => provider);

    try {
      setImporting(true);
      await onImport(providersToImport);
      message.success(`成功导入 ${validProviders.length} 个供应商配置`);
      handleClose();
    } catch (error) {
      message.error('导入失败：' + (error as Error).message);
    } finally {
      setImporting(false);
    }
  };

  // 导出为 JSON
  const handleExportJson = () => {
    const dataStr = JSON.stringify(providers, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `proxy-providers-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    message.success(`已导出 ${providers.length} 个供应商配置`);
  };

  // 导出为 Excel
  const handleExportExcel = () => {
    // 注意：这里需要安装 xlsx 库
    message.warning('Excel 导出功能需要安装 xlsx 库，请先运行: pnpm add xlsx');

    // 完整实现示例（需要 xlsx 库）：
    /*
    import * as XLSX from 'xlsx';

    const worksheet = XLSX.utils.json_to_sheet(
      providers.map(p => ({
        '名称': p.name,
        '类型': p.type.toUpperCase(),
        '启用': p.enabled ? '是' : '否',
        '网关地址': p.config?.gateway,
        '用户名': p.config?.username || '',
        '密码': p.config?.password || '',
        '成功率': p.successRate ? `${p.successRate}%` : '0%',
        '最后测试': p.lastTestedAt ? new Date(p.lastTestedAt).toLocaleString('zh-CN') : '-',
      }))
    );

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '代理供应商');
    XLSX.writeFile(workbook, `proxy-providers-${new Date().toISOString().split('T')[0]}.xlsx`);
    message.success(`已导出 ${providers.length} 个供应商配置`);
    */
  };

  // 关闭对话框
  const handleClose = () => {
    setFileList([]);
    setPreviewData([]);
    setActiveTab('import');
    onCancel();
  };

  // 预览表格列定义
  const previewColumns: ColumnsType<ImportPreviewItem> = [
    {
      title: '序号',
      dataIndex: '_index',
      width: 60,
      render: (index) => index + 1,
    },
    {
      title: '名称',
      dataIndex: 'name',
      width: 150,
    },
    {
      title: '类型',
      dataIndex: 'type',
      width: 100,
      render: (type) => type ? <Tag color="blue">{type.toUpperCase()}</Tag> : '-',
    },
    {
      title: '网关地址',
      dataIndex: ['config', 'gateway'],
      width: 200,
      ellipsis: true,
    },
    {
      title: '验证状态',
      dataIndex: '_validation',
      width: 120,
      render: (validation: ValidationResult) => {
        if (validation.valid && validation.warnings.length === 0) {
          return <Tag icon={<CheckCircleOutlined />} color="success">有效</Tag>;
        } else if (validation.valid && validation.warnings.length > 0) {
          return <Tag icon={<WarningOutlined />} color="warning">有警告</Tag>;
        } else {
          return <Tag icon={<CloseCircleOutlined />} color="error">无效</Tag>;
        }
      },
    },
  ];

  // 统计信息
  const statistics = useMemo(() => {
    const valid = previewData.filter(item => item._validation.valid).length;
    const warnings = previewData.filter(item =>
      item._validation.valid && item._validation.warnings.length > 0
    ).length;
    const errors = previewData.filter(item => !item._validation.valid).length;

    return { valid, warnings, errors, total: previewData.length };
  }, [previewData]);

  // 展开行渲染（显示验证详情）
  const expandedRowRender = (record: ImportPreviewItem) => {
    const { _validation } = record;

    return (
      <div style={{ padding: '12px 24px' }}>
        {_validation.errors.length > 0 && (
          <Alert
            message="错误"
            description={
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {_validation.errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            }
            type="error"
            showIcon
            style={{ marginBottom: 8 }}
          />
        )}

        {_validation.warnings.length > 0 && (
          <Alert
            message="警告"
            description={
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {_validation.warnings.map((warning, index) => (
                  <li key={index}>{warning}</li>
                ))}
              </ul>
            }
            type="warning"
            showIcon
            style={{ marginBottom: 8 }}
          />
        )}

        {_validation.valid && _validation.warnings.length === 0 && (
          <Alert
            message="配置有效，可以导入"
            type="success"
            showIcon
          />
        )}

        <Divider style={{ margin: '12px 0' }} />

        <Descriptions size="small" column={2}>
          <Descriptions.Item label="名称">{record.name}</Descriptions.Item>
          <Descriptions.Item label="类型">{record.type?.toUpperCase()}</Descriptions.Item>
          <Descriptions.Item label="启用">
            {record.enabled !== undefined ? (record.enabled ? '是' : '否') : '否'}
          </Descriptions.Item>
          <Descriptions.Item label="网关">{record.config?.gateway || '-'}</Descriptions.Item>
        </Descriptions>
      </div>
    );
  };

  return (
    <Modal
      title="导入/导出配置"
      open={visible}
      onCancel={handleClose}
      width={900}
      footer={null}
      destroyOnClose
    >
      <Tabs activeKey={activeTab} onChange={(key) => setActiveTab(key as 'import' | 'export')}>
        {/* 导入选项卡 */}
        <TabPane tab="导入配置" key="import">
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            {/* 格式选择 */}
            <div>
              <div style={{ marginBottom: 8, fontWeight: 500 }}>选择导入格式：</div>
              <Radio.Group value={importFormat} onChange={(e) => setImportFormat(e.target.value)}>
                <Radio.Button value="json">
                  <FileTextOutlined /> JSON 格式
                </Radio.Button>
                <Radio.Button value="excel" disabled>
                  <FileExcelOutlined /> Excel 格式 (需要安装 xlsx)
                </Radio.Button>
              </Radio.Group>
            </div>

            {/* 文件上传 */}
            <div>
              <Upload
                fileList={fileList}
                beforeUpload={(file) => {
                  setFileList([file]);
                  handleFileUpload(file);
                  return false;
                }}
                onRemove={() => {
                  setFileList([]);
                  setPreviewData([]);
                }}
                accept={importFormat === 'json' ? '.json' : '.xlsx,.xls'}
                maxCount={1}
              >
                <Button icon={<UploadOutlined />}>选择文件</Button>
              </Upload>

              <Alert
                message="导入说明"
                description={
                  <ul style={{ margin: '8px 0 0 0', paddingLeft: 20 }}>
                    <li>JSON 格式：直接导出的配置文件，包含完整字段</li>
                    <li>Excel 格式：表格形式，适合批量编辑（需要安装 xlsx 库）</li>
                    <li>导入前会进行验证，只有有效的配置才会被导入</li>
                    <li>同名配置将创建新的供应商，不会覆盖现有配置</li>
                  </ul>
                }
                type="info"
                showIcon
                style={{ marginTop: 12 }}
              />
            </div>

            {/* 预览表格 */}
            {previewData.length > 0 && (
              <>
                <div>
                  <div style={{ marginBottom: 12 }}>
                    <Space size="large">
                      <Statistic
                        title="总计"
                        value={statistics.total}
                        prefix={<FileTextOutlined />}
                      />
                      <Statistic
                        title="有效"
                        value={statistics.valid}
                        valueStyle={{ color: '#52c41a' }}
                        prefix={<CheckCircleOutlined />}
                      />
                      {statistics.warnings > 0 && (
                        <Statistic
                          title="警告"
                          value={statistics.warnings}
                          valueStyle={{ color: '#faad14' }}
                          prefix={<WarningOutlined />}
                        />
                      )}
                      {statistics.errors > 0 && (
                        <Statistic
                          title="错误"
                          value={statistics.errors}
                          valueStyle={{ color: '#ff4d4f' }}
                          prefix={<CloseCircleOutlined />}
                        />
                      )}
                    </Space>
                  </div>
                </div>

                <Table
                  columns={previewColumns}
                  dataSource={previewData}
                  rowKey="_index"
                  pagination={false}
                  scroll={{ y: 300 }}
                  expandable={{
                    expandedRowRender,
                    rowExpandable: (record) => true,
                  }}
                />

                <div style={{ textAlign: 'right' }}>
                  <Space>
                    <Button onClick={handleClose}>取消</Button>
                    <Button
                      type="primary"
                      onClick={handleImport}
                      loading={importing}
                      disabled={statistics.valid === 0}
                    >
                      导入 {statistics.valid} 个有效配置
                    </Button>
                  </Space>
                </div>
              </>
            )}
          </Space>
        </TabPane>

        {/* 导出选项卡 */}
        <TabPane tab="导出配置" key="export">
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            {/* 格式选择 */}
            <div>
              <div style={{ marginBottom: 8, fontWeight: 500 }}>选择导出格式：</div>
              <Radio.Group value={exportFormat} onChange={(e) => setExportFormat(e.target.value)}>
                <Radio.Button value="json">
                  <FileTextOutlined /> JSON 格式
                </Radio.Button>
                <Radio.Button value="excel">
                  <FileExcelOutlined /> Excel 格式 (需要安装 xlsx)
                </Radio.Button>
              </Radio.Group>
            </div>

            {/* 导出信息 */}
            <Alert
              message="导出说明"
              description={
                <ul style={{ margin: '8px 0 0 0', paddingLeft: 20 }}>
                  <li>将导出 <strong>{providers.length}</strong> 个供应商配置</li>
                  <li>JSON 格式：包含完整配置信息，可直接用于导入</li>
                  <li>Excel 格式：表格形式，方便查看和编辑（需要安装 xlsx 库）</li>
                  <li>导出的文件可用于备份或迁移配置</li>
                </ul>
              }
              type="info"
              showIcon
            />

            {/* 导出按钮 */}
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              {exportFormat === 'json' ? (
                <Button
                  type="primary"
                  size="large"
                  icon={<DownloadOutlined />}
                  onClick={handleExportJson}
                >
                  导出为 JSON 文件
                </Button>
              ) : (
                <Button
                  type="primary"
                  size="large"
                  icon={<DownloadOutlined />}
                  onClick={handleExportExcel}
                  disabled
                >
                  导出为 Excel 文件 (需要 xlsx 库)
                </Button>
              )}
            </div>
          </Space>
        </TabPane>
      </Tabs>
    </Modal>
  );
};

export default ImportExportModal;
