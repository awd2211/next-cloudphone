# 性能优化与功能增强计划

## 📋 项目概述

基于当前云手机平台的开发进度，本计划旨在全面提升系统性能、增强核心功能、提高代码质量和系统稳定性。

---

## 🎯 总体目标

- **性能优化**: 前端渲染 +50% 速度，后端查询 +60% 速度，WebSocket延迟 -30%
- **功能增强**: 新增 4 大核心功能模块
- **质量提升**: 错误率 <0.1%，日志覆盖率 100%

---

## 📊 实施计划

### 阶段一: 性能优化 (预计 8-10 小时)

#### 1.1 前端渲染优化 ⭐ (2-3小时)

**目标**: 提升首屏加载速度 50%，列表渲染性能 60%

**具体任务**:

1. **React 性能优化**
   - [ ] 为大型列表组件添加 `React.memo`
   - [ ] 使用 `useMemo` 缓存复杂计算
   - [ ] 使用 `useCallback` 避免函数重复创建
   - [ ] 虚拟滚动优化长列表 (react-window)

   **优化文件清单**:
   ```
   - QuotaList.tsx - 添加 React.memo
   - TicketList.tsx - 虚拟滚动
   - TransactionHistory.tsx - useMemo 缓存过滤
   - AuditLogList.tsx - 分页优化
   - ApiKeyList.tsx - useCallback 优化
   ```

2. **代码分割与懒加载**
   - [ ] 路由级别代码分割 (React.lazy)
   - [ ] ECharts 按需加载
   - [ ] 图片懒加载 (react-lazy-load-image)

   **示例代码**:
   ```typescript
   // 路由懒加载
   const QuotaList = lazy(() => import('@/pages/Quota/QuotaList'));
   const TicketList = lazy(() => import('@/pages/Ticket/TicketList'));

   // 使用 Suspense
   <Suspense fallback={<Loading />}>
     <QuotaList />
   </Suspense>
   ```

3. **打包优化**
   - [ ] Vite 生产构建优化
   - [ ] Tree-shaking 配置
   - [ ] Gzip/Brotli 压缩
   - [ ] CDN 资源优化

**预期效果**:
- 首屏加载时间: 3s → 1.5s
- 列表渲染: 500ms → 200ms
- Bundle 大小: -40%

---

#### 1.2 后端查询优化 ⭐ (2-3小时)

**目标**: 查询响应时间减少 60%，并发支持提升 3倍

**具体任务**:

1. **数据库索引优化**
   - [ ] 分析慢查询日志
   - [ ] 添加必要的复合索引
   - [ ] 优化查询语句

   **索引清单**:
   ```sql
   -- notifications 表
   CREATE INDEX idx_notifications_user_read ON notifications(user_id, is_read, created_at);
   CREATE INDEX idx_notifications_type_status ON notifications(type, status);

   -- tickets 表
   CREATE INDEX idx_tickets_status_priority ON tickets(status, priority, created_at);
   CREATE INDEX idx_tickets_assigned ON tickets(assigned_to, status);

   -- audit_logs 表
   CREATE INDEX idx_audit_resource ON audit_logs(resource_type, resource_id, created_at);
   CREATE INDEX idx_audit_user_action ON audit_logs(user_id, action, created_at);

   -- quotas 表
   CREATE INDEX idx_quotas_user_status ON quotas(user_id, status);
   ```

2. **查询优化**
   - [ ] 解决 N+1 查询问题 (使用 join 或 eager loading)
   - [ ] 分页查询优化
   - [ ] 避免 SELECT *

   **优化示例**:
   ```typescript
   // 优化前: N+1 查询
   const tickets = await ticketRepository.find();
   for (const ticket of tickets) {
     ticket.user = await userRepository.findOne(ticket.userId);
   }

   // 优化后: JOIN 查询
   const tickets = await ticketRepository
     .createQueryBuilder('ticket')
     .leftJoinAndSelect('ticket.user', 'user')
     .getMany();
   ```

3. **查询结果缓存**
   - [ ] Redis 缓存热点数据
   - [ ] 配置 TTL 策略
   - [ ] 缓存失效机制

**预期效果**:
- 查询响应时间: 500ms → 200ms
- 数据库负载: -50%
- QPS: 1000 → 3000

---

#### 1.3 WebSocket 连接优化 ⭐ (1-2小时)

**目标**: 延迟减少 30%，支持 10,000+ 并发连接

**具体任务**:

1. **心跳机制优化**
   - [ ] 自适应心跳间隔
   - [ ] 客户端主动心跳
   - [ ] 超时断线检测

   **实现代码**:
   ```typescript
   // WebSocket Gateway
   private heartbeatInterval = 30000; // 30秒

   @SubscribeMessage('ping')
   handlePing(client: Socket) {
     client.emit('pong', { timestamp: Date.now() });
   }

   // 客户端
   setInterval(() => {
     socket.emit('ping');
   }, 30000);
   ```

2. **断线重连策略**
   - [ ] 指数退避重连
   - [ ] 最大重试次数
   - [ ] 重连后状态恢复

3. **消息压缩**
   - [ ] 启用 WebSocket 压缩 (permessage-deflate)
   - [ ] 大数据分包传输

4. **连接池管理**
   - [ ] 用户连接池
   - [ ] 连接数限制
   - [ ] 内存优化

**预期效果**:
- 消息延迟: 100ms → 70ms
- 并发连接: 5,000 → 10,000
- 内存占用: -30%

---

#### 1.4 缓存策略优化 ⭐ (2-3小时)

**目标**: 缓存命中率 >80%，缓存雪崩/穿透防护

**具体任务**:

1. **缓存分层设计**
   - [ ] L1: 本地内存缓存 (Node.js-cache)
   - [ ] L2: Redis 缓存
   - [ ] L3: 数据库查询

   **实现架构**:
   ```typescript
   class CacheService {
     async get(key: string) {
       // L1: 本地缓存
       let value = this.localCache.get(key);
       if (value) return value;

       // L2: Redis
       value = await this.redis.get(key);
       if (value) {
         this.localCache.set(key, value);
         return value;
       }

       // L3: 数据库
       value = await this.database.query(key);
       await this.redis.setex(key, 300, value);
       this.localCache.set(key, value);
       return value;
     }
   }
   ```

2. **缓存雪崩防护**
   - [ ] 随机 TTL
   - [ ] 热点数据永不过期
   - [ ] 缓存预热

3. **缓存穿透防护**
   - [ ] 布隆过滤器
   - [ ] 空值缓存

4. **缓存更新策略**
   - [ ] 主动失效
   - [ ] 延迟双删
   - [ ] 订阅发布同步

**预期效果**:
- 缓存命中率: 60% → 85%
- 数据库压力: -70%
- 响应时间: -50%

---

### 阶段二: 功能增强 (预计 10-12 小时)

#### 2.1 数据导出功能 ⭐ (2-3小时)

**支持格式**: Excel, PDF, CSV

**功能模块**:
- [ ] 配额数据导出
- [ ] 交易记录导出
- [ ] 工单数据导出
- [ ] 审计日志导出
- [ ] API 密钥导出

**技术实现**:

1. **后端 API**
   ```typescript
   @Controller('export')
   export class ExportController {
     @Get('quotas/excel')
     async exportQuotas(@Query() filters, @Res() res) {
       const workbook = new ExcelJS.Workbook();
       const worksheet = workbook.addWorksheet('配额数据');

       // 添加表头
       worksheet.columns = [
         { header: '用户', key: 'userName', width: 20 },
         { header: '设备配额', key: 'maxDevices', width: 15 },
         // ...
       ];

       // 添加数据
       const quotas = await this.quotaService.find(filters);
       worksheet.addRows(quotas);

       res.setHeader('Content-Type', 'application/vnd.openxmlformats');
       res.setHeader('Content-Disposition', 'attachment; filename=quotas.xlsx');

       await workbook.xlsx.write(res);
     }
   }
   ```

2. **前端下载**
   ```typescript
   const handleExport = async (format: 'excel' | 'pdf') => {
     const response = await exportQuotas({ format, ...filters });
     const blob = new Blob([response.data]);
     const url = window.URL.createObjectURL(blob);
     const link = document.createElement('a');
     link.href = url;
     link.download = `quotas_${Date.now()}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
     link.click();
   };
   ```

**依赖库**:
- Backend: `exceljs`, `pdfkit`
- Frontend: 无需额外依赖

---

#### 2.2 批量操作功能 ⭐ (2-3小时)

**功能清单**:
- [ ] 批量删除 (quotas, tickets, api-keys)
- [ ] 批量修改状态
- [ ] 批量导入 (Excel/CSV)
- [ ] 批量分配 (工单分配)

**实现方案**:

1. **前端多选组件**
   ```typescript
   const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);

   const rowSelection = {
     selectedRowKeys,
     onChange: setSelectedRowKeys,
   };

   const handleBatchDelete = async () => {
     if (selectedRowKeys.length === 0) {
       message.warning('请选择要删除的项');
       return;
     }

     Modal.confirm({
       title: `确认删除 ${selectedRowKeys.length} 项？`,
       onOk: async () => {
         await batchDeleteQuotas(selectedRowKeys);
         message.success('删除成功');
         reload();
       },
     });
   };

   <Table rowSelection={rowSelection} dataSource={data} />
   <Button danger onClick={handleBatchDelete}>
     批量删除 ({selectedRowKeys.length})
   </Button>
   ```

2. **后端批量处理**
   ```typescript
   @Post('batch/delete')
   async batchDelete(@Body() { ids }: { ids: string[] }) {
     if (ids.length > 100) {
       throw new BadRequestException('一次最多删除100条');
     }

     // 使用事务
     return await this.quotaRepository.manager.transaction(async manager => {
       await manager.delete(Quota, ids);
       // 记录审计日志
       await this.auditService.log({
         action: 'batch_delete',
         resource: 'quotas',
         count: ids.length,
       });
     });
   }
   ```

---

#### 2.3 高级搜索筛选 ⭐ (2-3小时)

**功能特性**:
- [ ] 多条件组合搜索
- [ ] 保存搜索条件
- [ ] 搜索历史
- [ ] 智能搜索建议

**实现方案**:

1. **高级筛选组件**
   ```typescript
   interface FilterCondition {
     field: string;
     operator: 'eq' | 'ne' | 'gt' | 'lt' | 'like' | 'in';
     value: any;
   }

   const AdvancedFilter: React.FC = () => {
     const [conditions, setConditions] = useState<FilterCondition[]>([]);

     const addCondition = () => {
       setConditions([...conditions, { field: '', operator: 'eq', value: '' }]);
     };

     const handleSearch = () => {
       const query = buildQuery(conditions);
       onSearch(query);
     };

     return (
       <div>
         {conditions.map((condition, index) => (
           <Row key={index} gutter={8}>
             <Col span={6}>
               <Select value={condition.field} onChange={...}>
                 <Option value="userName">用户名</Option>
                 <Option value="status">状态</Option>
                 <Option value="createdAt">创建时间</Option>
               </Select>
             </Col>
             <Col span={6}>
               <Select value={condition.operator}>
                 <Option value="eq">等于</Option>
                 <Option value="like">包含</Option>
                 <Option value="gt">大于</Option>
               </Select>
             </Col>
             <Col span={10}>
               <Input value={condition.value} />
             </Col>
             <Col span={2}>
               <Button icon={<DeleteOutlined />} />
             </Col>
           </Row>
         ))}
         <Button onClick={addCondition}>添加条件</Button>
         <Button type="primary" onClick={handleSearch}>搜索</Button>
       </div>
     );
   };
   ```

2. **保存搜索条件**
   ```typescript
   const [savedFilters, setSavedFilters] = useState([]);

   const saveCurrentFilter = () => {
     const filterName = prompt('输入筛选器名称');
     const newFilter = {
       id: Date.now(),
       name: filterName,
       conditions,
     };
     setSavedFilters([...savedFilters, newFilter]);
     localStorage.setItem('savedFilters', JSON.stringify(savedFilters));
   };
   ```

---

#### 2.4 短信/邮件通知集成 ⭐ (3-4小时)

**集成服务**:
- [ ] 阿里云短信
- [ ] 腾讯云短信
- [ ] SendGrid 邮件
- [ ] 通知偏好设置

**实现方案**:

1. **短信服务集成**
   ```typescript
   // sms.service.ts
   import * as Core from '@alicloud/pop-core';

   export class SmsService {
     private client: Core;

     constructor() {
       this.client = new Core({
         accessKeyId: process.env.ALIYUN_ACCESS_KEY_ID,
         accessKeySecret: process.env.ALIYUN_ACCESS_KEY_SECRET,
         endpoint: 'https://dysmsapi.aliyuncs.com',
         apiVersion: '2017-05-25',
       });
     }

     async sendSms(phone: string, template: string, params: any) {
       const result = await this.client.request('SendSms', {
         PhoneNumbers: phone,
         SignName: '云手机平台',
         TemplateCode: template,
         TemplateParam: JSON.stringify(params),
       });

       return result;
     }
   }
   ```

2. **通知偏好设置**
   ```typescript
   interface NotificationPreference {
     userId: string;
     channels: {
       email: boolean;
       sms: boolean;
       websocket: boolean;
       inApp: boolean;
     };
     types: {
       ticketReply: boolean;
       balanceLow: boolean;
       quotaExceeded: boolean;
       // ...
     };
   }

   // 前端偏好设置页面
   <Form>
     <Form.Item label="通知渠道">
       <Checkbox.Group>
         <Checkbox value="email">邮件</Checkbox>
         <Checkbox value="sms">短信</Checkbox>
         <Checkbox value="websocket">实时推送</Checkbox>
       </Checkbox.Group>
     </Form.Item>
     <Form.Item label="通知类型">
       <Checkbox.Group>
         <Checkbox value="ticketReply">工单回复</Checkbox>
         <Checkbox value="balanceLow">余额不足</Checkbox>
         <Checkbox value="quotaExceeded">配额超限</Checkbox>
       </Checkbox.Group>
     </Form.Item>
   </Form>
   ```

---

### 阶段三: 质量保障 (预计 3-4 小时)

#### 3.1 全局错误处理和日志 ⭐

**目标**: 错误率 <0.1%，日志覆盖率 100%

**具体任务**:

1. **后端全局异常过滤器**
   ```typescript
   @Catch()
   export class GlobalExceptionFilter implements ExceptionFilter {
     constructor(private logger: Logger) {}

     catch(exception: any, host: ArgumentsHost) {
       const ctx = host.switchToHttp();
       const response = ctx.getResponse();
       const request = ctx.getRequest();

       const status = exception instanceof HttpException
         ? exception.getStatus()
         : HttpStatus.INTERNAL_SERVER_ERROR;

       const errorResponse = {
         code: status,
         timestamp: new Date().toISOString(),
         path: request.url,
         method: request.method,
         message: exception.message || 'Internal server error',
       };

       // 记录日志
       this.logger.error(
         `${request.method} ${request.url}`,
         exception.stack,
         'ExceptionFilter',
       );

       response.status(status).json(errorResponse);
     }
   }
   ```

2. **前端全局错误处理**
   ```typescript
   // ErrorBoundary.tsx
   class ErrorBoundary extends React.Component {
     componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
       // 记录到日志系统
       logErrorToService(error, errorInfo);

       // 显示错误提示
       message.error('页面发生错误，请刷新重试');
     }

     render() {
       if (this.state.hasError) {
         return <ErrorPage />;
       }
       return this.props.children;
     }
   }

   // axios 拦截器
   axios.interceptors.response.use(
     response => response,
     error => {
       if (error.response?.status === 401) {
         message.error('登录已过期，请重新登录');
         navigate('/login');
       } else if (error.response?.status === 403) {
         message.error('无权限访问');
       } else if (error.response?.status >= 500) {
         message.error('服务器错误，请稍后重试');
       } else {
         message.error(error.response?.data?.message || '请求失败');
       }
       return Promise.reject(error);
     }
   );
   ```

3. **结构化日志**
   ```typescript
   // logger.service.ts
   export class LoggerService {
     log(level: string, message: string, context?: any) {
       const logEntry = {
         timestamp: new Date().toISOString(),
         level,
         message,
         context,
         service: 'notification-service',
         environment: process.env.NODE_ENV,
       };

       console.log(JSON.stringify(logEntry));

       // 发送到日志收集系统 (ELK, Loki等)
       this.sendToLogCollector(logEntry);
     }
   }
   ```

---

## 📅 时间安排

| 阶段 | 任务 | 预计时间 | 优先级 |
|------|------|---------|--------|
| 阶段一 | 前端渲染优化 | 2-3小时 | P0 |
| 阶段一 | 后端查询优化 | 2-3小时 | P0 |
| 阶段一 | WebSocket优化 | 1-2小时 | P1 |
| 阶段一 | 缓存策略优化 | 2-3小时 | P1 |
| 阶段二 | 数据导出功能 | 2-3小时 | P1 |
| 阶段二 | 批量操作功能 | 2-3小时 | P1 |
| 阶段二 | 高级搜索筛选 | 2-3小时 | P2 |
| 阶段二 | 短信/邮件通知 | 3-4小时 | P2 |
| 阶段三 | 错误处理日志 | 3-4小时 | P0 |

**总计**: 19-28 小时

---

## 🎯 成功指标

### 性能指标
- [ ] 前端首屏加载 <2s
- [ ] 后端 API 响应 <200ms (P95)
- [ ] WebSocket 延迟 <100ms
- [ ] 缓存命中率 >80%

### 功能指标
- [ ] 数据导出成功率 >99%
- [ ] 批量操作支持 100+ 条记录
- [ ] 高级搜索支持 10+ 条件组合
- [ ] 短信/邮件发送成功率 >95%

### 质量指标
- [ ] 错误率 <0.1%
- [ ] 日志覆盖率 100%
- [ ] 代码覆盖率 >70%

---

## 🚀 立即开始

**建议实施顺序**:

1. **Day 1**: 全局错误处理和日志 (P0) ✅
2. **Day 2**: 前端渲染优化 + 后端查询优化 (P0) ✅
3. **Day 3**: 数据导出 + 批量操作 (P1) ✅
4. **Day 4**: WebSocket优化 + 缓存策略 (P1) ✅
5. **Day 5**: 高级搜索 + 短信通知 (P2) ✅

---

**文档版本**: v1.0
**创建日期**: 2025-10-20
**作者**: Claude Code

*Let's build something amazing! 🚀*
