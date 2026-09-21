import type { IWidgetTab } from '@/types/lego';

export const DEFAULT_AVATAR_PLACEHOLDER = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120' fill='%23e2e8f0'><rect width='120' height='120' fill='%23f1f5f9'/><circle cx='60' cy='45' r='24' fill='%2394a3b8'/><path d='M24 105c0-20 16-36 36-36s36 16 36 36' fill='%2394a3b8'/></svg>";

export const WIDGET_CONFIG_LIST: IWidgetTab[] = [
  {
    title: '头像',
    category: 'avatar',
    icon: 'User',
    dataSource: { avatarSrc: DEFAULT_AVATAR_PLACEHOLDER },
    list: [
      {
        id: '',
        componentName: 'hj-avatar-1',
        title: '正方形头像',
        description: '直角/圆角头像',
        css: {
          left: 100, top: 100, width: 120, height: 150, zIndex: 2,
          backgroundColor: '#f1f5f9', borderWidth: 3, borderColor: '#eee', borderStyle: 'solid', borderRadius: 10
        },
        dataSource: { avatarSrc: DEFAULT_AVATAR_PLACEHOLDER }
      },
      {
        id: '',
        componentName: 'hj-avatar-2',
        title: '圆形头像',
        description: '纯圆框头像',
        css: {
          left: 100, top: 100, width: 120, height: 120, zIndex: 2,
          backgroundColor: '#f1f5f9', borderRadius: '50%'
        },
        dataSource: { avatarSrc: DEFAULT_AVATAR_PLACEHOLDER }
      },
      {
        id: '',
        componentName: 'hj-avatar-3',
        title: '六边形头像',
        description: '六边形头像',
        css: { left: 100, top: 100, width: 120, height: 120, zIndex: 2 },
        dataSource: { avatarSrc: DEFAULT_AVATAR_PLACEHOLDER }
      },
      {
        id: '',
        componentName: 'hj-avatar-4',
        title: '花朵形头像',
        description: '花朵形头像',
        css: { left: 100, top: 100, width: 120, height: 120, zIndex: 2 },
        dataSource: { avatarSrc: DEFAULT_AVATAR_PLACEHOLDER }
      },
      {
        id: '',
        componentName: 'hj-avatar-5',
        title: '八角形头像',
        description: '八角形头像',
        css: { left: 100, top: 100, width: 120, height: 120, zIndex: 2 },
        dataSource: { avatarSrc: DEFAULT_AVATAR_PLACEHOLDER }
      },
      {
        id: '',
        componentName: 'hj-avatar-6',
        title: '菱形头像',
        description: '菱形头像',
        css: { left: 100, top: 100, width: 120, height: 120, zIndex: 2 },
        dataSource: { avatarSrc: DEFAULT_AVATAR_PLACEHOLDER }
      }
    ]
  },
  {
    title: '文本',
    category: 'text',
    icon: 'Type',
    dataSource: { text: '点击双击修改文本' },
    list: [
      {
        id: '', componentName: 'hj-text-1', title: '基础文本', description: '基础文本',
        css: { left: 100, top: 100, width: 240, height: 36, fontSize: 16, fontColor: '#1e293b', zIndex: 2 },
        dataSource: { text: '基础文本' }
      },
      {
        id: '', componentName: 'hj-text-2', title: '粗体标题', description: '粗体标题',
        css: { left: 100, top: 100, width: 320, height: 48, fontSize: 24, fontWeight: 'bold', fontColor: '#0f172a', zIndex: 2 },
        dataSource: { text: '粗体标题' }
      },
      {
        id: '', componentName: 'hj-text-3', title: '居中文本', description: '居中文本',
        css: { left: 100, top: 100, width: 300, height: 36, fontSize: 14, textAlign: 'center', zIndex: 2 },
        dataSource: { text: '居中文本' }
      },
      {
        id: '', componentName: 'hj-text-4', title: '链接文本', description: '链接文本',
        css: { left: 100, top: 100, width: 200, height: 30, fontSize: 13, fontColor: '#2563eb', textDecoration: 'underline', zIndex: 2 },
        dataSource: { text: '链接文本' }
      },
      {
        id: '', componentName: 'hj-text-5', title: '标签文本', description: '标签文本',
        css: { left: 100, top: 100, width: 80, height: 28, fontSize: 12, backgroundColor: '#eff6ff', textAlign: 'center', borderRadius: 14, zIndex: 2 },
        dataSource: { text: '标签' }
      },
      {
        id: '', componentName: 'hj-text-6', title: '段落文本', description: '段落文本',
        css: { left: 100, top: 100, width: 380, height: 80, fontSize: 13, lineHeight: 1.8, zIndex: 2 },
        dataSource: { text: '这是一段段落文本...' }
      },
      {
        id: '', componentName: 'hj-text-7', title: '竖排文本', description: '竖排文本',
        css: { left: 100, top: 100, width: 36, height: 200, fontSize: 14, zIndex: 2 },
        dataSource: { text: '竖排文本' }
      },
      {
        id: '', componentName: 'hj-text-8', title: '引用文本', description: '引用文本',
        css: { left: 100, top: 100, width: 350, height: 50, fontSize: 13, borderLeftWidth: 3, borderLeftColor: '#3b82f6', borderLeftStyle: 'solid', paddingLeft: 12, zIndex: 2 },
        dataSource: { text: '引用文本' }
      },
      {
        id: '', componentName: 'hj-text-9', title: '编号列表', description: '编号列表',
        css: { left: 100, top: 100, width: 350, height: 100, fontSize: 13, zIndex: 2 },
        dataSource: { text: '1. 列表项1\n2. 列表项2\n3. 列表项3' }
      },
      {
        id: '', componentName: 'hj-text-10', title: '项目符号列表', description: '项目符号列表',
        css: { left: 100, top: 100, width: 350, height: 100, fontSize: 13, zIndex: 2 },
        dataSource: { text: '• 列表项1\n• 列表项2\n• 列表项3' }
      }
    ]
  },
  {
    title: '图标',
    category: 'icon',
    icon: 'Smile',
    dataSource: {},
    list: [
      {
        id: '', componentName: 'hj-icon', title: '图标组件', description: '图标组件',
        css: { left: 100, top: 100, width: 32, height: 32, fontColor: '#475569', zIndex: 2 },
        dataSource: { icon: 'Mail' }
      }
    ]
  },
  {
    title: '列表',
    category: 'list',
    icon: 'List',
    dataSource: {},
    list: [
      {
        id: '', componentName: 'hj-li', title: '列表组件', description: '列表组件',
        css: { left: 100, top: 100, width: 350, height: 120, zIndex: 2 },
        dataSource: { list: ['项目一', '项目二', '项目三'] }
      }
    ]
  },
  {
    title: '图片',
    category: 'image',
    icon: 'Image',
    dataSource: {},
    list: [
      {
        id: '', componentName: 'hj-image', title: '图片组件', description: '图片组件',
        css: { left: 100, top: 100, width: 200, height: 150, zIndex: 2 },
        dataSource: { src: '' }
      }
    ]
  },
  {
    title: '形状',
    category: 'shape',
    icon: 'Square',
    dataSource: {},
    list: [
      {
        id: '', componentName: 'hj-rectangle', title: '矩形', description: '矩形',
        css: { left: 100, top: 100, width: 200, height: 80, backgroundColor: '#eff6ff', borderRadius: 8, borderWidth: 1, borderColor: '#3b82f6', borderStyle: 'solid', zIndex: 1 },
        dataSource: {}
      },
      {
        id: '', componentName: 'hj-circle', title: '圆形', description: '圆形',
        css: { left: 100, top: 100, width: 60, height: 60, backgroundColor: '#3b82f6', borderRadius: '50%', zIndex: 1 },
        dataSource: {}
      },
      {
        id: '', componentName: 'hj-square', title: '正方形', description: '正方形',
        css: { left: 100, top: 100, width: 80, height: 80, backgroundColor: '#f1f5f9', zIndex: 1 },
        dataSource: {}
      },
      {
        id: '', componentName: 'hj-oval', title: '椭圆', description: '椭圆',
        css: { left: 100, top: 100, width: 120, height: 60, borderRadius: '50%', backgroundColor: '#cbd5e1', zIndex: 1 },
        dataSource: {}
      },
      {
        id: '', componentName: 'hj-triangle', title: '三角形', description: '三角形',
        css: { left: 100, top: 100, width: 80, height: 80, backgroundColor: '#94a3b8', zIndex: 1 },
        dataSource: {}
      },
      {
        id: '', componentName: 'hj-trapezoid', title: '梯形', description: '梯形',
        css: { left: 100, top: 100, width: 100, height: 60, backgroundColor: '#94a3b8', zIndex: 1 },
        dataSource: {}
      },
      {
        id: '', componentName: 'hj-parallelogram', title: '平行四边形', description: '平行四边形',
        css: { left: 100, top: 100, width: 120, height: 60, backgroundColor: '#94a3b8', zIndex: 1 },
        dataSource: {}
      },
      {
        id: '', componentName: 'hj-rhombus', title: '菱形', description: '菱形',
        css: { left: 100, top: 100, width: 80, height: 80, backgroundColor: '#94a3b8', zIndex: 1 },
        dataSource: {}
      },
      {
        id: '', componentName: 'hj-pentagon', title: '五边形', description: '五边形',
        css: { left: 100, top: 100, width: 80, height: 80, backgroundColor: '#94a3b8', zIndex: 1 },
        dataSource: {}
      },
      {
        id: '', componentName: 'hj-hexagon', title: '六边形', description: '六边形',
        css: { left: 100, top: 100, width: 80, height: 80, backgroundColor: '#94a3b8', zIndex: 1 },
        dataSource: {}
      },
      {
        id: '', componentName: 'hj-star', title: '五角星', description: '五角星',
        css: { left: 100, top: 100, width: 80, height: 80, backgroundColor: '#94a3b8', zIndex: 1 },
        dataSource: {}
      },
      {
        id: '', componentName: 'hj-leftArrow', title: '左箭头', description: '左箭头',
        css: { left: 100, top: 100, width: 100, height: 50, backgroundColor: '#94a3b8', zIndex: 1 },
        dataSource: {}
      },
      {
        id: '', componentName: 'hj-rightArrow', title: '右箭头', description: '右箭头',
        css: { left: 100, top: 100, width: 100, height: 50, backgroundColor: '#94a3b8', zIndex: 1 },
        dataSource: {}
      },
      {
        id: '', componentName: 'hj-cross', title: '十字形', description: '十字形',
        css: { left: 100, top: 100, width: 60, height: 60, backgroundColor: '#94a3b8', zIndex: 1 },
        dataSource: {}
      },
      {
        id: '', componentName: 'hj-message', title: '消息气泡', description: '消息气泡',
        css: { left: 100, top: 100, width: 120, height: 80, backgroundColor: '#94a3b8', zIndex: 1 },
        dataSource: {}
      },
      {
        id: '', componentName: 'hj-frame', title: '边框', description: '边框',
        css: { left: 100, top: 100, width: 150, height: 100, borderWidth: 2, borderColor: '#3b82f6', borderStyle: 'solid', zIndex: 1 },
        dataSource: {}
      }
    ]
  },
  {
    title: '评分',
    category: 'rate',
    icon: 'Star',
    dataSource: {},
    list: [
      {
        id: '', componentName: 'hj-rate-1', title: '圆形评分', description: '圆形评分',
        css: { left: 100, top: 100, width: 180, height: 24, zIndex: 2 },
        dataSource: { rate: 3, maxRate: 5, shape: 'circle' }
      },
      {
        id: '', componentName: 'hj-rate-2', title: '星形评分', description: '星形评分',
        css: { left: 100, top: 100, width: 180, height: 24, zIndex: 2 },
        dataSource: { rate: 4, maxRate: 5, shape: 'star' }
      },
      {
        id: '', componentName: 'hj-rate-3', title: '方形评分', description: '方形评分',
        css: { left: 100, top: 100, width: 180, height: 24, zIndex: 2 },
        dataSource: { rate: 3, maxRate: 5, shape: 'square' }
      },
      {
        id: '', componentName: 'hj-rate-4', title: '菱形评分', description: '菱形评分',
        css: { left: 100, top: 100, width: 180, height: 24, zIndex: 2 },
        dataSource: { rate: 4, maxRate: 5, shape: 'diamond' }
      },
      {
        id: '', componentName: 'hj-rate-5', title: '进度条', description: '进度条',
        css: { left: 100, top: 100, width: 200, height: 16, zIndex: 2 },
        dataSource: { rate: 75, maxRate: 100, shape: 'bar' }
      }
    ]
  },
  {
    title: '日期',
    category: 'date',
    icon: 'Calendar',
    dataSource: {},
    list: [
      {
        id: '', componentName: 'hj-date-1', title: '日期文本', description: '日期文本',
        css: { left: 100, top: 100, width: 160, height: 24, zIndex: 2 },
        dataSource: { text: '2023.06 - 2024.01' }
      },
      {
        id: '', componentName: 'hj-date-2', title: '日期范围', description: '日期范围',
        css: { left: 100, top: 100, width: 200, height: 24, zIndex: 2 },
        dataSource: { text: '2023年6月 - 2024年1月' }
      },
      {
        id: '', componentName: 'hj-date-3', title: '至今日期', description: '至今日期',
        css: { left: 100, top: 100, width: 160, height: 24, zIndex: 2 },
        dataSource: { text: '2023.06 - 至今' }
      },
      {
        id: '', componentName: 'hj-date-4', title: '年月日期', description: '年月日期',
        css: { left: 100, top: 100, width: 120, height: 24, zIndex: 2 },
        dataSource: { text: '2023.06' }
      },
      {
        id: '', componentName: 'hj-date-5', title: '日期标签', description: '日期标签',
        css: { left: 100, top: 100, width: 180, height: 28, backgroundColor: '#f0f9ff', borderRadius: 14, zIndex: 2 },
        dataSource: { text: '2023.06 - 2024.01' }
      }
    ]
  },
  {
    title: '其他',
    category: 'other',
    icon: 'MoreHorizontal',
    dataSource: {},
    list: [
      {
        id: '', componentName: 'hj-other-1', title: '分割线', description: '分割线',
        css: { left: 100, top: 100, width: 350, height: 2, backgroundColor: '#e2e8f0', zIndex: 2 },
        dataSource: {}
      },
      {
        id: '', componentName: 'hj-other-2', title: '二维码占位', description: '二维码占位',
        css: { left: 100, top: 100, width: 80, height: 80, borderWidth: 1, borderColor: '#cbd5e1', borderStyle: 'solid', zIndex: 2 },
        dataSource: { text: 'QR Code' }
      }
    ]
  }
];
