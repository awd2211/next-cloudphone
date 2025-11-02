import React from 'react';
import { Card, Typography, Divider, Alert, Table, Tag } from 'antd';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';

const { Title, Paragraph, Text } = Typography;

/**
 * 服务水平协议（SLA）页面
 *
 * 功能：
 * 1. 说明服务可用性承诺
 * 2. 定义服务指标和计算方式
 * 3. 赔偿标准说明
 * 4. 例外情况说明
 */
const ServiceLevelAgreement: React.FC = () => {
  // 服务可用性等级表格
  const availabilityColumns = [
    {
      title: '套餐类型',
      dataIndex: 'plan',
      key: 'plan',
    },
    {
      title: '可用性承诺',
      dataIndex: 'availability',
      key: 'availability',
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: '月度停机时间上限',
      dataIndex: 'downtime',
      key: 'downtime',
    },
    {
      title: '赔偿比例',
      dataIndex: 'compensation',
      key: 'compensation',
      render: (text: string) => <Tag color="green">{text}</Tag>,
    },
  ];

  const availabilityData = [
    {
      key: '1',
      plan: '基础版',
      availability: '99.5%',
      downtime: '≤ 3.6 小时',
      compensation: '10%',
    },
    {
      key: '2',
      plan: '标准版',
      availability: '99.9%',
      downtime: '≤ 43.2 分钟',
      compensation: '25%',
    },
    {
      key: '3',
      plan: '专业版',
      availability: '99.95%',
      downtime: '≤ 21.6 分钟',
      compensation: '50%',
    },
    {
      key: '4',
      plan: '企业版',
      availability: '99.99%',
      downtime: '≤ 4.3 分钟',
      compensation: '100%',
    },
  ];

  // 性能指标表格
  const performanceColumns = [
    {
      title: '性能指标',
      dataIndex: 'metric',
      key: 'metric',
    },
    {
      title: '目标值',
      dataIndex: 'target',
      key: 'target',
    },
    {
      title: '说明',
      dataIndex: 'description',
      key: 'description',
    },
  ];

  const performanceData = [
    {
      key: '1',
      metric: 'API响应时间',
      target: '< 200ms (P95)',
      description: '95%的API请求在200毫秒内返回',
    },
    {
      key: '2',
      metric: '设备启动时间',
      target: '< 30秒',
      description: '从发起启动到设备ready状态',
    },
    {
      key: '3',
      metric: 'WebRTC延迟',
      target: '< 150ms',
      description: '屏幕投射的端到端延迟',
    },
    {
      key: '4',
      metric: '数据备份恢复',
      target: '< 5分钟',
      description: '快照恢复到设备可用状态',
    },
  ];

  // 赔偿阶梯表格
  const compensationColumns = [
    {
      title: '实际可用性',
      dataIndex: 'actualAvailability',
      key: 'actualAvailability',
    },
    {
      title: '赔偿比例',
      dataIndex: 'percentage',
      key: 'percentage',
      render: (text: string) => <Tag color="red">{text}</Tag>,
    },
  ];

  const compensationData = [
    {
      key: '1',
      actualAvailability: '≥ 99.9%',
      percentage: '无赔偿',
    },
    {
      key: '2',
      actualAvailability: '99.0% - 99.9%',
      percentage: '10%',
    },
    {
      key: '3',
      actualAvailability: '95.0% - 99.0%',
      percentage: '25%',
    },
    {
      key: '4',
      actualAvailability: '90.0% - 95.0%',
      percentage: '50%',
    },
    {
      key: '5',
      actualAvailability: '< 90.0%',
      percentage: '100%',
    },
  ];

  return (
    <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
      <Card>
        <Typography>
          {/* 标题 */}
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <Title level={2}>
              <CheckCircleOutlined style={{ marginRight: '8px' }} />
              服务水平协议（SLA）
            </Title>
            <Text type="secondary">
              <ClockCircleOutlined style={{ marginRight: '4px' }} />
              最后更新：2025年1月15日
            </Text>
          </div>

          <Alert
            message="服务承诺"
            description="我们承诺为您提供高质量、高可用性的云手机服务。本协议明确了我们的服务水平标准和赔偿政策。"
            type="info"
            showIcon
            style={{ marginBottom: '24px' }}
          />

          <Divider />

          {/* 第一部分：定义 */}
          <Title level={3}>1. 定义</Title>
          <Paragraph>
            <ul>
              <li>
                <Text strong>服务可用性：</Text>
                在约定的服务周期内，服务处于可用状态的时间占总时间的百分比。
              </li>
              <li>
                <Text strong>服务周期：</Text>
                一个自然月为一个服务周期。
              </li>
              <li>
                <Text strong>不可用时间：</Text>
                连续5分钟以上无法正常使用服务的时间。不足5分钟不计入不可用时间。
              </li>
              <li>
                <Text strong>计划维护：</Text>
                提前至少48小时通知的系统维护时间，不计入不可用时间。
              </li>
              <li>
                <Text strong>月度服务费：</Text>
                用户在一个服务周期内支付的服务费用。
              </li>
            </ul>
          </Paragraph>

          <Divider />

          {/* 第二部分：服务可用性承诺 */}
          <Title level={3}>2. 服务可用性承诺</Title>
          <Paragraph>
            根据不同的套餐类型，我们提供以下服务可用性保证：
          </Paragraph>

          <Table
            columns={availabilityColumns}
            dataSource={availabilityData}
            pagination={false}
            bordered
            style={{ marginBottom: '16px' }}
          />

          <Alert
            message="计算方式"
            description={
              <div>
                <Paragraph style={{ marginBottom: 0 }}>
                  服务可用性 = (服务周期总分钟数 - 不可用时间) / 服务周期总分钟数 × 100%
                </Paragraph>
                <Paragraph style={{ marginBottom: 0, marginTop: 8 }}>
                  示例：某月共30天(43,200分钟)，不可用时间为30分钟，则可用性 = (43200 - 30) / 43200 × 100% = 99.93%
                </Paragraph>
              </div>
            }
            type="warning"
            showIcon
            style={{ marginTop: '16px' }}
          />

          <Divider />

          {/* 第三部分：性能指标 */}
          <Title level={3}>3. 性能指标</Title>
          <Paragraph>
            除了可用性，我们还承诺以下性能指标：
          </Paragraph>

          <Table
            columns={performanceColumns}
            dataSource={performanceData}
            pagination={false}
            bordered
          />

          <Divider />

          {/* 第四部分：赔偿标准 */}
          <Title level={3}>4. 赔偿标准</Title>
          <Paragraph>
            <ThunderboltOutlined style={{ marginRight: '4px' }} />
            当服务可用性未达到承诺标准时，我们将按照以下标准进行赔偿：
          </Paragraph>

          <Table
            columns={compensationColumns}
            dataSource={compensationData}
            pagination={false}
            bordered
            style={{ marginBottom: '16px' }}
          />

          <Paragraph>
            <Text strong>赔偿说明：</Text>
            <ul>
              <li>
                赔偿以<Text strong>服务时长</Text>形式发放，等值于 月度服务费 × 赔偿比例
              </li>
              <li>赔偿的服务时长有效期为3个月</li>
              <li>单个服务周期的最高赔偿金额不超过该周期的月度服务费</li>
              <li>赔偿申请需在故障发生后30日内提出，逾期不予受理</li>
            </ul>
          </Paragraph>

          <Divider />

          {/* 第五部分：赔偿申请流程 */}
          <Title level={3}>5. 赔偿申请流程</Title>
          <Paragraph>
            如您认为服务可用性未达标，可通过以下流程申请赔偿：
          </Paragraph>
          <Paragraph>
            <ol>
              <li>登录平台，进入"工单系统"</li>
              <li>选择"SLA赔偿申请"类型</li>
              <li>
                提供相关证明材料（如截图、日志记录等）
              </li>
              <li>提交工单</li>
            </ol>
          </Paragraph>
          <Paragraph>
            我们会在收到申请后5个工作日内完成审核，审核通过后7个工作日内发放赔偿。
          </Paragraph>

          <Divider />

          {/* 第六部分：免责条款 */}
          <Title level={3}>6. 免责条款（例外情况）</Title>
          <Paragraph>
            以下情况导致的服务不可用，不计入服务可用性统计，我们也不承担赔偿责任：
          </Paragraph>
          <Paragraph>
            <Text strong>6.1 不可抗力</Text>
            <ul>
              <li>自然灾害（地震、洪水、台风等）</li>
              <li>战争、暴乱、罢工等社会事件</li>
              <li>政府行为、法律法规变更</li>
              <li>电力中断、网络中断等基础设施故障</li>
            </ul>
          </Paragraph>
          <Paragraph>
            <Text strong>6.2 计划维护</Text>
            <ul>
              <li>提前48小时通知的系统维护</li>
              <li>紧急安全补丁（影响时间通常小于30分钟）</li>
            </ul>
          </Paragraph>
          <Paragraph>
            <Text strong>6.3 用户原因</Text>
            <ul>
              <li>用户操作不当（误删除设备、错误配置等）</li>
              <li>用户账户欠费导致服务暂停</li>
              <li>用户安装的应用导致设备异常</li>
              <li>用户自行修改系统配置导致的问题</li>
            </ul>
          </Paragraph>
          <Paragraph>
            <Text strong>6.4 第三方原因</Text>
            <ul>
              <li>第三方服务（如支付、短信）不可用</li>
              <li>用户使用的网络运营商故障</li>
              <li>DDoS攻击、黑客攻击等安全事件</li>
            </ul>
          </Paragraph>
          <Paragraph>
            <Text strong>6.5 其他</Text>
            <ul>
              <li>测试版、Beta版功能</li>
              <li>免费试用期间的服务</li>
              <li>用户明确同意的其他情况</li>
            </ul>
          </Paragraph>

          <Divider />

          {/* 第七部分：监控与通知 */}
          <Title level={3}>7. 监控与通知</Title>
          <Paragraph>
            7.1 我们会7×24小时监控服务状态，及时发现并处理故障。
          </Paragraph>
          <Paragraph>
            7.2 发生重大故障时，我们会通过以下渠道通知您：
            <ul>
              <li>平台内消息通知</li>
              <li>注册邮箱</li>
              <li>短信（影响范围较大时）</li>
              <li>状态页面：<a href="https://status.cloudphone.com">status.cloudphone.com</a></li>
            </ul>
          </Paragraph>
          <Paragraph>
            7.3 您可以订阅服务状态通知，第一时间获取故障信息和恢复进展。
          </Paragraph>

          <Divider />

          {/* 第八部分：技术支持 */}
          <Title level={3}>8. 技术支持</Title>
          <Paragraph>
            我们为不同套餐提供相应级别的技术支持：
          </Paragraph>
          <Paragraph>
            <ul>
              <li>
                <Text strong>基础版：</Text>工单支持（24小时响应）
              </li>
              <li>
                <Text strong>标准版：</Text>工单 + 邮件支持（12小时响应）
              </li>
              <li>
                <Text strong>专业版：</Text>工单 + 邮件 + 电话支持（4小时响应）
              </li>
              <li>
                <Text strong>企业版：</Text>
                工单 + 邮件 + 电话 + 专属客户经理（2小时响应，紧急故障1小时内响应）
              </li>
            </ul>
          </Paragraph>

          <Divider />

          {/* 第九部分：服务改进 */}
          <Title level={3}>9. 持续改进</Title>
          <Paragraph>
            9.1 我们会定期（每季度）发布服务质量报告，公开服务可用性数据。
          </Paragraph>
          <Paragraph>
            9.2 我们会持续投入研发，优化系统架构，提升服务质量。
          </Paragraph>
          <Paragraph>
            9.3 我们欢迎您的反馈和建议，帮助我们改进服务。
          </Paragraph>

          <Divider />

          {/* 第十部分：协议修订 */}
          <Title level={3}>10. 协议修订</Title>
          <Paragraph>
            10.1 我们有权修订本协议，修订后的协议会在平台上公布。
          </Paragraph>
          <Paragraph>
            10.2
            如修订降低了服务水平标准，现有用户在套餐到期前可继续享受原有标准。
          </Paragraph>
          <Paragraph>
            10.3 继续使用服务即视为接受修订后的协议。
          </Paragraph>

          <Divider />

          {/* 第十一部分：联系方式 */}
          <Title level={3}>11. 联系我们</Title>
          <Paragraph>
            如您对本SLA有任何疑问，或需要申请赔偿，请联系我们：
            <ul>
              <li>SLA专员邮箱：sla@cloudphone.com</li>
              <li>客服电话：400-123-4567（7×24小时）</li>
              <li>工单系统：登录平台后提交"SLA赔偿申请"工单</li>
              <li>
                服务状态页：<a href="https://status.cloudphone.com">status.cloudphone.com</a>
              </li>
            </ul>
          </Paragraph>

          <Alert
            message="我们的承诺"
            description="我们承诺提供稳定、可靠的云手机服务，并对服务质量负责。您的满意是我们最大的追求！"
            type="success"
            showIcon
            style={{ marginTop: '32px' }}
          />
        </Typography>
      </Card>
    </div>
  );
};

export default ServiceLevelAgreement;
