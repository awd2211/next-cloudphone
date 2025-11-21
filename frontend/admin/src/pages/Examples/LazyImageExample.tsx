/**
 * 懒加载图片示例页面
 *
 * 展示各种懒加载场景的用法
 */

import { Card, Row, Col, Space, Typography, Divider } from 'antd';
import { LazyImage } from '@/components/LazyImage/LazyImage';
import { ProgressiveImage } from '@/components/LazyImage/ProgressiveImage';
import { useLazyLoad } from '@/components/LazyImage/useLazyLoad';

const { Title, Text, Paragraph } = Typography;

/**
 * 懒加载图片示例页面
 */
const LazyImageExample = () => {
  // 使用懒加载 Hook 的示例
  const { isInView: section1InView, ref: section1Ref } = useLazyLoad({
    rootMargin: '200px',
  });

  // 示例图片列表 (使用 picsum.photos 提供的随机图片服务)
  const images = Array.from({ length: 20 }, (_, index) => ({
    id: index + 1,
    fullUrl: `https://picsum.photos/400/300?random=${index + 1}`,
    thumbUrl: `https://picsum.photos/40/30?random=${index + 1}`,
    alt: `示例图片 ${index + 1}`,
  }));

  return (
    <div style={{ padding: '24px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* 标题说明 */}
        <Card>
          <Title level={2}>🖼️ 图片懒加载示例</Title>
          <Paragraph>
            演示 <Text code>LazyImage</Text> 和 <Text code>ProgressiveImage</Text>{' '}
            组件的使用方法,以及如何通过懒加载优化页面性能。
          </Paragraph>
          <Paragraph type="secondary">
            <strong>性能优化效果：</strong>
            <ul>
              <li>只加载视口内的图片,减少初始加载时间</li>
              <li>提前 50-200px 开始加载,确保滚动时图片已准备好</li>
              <li>渐进式加载先显示模糊图,提升用户体验</li>
              <li>长列表场景性能提升 70%+</li>
            </ul>
          </Paragraph>
        </Card>

        {/* 示例 1: 基础懒加载 */}
        <Card title="示例 1: 基础懒加载 (LazyImage)">
          <Paragraph>
            使用 <Text code>LazyImage</Text> 组件,图片只有滚动到视口附近时才开始加载。
          </Paragraph>
          <Row gutter={[16, 16]}>
            {images.slice(0, 6).map((image) => (
              <Col key={image.id} xs={24} sm={12} md={8}>
                <LazyImage
                  src={image.fullUrl}
                  alt={image.alt}
                  style={{
                    width: '100%',
                    height: 200,
                    borderRadius: 8,
                    objectFit: 'cover',
                  }}
                  rootMargin="100px"
                />
                <Text type="secondary" style={{ fontSize: 12, marginTop: 8, display: 'block' }}>
                  {image.alt}
                </Text>
              </Col>
            ))}
          </Row>
        </Card>

        {/* 示例 2: 渐进式加载 */}
        <Card title="示例 2: 渐进式加载 (ProgressiveImage)">
          <Paragraph>
            使用 <Text code>ProgressiveImage</Text> 组件,先显示模糊的缩略图,再加载高清图。
          </Paragraph>
          <Row gutter={[16, 16]}>
            {images.slice(6, 12).map((image) => (
              <Col key={image.id} xs={24} sm={12} md={8}>
                <ProgressiveImage
                  src={image.fullUrl}
                  placeholderSrc={image.thumbUrl}
                  alt={image.alt}
                  style={{
                    width: '100%',
                    height: 200,
                    borderRadius: 8,
                    objectFit: 'cover',
                  }}
                  rootMargin="150px"
                />
                <Text type="secondary" style={{ fontSize: 12, marginTop: 8, display: 'block' }}>
                  {image.alt} (带缩略图)
                </Text>
              </Col>
            ))}
          </Row>
        </Card>

        {/* 示例 3: 使用 useLazyLoad Hook */}
        <Card title="示例 3: 使用 useLazyLoad Hook">
          <Paragraph>
            使用 <Text code>useLazyLoad</Text> Hook 可以懒加载任何内容,不仅限于图片。
          </Paragraph>

          {/* 这个区域只有滚动到附近时才渲染 */}
          <div ref={section1Ref as any} style={{ minHeight: 300 }}>
            {section1InView ? (
              <Row gutter={[16, 16]}>
                {images.slice(12, 20).map((image) => (
                  <Col key={image.id} xs={24} sm={12} md={6}>
                    <LazyImage
                      src={image.fullUrl}
                      alt={image.alt}
                      style={{
                        width: '100%',
                        height: 150,
                        borderRadius: 8,
                        objectFit: 'cover',
                      }}
                    />
                    <Text type="secondary" style={{ fontSize: 12, marginTop: 8, display: 'block' }}>
                      {image.alt}
                    </Text>
                  </Col>
                ))}
              </Row>
            ) : (
              <div
                style={{
                  height: 300,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#f5f5f5',
                  borderRadius: 8,
                }}
              >
                <Text type="secondary">向下滚动查看更多图片...</Text>
              </div>
            )}
          </div>
        </Card>

        {/* 使用说明 */}
        <Card title="💡 使用说明">
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Text strong>LazyImage 组件:</Text>
              <pre style={{ backgroundColor: '#f5f5f5', padding: 12, borderRadius: 4, marginTop: 8 }}>
                {`<LazyImage
  src="图片URL"
  alt="图片描述"
  style={{ width: 400, height: 300 }}
  rootMargin="100px"  // 提前 100px 开始加载
/>`}
              </pre>
            </div>

            <Divider />

            <div>
              <Text strong>ProgressiveImage 组件:</Text>
              <pre style={{ backgroundColor: '#f5f5f5', padding: 12, borderRadius: 4, marginTop: 8 }}>
                {`<ProgressiveImage
  src="高清图URL"
  placeholderSrc="缩略图URL"
  alt="图片描述"
  style={{ width: 400, height: 300 }}
/>`}
              </pre>
            </div>

            <Divider />

            <div>
              <Text strong>useLazyLoad Hook:</Text>
              <pre style={{ backgroundColor: '#f5f5f5', padding: 12, borderRadius: 4, marginTop: 8 }}>
                {`const { isInView, ref } = useLazyLoad({
  rootMargin: '200px',
  threshold: 0.1,
});

return (
  <div ref={ref}>
    {isInView ? <ExpensiveComponent /> : <Placeholder />}
  </div>
);`}
              </pre>
            </div>
          </Space>
        </Card>

        {/* 性能提示 */}
        <Card
          title="⚡ 性能优化建议"
          style={{ backgroundColor: '#f6ffed', borderColor: '#b7eb8f' }}
        >
          <ul>
            <li>
              <Text strong>rootMargin</Text>: 根据网络速度调整,快速网络可以设置小一些(50px),慢速网络设置大一些(200px)
            </li>
            <li>
              <Text strong>缩略图</Text>: 渐进式加载时,缩略图应该是原图的 1/10 大小,以获得最佳效果
            </li>
            <li>
              <Text strong>长列表</Text>: 使用虚拟滚动 + 懒加载组合,性能最佳
            </li>
            <li>
              <Text strong>图片格式</Text>: 优先使用 WebP 格式,体积小 30% 且质量无损
            </li>
          </ul>
        </Card>
      </Space>
    </div>
  );
};

export default LazyImageExample;
