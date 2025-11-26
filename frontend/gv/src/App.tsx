import { RouterProvider } from 'react-router-dom';
import { ConfigProvider, App as AntApp, theme } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { router } from './router';
import { ErrorBoundary } from './components/ErrorBoundary';
import { QueryProvider } from './lib/react-query';
import { SocketProvider } from './contexts/SocketContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';

// 政务风格主题配置
const govTheme = {
  // 设计令牌 (Design Tokens)
  token: {
    // 品牌色
    colorPrimary: '#1677ff',
    colorSuccess: '#52c41a',
    colorWarning: '#faad14',
    colorError: '#ff4d4f',
    colorInfo: '#1677ff',

    // 中性色
    colorTextBase: '#262626',
    colorBgBase: '#ffffff',
    colorBgLayout: '#f0f2f5',

    // 圆角
    borderRadius: 6,
    borderRadiusLG: 8,
    borderRadiusSM: 4,
    borderRadiusXS: 2,

    // 字体
    fontFamily: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', 'PingFang SC', 'Microsoft YaHei', sans-serif`,
    fontSize: 14,
    fontSizeLG: 16,
    fontSizeSM: 12,
    fontSizeHeading1: 38,
    fontSizeHeading2: 30,
    fontSizeHeading3: 24,
    fontSizeHeading4: 20,
    fontSizeHeading5: 16,

    // 行高
    lineHeight: 1.5715,
    lineHeightLG: 1.5,
    lineHeightSM: 1.66,

    // 间距
    padding: 16,
    paddingLG: 24,
    paddingSM: 12,
    paddingXS: 8,
    paddingXXS: 4,

    margin: 16,
    marginLG: 24,
    marginSM: 12,
    marginXS: 8,
    marginXXS: 4,

    // 控件
    controlHeight: 32,
    controlHeightLG: 40,
    controlHeightSM: 24,

    // 阴影
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
    boxShadowSecondary: '0 4px 12px rgba(0, 0, 0, 0.12)',

    // 动画
    motionDurationFast: '0.1s',
    motionDurationMid: '0.2s',
    motionDurationSlow: '0.3s',
    motionEaseInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    motionEaseOut: 'cubic-bezier(0, 0, 0.2, 1)',
    motionEaseIn: 'cubic-bezier(0.4, 0, 1, 1)',

    // 链接
    colorLink: '#1677ff',
    colorLinkHover: '#4096ff',
    colorLinkActive: '#0958d9',

    // 边框
    colorBorder: '#d9d9d9',
    colorBorderSecondary: '#f0f0f0',

    // 填充
    colorFill: 'rgba(0, 0, 0, 0.06)',
    colorFillSecondary: 'rgba(0, 0, 0, 0.04)',
    colorFillTertiary: 'rgba(0, 0, 0, 0.02)',

    // 分割线
    colorSplit: 'rgba(5, 5, 5, 0.06)',
  },

  // 组件配置
  components: {
    // 布局
    Layout: {
      headerBg: '#001529',
      headerColor: '#ffffff',
      headerHeight: 64,
      headerPadding: '0 24px',
      siderBg: '#001529',
      bodyBg: '#f0f2f5',
      footerBg: '#f0f2f5',
    },

    // 菜单
    Menu: {
      darkItemBg: '#001529',
      darkSubMenuItemBg: '#000c17',
      darkItemSelectedBg: '#1677ff',
      darkItemHoverBg: 'rgba(255, 255, 255, 0.08)',
      darkItemColor: 'rgba(255, 255, 255, 0.85)',
      darkItemHoverColor: '#ffffff',
      darkItemSelectedColor: '#ffffff',
      itemHeight: 40,
      itemMarginBlock: 4,
      itemMarginInline: 4,
      itemBorderRadius: 6,
      iconSize: 16,
      iconMarginInlineEnd: 10,
    },

    // 按钮
    Button: {
      primaryShadow: '0 2px 0 rgba(5, 145, 255, 0.1)',
      defaultShadow: '0 2px 0 rgba(0, 0, 0, 0.02)',
      dangerShadow: '0 2px 0 rgba(255, 38, 5, 0.06)',
      borderRadius: 6,
      controlHeight: 32,
      controlHeightLG: 40,
      controlHeightSM: 24,
      paddingInline: 15,
      paddingInlineLG: 15,
      paddingInlineSM: 7,
    },

    // 卡片
    Card: {
      headerBg: 'transparent',
      headerFontSize: 16,
      headerFontSizeSM: 14,
      headerHeight: 56,
      headerHeightSM: 38,
      paddingLG: 24,
      padding: 20,
      paddingSM: 12,
      borderRadiusLG: 8,
    },

    // 表格
    Table: {
      headerBg: '#fafafa',
      headerColor: '#262626',
      headerSortActiveBg: '#f0f0f0',
      headerSortHoverBg: '#f0f0f0',
      bodySortBg: '#fafafa',
      rowHoverBg: '#f5f7fa',
      rowSelectedBg: '#e6f4ff',
      rowSelectedHoverBg: '#dcedff',
      borderRadius: 8,
      borderRadiusLG: 8,
      headerBorderRadius: 8,
      cellFontSize: 14,
      cellPaddingBlock: 12,
      cellPaddingInline: 16,
    },

    // 输入框
    Input: {
      activeBorderColor: '#1677ff',
      hoverBorderColor: '#4096ff',
      activeShadow: '0 0 0 2px rgba(5, 145, 255, 0.1)',
      errorActiveShadow: '0 0 0 2px rgba(255, 38, 5, 0.06)',
      warningActiveShadow: '0 0 0 2px rgba(255, 215, 5, 0.1)',
      paddingBlock: 4,
      paddingBlockLG: 7,
      paddingBlockSM: 0,
      paddingInline: 11,
      paddingInlineLG: 11,
      paddingInlineSM: 7,
      borderRadius: 6,
    },

    // 选择框
    Select: {
      optionSelectedBg: '#e6f4ff',
      optionSelectedColor: '#1677ff',
      optionSelectedFontWeight: 600,
      optionActiveBg: 'rgba(0, 0, 0, 0.04)',
      optionPadding: '5px 12px',
      borderRadius: 6,
    },

    // 模态框
    Modal: {
      headerBg: '#ffffff',
      contentBg: '#ffffff',
      footerBg: 'transparent',
      titleFontSize: 16,
      titleLineHeight: 1.5,
      borderRadiusLG: 8,
      paddingContentHorizontalLG: 24,
    },

    // 抽屉
    Drawer: {
      footerPaddingBlock: 16,
      footerPaddingInline: 24,
    },

    // 标签页
    Tabs: {
      cardBg: '#fafafa',
      cardHeight: 40,
      cardPadding: '8px 16px',
      cardGutter: 2,
      itemSelectedColor: '#1677ff',
      itemHoverColor: '#4096ff',
      itemActiveColor: '#0958d9',
      titleFontSize: 14,
      titleFontSizeLG: 16,
      titleFontSizeSM: 14,
      horizontalItemPadding: '12px 0',
      horizontalItemPaddingLG: '16px 0',
      horizontalItemPaddingSM: '8px 0',
    },

    // 标签
    Tag: {
      borderRadiusSM: 4,
      defaultBg: '#fafafa',
      defaultColor: '#262626',
    },

    // 徽章
    Badge: {
      dotSize: 6,
      indicatorHeight: 20,
      indicatorHeightSM: 14,
      textFontSize: 12,
      textFontSizeSM: 12,
      textFontWeight: 'normal',
      statusSize: 6,
    },

    // 警告框
    Alert: {
      defaultPadding: '8px 12px',
      withDescriptionPadding: '20px 24px 20px 64px',
      borderRadiusLG: 8,
    },

    // 消息提示
    Message: {
      contentBg: '#ffffff',
      contentPadding: '9px 12px',
    },

    // 通知
    Notification: {
      width: 384,
      padding: 20,
      borderRadiusLG: 8,
    },

    // 进度条
    Progress: {
      circleTextFontSize: '1em',
      defaultColor: '#1677ff',
      remainingColor: 'rgba(0, 0, 0, 0.04)',
      lineBorderRadius: 100,
    },

    // 统计数值
    Statistic: {
      titleFontSize: 14,
      contentFontSize: 24,
    },

    // 步骤条
    Steps: {
      iconSize: 32,
      iconSizeSM: 24,
      iconFontSize: 14,
      titleLineHeight: 32,
      descriptionMaxWidth: 140,
    },

    // 时间线
    Timeline: {
      dotBg: '#ffffff',
      dotBorderWidth: 2,
      itemPaddingBottom: 20,
    },

    // 分页
    Pagination: {
      itemActiveBg: '#ffffff',
      itemActiveBgDisabled: 'rgba(0, 0, 0, 0.15)',
      itemBg: '#ffffff',
      itemInputBg: '#ffffff',
      itemSize: 32,
      itemSizeSM: 24,
      borderRadius: 6,
    },

    // 面包屑
    Breadcrumb: {
      itemColor: 'rgba(0, 0, 0, 0.45)',
      lastItemColor: 'rgba(0, 0, 0, 0.88)',
      linkColor: 'rgba(0, 0, 0, 0.45)',
      linkHoverColor: 'rgba(0, 0, 0, 0.88)',
      separatorColor: 'rgba(0, 0, 0, 0.45)',
      separatorMargin: 8,
      iconFontSize: 14,
    },

    // 下拉菜单
    Dropdown: {
      paddingBlock: 5,
      borderRadiusLG: 8,
      controlItemBgHover: 'rgba(0, 0, 0, 0.04)',
      controlItemBgActive: '#e6f4ff',
      controlItemBgActiveHover: '#dcedff',
    },

    // 弹出确认框
    Popconfirm: {
      zIndexPopup: 1060,
    },

    // 工具提示
    Tooltip: {
      borderRadius: 6,
      colorBgSpotlight: 'rgba(0, 0, 0, 0.85)',
    },

    // 气泡卡片
    Popover: {
      borderRadiusLG: 8,
      titleMinWidth: 177,
    },

    // 描述列表
    Descriptions: {
      itemPaddingBottom: 16,
      labelBg: '#fafafa',
    },

    // 空状态
    Empty: {
      colorText: 'rgba(0, 0, 0, 0.45)',
      colorTextDisabled: 'rgba(0, 0, 0, 0.25)',
    },

    // 结果
    Result: {
      titleFontSize: 24,
      subtitleFontSize: 14,
      iconFontSize: 72,
    },

    // 骨架屏
    Skeleton: {
      blockRadius: 4,
      titleHeight: 16,
      paragraphMarginTop: 28,
      paragraphLiHeight: 16,
    },

    // 加载中
    Spin: {
      dotSize: 20,
      dotSizeLG: 32,
      dotSizeSM: 14,
    },

    // 头像
    Avatar: {
      containerSize: 32,
      containerSizeLG: 40,
      containerSizeSM: 24,
      textFontSize: 18,
      textFontSizeLG: 24,
      textFontSizeSM: 14,
      borderRadius: 4,
      groupOverlapping: -8,
      groupBorderColor: '#ffffff',
    },

    // 日历
    Calendar: {
      itemActiveBg: '#e6f4ff',
      fullBg: '#ffffff',
      fullPanelBg: '#ffffff',
    },

    // 日期选择器
    DatePicker: {
      cellHoverBg: '#f5f5f5',
      cellActiveWithRangeBg: '#e6f4ff',
      cellHoverWithRangeBg: '#dcedff',
      cellRangeBorderColor: '#7ec1ff',
      presetsWidth: 120,
    },

    // 上传
    Upload: {
      actionsColor: 'rgba(0, 0, 0, 0.45)',
    },

    // 表单
    Form: {
      itemMarginBottom: 24,
      verticalLabelPadding: '0 0 8px',
      labelFontSize: 14,
      labelColor: '#262626',
      labelRequiredMarkColor: '#c41d1d',
    },

    // 分割线
    Divider: {
      textPaddingInline: '1em',
      orientationMargin: 0.05,
    },

    // 锚点
    Anchor: {
      linkPaddingBlock: 4,
      linkPaddingInlineStart: 16,
    },

    // 树
    Tree: {
      nodeHoverBg: '#f5f5f5',
      nodeSelectedBg: '#e6f4ff',
      directoryNodeSelectedBg: '#e6f4ff',
      directoryNodeSelectedColor: '#1677ff',
    },

    // 穿梭框
    Transfer: {
      headerHeight: 40,
      itemHeight: 32,
      listWidth: 180,
      listHeight: 200,
    },

    // 评分
    Rate: {
      starSize: 20,
      starBg: '#e8e8e8',
      starColor: '#fadb14',
    },

    // 开关
    Switch: {
      trackHeight: 22,
      trackMinWidth: 44,
      trackPadding: 2,
      handleSize: 18,
      innerMinMargin: 9,
      innerMaxMargin: 25,
    },

    // 滑动输入条
    Slider: {
      trackBg: '#91caff',
      trackBgDisabled: 'rgba(0, 0, 0, 0.04)',
      trackHoverBg: '#69b1ff',
      railBg: 'rgba(0, 0, 0, 0.04)',
      railHoverBg: 'rgba(0, 0, 0, 0.06)',
      handleColor: '#1677ff',
      handleActiveColor: '#1677ff',
      handleSize: 10,
      handleSizeHover: 12,
      handleLineWidth: 2,
      handleLineWidthHover: 4,
      dotBorderColor: 'rgba(0, 0, 0, 0.06)',
      dotActiveBorderColor: '#1677ff',
    },
  },

  // 使用默认算法 - 将被动态覆盖
  algorithm: theme.defaultAlgorithm,
};

// 暗色模式额外配置
const darkModeOverrides = {
  token: {
    colorBgBase: '#141414',
    colorTextBase: '#e6e6e6',
    colorBgLayout: '#0a0a0a',
  },
  components: {
    Layout: {
      headerBg: '#1f1f1f',
      siderBg: '#141414',
      bodyBg: '#0a0a0a',
      footerBg: '#0a0a0a',
    },
    Menu: {
      darkItemBg: '#141414',
      darkSubMenuItemBg: '#0a0a0a',
    },
    Card: {
      colorBgContainer: '#1f1f1f',
    },
    Table: {
      headerBg: '#1f1f1f',
      rowHoverBg: '#262626',
      bodySortBg: '#1a1a1a',
    },
    Modal: {
      headerBg: '#1f1f1f',
      contentBg: '#1f1f1f',
    },
  },
};

// 内部组件，用于访问主题上下文
function AppContent() {
  const { algorithm, isDark } = useTheme();

  // 合并主题配置
  const currentTheme = {
    ...govTheme,
    algorithm,
    ...(isDark ? {
      token: { ...govTheme.token, ...darkModeOverrides.token },
      components: {
        ...govTheme.components,
        ...Object.fromEntries(
          Object.entries(darkModeOverrides.components).map(([key, value]) => [
            key,
            { ...(govTheme.components as Record<string, unknown>)[key], ...value },
          ])
        ),
      },
    } : {}),
  };

  return (
    <ConfigProvider locale={zhCN} theme={currentTheme}>
      <AntApp>
        <SocketProvider>
          <RouterProvider router={router} />
        </SocketProvider>
      </AntApp>
    </ConfigProvider>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryProvider>
        <ThemeProvider>
          <AppContent />
        </ThemeProvider>
      </QueryProvider>
    </ErrorBoundary>
  );
}

export default App;
