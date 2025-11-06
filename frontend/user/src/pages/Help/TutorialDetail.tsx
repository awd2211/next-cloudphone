import React, { useState, useEffect } from 'react';
import {
  Card,
  Steps,
  Button,
  Space,
  Tag,
  Typography,
  Row,
  Col,
  Divider,
  message,
  Image,
  Alert,
} from 'antd';
import {
  ClockCircleOutlined,
  EyeOutlined,
  LikeOutlined,
  CheckCircleOutlined,
  LeftOutlined,
  RightOutlined,
  LikeFilled,
  BookOutlined,
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getTutorialDetail,
  recordTutorialView,
  likeContent,
  TutorialDifficulty,
  type Tutorial,
} from '@/services/help';

const { Title, Text, Paragraph } = Typography;
const { Step } = Steps;

// 难度配置
const difficultyConfig: Record<TutorialDifficulty, { label: string; color: string }> = {
  [TutorialDifficulty.BEGINNER]: { label: '入门', color: 'green' },
  [TutorialDifficulty.INTERMEDIATE]: { label: '进阶', color: 'orange' },
  [TutorialDifficulty.ADVANCED]: { label: '高级', color: 'red' },
};

const TutorialDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [tutorial, setTutorial] = useState<Tutorial | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [liked, setLiked] = useState(false);
  const [completed, setCompleted] = useState(false);

  // 加载教程详情
  const loadTutorial = async () => {
    if (!id) return;

    setLoading(true);
    try {
      const data = await getTutorialDetail(id);
      setTutorial(data);

      // 记录浏览
      recordTutorialView(id).catch(() => {
        // 忽略错误
      });
    } catch (error) {
      message.error('加载教程失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTutorial();
  }, [id]);

  // 点赞
  const handleLike = async () => {
    if (!id || liked) return;

    try {
      await likeContent(id, 'tutorial');
      setLiked(true);
      message.success('点赞成功！');
      loadTutorial();
    } catch (error) {
      message.error('点赞失败');
    }
  };

  // 上一步
  const handlePrevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // 下一步
  const handleNextStep = () => {
    if (tutorial && currentStep < tutorial.steps.length - 1) {
      setCurrentStep(currentStep + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // 完成教程
  const handleComplete = () => {
    setCompleted(true);
    message.success('恭喜您完成本教程！');
  };

  if (loading || !tutorial) {
    return <Card loading={loading} />;
  }

  const diffConfig = difficultyConfig[tutorial.difficulty];
  const currentStepData = tutorial.steps[currentStep];

  // Guard: If step data doesn't exist, reset to first step
  if (!currentStepData) {
    setCurrentStep(0);
    return <Card loading={true} />;
  }

  const isLastStep = currentStep === tutorial.steps.length - 1;

  return (
    <div>
      {/* 教程信息 */}
      <Card style={{ marginBottom: 16 }}>
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
            <Space>
              <Button icon={<LeftOutlined />} onClick={() => navigate('/help/tutorials')}>
                返回教程列表
              </Button>
            </Space>
            <Space>
              <Button
                type={liked ? 'primary' : 'default'}
                icon={liked ? <LikeFilled /> : <LikeOutlined />}
                onClick={handleLike}
                disabled={liked}
              >
                {liked ? '已点赞' : '点赞'} ({tutorial.likes})
              </Button>
            </Space>
          </Space>

          <div>
            <Space style={{ marginBottom: 12 }}>
              <Tag color={diffConfig.color}>{diffConfig.label}</Tag>
              {tutorial.tags.map((tag) => (
                <Tag key={tag}>{tag}</Tag>
              ))}
            </Space>

            <Title level={2} style={{ marginBottom: 12 }}>
              {tutorial.title}
            </Title>

            <Paragraph type="secondary" style={{ fontSize: 16 }}>
              {tutorial.description}
            </Paragraph>

            <Space size="large" style={{ fontSize: 14 }}>
              <Space size="small">
                <ClockCircleOutlined />
                <span>预计 {tutorial.duration} 分钟</span>
              </Space>
              <Space size="small">
                <BookOutlined />
                <span>{tutorial.steps.length} 个步骤</span>
              </Space>
              <Space size="small">
                <EyeOutlined />
                <span>{tutorial.views} 次浏览</span>
              </Space>
              <Space size="small">
                <CheckCircleOutlined style={{ color: '#52c41a' }} />
                <span>{tutorial.completedCount} 人完成</span>
              </Space>
            </Space>
          </div>
        </Space>
      </Card>

      <Row gutter={16}>
        {/* 步骤列表 */}
        <Col xs={24} lg={6}>
          <Card title="教程步骤" style={{ marginBottom: 16 }}>
            <Steps
              direction="vertical"
              current={currentStep}
              onChange={setCurrentStep}
              style={{ cursor: 'pointer' }}
            >
              {tutorial.steps.map((step, index) => (
                <Step
                  key={index}
                  title={step.title}
                  description={
                    currentStep === index ? (
                      <Tag color="blue">当前步骤</Tag>
                    ) : currentStep > index ? (
                      <Tag color="green" icon={<CheckCircleOutlined />}>
                        已完成
                      </Tag>
                    ) : null
                  }
                />
              ))}
            </Steps>

            {completed && (
              <Alert
                message="教程已完成"
                description="恭喜您完成本教程！"
                type="success"
                showIcon
                icon={<CheckCircleOutlined />}
                style={{ marginTop: 16 }}
              />
            )}
          </Card>
        </Col>

        {/* 步骤内容 */}
        <Col xs={24} lg={18}>
          <Card
            title={
              <Space>
                <span>步骤 {currentStep + 1}</span>
                <Tag color="blue">{currentStepData!.title}</Tag>
              </Space>
            }
            extra={
              <Text type="secondary">
                {currentStep + 1} / {tutorial.steps.length}
              </Text>
            }
          >
            <Space direction="vertical" style={{ width: '100%' }} size="large">
              {/* 步骤描述 */}
              <div>
                <Paragraph
                  style={{
                    fontSize: 16,
                    lineHeight: '1.8',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {currentStepData!.description}
                </Paragraph>
              </div>

              {/* 步骤图片 */}
              {currentStepData!.image && (
                <div>
                  <Image
                    src={currentStepData!.image}
                    alt={currentStepData!.title}
                    style={{ width: '100%', borderRadius: '8px' }}
                  />
                </div>
              )}

              {/* 步骤视频 */}
              {currentStepData!.video && (
                <div
                  style={{
                    position: 'relative',
                    paddingTop: '56.25%',
                    background: '#000',
                    borderRadius: '8px',
                    overflow: 'hidden',
                  }}
                >
                  <video
                    controls
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                    }}
                  >
                    <source src={currentStepData!.video} type="video/mp4" />
                    您的浏览器不支持视频播放
                  </video>
                </div>
              )}

              {/* 代码示例 */}
              {currentStepData!.code && (
                <div>
                  <Text strong style={{ marginBottom: 8, display: 'block' }}>
                    代码示例:
                  </Text>
                  <pre
                    style={{
                      background: '#f5f5f5',
                      padding: '16px',
                      borderRadius: '4px',
                      overflow: 'auto',
                      fontSize: 14,
                      lineHeight: '1.6',
                    }}
                  >
                    <code>{currentStepData!.code}</code>
                  </pre>
                </div>
              )}

              <Divider />

              {/* 导航按钮 */}
              <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                <Button
                  icon={<LeftOutlined />}
                  onClick={handlePrevStep}
                  disabled={currentStep === 0}
                >
                  上一步
                </Button>

                {isLastStep ? (
                  <Button
                    type="primary"
                    icon={<CheckCircleOutlined />}
                    onClick={handleComplete}
                    disabled={completed}
                  >
                    {completed ? '已完成' : '完成教程'}
                  </Button>
                ) : (
                  <Button type="primary" onClick={handleNextStep} icon={<RightOutlined />}>
                    下一步
                  </Button>
                )}
              </Space>
            </Space>
          </Card>

          {/* 提示 */}
          {isLastStep && !completed && (
            <Alert
              message="即将完成"
              description="完成本步骤后，点击「完成教程」按钮即可完成整个教程"
              type="info"
              showIcon
              style={{ marginTop: 16 }}
            />
          )}
        </Col>
      </Row>

      {/* 底部操作 */}
      <Card style={{ marginTop: 16, textAlign: 'center' }}>
        <Space direction="vertical">
          <Text>觉得这个教程有帮助吗？</Text>
          <Space>
            <Button
              type={liked ? 'primary' : 'default'}
              icon={liked ? <LikeFilled /> : <LikeOutlined />}
              onClick={handleLike}
              disabled={liked}
            >
              {liked ? '已点赞' : '点赞'}
            </Button>
            <Button onClick={() => navigate('/help/tutorials')}>浏览更多教程</Button>
            <Button onClick={() => navigate('/help')}>返回帮助中心</Button>
          </Space>
        </Space>
      </Card>
    </div>
  );
};

export default TutorialDetail;
