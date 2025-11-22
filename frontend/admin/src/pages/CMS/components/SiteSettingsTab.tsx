/**
 * 网站设置管理 Tab
 */
import React, { useEffect, useState } from 'react';
import { Form, Input, Button, message, Spin, Collapse, Space, Card } from 'antd';
import { SaveOutlined, ReloadOutlined } from '@ant-design/icons';
import * as cmsService from '@/services/cms';

const { Panel } = Collapse;
const { TextArea } = Input;

const SiteSettingsTab: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<Record<string, any>>({});

  const loadSettings = async () => {
    setLoading(true);
    try {
      const data = await cmsService.getFormattedSettings();
      setSettings(data);
      // 将嵌套对象扁平化为表单字段
      const flatData: Record<string, any> = {};
      Object.entries(data).forEach(([category, values]) => {
        if (typeof values === 'object' && values !== null) {
          Object.entries(values as Record<string, any>).forEach(([key, value]) => {
            if (typeof value === 'object' && !Array.isArray(value)) {
              flatData[`${category}.${key}`] = JSON.stringify(value, null, 2);
            } else if (Array.isArray(value)) {
              flatData[`${category}.${key}`] = JSON.stringify(value, null, 2);
            } else {
              flatData[`${category}.${key}`] = value;
            }
          });
        }
      });
      form.setFieldsValue(flatData);
    } catch (error) {
      message.error('加载设置失败');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const values = await form.validateFields();
      // 转换为 key-value 格式
      const settingsToUpdate: Record<string, string> = {};
      Object.entries(values).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          settingsToUpdate[key] = String(value);
        }
      });
      await cmsService.batchUpdateSettings(settingsToUpdate);
      message.success('设置保存成功');
      loadSettings();
    } catch (error) {
      message.error('保存设置失败');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 50 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={loadSettings}>
            刷新
          </Button>
          <Button type="primary" icon={<SaveOutlined />} onClick={handleSave} loading={saving}>
            保存所有设置
          </Button>
        </Space>
      </div>

      <Form form={form} layout="vertical">
        <Collapse defaultActiveKey={['company', 'contact', 'seo', 'social']}>
          <Panel header="公司信息" key="company">
            <Form.Item label="公司名称" name="company.name">
              <Input placeholder="请输入公司名称" />
            </Form.Item>
            <Form.Item label="公司口号" name="company.slogan">
              <Input placeholder="请输入公司口号" />
            </Form.Item>
            <Form.Item label="成立年份" name="company.founded_year">
              <Input placeholder="请输入成立年份" />
            </Form.Item>
            <Form.Item
              label="办公地点 (JSON 数组)"
              name="company.offices"
              tooltip="JSON 格式，包含 city, address, phone 字段"
            >
              <TextArea
                rows={8}
                placeholder='[{"city": "北京总部", "address": "...", "phone": "..."}]'
              />
            </Form.Item>
          </Panel>

          <Panel header="联系方式" key="contact">
            <Form.Item label="客服电话" name="contact.phone">
              <Input placeholder="请输入客服电话" />
            </Form.Item>
            <Form.Item label="客服邮箱" name="contact.email">
              <Input placeholder="请输入客服邮箱" />
            </Form.Item>
            <Form.Item label="微信客服" name="contact.wechat">
              <Input placeholder="请输入微信客服号" />
            </Form.Item>
            <Form.Item label="QQ 群" name="contact.qq_group">
              <Input placeholder="请输入 QQ 群号" />
            </Form.Item>
            <Form.Item label="隐私问题邮箱" name="contact.privacy_email">
              <Input placeholder="请输入隐私问题邮箱" />
            </Form.Item>
            <Form.Item label="退款问题邮箱" name="contact.refund_email">
              <Input placeholder="请输入退款问题邮箱" />
            </Form.Item>
            <Form.Item label="SLA 问题邮箱" name="contact.sla_email">
              <Input placeholder="请输入 SLA 问题邮箱" />
            </Form.Item>
            <Form.Item label="服务状态页" name="contact.status_page">
              <Input placeholder="请输入服务状态页 URL" />
            </Form.Item>
          </Panel>

          <Panel header="SEO 设置" key="seo">
            <Form.Item label="默认标题" name="seo.default_title">
              <Input placeholder="请输入网站默认标题" />
            </Form.Item>
            <Form.Item label="默认描述" name="seo.default_description">
              <TextArea rows={3} placeholder="请输入网站默认描述" />
            </Form.Item>
            <Form.Item label="默认关键词" name="seo.default_keywords">
              <Input placeholder="请输入关键词，用逗号分隔" />
            </Form.Item>
          </Panel>

          <Panel header="社交媒体" key="social">
            <Form.Item
              label="社交媒体链接 (JSON)"
              name="social.links"
              tooltip="JSON 格式，包含各社交平台账号"
            >
              <TextArea
                rows={5}
                placeholder='{"wechat": "...", "weibo": "...", "github": "..."}'
              />
            </Form.Item>
          </Panel>
        </Collapse>
      </Form>
    </div>
  );
};

export default SiteSettingsTab;
