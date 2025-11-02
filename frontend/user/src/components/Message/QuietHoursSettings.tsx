import React from 'react';
import { Card, Form, Row, Col, Space, Switch, Typography, TimePicker, Alert } from 'antd';
import { ClockCircleOutlined } from '@ant-design/icons';
import type { FormInstance } from 'antd/es/form';

const { Text, Paragraph } = Typography;

interface QuietHoursSettingsProps {
  form: FormInstance;
}

/**
 * 免打扰时间设置组件
 * 配置免打扰时间段
 */
export const QuietHoursSettings: React.FC<QuietHoursSettingsProps> = React.memo(({
  form,
}) => {
  return (
    <Card
      title={
        <Space>
          <ClockCircleOutlined />
          <span>免打扰时间</span>
        </Space>
      }
      style={{ marginBottom: 16 }}
    >
      <Paragraph type="secondary">
        在指定时间段内，系统将不会发送推送通知和声音提醒（紧急通知除外）
      </Paragraph>

      <Form.Item
        name="quietHoursEnabled"
        valuePropName="checked"
        label={
          <Space>
            <span>启用免打扰</span>
            <Text type="secondary" style={{ fontWeight: 'normal' }}>
              (建议在休息时间启用)
            </Text>
          </Space>
        }
      >
        <Switch />
      </Form.Item>

      <Form.Item
        noStyle
        shouldUpdate={(prevValues, currentValues) =>
          prevValues.quietHoursEnabled !== currentValues.quietHoursEnabled
        }
      >
        {({ getFieldValue }) =>
          getFieldValue('quietHoursEnabled') ? (
            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Form.Item
                  name="quietHoursStart"
                  label="开始时间"
                  rules={[
                    {
                      required: getFieldValue('quietHoursEnabled'),
                      message: '请选择开始时间',
                    },
                  ]}
                >
                  <TimePicker
                    format="HH:mm"
                    style={{ width: '100%' }}
                    placeholder="选择开始时间"
                  />
                </Form.Item>
              </Col>

              <Col xs={24} sm={12}>
                <Form.Item
                  name="quietHoursEnd"
                  label="结束时间"
                  rules={[
                    {
                      required: getFieldValue('quietHoursEnabled'),
                      message: '请选择结束时间',
                    },
                  ]}
                >
                  <TimePicker
                    format="HH:mm"
                    style={{ width: '100%' }}
                    placeholder="选择结束时间"
                  />
                </Form.Item>
              </Col>
            </Row>
          ) : null
        }
      </Form.Item>

      {form.getFieldValue('quietHoursEnabled') && (
        <Alert
          message="免打扰期间，紧急通知（如安全提醒）仍会正常发送"
          type="warning"
          showIcon
        />
      )}
    </Card>
  );
});

QuietHoursSettings.displayName = 'QuietHoursSettings';
