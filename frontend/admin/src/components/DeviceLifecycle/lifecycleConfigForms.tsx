/**
 * lifecycleConfigForms - 生命周期配置表单工具函数
 * 根据规则类型渲染不同的配置表单
 */
import { Form, InputNumber, Select, Switch, Input } from 'antd';

const { Option } = Select;
const { TextArea } = Input;

/**
 * 渲染生命周期规则配置表单
 */
export const renderConfigForm = (type: string) => {
  switch (type) {
    case 'cleanup':
      return (
        <>
          <Form.Item label="空闲时长 (小时)" name={['idleHours']} initialValue={24}>
            <InputNumber min={1} max={720} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="清理动作" name={['action']} initialValue="stop">
            <Select>
              <Option value="stop">停止设备</Option>
              <Option value="delete">删除设备</Option>
              <Option value="archive">归档设备</Option>
            </Select>
          </Form.Item>
          <Form.Item label="包含状态" name={['includeStatuses']}>
            <Select mode="multiple" placeholder="选择要清理的设备状态">
              <Option value="idle">空闲</Option>
              <Option value="error">错误</Option>
              <Option value="stopped">已停止</Option>
            </Select>
          </Form.Item>
          <Form.Item label="排除用户 ID" name={['excludeUsers']}>
            <Select mode="tags" placeholder="输入要排除的用户 ID" />
          </Form.Item>
        </>
      );

    case 'autoscaling':
      return (
        <>
          <Form.Item label="最小设备数" name={['minDevices']} initialValue={1}>
            <InputNumber min={0} max={100} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="最大设备数" name={['maxDevices']} initialValue={10}>
            <InputNumber min={1} max={1000} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="扩容阈值 (%)" name={['scaleUpThreshold']} initialValue={80}>
            <InputNumber min={50} max={100} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="缩容阈值 (%)" name={['scaleDownThreshold']} initialValue={30}>
            <InputNumber min={0} max={50} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="冷却时间 (分钟)" name={['cooldownMinutes']} initialValue={5}>
            <InputNumber min={1} max={60} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="目标用户" name={['targetUserId']}>
            <Input placeholder="留空则应用于所有用户" />
          </Form.Item>
        </>
      );

    case 'backup':
      return (
        <>
          <Form.Item label="备份类型" name={['backupType']} initialValue="snapshot">
            <Select>
              <Option value="snapshot">快照</Option>
              <Option value="full">完整备份</Option>
              <Option value="incremental">增量备份</Option>
            </Select>
          </Form.Item>
          <Form.Item label="保留天数" name={['retentionDays']} initialValue={7}>
            <InputNumber min={1} max={365} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="最大备份数" name={['maxBackups']} initialValue={5}>
            <InputNumber min={1} max={50} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="备份范围" name={['scope']} initialValue="all">
            <Select>
              <Option value="all">所有设备</Option>
              <Option value="active">活跃设备</Option>
              <Option value="critical">关键设备</Option>
            </Select>
          </Form.Item>
          <Form.Item
            label="压缩备份"
            name={['compress']}
            valuePropName="checked"
            initialValue={true}
          >
            <Switch />
          </Form.Item>
        </>
      );

    case 'expiration-warning':
      return (
        <>
          <Form.Item label="提前天数" name={['daysBeforeExpiration']} initialValue={3}>
            <InputNumber min={1} max={30} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="通知渠道" name={['channels']} initialValue={['email']}>
            <Select mode="multiple">
              <Option value="email">邮件</Option>
              <Option value="sms">短信</Option>
              <Option value="websocket">站内通知</Option>
            </Select>
          </Form.Item>
          <Form.Item
            label="重复提醒"
            name={['repeat']}
            valuePropName="checked"
            initialValue={false}
          >
            <Switch />
          </Form.Item>
          <Form.Item label="重复间隔 (天)" name={['repeatInterval']} initialValue={1}>
            <InputNumber min={1} max={7} style={{ width: '100%' }} />
          </Form.Item>
        </>
      );

    default:
      return (
        <Form.Item label="自定义配置 (JSON)" name={['custom']}>
          <TextArea rows={6} placeholder='{"key": "value"}' />
        </Form.Item>
      );
  }
};
