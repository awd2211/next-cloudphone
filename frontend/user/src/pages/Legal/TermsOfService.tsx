import React from 'react';
import { Card, Typography, Divider, Alert } from 'antd';
import { SafetyOutlined, ClockCircleOutlined } from '@ant-design/icons';

const { Title, Paragraph, Text } = Typography;

/**
 * 服务条款页面
 *
 * 功能：
 * 1. 展示云手机平台服务条款
 * 2. 用户权利和义务说明
 * 3. 服务使用规范
 * 4. 免责声明
 */
const TermsOfService: React.FC = () => {
  return (
    <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
      <Card>
        <Typography>
          {/* 标题 */}
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <Title level={2}>
              <SafetyOutlined style={{ marginRight: '8px' }} />
              云手机平台服务条款
            </Title>
            <Text type="secondary">
              <ClockCircleOutlined style={{ marginRight: '4px' }} />
              最后更新：2025年1月15日
            </Text>
          </div>

          <Alert
            message="重要提示"
            description="请您仔细阅读本服务条款。使用本平台服务即表示您同意并接受本服务条款的约束。"
            type="info"
            showIcon
            style={{ marginBottom: '24px' }}
          />

          <Divider />

          {/* 第一部分：服务说明 */}
          <Title level={3}>1. 服务说明</Title>
          <Paragraph>
            1.1 云手机平台（以下简称"本平台"）是一个提供云端Android设备租赁和管理服务的平台。
          </Paragraph>
          <Paragraph>
            1.2 本平台提供的服务包括但不限于：
            <ul>
              <li>云手机设备的创建、启动、停止、重启等管理功能</li>
              <li>设备远程控制和屏幕投射功能</li>
              <li>应用安装、卸载和管理功能</li>
              <li>设备快照备份和恢复功能</li>
              <li>设备监控和资源使用统计</li>
            </ul>
          </Paragraph>
          <Paragraph>
            1.3 本平台保留随时修改、中断或终止部分或全部服务的权利，恕不另行通知。
          </Paragraph>

          <Divider />

          {/* 第二部分：账户注册与使用 */}
          <Title level={3}>2. 账户注册与使用</Title>
          <Paragraph>
            2.1 用户需要注册账户才能使用本平台服务。注册时需提供真实、准确、完整的个人信息。
          </Paragraph>
          <Paragraph>
            2.2 用户应妥善保管账户密码，对使用该账户进行的所有操作承担责任。
          </Paragraph>
          <Paragraph>
            2.3 如发现账户被盗用或存在安全漏洞，应立即通知本平台。
          </Paragraph>
          <Paragraph>
            2.4 禁止将账户转让、出租、出借给他人使用。
          </Paragraph>

          <Divider />

          {/* 第三部分：用户权利与义务 */}
          <Title level={3}>3. 用户权利与义务</Title>
          <Paragraph>
            <Text strong>3.1 用户权利</Text>
            <ul>
              <li>在购买服务后，有权使用对应套餐的所有功能</li>
              <li>有权随时查询账户余额、使用记录和账单明细</li>
              <li>有权对服务质量提出意见和建议</li>
              <li>有权要求本平台保护个人隐私和数据安全</li>
            </ul>
          </Paragraph>
          <Paragraph>
            <Text strong>3.2 用户义务</Text>
            <ul>
              <li>遵守中华人民共和国相关法律法规</li>
              <li>不得利用本平台从事违法违规活动</li>
              <li>不得利用本平台发送垃圾信息、恶意软件或进行网络攻击</li>
              <li>不得破坏或干扰本平台的正常运行</li>
              <li>按时支付服务费用</li>
              <li>合理使用系统资源，不得滥用或浪费</li>
            </ul>
          </Paragraph>

          <Divider />

          {/* 第四部分：服务费用与支付 */}
          <Title level={3}>4. 服务费用与支付</Title>
          <Paragraph>
            4.1 本平台提供的服务为付费服务，具体收费标准以套餐页面显示为准。
          </Paragraph>
          <Paragraph>
            4.2 用户可以通过微信支付、支付宝等方式进行充值和支付。
          </Paragraph>
          <Paragraph>
            4.3 服务费用一经支付，除本平台原因导致的问题外，概不退还。
          </Paragraph>
          <Paragraph>
            4.4 用户账户余额不足时，相关服务将自动停止，直至充值后恢复。
          </Paragraph>

          <Divider />

          {/* 第五部分：服务保障 */}
          <Title level={3}>5. 服务保障</Title>
          <Paragraph>
            5.1 本平台承诺提供99.9%的服务可用性（不包括计划内维护时间）。
          </Paragraph>
          <Paragraph>
            5.2 本平台将采取合理的技术和管理措施保障系统安全稳定运行。
          </Paragraph>
          <Paragraph>
            5.3 如遇不可抗力（自然灾害、战争、政府行为等）导致服务中断，本平台不承担责任。
          </Paragraph>

          <Divider />

          {/* 第六部分：数据安全与隐私保护 */}
          <Title level={3}>6. 数据安全与隐私保护</Title>
          <Paragraph>
            6.1 本平台重视用户隐私保护，具体内容请参阅《隐私政策》。
          </Paragraph>
          <Paragraph>
            6.2 用户在云手机中存储的数据由用户自行负责备份，本平台不对数据丢失承担责任。
          </Paragraph>
          <Paragraph>
            6.3 本平台建议用户定期使用快照功能备份重要数据。
          </Paragraph>

          <Divider />

          {/* 第七部分：知识产权 */}
          <Title level={3}>7. 知识产权</Title>
          <Paragraph>
            7.1 本平台的所有内容（包括但不限于文字、图片、代码、界面设计）的知识产权归本平台所有。
          </Paragraph>
          <Paragraph>
            7.2 未经本平台书面许可，任何人不得复制、传播、修改本平台的内容。
          </Paragraph>

          <Divider />

          {/* 第八部分：免责声明 */}
          <Title level={3}>8. 免责声明</Title>
          <Paragraph>
            8.1 本平台对用户在云手机中安装的应用和存储的内容不承担审查义务。
          </Paragraph>
          <Paragraph>
            8.2 因用户违法违规使用本平台导致的一切后果，由用户自行承担。
          </Paragraph>
          <Paragraph>
            8.3 本平台不对用户因使用或无法使用本服务而遭受的任何间接、偶然、特殊或惩罚性损害承担责任。
          </Paragraph>

          <Divider />

          {/* 第九部分：服务终止 */}
          <Title level={3}>9. 服务终止</Title>
          <Paragraph>
            9.1 用户可以随时申请注销账户，注销后账户余额不予退还。
          </Paragraph>
          <Paragraph>
            9.2 如用户违反本服务条款，本平台有权暂停或终止提供服务，且不退还任何费用。
          </Paragraph>

          <Divider />

          {/* 第十部分：法律适用与争议解决 */}
          <Title level={3}>10. 法律适用与争议解决</Title>
          <Paragraph>
            10.1 本服务条款的订立、执行和解释及争议的解决均适用中华人民共和国法律。
          </Paragraph>
          <Paragraph>
            10.2 如双方就本服务条款发生争议，应友好协商解决；协商不成的，任何一方均可向本平台所在地人民法院提起诉讼。
          </Paragraph>

          <Divider />

          {/* 第十一部分：条款修改 */}
          <Title level={3}>11. 条款修改</Title>
          <Paragraph>
            11.1 本平台有权随时修改本服务条款，修改后的条款将在平台上公布。
          </Paragraph>
          <Paragraph>
            11.2 如用户不同意修改后的条款，可以停止使用本服务；继续使用即视为接受修改后的条款。
          </Paragraph>

          <Divider />

          {/* 联系方式 */}
          <Title level={3}>12. 联系我们</Title>
          <Paragraph>
            如您对本服务条款有任何疑问，请通过以下方式联系我们：
            <ul>
              <li>客服邮箱：support@cloudphone.com</li>
              <li>客服电话：400-123-4567</li>
              <li>工单系统：登录平台后提交工单</li>
            </ul>
          </Paragraph>

          <Alert
            message="感谢您使用云手机平台！"
            type="success"
            showIcon
            style={{ marginTop: '32px' }}
          />
        </Typography>
      </Card>
    </div>
  );
};

export default TermsOfService;
