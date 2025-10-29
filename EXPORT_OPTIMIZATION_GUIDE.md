# 导出功能优化指南

本文档提供导出功能的优化技巧和最佳实践。

---

## 📊 当前导出实现

### 已实现的导出格式

在 [Device/List.tsx](frontend/admin/src/pages/Device/List.tsx) 中：

```typescript
// ✅ 已优化：使用 useMemo 缓存导出数据
const exportData = useMemo(() =>
  devices.map(device => ({
    '设备ID': device.id,
    '设备名称': device.name,
    '状态': statusMap[device.status].text,
    'Android版本': device.androidVersion,
    'CPU核心数': device.cpuCores,
    '内存': `${device.memoryMB}MB`,
    '存储': `${device.storageMB}MB`,
    'IP地址': device.ipAddress || '-',
    'ADB端口': device.adbPort || '-',
    '创建时间': dayjs(device.createdAt).format('YYYY-MM-DD HH:mm'),
  })),
  [devices, statusMap]
);

// ✅ 已优化：使用 useCallback 缓存导出函数
const handleExportExcel = useCallback(() => {
  exportToExcel(exportData, '设备列表');
  message.success('导出成功');
}, [exportData]);

const handleExportCSV = useCallback(() => {
  exportToCSV(exportData, '设备列表');
  message.success('导出成功');
}, [exportData]);

const handleExportJSON = useCallback(() => {
  const dataStr = JSON.stringify(exportData, null, 2);
  const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
  const exportFileDefaultName = `设备列表_${dayjs().format('YYYYMMDD_HHmmss')}.json`;

  const linkElement = document.createElement('a');
  linkElement.setAttribute('href', dataUri);
  linkElement.setAttribute('download', exportFileDefaultName);
  linkElement.click();

  message.success('导出成功');
}, [exportData]);
```

### 导出菜单

```typescript
// ✅ 已优化：使用 useMemo 缓存菜单配置
const exportMenuItems: MenuProps['items'] = useMemo(() => [
  { key: 'excel', label: '导出为 Excel', onClick: handleExportExcel },
  { key: 'csv', label: '导出为 CSV', onClick: handleExportCSV },
  { key: 'json', label: '导出为 JSON', onClick: handleExportJSON },
], [handleExportExcel, handleExportCSV, handleExportJSON]);
```

---

## 🚀 高级优化技巧

### 1. 大数据量导出优化

当数据量超过 10,000 条时，需要特殊处理：

```typescript
import { useCallback, useState } from 'react';
import { message } from 'antd';

// 分批导出大数据量
const useLargeDataExport = () => {
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);

  const exportLargeData = useCallback(async (
    fetchDataFn: (page: number, pageSize: number) => Promise<any[]>,
    totalCount: number,
    format: 'excel' | 'csv'
  ) => {
    setExporting(true);
    setProgress(0);

    const batchSize = 1000; // 每批1000条
    const totalBatches = Math.ceil(totalCount / batchSize);
    let allData: any[] = [];

    try {
      // 分批获取数据
      for (let i = 0; i < totalBatches; i++) {
        const batchData = await fetchDataFn(i + 1, batchSize);
        allData = [...allData, ...batchData];

        // 更新进度
        setProgress(Math.round(((i + 1) / totalBatches) * 100));

        // 避免阻塞UI
        await new Promise(resolve => setTimeout(resolve, 0));
      }

      // 导出数据
      if (format === 'excel') {
        await exportToExcel(allData, '设备列表_完整');
      } else {
        await exportToCSV(allData, '设备列表_完整');
      }

      message.success(`成功导出 ${allData.length} 条数据`);
    } catch (error) {
      message.error('导出失败');
      console.error('Export error:', error);
    } finally {
      setExporting(false);
      setProgress(0);
    }
  }, []);

  return { exportLargeData, exporting, progress };
};

// 使用示例
const DeviceList = () => {
  const { exportLargeData, exporting, progress } = useLargeDataExport();
  const { data } = useDevices();

  const handleExportAll = useCallback(async () => {
    const totalCount = data?.total || 0;

    if (totalCount > 10000) {
      Modal.confirm({
        title: '大数据量导出',
        content: `即将导出 ${totalCount} 条数据，可能需要一些时间，是否继续？`,
        onOk: async () => {
          await exportLargeData(
            (page, pageSize) => deviceService.getDevices({ page, pageSize }),
            totalCount,
            'excel'
          );
        },
      });
    } else {
      // 小数据量直接导出
      exportToExcel(devices, '设备列表');
    }
  }, [data, devices, exportLargeData]);

  return (
    <>
      <Button onClick={handleExportAll} loading={exporting}>
        导出全部 {exporting && `(${progress}%)`}
      </Button>

      {exporting && (
        <Progress percent={progress} status="active" />
      )}
    </>
  );
};
```

### 2. 流式导出（推荐用于超大数据）

使用 Web Streams API 实现真正的流式导出：

```typescript
// utils/streamExport.ts
export class StreamExporter {
  private writer: WritableStreamDefaultWriter<Uint8Array> | null = null;
  private encoder = new TextEncoder();

  async startCSVExport(filename: string) {
    // 创建可下载的流
    const fileStream = await this.createDownloadStream(filename);
    this.writer = fileStream.getWriter();

    // 写入 CSV 头部（带 BOM 以支持中文）
    await this.write('\ufeff');
  }

  async writeCSVRow(row: Record<string, any>) {
    if (!this.writer) throw new Error('Export not started');

    const csvRow = Object.values(row)
      .map(val => `"${String(val).replace(/"/g, '""')}"`)
      .join(',') + '\n';

    await this.write(csvRow);
  }

  async finish() {
    if (this.writer) {
      await this.writer.close();
      this.writer = null;
    }
  }

  private async write(data: string) {
    if (!this.writer) return;
    await this.writer.write(this.encoder.encode(data));
  }

  private async createDownloadStream(filename: string) {
    // 使用 Service Worker 创建可下载的流
    // 或使用 StreamSaver.js 库
    // 这里是简化版本
    const { readable, writable } = new TransformStream();

    // 触发下载
    const url = URL.createObjectURL(
      new Response(readable, {
        headers: { 'Content-Type': 'text/csv' }
      })
    );

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();

    return writable;
  }
}

// 使用流式导出
const useStreamExport = () => {
  const [exporting, setExporting] = useState(false);

  const exportWithStream = useCallback(async (
    fetchDataFn: (page: number) => Promise<any[]>,
    totalPages: number,
    headers: string[]
  ) => {
    setExporting(true);
    const exporter = new StreamExporter();

    try {
      await exporter.startCSVExport(`设备列表_${dayjs().format('YYYYMMDD')}.csv`);

      // 写入头部
      await exporter.writeCSVRow(
        headers.reduce((acc, h) => ({ ...acc, [h]: h }), {})
      );

      // 逐页获取并写入数据
      for (let page = 1; page <= totalPages; page++) {
        const data = await fetchDataFn(page);

        for (const item of data) {
          await exporter.writeCSVRow(item);
        }

        message.info(`已导出 ${page}/${totalPages} 页`);
      }

      await exporter.finish();
      message.success('导出完成');
    } catch (error) {
      message.error('导出失败');
      console.error(error);
    } finally {
      setExporting(false);
    }
  }, []);

  return { exportWithStream, exporting };
};
```

### 3. 后端导出（推荐用于生产环境）

对于大数据量，最好在后端生成文件：

```typescript
// Frontend
const useBackendExport = () => {
  const [exportTaskId, setExportTaskId] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');

  // 发起导出任务
  const startExport = useCallback(async (params: ExportParams) => {
    setStatus('pending');

    try {
      // 调用后端API创建导出任务
      const { taskId } = await deviceService.createExportTask(params);
      setExportTaskId(taskId);

      // 轮询任务状态
      const checkStatus = async () => {
        const task = await deviceService.getExportTask(taskId);

        if (task.status === 'completed') {
          setStatus('success');
          // 下载文件
          window.open(task.downloadUrl, '_blank');
          message.success('导出成功');
        } else if (task.status === 'failed') {
          setStatus('error');
          message.error('导出失败');
        } else {
          // 继续轮询
          setTimeout(checkStatus, 2000);
        }
      };

      checkStatus();
    } catch (error) {
      setStatus('error');
      message.error('创建导出任务失败');
    }
  }, []);

  return { startExport, status, exportTaskId };
};

// Backend (NestJS)
@Post('export')
async createExportTask(@Body() params: ExportParamsDto) {
  // 创建后台任务
  const taskId = uuid();

  // 使用 Bull Queue 处理导出
  await this.exportQueue.add('export-devices', {
    taskId,
    params,
  });

  return { taskId };
}

@Get('export/:taskId')
async getExportTaskStatus(@Param('taskId') taskId: string) {
  const task = await this.exportTaskRepository.findOne({ taskId });

  return {
    status: task.status,
    downloadUrl: task.status === 'completed' ? task.fileUrl : null,
    progress: task.progress,
  };
}

// Export Queue Processor
@Processor('export-devices')
export class ExportProcessor {
  @Process('export-devices')
  async handleExport(job: Job) {
    const { taskId, params } = job.data;

    try {
      // 分批查询数据
      const batchSize = 1000;
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('设备列表');

      // 写入头部
      worksheet.columns = [
        { header: '设备ID', key: 'id', width: 20 },
        { header: '设备名称', key: 'name', width: 30 },
        // ... more columns
      ];

      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const { data, total } = await this.deviceService.getDevices({
          page,
          pageSize: batchSize,
          ...params,
        });

        // 写入数据
        data.forEach(device => {
          worksheet.addRow(device);
        });

        // 更新进度
        await job.progress(Math.min((page * batchSize / total) * 100, 100));

        hasMore = page * batchSize < total;
        page++;
      }

      // 保存到 MinIO/S3
      const buffer = await workbook.xlsx.writeBuffer();
      const filename = `export_${taskId}.xlsx`;
      const fileUrl = await this.storageService.upload(filename, buffer);

      // 更新任务状态
      await this.exportTaskRepository.update(
        { taskId },
        { status: 'completed', fileUrl }
      );

    } catch (error) {
      await this.exportTaskRepository.update(
        { taskId },
        { status: 'failed', error: error.message }
      );
      throw error;
    }
  }
}
```

### 4. 导出进度UI组件

```typescript
// components/ExportProgress.tsx
interface ExportProgressProps {
  visible: boolean;
  progress: number;
  status: 'pending' | 'success' | 'error';
  onCancel?: () => void;
}

const ExportProgress: React.FC<ExportProgressProps> = ({
  visible,
  progress,
  status,
  onCancel,
}) => {
  return (
    <Modal
      open={visible}
      title="导出进度"
      footer={null}
      closable={status !== 'pending'}
      onCancel={onCancel}
    >
      <Space direction="vertical" style={{ width: '100%' }}>
        <Progress
          percent={progress}
          status={
            status === 'pending' ? 'active' :
            status === 'success' ? 'success' : 'exception'
          }
        />

        {status === 'pending' && (
          <Typography.Text type="secondary">
            正在导出数据，请稍候...
          </Typography.Text>
        )}

        {status === 'success' && (
          <Alert
            message="导出成功"
            description="文件已开始下载"
            type="success"
            showIcon
          />
        )}

        {status === 'error' && (
          <Alert
            message="导出失败"
            description="请重试或联系管理员"
            type="error"
            showIcon
          />
        )}
      </Space>
    </Modal>
  );
};
```

---

## 🎨 导出格式优化

### Excel 高级功能

```typescript
import ExcelJS from 'exceljs';

export const exportToExcelAdvanced = async (
  data: any[],
  filename: string
) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('设备列表');

  // 设置列
  worksheet.columns = [
    { header: '设备ID', key: 'id', width: 20 },
    { header: '设备名称', key: 'name', width: 30 },
    { header: '状态', key: 'status', width: 15 },
    { header: 'CPU核心数', key: 'cpuCores', width: 15 },
    { header: '内存(MB)', key: 'memoryMB', width: 15 },
  ];

  // 样式化头部
  worksheet.getRow(1).font = { bold: true, size: 12 };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' },
  };
  worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

  // 添加数据
  data.forEach(item => {
    const row = worksheet.addRow(item);

    // 根据状态设置行颜色
    if (item.status === 'error') {
      row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFC7CE' },
      };
    } else if (item.status === 'running') {
      row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFC6EFCE' },
      };
    }
  });

  // 添加筛选器
  worksheet.autoFilter = {
    from: 'A1',
    to: `E${data.length + 1}`,
  };

  // 冻结首行
  worksheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];

  // 添加统计行
  const summaryRow = worksheet.addRow({
    id: '',
    name: '总计',
    status: '',
    cpuCores: data.reduce((sum, item) => sum + item.cpuCores, 0),
    memoryMB: data.reduce((sum, item) => sum + item.memoryMB, 0),
  });
  summaryRow.font = { bold: true };

  // 生成并下载
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}_${dayjs().format('YYYYMMDD_HHmmss')}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
};
```

### PDF 导出

```typescript
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const exportToPDF = (data: any[], filename: string) => {
  const doc = new jsPDF();

  // 添加中文字体支持
  // doc.addFont('path/to/chinese-font.ttf', 'chinese', 'normal');
  // doc.setFont('chinese');

  // 标题
  doc.setFontSize(16);
  doc.text('设备列表', 14, 15);

  // 添加表格
  autoTable(doc, {
    head: [['设备ID', '设备名称', '状态', 'CPU', '内存']],
    body: data.map(item => [
      item.id,
      item.name,
      item.status,
      item.cpuCores,
      `${item.memoryMB}MB`,
    ]),
    startY: 20,
    styles: {
      font: 'chinese',
      fontSize: 10,
    },
    headStyles: {
      fillColor: [68, 114, 196],
      textColor: 255,
    },
  });

  // 保存
  doc.save(`${filename}_${dayjs().format('YYYYMMDD')}.pdf`);
};
```

---

## 📈 性能对比

| 方案 | 数据量 | 性能 | 用户体验 | 服务器负载 |
|------|--------|------|---------|-----------|
| 前端直接导出 | < 1,000 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐ |
| 分批前端导出 | < 10,000 | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| 流式导出 | < 50,000 | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ |
| 后端导出 | 无限制 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |

---

## 🔧 推荐方案

### 小数据量（< 1,000条）
✅ **当前实现已足够**
- 使用 useMemo 缓存数据
- 使用 useCallback 缓存函数
- 前端直接导出

### 中等数据量（1,000 - 10,000条）
✅ **使用分批导出**
- 显示进度条
- 分批获取数据
- 前端合并后导出

### 大数据量（> 10,000条）
✅ **使用后端导出**
- 创建后台任务
- 使用消息队列
- 提供下载链接

---

## 📚 相关资源

- [ExcelJS 文档](https://github.com/exceljs/exceljs)
- [jsPDF 文档](https://github.com/parallax/jsPDF)
- [StreamSaver.js](https://github.com/jimmywarting/StreamSaver.js)
- [Web Streams API](https://developer.mozilla.org/en-US/docs/Web/API/Streams_API)

---

**最后更新**: 2025-10-29
**版本**: 1.0.0
