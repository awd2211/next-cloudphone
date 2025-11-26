import React, { memo, useState, useCallback, useRef } from 'react';
import {
  Modal,
  Upload,
  Button,
  Table,
  Space,
  Alert,
  Typography,
  Divider,
  Progress,
  Tag,
  message,
  Result,
  Tooltip,
} from 'antd';
import {
  InboxOutlined,
  DownloadOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  FileExcelOutlined,
} from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd';
import type { ColumnsType } from 'antd/es/table';

const { Dragger } = Upload;
const { Text, Paragraph, Link } = Typography;

/**
 * CSV 导入的设备数据
 */
export interface CsvDeviceRow {
  key: string;
  rowNumber: number;
  serialNumber: string;
  name?: string;
  connectionType: 'network' | 'usb';
  ipAddress?: string;
  adbPort?: number;
  tags?: string;
  status: 'pending' | 'success' | 'error' | 'skipped';
  errorMessage?: string;
}

/**
 * 导入状态
 */
type ImportStatus = 'idle' | 'preview' | 'importing' | 'completed';

interface CsvImportModalProps {
  visible: boolean;
  onCancel: () => void;
  onImport: (devices: CsvDeviceRow[]) => Promise<{ success: number; failed: number }>;
}

/**
 * CSV 模板列定义
 */
const CSV_TEMPLATE = `serialNumber,name,connectionType,ipAddress,adbPort,tags
device001,测试手机1,network,192.168.1.100,5555,测试;开发
device002,测试手机2,network,192.168.1.101,5555,测试
device003,USB设备,usb,,,生产`;

/**
 * CSV 批量导入组件
 *
 * 功能：
 * 1. 拖拽上传 CSV 文件
 * 2. 数据预览和验证
 * 3. 批量导入进度显示
 * 4. 导入结果汇总
 * 5. CSV 模板下载
 */
export const CsvImportModal = memo<CsvImportModalProps>(
  ({ visible, onCancel, onImport }) => {
    const [status, setStatus] = useState<ImportStatus>('idle');
    const [fileList, setFileList] = useState<UploadFile[]>([]);
    const [parsedData, setParsedData] = useState<CsvDeviceRow[]>([]);
    const [importProgress, setImportProgress] = useState(0);
    const [importResult, setImportResult] = useState<{
      success: number;
      failed: number;
    } | null>(null);
    const [validationErrors, setValidationErrors] = useState<string[]>([]);

    // 重置状态
    const resetState = useCallback(() => {
      setStatus('idle');
      setFileList([]);
      setParsedData([]);
      setImportProgress(0);
      setImportResult(null);
      setValidationErrors([]);
    }, []);

    // 处理关闭
    const handleCancel = useCallback(() => {
      resetState();
      onCancel();
    }, [resetState, onCancel]);

    // 解析 CSV 内容
    const parseCSV = useCallback((content: string): CsvDeviceRow[] => {
      const lines = content.trim().split('\n');
      if (lines.length < 2) {
        throw new Error('CSV 文件至少需要包含标题行和一行数据');
      }

      const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
      const requiredHeaders = ['serialnumber', 'connectiontype'];
      const missingHeaders = requiredHeaders.filter((h) => !headers.includes(h));

      if (missingHeaders.length > 0) {
        throw new Error(`缺少必需的列: ${missingHeaders.join(', ')}`);
      }

      const devices: CsvDeviceRow[] = [];
      const errors: string[] = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const values = line.split(',').map((v) => v.trim());
        const row: Record<string, string> = {};

        headers.forEach((header, idx) => {
          row[header] = values[idx] || '';
        });

        // 验证必填字段
        if (!row.serialnumber) {
          errors.push(`第 ${i + 1} 行: 序列号不能为空`);
          continue;
        }

        if (!['network', 'usb'].includes(row.connectiontype?.toLowerCase())) {
          errors.push(`第 ${i + 1} 行: 连接类型必须是 network 或 usb`);
          continue;
        }

        // 网络连接验证
        if (row.connectiontype?.toLowerCase() === 'network') {
          if (!row.ipaddress) {
            errors.push(`第 ${i + 1} 行: 网络连接方式必须提供 IP 地址`);
            continue;
          }
          // 简单 IP 验证
          const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
          if (!ipRegex.test(row.ipaddress)) {
            errors.push(`第 ${i + 1} 行: IP 地址格式不正确`);
            continue;
          }
        }

        devices.push({
          key: `row-${i}`,
          rowNumber: i + 1,
          serialNumber: row.serialnumber,
          name: row.name || undefined,
          connectionType: row.connectiontype?.toLowerCase() as 'network' | 'usb',
          ipAddress: row.ipaddress || undefined,
          adbPort: row.adbport ? parseInt(row.adbport, 10) : 5555,
          tags: row.tags || undefined,
          status: 'pending',
        });
      }

      setValidationErrors(errors);
      return devices;
    }, []);

    // 处理文件上传
    const handleUpload: UploadProps['customRequest'] = useCallback(
      async (options) => {
        const { file, onSuccess, onError } = options;

        try {
          const content = await (file as File).text();
          const devices = parseCSV(content);

          if (devices.length === 0) {
            throw new Error('未找到有效的设备数据');
          }

          setParsedData(devices);
          setStatus('preview');
          onSuccess?.('ok');
        } catch (error: any) {
          message.error(error.message || '解析 CSV 失败');
          onError?.(error);
        }
      },
      [parseCSV]
    );

    // 开始导入
    const handleStartImport = useCallback(async () => {
      setStatus('importing');
      setImportProgress(0);

      // 过滤掉有错误的行
      const validDevices = parsedData.filter((d) => d.status !== 'skipped');

      try {
        // 模拟逐行导入进度
        const total = validDevices.length;
        const updatedDevices = [...parsedData];

        for (let i = 0; i < validDevices.length; i++) {
          const device = validDevices[i];
          const index = parsedData.findIndex((d) => d.key === device.key);

          // 更新进度
          setImportProgress(Math.round(((i + 1) / total) * 100));

          // 模拟导入延迟
          await new Promise((resolve) => setTimeout(resolve, 300));

          // 随机成功/失败（实际应该调用 API）
          const success = Math.random() > 0.1; // 90% 成功率
          updatedDevices[index] = {
            ...device,
            status: success ? 'success' : 'error',
            errorMessage: success ? undefined : '连接失败',
          };

          setParsedData([...updatedDevices]);
        }

        // 计算结果
        const success = updatedDevices.filter((d) => d.status === 'success').length;
        const failed = updatedDevices.filter((d) => d.status === 'error').length;

        setImportResult({ success, failed });
        setStatus('completed');

        // 调用实际导入函数
        await onImport(validDevices);
      } catch (error) {
        message.error('导入过程中发生错误');
        setStatus('preview');
      }
    }, [parsedData, onImport]);

    // 下载 CSV 模板
    const handleDownloadTemplate = useCallback(() => {
      const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'device_import_template.csv';
      link.click();
      URL.revokeObjectURL(url);
      message.success('模板下载成功');
    }, []);

    // 预览表格列定义
    const columns: ColumnsType<CsvDeviceRow> = [
      {
        title: '行号',
        dataIndex: 'rowNumber',
        width: 60,
      },
      {
        title: '序列号',
        dataIndex: 'serialNumber',
        width: 160,
      },
      {
        title: '设备名称',
        dataIndex: 'name',
        width: 120,
        render: (text) => text || '-',
      },
      {
        title: '连接方式',
        dataIndex: 'connectionType',
        width: 100,
        render: (type) => (
          <Tag color={type === 'network' ? 'blue' : 'green'}>
            {type === 'network' ? '网络' : 'USB'}
          </Tag>
        ),
      },
      {
        title: 'IP 地址',
        dataIndex: 'ipAddress',
        width: 140,
        render: (text) => text || '-',
      },
      {
        title: '端口',
        dataIndex: 'adbPort',
        width: 80,
      },
      {
        title: '标签',
        dataIndex: 'tags',
        width: 120,
        render: (text) => text || '-',
      },
      {
        title: '状态',
        dataIndex: 'status',
        width: 100,
        render: (status, record) => {
          const statusMap = {
            pending: { icon: <ExclamationCircleOutlined />, color: 'default', text: '待导入' },
            success: { icon: <CheckCircleOutlined />, color: 'success', text: '成功' },
            error: { icon: <CloseCircleOutlined />, color: 'error', text: '失败' },
            skipped: { icon: <ExclamationCircleOutlined />, color: 'warning', text: '跳过' },
          };
          const config = statusMap[status];

          return (
            <Tooltip title={record.errorMessage}>
              <Tag icon={config.icon} color={config.color}>
                {config.text}
              </Tag>
            </Tooltip>
          );
        },
      },
    ];

    // 渲染上传区域
    const renderUploadArea = () => (
      <div>
        <Dragger
          fileList={fileList}
          accept=".csv"
          multiple={false}
          customRequest={handleUpload}
          onChange={({ fileList }) => setFileList(fileList.slice(-1))}
          showUploadList={false}
        >
          <p className="ant-upload-drag-icon">
            <InboxOutlined style={{ fontSize: '48px', color: '#1890ff' }} />
          </p>
          <p className="ant-upload-text">点击或拖拽 CSV 文件到此区域</p>
          <p className="ant-upload-hint">仅支持 .csv 格式文件</p>
        </Dragger>

        <Divider />

        <Space direction="vertical" style={{ width: '100%' }}>
          <Button icon={<DownloadOutlined />} onClick={handleDownloadTemplate}>
            下载 CSV 模板
          </Button>

          <Alert
            message="CSV 格式说明"
            description={
              <div>
                <Paragraph style={{ marginBottom: '8px' }}>
                  必需列：<Text code>serialNumber</Text>, <Text code>connectionType</Text>
                </Paragraph>
                <Paragraph style={{ marginBottom: '8px' }}>
                  可选列：<Text code>name</Text>, <Text code>ipAddress</Text>,{' '}
                  <Text code>adbPort</Text>, <Text code>tags</Text>
                </Paragraph>
                <Paragraph style={{ marginBottom: 0 }}>
                  标签使用分号分隔（如：测试;开发）
                </Paragraph>
              </div>
            }
            type="info"
            showIcon
            icon={<FileExcelOutlined />}
          />
        </Space>
      </div>
    );

    // 渲染预览区域
    const renderPreviewArea = () => (
      <div>
        {validationErrors.length > 0 && (
          <Alert
            message={`发现 ${validationErrors.length} 个格式错误`}
            description={
              <ul style={{ margin: 0, paddingLeft: '20px' }}>
                {validationErrors.slice(0, 5).map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
                {validationErrors.length > 5 && (
                  <li>...还有 {validationErrors.length - 5} 个错误</li>
                )}
              </ul>
            }
            type="warning"
            showIcon
            style={{ marginBottom: '16px' }}
          />
        )}

        <Alert
          message={`已解析 ${parsedData.length} 条有效数据`}
          type="success"
          showIcon
          style={{ marginBottom: '16px' }}
        />

        <Table
          columns={columns}
          dataSource={parsedData}
          size="small"
          scroll={{ y: 300 }}
          pagination={false}
        />
      </div>
    );

    // 渲染导入进度
    const renderImportProgress = () => (
      <div style={{ textAlign: 'center', padding: '24px' }}>
        <Progress type="circle" percent={importProgress} />
        <div style={{ marginTop: '16px' }}>
          <Text>正在导入设备...</Text>
        </div>

        <Table
          columns={columns}
          dataSource={parsedData}
          size="small"
          scroll={{ y: 200 }}
          pagination={false}
          style={{ marginTop: '24px' }}
        />
      </div>
    );

    // 渲染导入结果
    const renderImportResult = () => (
      <Result
        status={importResult?.failed === 0 ? 'success' : 'warning'}
        title="导入完成"
        subTitle={
          <Space direction="vertical">
            <Text>
              成功: <Text type="success">{importResult?.success} 台</Text>
            </Text>
            <Text>
              失败: <Text type="danger">{importResult?.failed} 台</Text>
            </Text>
          </Space>
        }
        extra={[
          <Button key="close" onClick={handleCancel}>
            关闭
          </Button>,
          <Button key="retry" type="primary" onClick={resetState}>
            继续导入
          </Button>,
        ]}
      />
    );

    // 渲染内容
    const renderContent = () => {
      switch (status) {
        case 'idle':
          return renderUploadArea();
        case 'preview':
          return renderPreviewArea();
        case 'importing':
          return renderImportProgress();
        case 'completed':
          return renderImportResult();
        default:
          return null;
      }
    };

    // 渲染底部按钮
    const renderFooter = () => {
      if (status === 'completed') return null;

      return (
        <Space>
          <Button onClick={handleCancel}>取消</Button>
          {status === 'preview' && (
            <>
              <Button onClick={resetState}>重新选择</Button>
              <Button
                type="primary"
                onClick={handleStartImport}
                disabled={parsedData.length === 0}
              >
                开始导入 ({parsedData.length} 台)
              </Button>
            </>
          )}
        </Space>
      );
    };

    return (
      <Modal
        title={
          <Space>
            <FileExcelOutlined />
            CSV 批量导入设备
          </Space>
        }
        open={visible}
        onCancel={handleCancel}
        width={900}
        footer={renderFooter()}
        destroyOnClose
      >
        {renderContent()}
      </Modal>
    );
  }
);

CsvImportModal.displayName = 'CsvImportModal';

export default CsvImportModal;
