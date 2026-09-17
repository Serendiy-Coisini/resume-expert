import type { IHJSchema, IWidget } from '@/types/lego';

export const THEME_COLOR_PRESETS = [
  { name: '经典商务蓝', color: '#1e3a8a', accent: '#2563eb', bgLight: '#eff6ff', borderLight: '#bfdbfe', desc: '沉稳专业 · 世界500强/科技大厂' },
  { name: '晨曦天海蓝', color: '#0284c7', accent: '#0ea5e9', bgLight: '#f0f9ff', borderLight: '#bae6fd', desc: '现代敏捷 · 技术研发/产品经理' },
  { name: '翡翠森林绿', color: '#065f46', accent: '#059669', bgLight: '#ecfdf5', borderLight: '#a7f3d0', desc: '清新自然 · 生物医疗/环保/综合' },
  { name: '极简石墨黑', color: '#0f172a', accent: '#334155', bgLight: '#f8fafc', borderLight: '#e2e8f0', desc: '极简克制 · 现代黑白高级风' },
  { name: '典雅黛紫', color: '#581c87', accent: '#7c3aed', bgLight: '#faf5ff', borderLight: '#e9d5ff', desc: '高端典雅 · 艺术设计/创意总监' },
  { name: '活力珊瑚橙', color: '#ea580c', accent: '#f97316', bgLight: '#fff7ed', borderLight: '#fed7aa', desc: '热情敏捷 · 互联网运营/新媒体' },
  { name: '热情枫叶红', color: '#be123c', accent: '#e11d48', bgLight: '#fff1f2', borderLight: '#fecdd3', desc: '醒目吸睛 · 市场公关/管理咨询' },
  { name: '琥珀金棕', color: '#78350f', accent: '#d97706', bgLight: '#fffbeb', borderLight: '#fde68a', desc: '尊贵典雅 · 金融投行/法务政务' },
];

export function hslToHex(h: number, s: number, l: number): string {
  l /= 100;
  const a = (s * Math.min(l, 1 - l)) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

export function hexToHsl(hex: string): { h: number; s: number; l: number } {
  hex = hex.replace('#', '');
  if (hex.length === 3) {
    hex = hex.split('').map((c) => c + c).join('');
  }
  if (hex.length !== 6) {
    return { h: 220, s: 70, l: 35 };
  }
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  };
}

export function getHexLuminance(hex: string): number {
  const clean = hex.replace('#', '');
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16) || 0;
    const g = parseInt(clean[1] + clean[1], 16) || 0;
    const b = parseInt(clean[2] + clean[2], 16) || 0;
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  }
  const r = parseInt(clean.substring(0, 2), 16) || 0;
  const g = parseInt(clean.substring(2, 4), 16) || 0;
  const b = parseInt(clean.substring(4, 6), 16) || 0;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

/**
 * Intelligently applies a new theme color to all themed elements across the Lego schema.
 */
export function applyThemeColorToSchema(schema: IHJSchema, newThemeColor: string): IHJSchema {
  if (!schema || !schema.componentsTree || !schema.componentsTree[0]) {
    return schema;
  }

  const page = schema.componentsTree[0];
  const oldThemeColor = (schema.css as Record<string, unknown>)?.themeColor as string | undefined;

  const isColorMatch = (c?: string) => {
    if (!c) return false;
    if (oldThemeColor && c.toLowerCase() === oldThemeColor.toLowerCase()) return true;
    return THEME_COLOR_PRESETS.some((p) => p.color.toLowerCase() === c.toLowerCase() || p.accent.toLowerCase() === c.toLowerCase());
  };

  const newChildren = page.children.map((widget: IWidget) => {
    const id = (widget.id || '').toLowerCase();
    const title = (widget.title || '').toLowerCase();
    const compName = (widget.componentName || '').toLowerCase();

    let fontColor = widget.css.fontColor;
    let backgroundColor = widget.css.backgroundColor;
    let borderColor = widget.css.borderColor;
    let borderLeftColor = widget.css.borderLeftColor;

    const isBannerBg = id.includes('banner-bg') || id.includes('header-bg') || title.includes('banner背景') || title.includes('顶栏背景');
    const isBannerText = (id.includes('banner') || title.includes('banner')) && !isBannerBg;

    // 1. Corporate Banner & Background Blocks
    if (isBannerBg) {
      backgroundColor = newThemeColor;
      borderColor = newThemeColor;
    }
    // 1.1 Text widgets positioned on top of the banner (Name, Contact info, intent)
    else if (isBannerText) {
      const isDarkBanner = getHexLuminance(newThemeColor) < 0.65;
      if (id.includes('name') || title.includes('姓名')) {
        fontColor = isDarkBanner ? '#ffffff' : '#0f172a';
      } else {
        fontColor = isDarkBanner ? '#f1f5f9' : '#334155';
      }
    }
    // 2. Section Titles & Headings (Outside Banner)
    else if (
      !isBannerText &&
      (
        title.includes('标题') ||
        id.includes('title') ||
        (typeof widget.dataSource?.text === 'string' && widget.dataSource.text.startsWith('|')) ||
        (typeof widget.dataSource?.text === 'string' && widget.dataSource.text.startsWith('// 0'))
      )
    ) {
      if (widget.css.fontColor !== '#ffffff') {
        fontColor = newThemeColor;
      }
    }
    // 3. Job Intent / Highlights (Outside Banner)
    else if (!isBannerText && (id.includes('intent') || title.includes('求职意向') || title.includes('意向'))) {
      if (widget.css.fontColor !== '#ffffff') {
        fontColor = newThemeColor;
      }
    }

    // 4. Accent Borders
    if (widget.css.borderLeftColor && isColorMatch(widget.css.borderLeftColor)) {
      borderLeftColor = newThemeColor;
    } else if (widget.css.borderLeftWidth && widget.css.borderLeftWidth > 0 && widget.css.borderLeftColor && widget.css.borderLeftColor !== 'transparent') {
      borderLeftColor = newThemeColor;
    }

    // 5. Timeline Nodes / Points
    if (id.includes('dot') || id.includes('node') || title.includes('节点') || title.includes('圆点')) {
      backgroundColor = newThemeColor;
      borderColor = newThemeColor;
    }

    // 6. Skill Badges / Pills
    if (id.includes('skill') || title.includes('技能标签') || title.includes('技能 pill') || (id.includes('pill') && !id.includes('bg'))) {
      if (isColorMatch(widget.css.fontColor) || (widget.css.fontColor && widget.css.fontColor !== '#1e293b' && widget.css.fontColor !== '#334155')) {
        fontColor = newThemeColor;
      }
      if (isColorMatch(widget.css.borderColor)) {
        borderColor = newThemeColor + '66';
      }
      if (widget.css.backgroundColor && (widget.css.backgroundColor.startsWith('#eff6ff') || isColorMatch(widget.css.backgroundColor))) {
        backgroundColor = newThemeColor + '15';
      }
    }

    // 7. Divider lines with theme colors
    if ((id.includes('header-border') || id.includes('sec-line')) && isColorMatch(widget.css.backgroundColor)) {
      backgroundColor = newThemeColor;
    }

    // 8. General colored icons
    if (compName === 'hj-icon' && isColorMatch(widget.css.fontColor)) {
      fontColor = newThemeColor;
    }

    const hasChanged =
      fontColor !== widget.css.fontColor ||
      backgroundColor !== widget.css.backgroundColor ||
      borderColor !== widget.css.borderColor ||
      borderLeftColor !== widget.css.borderLeftColor;

    if (hasChanged) {
      return {
        ...widget,
        css: {
          ...widget.css,
          ...(fontColor !== undefined ? { fontColor } : {}),
          ...(backgroundColor !== undefined ? { backgroundColor } : {}),
          ...(borderColor !== undefined ? { borderColor } : {}),
          ...(borderLeftColor !== undefined ? { borderLeftColor } : {})
        }
      };
    }

    return widget;
  });

  return {
    ...schema,
    css: {
      ...schema.css,
      themeColor: newThemeColor
    },
    componentsTree: [
      {
        ...page,
        children: newChildren
      },
      ...schema.componentsTree.slice(1)
    ]
  };
}
