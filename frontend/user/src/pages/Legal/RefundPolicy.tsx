import React from 'react';
import { Card, Typography, Divider, Alert, Table, Steps } from 'antd';
import {
  DollarOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  WarningOutlined,
} from '@ant-design/icons';

const { Title, Paragraph, Text } = Typography;

/**
 * 退款政策页面
 *
 * 功能：
 * 1. 说明退款条件和范围
 * 2. 退款流程说明
 * 3. 退款时效说明
 * 4. 特殊情况处理
 */
const RefundPolicy: React.FC = () => {
  // 退款条件表格
  const refundConditionsColumns = [
    {
      title: '情况',
      dataIndex: 'situation',
      key: 'situation',
    },
    {
      title: '是否可退款',
      dataIndex: 'refundable',
      key: 'refundable',
      render: (refundable: boolean) =>
        refundable ? (
          <CheckCircleOutlined style={{ color: '#52c41a', fontSize: '18px' }} />
        ) : (
          <CloseCircleOutlined style={{ color: '#ff4d4f', fontSize: '18px' }} />
        ),
    },
    {
      title: '退款比例',
      dataIndex: 'percentage',
      key: 'percentage',
    },
    {
      title: '说明',
      dataIndex: 'note',
      key: 'note',
    },
  ];

  const refundConditionsData = [
    {
      key: '1',
      situation: '服务未开始使用',
      refundable: true,
      percentage: '100%',
      note: '购买后24小时内未创建设备',
    },
    {
      key: '2',
      situation: '服务质量问题',
      refundable: true,
      percentage: '按使用时间扣除',
      note: '平台原因导致无法正常使用',
    },
    {
      key: '3',
      situation: '套餐降级',
      refundable: true,
      percentage: '差价部分',
      note: '高级套餐降级为低级套餐',
    },
    {
      key: '4',
      situation: '已使用部分时长',
      refundable: false,
      percentage: '-',
      note: '已消耗的使用时长不予退款',
    },
    {
      key: '5',
      situation: '违规使用',
      refundable: false,
      percentage: '-',
      note: '违反服务条款被停止服务',
    },
    {
      key: '6',
      situation: '活动/促销套餐',
      refundable: false,
      percentage: '-',
      note: '特价活动期间购买的套餐',
    },
  ];

  // 退款时效表格
  const refundTimelineColumns = [
    {
      title: '支付方式',
      dataIndex: 'method',
      key: 'method',
    },
    {
      title: '退款到账时间',
      dataIndex: 'timeline',
      key: 'timeline',
    },
    {
      title: '备注',
      dataIndex: 'note',
      key: 'note',
    },
  ];

  const refundTimelineData = [
    {
      key: '1',
      method: '微信支付',
      timeline: '1-3个工作日',
      note: '原路退回至微信钱包',
    },
    {
      key: '2',
      method: '支付宝',
      timeline: '1-3个工作日',
      note: '原路退回至支付宝账户',
    },
    {
      key: '3',
      method: '银行卡',
      timeline: '3-7个工作日',
      note: '退回至原支付银行卡',
    },
    {
      key: '4',
      method: '账户余额',
      timeline: '即时到账',
      note: '充值到平台账户余额',
    },
  ];

  return (
    <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
      <Card>
        <Typography>
          {/* 标题 */}
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <Title level={2}>
              <DollarOutlined style={{ marginRight: '8px' }} />
              退款政策
            </Title>
            <Text type="secondary">
              <ClockCircleOutlined style={{ marginRight: '4px' }} />
              最后更新：2025年1月15日
            </Text>
          </div>

          <Alert
            message="退款原则"
            description="我们理解您的需求可能会发生变化。在符合条件的情况下，我们会尽快处理您的退款申请，让您无后顾之忧。"
            type="info"
            showIcon
            style={{ marginBottom: '24px' }}
          />

          <Divider />

          {/* 第一部分：退款范围 */}
          <Title level={3}>1. 退款范围</Title>
          <Paragraph>
            本退款政策适用于以下付费项目：
            <ul>
              <li>套餐购买费用</li>
              <li>账户充值余额</li>
              <li>增值服务费用（如额外存储、带宽等）</li>
            </ul>
          </Paragraph>
          <Paragraph>
            <WarningOutlined style={{ color: '#faad14', marginRight: '4px' }} />
            <Text strong>注意：</Text>
            以下情况不适用于本退款政策：
            <ul>
              <li>免费试用期间的服务</li>
              <li>赠送的代金券、优惠券</li>
              <li>已开具发票的金额（需先冲红发票）</li>
            </ul>
          </Paragraph>

          <Divider />

          {/* 第二部分：退款条件 */}
          <Title level={3}>2. 退款条件</Title>
          <Paragraph>
            我们根据不同情况制定了明确的退款规则：
          </Paragraph>

          <Table
            columns={refundConditionsColumns}
            dataSource={refundConditionsData}
            pagination={false}
            bordered
          />

          <Alert
            message="24小时无理由退款"
            description="如果您在购买套餐后24小时内未创建任何设备，可以申请全额退款，无需说明理由。这是我们对服务质量的信心体现。"
            type="success"
            showIcon
            style={{ marginTop: '16px' }}
          />

          <Divider />

          {/* 第三部分：退款计算 */}
          <Title level={3}>3. 退款金额计算</Title>
          <Paragraph>
            <Text strong>3.1 未使用退款</Text>
          </Paragraph>
          <Paragraph>
            购买后24小时内未使用，退款金额 = 购买金额 × 100%
          </Paragraph>
          <Paragraph>
            <Text strong>3.2 部分使用退款</Text>
          </Paragraph>
          <Paragraph>
            退款金额 = 购买金额 - 已使用金额 - 手续费
          </Paragraph>
          <Paragraph>
            其中：
            <ul>
              <li>已使用金额 = (已使用天数 / 套餐总天数) × 购买金额</li>
              <li>手续费 = 退款金额 × 2%（最低收取5元）</li>
            </ul>
          </Paragraph>
          <Paragraph>
            <Text strong>3.3 服务质量问题退款</Text>
          </Paragraph>
          <Paragraph>
            如因平台原因导致服务不可用：
            <ul>
              <li>不可用时间 &lt; 24小时：补偿等值服务时长</li>
              <li>不可用时间 ≥ 24小时：可选择全额退款或补偿双倍服务时长</li>
            </ul>
          </Paragraph>
          <Paragraph>
            <Text strong>3.4 计算示例</Text>
          </Paragraph>
          <Alert
            message="退款计算示例"
            description={
              <div>
                <Paragraph style={{ marginBottom: 8 }}>
                  <Text strong>场景：</Text>
                  用户购买了180元的月度套餐（30天），使用了10天后申请退款。
                </Paragraph>
                <Paragraph style={{ marginBottom: 8 }}>
                  <Text strong>计算：</Text>
                </Paragraph>
                <ul style={{ marginBottom: 0 }}>
                  <li>已使用金额 = (10 / 30) × 180 = 60元</li>
                  <li>可退金额 = 180 - 60 = 120元</li>
                  <li>手续费 = 120 × 2% = 2.4元（&lt; 5元，按5元收取）</li>
                  <li><Text strong>实际退款 = 120 - 5 = 115元</Text></li>
                </ul>
              </div>
            }
            type="warning"
            showIcon
          />

          <Divider />

          {/* 第四部分：退款流程 */}
          <Title level={3}>4. 退款申请流程</Title>
          <Paragraph>
            请按照以下步骤申请退款：
          </Paragraph>

          <Steps
            direction="vertical"
            current={-1}
            items={[
              {
                title: '第一步：登录平台',
                description: '使用您的账户登录云手机平台',
                icon: <CheckCircleOutlined />,
              },
              {
                title: '第二步：提交退款申请',
                description: (
                  <div>
                    进入"个人中心 - 订单管理"，找到需要退款的订单，点击"申请退款"按钮
                    <br />
                    填写退款原因和说明（必填）
                  </div>
                ),
                icon: <CheckCircleOutlined />,
              },
              {
                title: '第三步：等待审核',
                description: '我们会在1-3个工作日内完成审核，并通过站内消息、邮件通知您审核结果',
                icon: <CheckCircleOutlined />,
              },
              {
                title: '第四步：退款处理',
                description: '审核通过后，退款将按原支付方式原路返回',
                icon: <CheckCircleOutlined />,
              },
              {
                title: '第五步：确认到账',
                description: '请在规定时间内查收退款，如有问题请及时联系客服',
                icon: <CheckCircleOutlined />,
              },
            ]}
            style={{ marginTop: '16px', marginBottom: '16px' }}
          />

          <Divider />

          {/* 第五部分：退款时效 */}
          <Title level={3}>5. 退款到账时间</Title>
          <Paragraph>
            退款审核通过后，根据不同的支付方式，到账时间有所不同：
          </Paragraph>

          <Table
            columns={refundTimelineColumns}
            dataSource={refundTimelineData}
            pagination={false}
            bordered
          />

          <Alert
            message="温馨提示"
            description="退款到账时间可能因银行处理速度、节假日等因素略有延迟。如超过上述时间仍未到账，请联系我们协助查询。"
            type="info"
            showIcon
            style={{ marginTop: '16px' }}
          />

          <Divider />

          {/* 第六部分：特殊情况 */}
          <Title level={3}>6. 特殊情况处理</Title>
          <Paragraph>
            <Text strong>6.1 服务质量问题</Text>
          </Paragraph>
          <Paragraph>
            如您遇到以下服务质量问题，可以申请退款：
            <ul>
              <li>设备长时间无法启动（超过24小时未解决）</li>
              <li>网络连接持续不稳定影响使用</li>
              <li>数据丢失且无法恢复</li>
              <li>其他平台原因导致的重大服务问题</li>
            </ul>
          </Paragraph>
          <Paragraph>
            申请时需提供相关证明材料（如截图、错误日志等），我们会优先处理。
          </Paragraph>
          <Paragraph>
            <Text strong>6.2 套餐升级/降级</Text>
          </Paragraph>
          <Paragraph>
            <ul>
              <li>
                <Text strong>升级：</Text>
                需补差价，原套餐剩余时长按比例折算到新套餐
              </li>
              <li>
                <Text strong>降级：</Text>
                差价部分退回账户余额或原支付方式（扣除手续费）
              </li>
            </ul>
          </Paragraph>
          <Paragraph>
            <Text strong>6.3 账户注销</Text>
          </Paragraph>
          <Paragraph>
            如您申请注销账户，账户余额可申请退款：
            <ul>
              <li>需先清理所有设备和数据</li>
              <li>退款金额扣除2%手续费</li>
              <li>注销后无法恢复，请谨慎操作</li>
            </ul>
          </Paragraph>

          <Divider />

          {/* 第七部分：不予退款情况 */}
          <Title level={3}>7. 不予退款的情况</Title>
          <Paragraph>
            以下情况我们无法提供退款服务：
          </Paragraph>
          <Paragraph>
            <ul>
              <li>
                <CloseCircleOutlined style={{ color: '#ff4d4f', marginRight: '4px' }} />
                违反服务条款被停止服务
              </li>
              <li>
                <CloseCircleOutlined style={{ color: '#ff4d4f', marginRight: '4px' }} />
                利用平台从事违法违规活动
              </li>
              <li>
                <CloseCircleOutlined style={{ color: '#ff4d4f', marginRight: '4px' }} />
                恶意退款（多次购买后申请退款）
              </li>
              <li>
                <CloseCircleOutlined style={{ color: '#ff4d4f', marginRight: '4px' }} />
                超过退款申请期限（购买后30天）
              </li>
              <li>
                <CloseCircleOutlined style={{ color: '#ff4d4f', marginRight: '4px' }} />
                活动、促销期间购买的特价套餐
              </li>
              <li>
                <CloseCircleOutlined style={{ color: '#ff4d4f', marginRight: '4px' }} />
                赠送的余额、代金券
              </li>
            </ul>
          </Paragraph>

          <Divider />

          {/* 第八部分：发票处理 */}
          <Title level={3}>8. 发票处理</Title>
          <Paragraph>
            8.1 如您已开具发票，申请退款需要先办理发票冲红：
            <ul>
              <li>联系客服说明情况</li>
              <li>寄回纸质发票原件（如有）</li>
              <li>等待发票冲红完成后再处理退款</li>
            </ul>
          </Paragraph>
          <Paragraph>
            8.2 发票冲红完成后，退款流程按正常流程处理。
          </Paragraph>
          <Paragraph>
            8.3 发票冲红可能需要额外3-5个工作日。
          </Paragraph>

          <Divider />

          {/* 第九部分：争议解决 */}
          <Title level={3}>9. 争议解决</Title>
          <Paragraph>
            9.1 如您对退款决定有异议，可申请人工复核：
            <ul>
              <li>通过工单系统提交"退款复核申请"</li>
              <li>提供详细的情况说明和证据</li>
              <li>我们会在3个工作日内重新审核</li>
            </ul>
          </Paragraph>
          <Paragraph>
            9.2 如仍有争议，可通过以下方式解决：
            <ul>
              <li>协商解决：联系客服经理协商</li>
              <li>第三方调解：通过消费者协会等机构调解</li>
              <li>法律途径：向人民法院提起诉讼</li>
            </ul>
          </Paragraph>

          <Divider />

          {/* 第十部分：政策修订 */}
          <Title level={3}>10. 政策修订</Title>
          <Paragraph>
            10.1 我们有权根据实际情况修订本退款政策。
          </Paragraph>
          <Paragraph>
            10.2
            政策修订后会在平台上公布，并通过站内消息通知现有用户。
          </Paragraph>
          <Paragraph>
            10.3 修订后的政策不影响修订前已购买服务的退款规则。
          </Paragraph>

          <Divider />

          {/* 第十一部分：联系方式 */}
          <Title level={3}>11. 联系我们</Title>
          <Paragraph>
            如您对退款政策有任何疑问，或需要帮助处理退款申请，请联系我们：
            <ul>
              <li>退款专员邮箱：refund@cloudphone.com</li>
              <li>客服电话：400-123-4567</li>
              <li>工单系统：登录后提交"退款申请"或"退款咨询"工单</li>
              <li>在线客服：工作日 9:00-18:00</li>
            </ul>
          </Paragraph>

          <Alert
            message="我们的承诺"
            description="我们承诺公平、透明地处理每一个退款申请。您的满意是我们的目标，您的信任是我们前进的动力！"
            type="success"
            showIcon
            style={{ marginTop: '32px' }}
          />
        </Typography>
      </Card>
    </div>
  );
};

export default RefundPolicy;
