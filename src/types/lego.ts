export interface IWidgetPadding {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface IWidgetCss {
  left: number;
  top: number;
  width: number;
  height: number;
  zIndex: number;
  rotate?: number;
  backgroundColor?: string;
  fontColor?: string;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: string | number;
  letterSpace?: number;
  lineHeight?: number;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  borderColor?: string;
  borderStyle?: string;
  borderWidth?: number;
  borderLeftColor?: string;
  borderLeftStyle?: string;
  borderLeftWidth?: number;
  borderRadius?: number | string;
  padding?: IWidgetPadding;
  paddingLeft?: number;
  margin?: IWidgetPadding;
  opacity?: number;
  clipPath?: string;
  textDecoration?: string;
  textShadow?: string;
  boxShadow?: string;
  [key: string]: unknown;
}

export interface IWidgetDataSource {
  text?: string;
  avatarSrc?: string;
  src?: string;
  icon?: string;
  list?: Array<string | { title?: string; subtitle?: string; date?: string; desc?: string; [key: string]: unknown }>;
  rate?: number;
  maxRate?: number;
  shape?: string;
  headerFontSize?: number;
  headerFontWeight?: string | number;
  headerFontColor?: string;
  headerTimeFontSize?: number;
  headerTimeFontWeight?: string | number;
  headerTimeFontColor?: string;
  [key: string]: unknown;
}

export interface IWidget {
  id: string;
  componentName: string;
  commentType?: string;
  icon?: string;
  title: string;
  description?: string;
  screenShot?: {
    src: string;
    width: string;
    height: string;
    borderRadius?: string;
  };
  keywords?: string;
  category?: string;
  props?: Record<string, unknown>;
  css: IWidgetCss;
  dataSource: IWidgetDataSource;
  customProps?: Record<string, unknown>;
  binding?: string;
  section?: string;
}

export interface IPageComponent {
  id: string;
  componentName: 'page';
  commentType: 'page';
  children: IWidget[];
}

export interface IHJSchema {
  id: string;
  version: string;
  componentsTree: IPageComponent[];
  i18n?: Record<string, unknown>;
  constants?: Record<string, unknown>;
  css: {
    width: number;
    height: number;
    background: string;
    opacity: number;
    backgroundImage?: string;
    fontFamily?: string;
    themeColor?: string;
    pagePadding?: { top: number; right: number; bottom: number; left: number };
    [key: string]: unknown;
  };
  config: {
    title: string;
  };
  meta?: Record<string, unknown>;
  dataSource?: Record<string, unknown>;
}

export interface IWidgetTab {
  title: string;
  category: string;
  icon: string;
  dataSource: IWidgetDataSource;
  list: IWidget[];
}
