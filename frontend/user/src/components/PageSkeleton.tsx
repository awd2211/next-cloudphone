/**
 * 页面骨架屏组件
 * 提供各种页面加载时的骨架屏效果
 */

import { Card, Skeleton, Space } from 'antd';
import React from 'react';

/**
 * 表格骨架屏
 */
export function TableSkeleton({ rows = 10 }: { rows?: number }) {
  return (
    <Card>
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        {/* 搜索栏骨架 */}
        <div style={{ display: 'flex', gap: '16px' }}>
          <Skeleton.Input active style={{ width: 200 }} />
          <Skeleton.Button active />
          <Skeleton.Button active />
        </div>

        {/* 表格骨架 */}
        <Skeleton active paragraph={{ rows }} />
      </Space>
    </Card>
  );
}

/**
 * 详情页骨架屏
 */
export function DetailSkeleton() {
  return (
    <Card>
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        {/* 标题骨架 */}
        <Skeleton.Input active style={{ width: 300 }} size="large" />

        {/* 描述列表骨架 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index}>
              <Skeleton.Input active style={{ width: 100, marginBottom: 8 }} size="small" />
              <Skeleton.Input active style={{ width: '100%' }} />
            </div>
          ))}
        </div>

        {/* 操作按钮骨架 */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <Skeleton.Button active />
          <Skeleton.Button active />
          <Skeleton.Button active />
        </div>
      </Space>
    </Card>
  );
}

/**
 * 表单骨架屏
 */
export function FormSkeleton({ fields = 6 }: { fields?: number }) {
  return (
    <Card>
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        {Array.from({ length: fields }).map((_, index) => (
          <div key={index}>
            <Skeleton.Input active style={{ width: 120, marginBottom: 8 }} size="small" />
            <Skeleton.Input active block />
          </div>
        ))}

        {/* 提交按钮骨架 */}
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <Skeleton.Button active />
          <Skeleton.Button active />
        </div>
      </Space>
    </Card>
  );
}

/**
 * 仪表板统计卡片骨架屏
 */
export function DashboardSkeleton() {
  return (
    <Space direction="vertical" style={{ width: '100%' }} size="large">
      {/* 统计卡片行 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index}>
            <Skeleton active paragraph={{ rows: 1 }} />
          </Card>
        ))}
      </div>

      {/* 图表区域 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
        {Array.from({ length: 2 }).map((_, index) => (
          <Card key={index}>
            <Skeleton active paragraph={{ rows: 8 }} />
          </Card>
        ))}
      </div>

      {/* 表格区域 */}
      <Card>
        <Skeleton active paragraph={{ rows: 6 }} />
      </Card>
    </Space>
  );
}

/**
 * 卡片列表骨架屏
 */
export function CardListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
      {Array.from({ length: count }).map((_, index) => (
        <Card key={index}>
          <Skeleton active avatar paragraph={{ rows: 3 }} />
        </Card>
      ))}
    </div>
  );
}

/**
 * 通用内容骨架屏
 */
export function ContentSkeleton({ rows = 5 }: { rows?: number }) {
  return <Skeleton active paragraph={{ rows }} />;
}

/**
 * 带标题的卡片骨架屏
 */
export function CardSkeleton({ hasAvatar = false, rows = 4 }: { hasAvatar?: boolean; rows?: number }) {
  return (
    <Card>
      <Skeleton active avatar={hasAvatar} paragraph={{ rows }} />
    </Card>
  );
}
