import React from 'react';
import { Card, Row, Col, Tag, Space } from 'antd';
import LazyImage from '@/components/LazyImage';
import './ImageLazyLoadDemo.css';

/**
 * 图片懒加载演示页面
 *
 * 展示如何使用懒加载优化图片密集型页面
 */
const ImageLazyLoadDemo: React.FC = () => {
  // 生成示例图片 URL (使用 placeholder 服务)
  const generateImages = (count: number) => {
    return Array.from({ length: count }, (_, i) => ({
      id: i + 1,
      url: `https://picsum.photos/400/300?random=${i + 1}`,
      title: `图片 ${i + 1}`,
      description: `这是第 ${i + 1} 张图片的描述`,
    }));
  };

  const images = generateImages(50); // 50 张图片

  return (
    <div className="image-lazy-load-demo">
      <Card
        title="图片懒加载演示"
        extra={
          <Space>
            <Tag color="green">✅ 懒加载已启用</Tag>
            <span>共 {images.length} 张图片</span>
          </Space>
        }
      >
        <div className="demo-info">
          <Space direction="vertical" size="small">
            <div>
              <Tag color="blue">💡 性能优化</Tag>
              <span>图片只在进入视口时才加载，大幅减少初始加载时间</span>
            </div>
            <div>
              <Tag color="purple">🎨 过渡效果</Tag>
              <span>支持 blur、opacity 等多种加载过渡效果</span>
            </div>
            <div>
              <Tag color="orange">📊 效果对比</Tag>
              <span>不使用懒加载: 一次性加载所有图片 (50 x ~100KB = 5MB)</span>
            </div>
            <div>
              <Tag color="green">⚡ 使用懒加载</Tag>
              <span>只加载可见图片 (约 6-8 张 = ~600-800KB)</span>
            </div>
          </Space>
        </div>

        <Row gutter={[16, 16]} className="image-grid">
          {images.map((image) => (
            <Col xs={24} sm={12} md={8} lg={6} key={image.id}>
              <Card
                hoverable
                cover={
                  <div className="image-container">
                    <LazyImage
                      src={image.url}
                      alt={image.title}
                      effect="blur"
                      width="100%"
                      height={200}
                      className="lazy-image"
                    />
                  </div>
                }
              >
                <Card.Meta
                  title={image.title}
                  description={image.description}
                />
              </Card>
            </Col>
          ))}
        </Row>

        <div className="performance-note">
          <Tag color="blue">📈 性能对比</Tag>
          <div className="comparison">
            <div className="comparison-item">
              <strong>传统加载:</strong>
              <ul>
                <li>初始加载时间: ~5-8 秒</li>
                <li>网络请求: 50 个</li>
                <li>数据传输: ~5MB</li>
                <li>用户体验: 页面长时间空白</li>
              </ul>
            </div>
            <div className="comparison-item highlight">
              <strong>懒加载:</strong>
              <ul>
                <li>初始加载时间: ~0.5-1 秒</li>
                <li>网络请求: 6-8 个 (按需加载)</li>
                <li>数据传输: ~600-800KB</li>
                <li>用户体验: 快速显示内容</li>
              </ul>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default React.memo(ImageLazyLoadDemo);
