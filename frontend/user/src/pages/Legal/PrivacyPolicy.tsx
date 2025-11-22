import React from 'react';
import { Card, Typography, Divider, Alert, Table } from 'antd';
import { LockOutlined, ClockCircleOutlined } from '@ant-design/icons';

const { Title, Paragraph, Text } = Typography;

/**
 * 隐私政策页面
 *
 * 功能：
 * 1. 说明平台收集的个人信息类型
 * 2. 信息使用方式和目的
 * 3. 信息保护措施
 * 4. 用户权利
 */
const PrivacyPolicy: React.FC = () => {
  // 个人信息收集表格数据
  const dataCollectionColumns = [
    {
      title: '信息类型',
      dataIndex: 'type',
      key: 'type',
    },
    {
      title: '收集目的',
      dataIndex: 'purpose',
      key: 'purpose',
    },
    {
      title: '是否必需',
      dataIndex: 'required',
      key: 'required',
      render: (required: boolean) => (required ? '必需' : '可选'),
    },
  ];

  const dataCollectionData = [
    {
      key: '1',
      type: '账户信息（用户名、邮箱、手机号）',
      purpose: '账户注册、登录验证、找回密码',
      required: true,
    },
    {
      key: '2',
      type: '实名认证信息（姓名、身份证号）',
      purpose: '符合实名制要求，防止违规使用',
      required: true,
    },
    {
      key: '3',
      type: '设备信息（操作系统、浏览器类型、IP地址）',
      purpose: '安全防护、异常登录检测',
      required: true,
    },
    {
      key: '4',
      type: '支付信息（交易记录、账单）',
      purpose: '处理支付、生成账单、退款',
      required: true,
    },
    {
      key: '5',
      type: '使用行为数据（设备使用时长、操作记录）',
      purpose: '优化服务、统计分析',
      required: false,
    },
    {
      key: '6',
      type: '客服沟通记录',
      purpose: '解决问题、改进服务质量',
      required: false,
    },
  ];

  return (
    <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
      <Card>
        <Typography>
          {/* 标题 */}
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <Title level={2}>
              <LockOutlined style={{ marginRight: '8px' }} />
              云手机平台隐私政策
            </Title>
            <Text type="secondary">
              <ClockCircleOutlined style={{ marginRight: '4px' }} />
              最后更新：2025年1月15日
            </Text>
          </div>

          <Alert
            message="隐私保护承诺"
            description="我们高度重视用户隐私保护，并采取严格的安全措施保护您的个人信息。本隐私政策详细说明了我们如何收集、使用、存储和保护您的个人信息。"
            type="info"
            showIcon
            style={{ marginBottom: '24px' }}
          />

          <Divider />

          {/* 第一部分：适用范围 */}
          <Title level={3}>1. 适用范围</Title>
          <Paragraph>
            1.1 本隐私政策适用于云手机平台提供的所有服务。
          </Paragraph>
          <Paragraph>
            1.2 本隐私政策不适用于：
            <ul>
              <li>第三方服务提供商的隐私政策</li>
              <li>通过本平台链接到的其他网站</li>
              <li>非本平台授权的服务或产品</li>
            </ul>
          </Paragraph>

          <Divider />

          {/* 第二部分：信息收集 */}
          <Title level={3}>2. 我们收集的信息</Title>
          <Paragraph>
            为了向您提供更好的服务，我们可能会收集以下类型的个人信息：
          </Paragraph>

          <Table
            columns={dataCollectionColumns}
            dataSource={dataCollectionData}
            pagination={false}
            bordered
            style={{ marginBottom: '16px' }}
          />

          <Alert
            message="注意"
            description="如果您拒绝提供必需信息，可能无法正常使用我们的服务。可选信息不会影响核心功能的使用。"
            type="warning"
            showIcon
            style={{ marginTop: '16px' }}
          />

          <Divider />

          {/* 第三部分：信息使用 */}
          <Title level={3}>3. 信息的使用</Title>
          <Paragraph>
            <Text strong>3.1 我们会将收集的信息用于以下目的：</Text>
            <ul>
              <li>
                <Text strong>提供服务：</Text>处理您的注册、登录、购买、设备管理等请求
              </li>
              <li>
                <Text strong>账单和支付：</Text>生成账单、处理支付、发送发票
              </li>
              <li>
                <Text strong>安全保障：</Text>
                检测异常登录、防止账户被盗、识别违规行为
              </li>
              <li>
                <Text strong>客户支持：</Text>回复您的咨询、解决技术问题
              </li>
              <li>
                <Text strong>服务改进：</Text>
                分析使用数据、优化产品功能、提升用户体验
              </li>
              <li>
                <Text strong>法律合规：</Text>遵守法律法规要求、配合监管部门调查
              </li>
            </ul>
          </Paragraph>
          <Paragraph>
            3.2 我们<Text strong>不会</Text>将您的个人信息用于以下目的：
            <ul>
              <li>出售或出租给第三方</li>
              <li>未经您同意的营销推广</li>
              <li>与服务无关的其他用途</li>
            </ul>
          </Paragraph>

          <Divider />

          {/* 第四部分：信息共享 */}
          <Title level={3}>4. 信息的共享、转让和公开披露</Title>
          <Paragraph>
            <Text strong>4.1 共享</Text>
          </Paragraph>
          <Paragraph>
            我们不会与第三方共享您的个人信息，除非：
            <ul>
              <li>获得您的明确同意</li>
              <li>法律法规规定必须共享</li>
              <li>
                与关联公司共享：仅限于提供服务所需，且接收方需遵守本隐私政策
              </li>
              <li>
                与授权合作伙伴共享：如支付服务提供商、短信服务商等，仅共享必要信息
              </li>
            </ul>
          </Paragraph>
          <Paragraph>
            <Text strong>4.2 转让</Text>
          </Paragraph>
          <Paragraph>
            我们不会将您的个人信息转让给任何公司、组织和个人，除非：
            <ul>
              <li>获得您的明确同意</li>
              <li>发生合并、收购或破产清算时，需提前通知您</li>
            </ul>
          </Paragraph>
          <Paragraph>
            <Text strong>4.3 公开披露</Text>
          </Paragraph>
          <Paragraph>
            我们仅会在以下情况下公开披露您的个人信息：
            <ul>
              <li>获得您的明确同意</li>
              <li>基于法律规定或合理依据的公权力要求</li>
            </ul>
          </Paragraph>

          <Divider />

          {/* 第五部分：信息存储 */}
          <Title level={3}>5. 信息的存储</Title>
          <Paragraph>
            <Text strong>5.1 存储地点</Text>
          </Paragraph>
          <Paragraph>
            您的个人信息将存储在中华人民共和国境内。如需跨境传输，我们会单独征得您的授权同意。
          </Paragraph>
          <Paragraph>
            <Text strong>5.2 存储期限</Text>
          </Paragraph>
          <Paragraph>
            我们会在完成目的所需的最短时间内保留您的个人信息：
            <ul>
              <li>账户信息：账户存续期间及之后的6个月</li>
              <li>交易记录：至少保存3年（税务合规要求）</li>
              <li>日志信息：保存6个月</li>
              <li>其他信息：根据法律法规要求确定保存期限</li>
            </ul>
          </Paragraph>
          <Paragraph>
            超过保存期限后，我们会删除或匿名化处理您的个人信息。
          </Paragraph>

          <Divider />

          {/* 第六部分：信息安全 */}
          <Title level={3}>6. 信息安全保护措施</Title>
          <Paragraph>
            我们采取以下措施保护您的个人信息安全：
          </Paragraph>
          <Paragraph>
            <Text strong>6.1 技术措施</Text>
            <ul>
              <li>使用HTTPS加密传输</li>
              <li>密码加密存储（使用bcrypt等强加密算法）</li>
              <li>敏感数据脱敏显示</li>
              <li>定期进行安全审计和漏洞扫描</li>
              <li>部署防火墙、入侵检测系统</li>
            </ul>
          </Paragraph>
          <Paragraph>
            <Text strong>6.2 管理措施</Text>
            <ul>
              <li>建立数据安全管理制度</li>
              <li>员工签署保密协议</li>
              <li>限制访问权限，实施最小权限原则</li>
              <li>定期进行安全培训</li>
            </ul>
          </Paragraph>
          <Paragraph>
            <Text strong>6.3 应急响应</Text>
          </Paragraph>
          <Paragraph>
            如发生个人信息泄露等安全事件，我们会：
            <ul>
              <li>立即启动应急预案</li>
              <li>及时通知受影响的用户</li>
              <li>向监管部门报告</li>
              <li>采取补救措施</li>
            </ul>
          </Paragraph>

          <Divider />

          {/* 第七部分：用户权利 */}
          <Title level={3}>7. 您的权利</Title>
          <Paragraph>
            根据相关法律法规，您享有以下权利：
          </Paragraph>
          <Paragraph>
            <Text strong>7.1 访问权</Text>
          </Paragraph>
          <Paragraph>
            您有权访问您的个人信息，通过"个人中心"查看和管理您的账户信息。
          </Paragraph>
          <Paragraph>
            <Text strong>7.2 更正权</Text>
          </Paragraph>
          <Paragraph>
            如发现个人信息有误，您可以自行更正或联系我们协助更正。
          </Paragraph>
          <Paragraph>
            <Text strong>7.3 删除权</Text>
          </Paragraph>
          <Paragraph>
            在以下情况下，您可以要求我们删除您的个人信息：
            <ul>
              <li>处理目的已实现或无法实现</li>
              <li>我们停止提供服务</li>
              <li>您撤回同意</li>
              <li>我们违反法律法规或违反约定处理您的个人信息</li>
            </ul>
          </Paragraph>
          <Paragraph>
            <Text strong>7.4 撤回同意权</Text>
          </Paragraph>
          <Paragraph>
            您可以随时撤回授权同意，但不影响撤回前的信息处理。
          </Paragraph>
          <Paragraph>
            <Text strong>7.5 注销账户权</Text>
          </Paragraph>
          <Paragraph>
            您可以通过"个人中心 - 账户设置"申请注销账户。注销后，我们会删除或匿名化您的个人信息。
          </Paragraph>

          <Divider />

          {/* 第八部分：Cookie和类似技术 */}
          <Title level={3}>8. Cookie和类似技术</Title>
          <Paragraph>
            8.1 我们使用Cookie和类似技术来提供更好的用户体验。
          </Paragraph>
          <Paragraph>
            8.2 Cookie用于：
            <ul>
              <li>保持登录状态</li>
              <li>记住您的偏好设置</li>
              <li>分析网站流量和用户行为</li>
              <li>提供个性化内容</li>
            </ul>
          </Paragraph>
          <Paragraph>
            8.3 您可以通过浏览器设置拒绝或管理Cookie，但这可能影响某些功能的使用。
          </Paragraph>

          <Divider />

          {/* 第九部分：未成年人保护 */}
          <Title level={3}>9. 未成年人保护</Title>
          <Paragraph>
            9.1 我们的服务面向成年人（18周岁及以上）。
          </Paragraph>
          <Paragraph>
            9.2 如果我们发现在未事先获得父母或监护人同意的情况下收集了未成年人的个人信息，会尽快删除相关数据。
          </Paragraph>
          <Paragraph>
            9.3 如您是未成年人的父母或监护人，发现我们收集了未成年人的信息，请立即联系我们。
          </Paragraph>

          <Divider />

          {/* 第十部分：隐私政策变更 */}
          <Title level={3}>10. 隐私政策的变更</Title>
          <Paragraph>
            10.1 我们可能会适时修订本隐私政策，修订后的政策将在平台上公布。
          </Paragraph>
          <Paragraph>
            10.2 如果修改内容对您的权利产生实质影响，我们会通过站内通知、邮件等方式提前通知您。
          </Paragraph>
          <Paragraph>
            10.3 如您不同意修改后的隐私政策，可以停止使用我们的服务；继续使用即视为接受修改。
          </Paragraph>

          <Divider />

          {/* 第十一部分：联系我们 */}
          <Title level={3}>11. 如何联系我们</Title>
          <Paragraph>
            如您对本隐私政策有任何疑问、意见或建议，或者需要行使您的权利，请通过以下方式联系我们：
            <ul>
              <li>隐私保护专员邮箱：privacy@cloudphone.run</li>
              <li>客服电话：400-123-4567</li>
              <li>通讯地址：[公司地址]</li>
              <li>在线工单：登录平台后提交工单</li>
            </ul>
          </Paragraph>
          <Paragraph>
            我们会在15个工作日内回复您的请求。
          </Paragraph>

          <Alert
            message="您的隐私对我们至关重要"
            description="我们承诺严格遵守本隐私政策，采取一切合理措施保护您的个人信息安全。"
            type="success"
            showIcon
            style={{ marginTop: '32px' }}
          />
        </Typography>
      </Card>
    </div>
  );
};

export default PrivacyPolicy;
