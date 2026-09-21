import type { IHJSchema, IWidget, IPageComponent, IWidgetCss, IWidgetDataSource } from '@/types/lego';
import type { FinalResume } from '@/types/resume';

function extractValue(val: unknown): string {
  if (val === null || val === undefined) return '';
  if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') return String(val).trim();
  if (typeof val === 'object') {
    const obj = val as Record<string, unknown>;
    if (obj.value !== undefined) return extractValue(obj.value);
    if (obj.text !== undefined) return extractValue(obj.text);
    if (Array.isArray(val)) {
      return val.map(extractValue).filter(Boolean).join(' - ');
    }
  }
  return '';
}

function cleanHtmlText(html: string): string {
  if (!html) return '';
  return String(html)
    .replace(/<p[^>]*>/gi, '')
    .replace(/<\/p>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<\/li>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim();
}

function parseFiniteNumber(val: unknown, fallback: number): number {
  if (typeof val === 'number') {
    return Number.isFinite(val) ? val : fallback;
  }
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) return fallback;
    const num = Number(trimmed);
    return Number.isFinite(num) ? num : fallback;
  }
  return fallback;
}

export function ensureValidWidget(
  rawWidget: Record<string, unknown> | null | undefined,
  index?: number,
  seenIds?: Set<string>
): IWidget {
  if (!rawWidget || typeof rawWidget !== 'object') {
    let fallbackId = `widget-${Date.now()}-${index || 0}-${Math.random().toString(36).substring(2, 7)}`;
    if (seenIds) {
      while (seenIds.has(fallbackId)) {
        fallbackId = `widget-${Date.now()}-${index || 0}-${Math.random().toString(36).substring(2, 7)}`;
      }
      seenIds.add(fallbackId);
    }
    return {
      id: fallbackId,
      componentName: 'hj-text-1',
      title: '文本组件',
      css: { left: 40, top: 40 + (index || 0) * 50, zIndex: 1, width: 200, height: 40 },
      dataSource: { text: '' }
    };
  }

  const componentName = rawWidget.componentName && typeof rawWidget.componentName === 'string'
    ? rawWidget.componentName
    : 'hj-text-1';

  const isShapeOrLine = componentName === 'hj-rectangle' ||
    componentName.startsWith('hj-other') ||
    componentName === 'hj-circle' ||
    componentName === 'hj-bg' ||
    componentName.includes('line');
  const isAvatar = componentName.startsWith('hj-avatar');

  const minWidth = isShapeOrLine ? 1 : (isAvatar ? 20 : 10);
  const minHeight = isShapeOrLine ? 1 : (isAvatar ? 20 : 10);
  const defaultFallbackWidth = 200;
  const defaultFallbackHeight = isShapeOrLine ? 2 : 40;

  const css = (rawWidget.css || {}) as Record<string, unknown>;
  const padding = (css.padding || {}) as Record<string, unknown>;
  const safePadding = {
    top: Math.max(0, Math.min(1000, parseFiniteNumber(padding.top, 0))),
    right: Math.max(0, Math.min(1000, parseFiniteNumber(padding.right, 0))),
    bottom: Math.max(0, Math.min(1000, parseFiniteNumber(padding.bottom, 0))),
    left: Math.max(0, Math.min(1000, parseFiniteNumber(padding.left, 0)))
  };

  const margin = (css.margin || {}) as Record<string, unknown>;
  const safeMargin = {
    top: Math.max(0, Math.min(1000, parseFiniteNumber(margin.top, 0))),
    right: Math.max(0, Math.min(1000, parseFiniteNumber(margin.right, 0))),
    bottom: Math.max(0, Math.min(1000, parseFiniteNumber(margin.bottom, 0))),
    left: Math.max(0, Math.min(1000, parseFiniteNumber(margin.left, 0)))
  };

  const parsedLeft = parseFiniteNumber(css.left, 40);
  const parsedTop = parseFiniteNumber(css.top, 40 + (index || 0) * 50);
  const parsedWidth = parseFiniteNumber(css.width, defaultFallbackWidth);
  const parsedHeight = parseFiniteNumber(css.height, defaultFallbackHeight);

  // Preserve opacity including 0!
  const safeOpacity = typeof css.opacity === 'number' && Number.isFinite(css.opacity)
    ? Math.max(0, Math.min(1, css.opacity))
    : (typeof css.opacity === 'string' && !isNaN(Number(css.opacity))
        ? Math.max(0, Math.min(1, Number(css.opacity)))
        : 1);

  const allowedDecorations = ['none', 'underline', 'line-through', 'overline'];
  const rawTextDec = typeof css.textDecoration === 'string' ? css.textDecoration.trim().toLowerCase() : '';
  const safeTextDecoration = allowedDecorations.includes(rawTextDec) ? rawTextDec : undefined;

  const safeTextShadow = typeof css.textShadow === 'string' && css.textShadow.length <= 100 && !/[<>{}]/.test(css.textShadow)
    ? css.textShadow.trim()
    : undefined;

  const safeBoxShadow = typeof css.boxShadow === 'string' && css.boxShadow.length <= 100 && !/[<>{}]/.test(css.boxShadow)
    ? css.boxShadow.trim()
    : undefined;

  const safeCss: IWidgetCss = {
    left: Math.max(-2000, Math.min(5000, parsedLeft)),
    top: Math.max(-2000, Math.min(50000, parsedTop)),
    zIndex: Math.round(parseFiniteNumber(css.zIndex, 1)),
    width: Math.max(minWidth, Math.min(5000, parsedWidth)),
    height: Math.max(minHeight, Math.min(20000, parsedHeight)),
    rotate: Math.max(-360, Math.min(360, parseFiniteNumber(css.rotate, 0))),
    fontSize: Math.max(8, Math.min(72, parseFiniteNumber(css.fontSize, 14))),
    letterSpace: parseFiniteNumber(css.letterSpace ?? css.letterSpacing, 0),
    lineHeight: Math.max(0.8, Math.min(4, parseFiniteNumber(css.lineHeight, 1.5))),
    fontFamily: (css.fontFamily as string) || 'Inter, sans-serif',
    fontWeight: (css.fontWeight as string | number) || 400,
    textAlign: (css.textAlign as IWidgetCss['textAlign']) || 'left',
    fontColor: (css.fontColor as string) || (css.color as string) || '#333333',
    backgroundColor: (css.backgroundColor as string) || (css.background as string) || '',
    padding: safePadding,
    margin: safeMargin,
    opacity: safeOpacity,
    borderWidth: typeof css.borderWidth === 'number' ? css.borderWidth : (css.borderStyle && css.borderStyle !== 'none' ? 1 : 0),
    borderRadius: typeof css.borderRadius === 'number' ? css.borderRadius : ((css.borderRadius as string | number) || 0),
    borderColor: (css.borderColor as string) || '#eee',
    borderStyle: (css.borderStyle as string) || (css.borderWidth || (typeof css.borderWidth === 'number' && css.borderWidth > 0) ? 'solid' : 'none'),
    clipPath: (css.clipPath as string) || undefined,
    borderLeftWidth: typeof css.borderLeftWidth === 'number' ? css.borderLeftWidth : undefined,
    borderLeftColor: (css.borderLeftColor as string) || undefined,
    borderLeftStyle: (css.borderLeftStyle as string) || undefined,
    paddingLeft: typeof css.paddingLeft === 'number' ? css.paddingLeft : undefined,
    textDecoration: safeTextDecoration,
    textShadow: safeTextShadow,
    boxShadow: safeBoxShadow
  };

  const dataSource: IWidgetDataSource = rawWidget.dataSource && typeof rawWidget.dataSource === 'object'
    ? { ...(rawWidget.dataSource as Record<string, unknown>) }
    : {};

  if (componentName.startsWith('hj-avatar')) {
    dataSource.avatarSrc = (dataSource.avatarSrc || dataSource.avatar || dataSource.url || dataSource.src || '') as string;
  }
  if (componentName.startsWith('hj-text')) {
    const rawText = dataSource.text !== undefined ? String(dataSource.text) : (rawWidget.title ? String(rawWidget.title) : undefined);
    if (rawText !== undefined) {
      if (rawText.length > 10000) {
        throw new Error(`文本组件内容长度超出限制（最多允许 10000 字符，当前为 ${rawText.length} 字符）`);
      }
      dataSource.text = rawText;
    }
  }
  if (componentName === 'hj-li') {
    if (Array.isArray(dataSource.list)) {
      dataSource.list = dataSource.list.map((item) => {
        if (typeof item === 'string') {
          if (item.length > 5000) {
            throw new Error(`列表条目内容长度超出限制（最多允许 5000 字符，当前为 ${item.length} 字符）`);
          }
          return item;
        }
        if (item && typeof item === 'object') {
          const obj = item as Record<string, unknown>;
          const title = typeof obj.title === 'string' ? obj.title : '';
          if (title.length > 500) {
            throw new Error(`列表条目标题长度超出限制（最多允许 500 字符，当前为 ${title.length} 字符）`);
          }
          const subtitle = typeof obj.subtitle === 'string' ? obj.subtitle : '';
          if (subtitle.length > 500) {
            throw new Error(`列表条目副标题长度超出限制（最多允许 500 字符，当前为 ${subtitle.length} 字符）`);
          }
          const date = typeof obj.date === 'string' ? obj.date : '';
          if (date.length > 200) {
            throw new Error(`列表条目时间长度超出限制（最多允许 200 字符，当前为 ${date.length} 字符）`);
          }
          const desc = typeof obj.desc === 'string' ? obj.desc : '';
          if (desc.length > 5000) {
            throw new Error(`列表条目描述长度超出限制（最多允许 5000 字符，当前为 ${desc.length} 字符）`);
          }
          const text = typeof obj.text === 'string' ? obj.text : undefined;
          if (text !== undefined && text.length > 5000) {
            throw new Error(`列表条目文本长度超出限制（最多允许 5000 字符，当前为 ${text.length} 字符）`);
          }
          return {
            title,
            subtitle,
            date,
            desc,
            text,
          };
        }
        const str = String(item ?? '');
        if (str.length > 5000) {
          throw new Error(`列表条目内容长度超出限制（最多允许 5000 字符，当前为 ${str.length} 字符）`);
        }
        return str;
      });
    } else {
      dataSource.list = ['列表项'];
    }
  }

  if (dataSource.rate !== undefined || dataSource.maxRate !== undefined) {
    const maxRate = Math.max(1, Math.min(20, Math.round(parseFiniteNumber(dataSource.maxRate, 5))));
    const rate = Math.max(0, Math.min(maxRate, Math.round(parseFiniteNumber(dataSource.rate, 0))));
    dataSource.maxRate = maxRate;
    dataSource.rate = rate;
  }

  // ID deduplication
  let finalId = rawWidget.id && typeof rawWidget.id === 'string' && rawWidget.id.trim()
    ? rawWidget.id.trim()
    : `widget-${Date.now()}-${index ?? 0}-${Math.random().toString(36).substring(2, 7)}`;

  if (seenIds) {
    if (seenIds.has(finalId)) {
      finalId = `${finalId}-dup-${Math.random().toString(36).substring(2, 6)}`;
    }
    seenIds.add(finalId);
  }

  const customProps = (rawWidget.customProps as Record<string, unknown>) || {};
  const binding = (rawWidget.binding as string) || (customProps.binding as string) || undefined;
  const section = (rawWidget.section as string) || (customProps.section as string) || undefined;

  return {
    id: finalId,
    componentName,
    commentType: (rawWidget.commentType as string) || 'text',
    icon: (rawWidget.icon as string) || '',
    title: (rawWidget.title as string) || '组件',
    description: (rawWidget.description as string) || '',
    screenShot: (rawWidget.screenShot as IWidget['screenShot']) || undefined,
    keywords: (rawWidget.keywords as string) || '',
    category: (rawWidget.category as string) || 'text',
    props: (rawWidget.props as Record<string, unknown>) || {},
    css: safeCss,
    dataSource,
    customProps,
    binding,
    section
  };
}

// Convert complex composite modules from resume-design-main (e.g. BaseInfo_1, EduBackground_2) into Lego Widgets
export function convertResumeModuleToLegoWidgets(moduleItem: Record<string, unknown>, startTop: number): { widgets: IWidget[]; nextTop: number } {
  const widgets: IWidget[] = [];
  let top = startTop;
  const left = 40;
  const contentWidth = 740;

  const category = String(moduleItem.category || moduleItem.componentName || '').toLowerCase();
  const title = (moduleItem.title as string) || '';
  const ds = (moduleItem.dataSource || {}) as Record<string, unknown>;

  // Module Section Title
  if (title && !category.includes('baseinfo') && !category.includes('base_info')) {
    widgets.push(
      ensureValidWidget({
        id: `mod-title-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        componentName: 'hj-text-8',
        title: title,
        css: {
          left,
          top,
          width: contentWidth,
          height: 36,
          zIndex: 2,
          fontColor: '#1e3a8a',
          fontSize: 16,
          fontWeight: 'bold',
          padding: { top: 0, right: 0, bottom: 0, left: 10 }
        },
        dataSource: { text: `▌ ${title}` }
      })
    );
    top += 45;
  }

  if (category.includes('baseinfo') || category.includes('base_info')) {
    const name = extractValue(ds.name);
    const abstract = extractValue(ds.abstract);
    const avatar = extractValue(ds.avatar);
    const age = extractValue(ds.age);
    const address = extractValue(ds.address);
    const phone = extractValue(ds.phoneNumber);
    const email = extractValue(ds.email);
    const degree = extractValue(ds.degree);
    const workService = extractValue(ds.workService);

    let hasAvatar = false;
    if (avatar) {
      hasAvatar = true;
      widgets.push(
        ensureValidWidget({
          id: `avatar-${Date.now()}`,
          componentName: 'hj-avatar-1',
          title: '个人头像',
          css: {
            left: 640,
            top,
            width: 110,
            height: 140,
            zIndex: 3,
            borderRadius: 8,
            borderWidth: 2,
            borderColor: '#e2e8f0',
            borderStyle: 'solid'
          },
          dataSource: { avatarSrc: avatar }
        })
      );
    }

    const textWidth = hasAvatar ? 580 : contentWidth;

    if (name) {
      widgets.push(
        ensureValidWidget({
          id: `name-${Date.now()}`,
          componentName: 'hj-text-2',
          title: '姓名',
          css: {
            left,
            top,
            width: textWidth,
            height: 40,
            zIndex: 2,
            fontColor: '#0f172a',
            fontSize: 24,
            fontWeight: 'bold'
          },
          dataSource: { text: name }
        })
      );
      top += 44;
    }

    if (abstract) {
      const cleanAbs = cleanHtmlText(abstract);
      widgets.push(
        ensureValidWidget({
          id: `abstract-${Date.now()}`,
          componentName: 'hj-text-1',
          title: '一句话简介',
          css: {
            left,
            top,
            width: textWidth,
            height: 28,
            zIndex: 2,
            fontColor: '#64748b',
            fontSize: 13
          },
          dataSource: { text: cleanAbs }
        })
      );
      top += 32;
    }

    const contactItems: string[] = [];
    if (phone) contactItems.push(`电话: ${phone}`);
    if (email) contactItems.push(`邮箱: ${email}`);
    if (address) contactItems.push(`城市: ${address}`);
    if (age) contactItems.push(`${age}岁`);
    if (degree) contactItems.push(`学历: ${degree}`);
    if (workService && workService !== '0') contactItems.push(`经验: ${workService}年`);

    if (contactItems.length > 0) {
      widgets.push(
        ensureValidWidget({
          id: `contacts-${Date.now()}`,
          componentName: 'hj-text-1',
          title: '联系方式',
          css: {
            left,
            top,
            width: textWidth,
            height: 24,
            zIndex: 2,
            fontColor: '#475569',
            fontSize: 12
          },
          dataSource: { text: contactItems.join(' | ') }
        })
      );
      top += 36;
    }

    top = Math.max(top, startTop + 150);
    return { widgets, nextTop: top + 15 };
  }

  if (category.includes('job_intention') || category.includes('jobintention')) {
    const intendedPositions = extractValue(ds.intendedPositions);
    const intendedCity = extractValue(ds.intendedCity);
    const expectSalary = extractValue(ds.expectSalary);
    const jobStatus = extractValue(ds.jobStatus);
    const jobSearchType = extractValue(ds.jobSearchType);

    const items: string[] = [];
    if (intendedPositions) items.push(`意向岗位：${intendedPositions}`);
    if (intendedCity) items.push(`城市：${intendedCity}`);
    if (expectSalary) items.push(`薪资：${expectSalary}`);
    if (jobStatus) items.push(`状态：${jobStatus}`);
    if (jobSearchType) items.push(`类型：${jobSearchType}`);

    if (items.length > 0) {
      widgets.push(
        ensureValidWidget({
          id: `job-intent-${Date.now()}`,
          componentName: 'hj-text-1',
          title: '求职意向',
          css: {
            left,
            top,
            width: contentWidth,
            height: 28,
            zIndex: 2,
            fontColor: '#334155',
            fontSize: 13
          },
          dataSource: { text: items.join(' | ') }
        })
      );
      top += 35;
    }
    return { widgets, nextTop: top + 15 };
  }

  // Handle list-based modules (edu, work, project, internship, campus)
  const listObj = ds.list;
  let rawList: unknown[] = [];
  if (Array.isArray(listObj)) {
    rawList = listObj;
  } else if (listObj && typeof listObj === 'object') {
    const lObj = listObj as Record<string, unknown>;
    if (Array.isArray(lObj.value)) rawList = lObj.value;
  }

  if (rawList.length > 0) {
    rawList.forEach((sub: unknown) => {
      if (!sub || typeof sub !== 'object') return;
      const subObj = sub as Record<string, unknown>;

      const name = extractValue(subObj.schoolName) || extractValue(subObj.companyName) || extractValue(subObj.projectName) || extractValue(subObj.campusBriefly) || extractValue(subObj.worksName);
      const titleRole = extractValue(subObj.specialized) || extractValue(subObj.posts) || extractValue(subObj.campusDuty) || extractValue(subObj.degree);
      const dateVal = extractValue(subObj.date);

      if (name || titleRole || dateVal) {
        widgets.push(
          ensureValidWidget({
            id: `item-title-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            componentName: 'hj-text-2',
            title: '履历条目标题',
            css: {
              left,
              top,
              width: contentWidth,
              height: 28,
              zIndex: 2,
              fontColor: '#0f172a',
              fontSize: 14,
              fontWeight: 'bold'
            },
            dataSource: {
              text: `${name}${titleRole ? ` · ${titleRole}` : ''}${dateVal ? `  [ ${dateVal} ]` : ''}`
            }
          })
        );
        top += 30;
      }

      // Detailed content / bullets
      const details: string[] = [];
      const course = extractValue(subObj.majorCourse);
      const content = extractValue(subObj.campusContent);
      const intro = extractValue(subObj.introduce) || extractValue(subObj.worksIntroduce);

      if (course) details.push(course);
      if (content) details.push(content);
      if (intro) details.push(intro);

      if (subObj.jobContent && typeof subObj.jobContent === 'object') {
        const jc = subObj.jobContent as Record<string, unknown>;
        const jcArr = Array.isArray(jc.value) ? jc.value : (Array.isArray(subObj.jobContent) ? subObj.jobContent : []);
        jcArr.forEach((cItem: unknown) => {
          const txt = extractValue(cItem);
          if (txt) details.push(txt);
        });
      }

      details.forEach((rawText) => {
        const cleaned = cleanHtmlText(rawText);
        if (cleaned) {
          const lines = cleaned.split('\n').filter((l) => l.trim().length > 0);
          lines.forEach((line) => {
            const isBullet = line.trim().startsWith('•') || line.trim().startsWith('-') || /^\d+\./.test(line.trim());
            const formattedLine = isBullet ? line.trim() : `• ${line.trim()}`;
            widgets.push(
              ensureValidWidget({
                id: `item-desc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                componentName: 'hj-text-1',
                title: '描述内容',
                css: {
                  left: left + 10,
                  top,
                  width: contentWidth - 10,
                  height: Math.max(24, Math.ceil(line.length / 45) * 22),
                  zIndex: 2,
                  fontColor: '#334155',
                  fontSize: 13,
                  lineHeight: 1.6
                },
                dataSource: { text: formattedLine }
              })
            );
            top += Math.max(26, Math.ceil(line.length / 45) * 24);
          });
        }
      });
      top += 10;
    });

    return { widgets, nextTop: top + 10 };
  }

  // Single text content (for self evaluation, hobbies, skills text)
  const singleContent = extractValue(ds.content) || extractValue(ds.introduce) || extractValue(moduleItem.content);
  if (singleContent) {
    const cleaned = cleanHtmlText(singleContent);
    const lines = cleaned.split('\n').filter((l) => l.trim().length > 0);
    lines.forEach((line) => {
      widgets.push(
        ensureValidWidget({
          id: `single-text-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          componentName: 'hj-text-6',
          title: '模块内容',
          css: {
            left,
            top,
            width: contentWidth,
            height: Math.max(28, Math.ceil(line.length / 50) * 22),
            zIndex: 2,
            fontColor: '#334155',
            fontSize: 13,
            lineHeight: 1.7
          },
          dataSource: { text: line.trim() }
        })
      );
      top += Math.max(30, Math.ceil(line.length / 50) * 24);
    });
  }

  return { widgets, nextTop: top + 15 };
}

export function unwrapLegoSchemaWrapper(rawJson: unknown): Record<string, unknown> {
  if (!rawJson || typeof rawJson !== 'object' || Array.isArray(rawJson)) {
    return {};
  }
  let data = JSON.parse(JSON.stringify(rawJson)) as Record<string, unknown>;

  // Unwrap potential wrapper objects
  if (data.template_json && typeof data.template_json === 'object' && !Array.isArray(data.template_json)) {
    data = data.template_json as Record<string, unknown>;
  }
  if (data.lego_json && typeof data.lego_json === 'object' && !Array.isArray(data.lego_json)) {
    data = data.lego_json as Record<string, unknown>;
  }
  if (data.HJSchemaJsonStore && typeof data.HJSchemaJsonStore === 'object' && !Array.isArray(data.HJSchemaJsonStore)) {
    data = data.HJSchemaJsonStore as Record<string, unknown>;
  }
  if (
    data.data &&
    typeof data.data === 'object' &&
    !Array.isArray(data.data) &&
    ((data.data as Record<string, unknown>).componentsTree ||
      (data.data as Record<string, unknown>).children ||
      (data.data as Record<string, unknown>).widgets)
  ) {
    data = data.data as Record<string, unknown>;
  }
  return data;
}

export function normalizeLegoSchema(rawJson: unknown): IHJSchema {
  if (!rawJson || typeof rawJson !== 'object') {
    return {
      id: 'lego-default',
      version: '1.0.0',
      componentsTree: [{ id: 'page-1', componentName: 'page', commentType: 'page', children: [] }],
      css: { width: 820, height: 1160, background: '#ffffff', opacity: 1 },
      config: { title: '简历制作器' }
    };
  }

  const data = unwrapLegoSchemaWrapper(rawJson);

  const cssObj = (data.css || {}) as Record<string, unknown>;
  const parsedWidth = parseInt(String(cssObj.width));
  const safeWidth = typeof cssObj.width === 'number' && cssObj.width >= 300 ? cssObj.width : (!isNaN(parsedWidth) && parsedWidth >= 300 ? parsedWidth : 820);

  const parsedHeight = parseInt(String(cssObj.height));
  const safeHeight = typeof cssObj.height === 'number' && cssObj.height >= 500 ? cssObj.height : (!isNaN(parsedHeight) && parsedHeight >= 500 ? parsedHeight : 1160);

  const background = (cssObj.background as string) || (cssObj.backgroundColor as string) || '#ffffff';

  const rawPagePadding = (cssObj.pagePadding || {}) as Record<string, unknown>;
  const safePagePadding = {
    top: Math.max(0, Math.min(300, parseFiniteNumber(rawPagePadding.top, 30))),
    right: Math.max(0, Math.min(300, parseFiniteNumber(rawPagePadding.right, 30))),
    bottom: Math.max(0, Math.min(300, parseFiniteNumber(rawPagePadding.bottom, 30))),
    left: Math.max(0, Math.min(300, parseFiniteNumber(rawPagePadding.left, 30)))
  };

  const safeCss = {
    width: safeWidth,
    height: safeHeight,
    background,
    opacity: typeof cssObj.opacity === 'number' && Number.isFinite(cssObj.opacity) ? Math.max(0, Math.min(1, cssObj.opacity)) : 1,
    backgroundImage: (cssObj.backgroundImage as string) || '',
    fontFamily: (cssObj.fontFamily as string) || 'Inter, sans-serif',
    themeColor: (cssObj.themeColor as string) || '#2563eb',
    pagePadding: safePagePadding
  };

  const configObj = (data.config || {}) as Record<string, unknown>;
  const safeConfig = {
    title: (configObj.title as string) || '我的简历'
  };

  const seenIds = new Set<string>();
  let pages: IPageComponent[] = [];

  if (Array.isArray(data.componentsTree) && data.componentsTree.length > 0) {
    const hasPages = data.componentsTree.some(
      (item: unknown) =>
        item &&
        typeof item === 'object' &&
        ((item as Record<string, unknown>).componentName === 'page' ||
          (item as Record<string, unknown>).commentType === 'page' ||
          Array.isArray((item as Record<string, unknown>).children))
    );

    if (hasPages) {
      if (data.componentsTree.length > 20) {
        throw new Error(`积木数据超出最大允许页数限制（最多支持 20 页，当前包含 ${data.componentsTree.length} 页）`);
      }
      pages = data.componentsTree.map((pageItem: unknown, pIdx: number) => {
        const pObj = (pageItem || {}) as Record<string, unknown>;
        const childrenList = Array.isArray(pObj.children) ? pObj.children : [];
        if (childrenList.length > 500) {
          throw new Error(`第 ${pIdx + 1} 页组件数量超出限制（单页最多支持 500 个组件，当前包含 ${childrenList.length} 个）`);
        }
        return {
          id: (pObj.id as string) || `page-${pIdx + 1}`,
          componentName: 'page',
          commentType: 'page',
          children: childrenList.map((w: unknown, wIdx: number) =>
            ensureValidWidget(w as Record<string, unknown>, wIdx, seenIds)
          )
        };
      });
    } else {
      // Check if items in componentsTree are atomic Lego widgets (starting with 'hj-') vs composite resume modules (BaseInfo_1, EduBackground_2, etc.)
      const isCompositeModules = data.componentsTree.some(
        (item: unknown) =>
          item &&
          typeof item === 'object' &&
          ((item as Record<string, unknown>).category || (item as Record<string, unknown>).componentName) &&
          !String((item as Record<string, unknown>).componentName || '').startsWith('hj-')
      );

      if (isCompositeModules) {
        if (data.componentsTree.length > 100) {
          throw new Error(`模块数量超出限制（最多支持 100 个模块，当前包含 ${data.componentsTree.length} 个）`);
        }
        const moduleWidgets: IWidget[] = [];
        let currentTop = 40;
        data.componentsTree.forEach((mod: unknown) => {
          if (mod && typeof mod === 'object') {
            const { widgets, nextTop } = convertResumeModuleToLegoWidgets(mod as Record<string, unknown>, currentTop);
            moduleWidgets.push(...widgets);
            currentTop = nextTop;
          }
        });
        if (moduleWidgets.length > 500) {
          throw new Error(`转换后的组件数量超出限制（单页最多支持 500 个组件，当前包含 ${moduleWidgets.length} 个）`);
        }
        moduleWidgets.forEach((w) => {
          if (seenIds.has(w.id)) {
            w.id = `${w.id}-dup-${Math.random().toString(36).substring(2, 6)}`;
          }
          seenIds.add(w.id);
        });
        pages = [{ id: 'page-1', componentName: 'page', commentType: 'page', children: moduleWidgets }];
      } else {
        // componentsTree is directly an array of Lego widgets
        if (data.componentsTree.length > 500) {
          throw new Error(`组件数量超出限制（最多支持 500 个组件，当前包含 ${data.componentsTree.length} 个）`);
        }
        const widgets = data.componentsTree.map((w: unknown, wIdx: number) =>
          ensureValidWidget(w as Record<string, unknown>, wIdx, seenIds)
        );
        pages = [{ id: 'page-1', componentName: 'page', commentType: 'page', children: widgets }];
      }
    }
  } else if (Array.isArray(data.children)) {
    if (data.children.length > 500) {
      throw new Error(`组件数量超出限制（最多支持 500 个组件，当前包含 ${data.children.length} 个）`);
    }
    const widgets = data.children.map((w: unknown, wIdx: number) =>
      ensureValidWidget(w as Record<string, unknown>, wIdx, seenIds)
    );
    pages = [{ id: 'page-1', componentName: 'page', commentType: 'page', children: widgets }];
  } else if (Array.isArray(data.widgets)) {
    if (data.widgets.length > 500) {
      throw new Error(`组件数量超出限制（最多支持 500 个组件，当前包含 ${data.widgets.length} 个）`);
    }
    const widgets = data.widgets.map((w: unknown, wIdx: number) =>
      ensureValidWidget(w as Record<string, unknown>, wIdx, seenIds)
    );
    pages = [{ id: 'page-1', componentName: 'page', commentType: 'page', children: widgets }];
  } else {
    // Check if rawJson is a map of resume modules like { BASE_INFO: ..., WORK_EXPERIENCE: ... }
    const fallbackWidgets: IWidget[] = [];
    let topY = 40;

    Object.keys(data).forEach((key) => {
      const mod = data[key] as Record<string, unknown> | null;
      if (mod && typeof mod === 'object') {
        const { widgets, nextTop } = convertResumeModuleToLegoWidgets(mod, topY);
        fallbackWidgets.push(...widgets);
        topY = nextTop;
      }
    });

    if (fallbackWidgets.length > 500) {
      throw new Error(`转换后的组件数量超出限制（单页最多支持 500 个组件，当前包含 ${fallbackWidgets.length} 个）`);
    }

    fallbackWidgets.forEach((w) => {
      if (seenIds.has(w.id)) {
        w.id = `${w.id}-dup-${Math.random().toString(36).substring(2, 6)}`;
      }
      seenIds.add(w.id);
    });

    pages = [{ id: 'page-1', componentName: 'page', commentType: 'page', children: fallbackWidgets }];
  }

  if (pages.length === 0) {
    pages = [{ id: 'page-1', componentName: 'page', commentType: 'page', children: [] }];
  }

  // Ensure canvas height expands to fit all widgets cleanly without uncontrolled drift
  let maxWidgetBottom = 0;
  pages.forEach((page) => {
    (page.children || []).forEach((w) => {
      const b = (w.css?.top || 0) + (w.css?.height || 40);
      if (b > maxWidgetBottom) maxWidgetBottom = b;
    });
  });

  if (maxWidgetBottom > safeHeight) {
    safeCss.height = Math.max(safeHeight, maxWidgetBottom + 40);
  } else {
    safeCss.height = safeHeight;
  }

  return {
    id: (data.id as string) || `lego-${Date.now()}`,
    version: (data.version as string) || '1.0.0',
    componentsTree: pages,
    css: safeCss,
    config: safeConfig,
    i18n: (data.i18n as Record<string, unknown>) || {},
    constants: (data.constants as Record<string, unknown>) || {},
    meta: (data.meta as Record<string, unknown>) || {},
    dataSource: (data.dataSource as Record<string, unknown>) || {}
  };
}

export function validateAndNormalizeLegoJson(rawJson: unknown): { success: boolean; data?: IHJSchema; error?: string } {
  if (!rawJson || typeof rawJson !== 'object' || Array.isArray(rawJson)) {
    return { success: false, error: '导入的 JSON 必须是非空对象' };
  }

  // Unwrap supported wrapper formats first (e.g. { template_json: schema }, { lego_json: schema }, { data: schema })
  const rawObj = unwrapLegoSchemaWrapper(rawJson);
  const keys = Object.keys(rawObj);
  if (keys.length === 0) {
    return { success: false, error: '导入的 JSON 为空对象，未包含积木画布数据' };
  }

  // Pre-check page count if componentsTree is present
  if (Array.isArray(rawObj.componentsTree) && rawObj.componentsTree.length > 20) {
    return {
      success: false,
      error: `积木数据超出最大允许页数限制（最多支持 20 页，当前包含 ${rawObj.componentsTree.length} 页）`
    };
  }

  // Must contain recognizable Lego structure or composite resume modules
  const hasCanvasStructure =
    Array.isArray(rawObj.componentsTree) ||
    Array.isArray(rawObj.children) ||
    Array.isArray(rawObj.widgets) ||
    keys.some(
      (k) =>
        k.startsWith('BASE_') ||
        k.startsWith('WORK_') ||
        k.startsWith('EDU_') ||
        k.startsWith('SKILL_') ||
        k.startsWith('PROJECT_') ||
        k === 'BaseInfo_1' ||
        k === 'id' && (rawObj.componentsTree !== undefined || rawObj.children !== undefined)
    );

  if (!hasCanvasStructure) {
    return { success: false, error: '导入的 JSON 不包含有效的积木画布组件结构' };
  }

  try {
    const normalized = normalizeLegoSchema(rawJson);
    if (!normalized.componentsTree || normalized.componentsTree.length === 0) {
      return { success: false, error: 'JSON 中未包含有效的页面结构' };
    }

    const totalWidgets = normalized.componentsTree.reduce(
      (sum, p) => sum + (Array.isArray(p.children) ? p.children.length : 0),
      0
    );

    if (totalWidgets === 0) {
      return { success: false, error: '导入的积木数据不包含任何有效组件' };
    }

    return { success: true, data: normalized };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : '解析 Schema 失败' };
  }
}

export interface StructuredResumeValidationResult {
  success: boolean;
  data?: FinalResume;
  error?: string;
}

/**
 * Strictly validates and normalizes a structured resume JSON object.
 * Rejects empty objects, objects missing personalInfo/name, or invalid collection types.
 * Normalizes all fields to ensure no undefined crashes in downstream UI.
 */
export function validateAndNormalizeStructuredResume(rawInput: unknown): StructuredResumeValidationResult {
  if (!rawInput || typeof rawInput !== 'object' || Array.isArray(rawInput)) {
    return { success: false, error: '导入的 JSON 必须是一个非空对象' };
  }

  const rawObj = rawInput as Record<string, unknown>;
  // Unwrap nested finalResume or resumeData if present
  let candidate: Record<string, unknown> = rawObj;
  if (rawObj.finalResume && typeof rawObj.finalResume === 'object' && !Array.isArray(rawObj.finalResume)) {
    candidate = rawObj.finalResume as Record<string, unknown>;
  } else if (rawObj.resumeData && typeof rawObj.resumeData === 'object' && !Array.isArray(rawObj.resumeData)) {
    candidate = rawObj.resumeData as Record<string, unknown>;
  }

  if (Object.keys(candidate).length === 0) {
    return { success: false, error: '导入的 JSON 为空对象，未包含简历字段数据' };
  }

  const personalInfo = candidate.personalInfo as Record<string, unknown> | undefined;
  if (!personalInfo || typeof personalInfo !== 'object' || Array.isArray(personalInfo)) {
    return { success: false, error: '导入的简历缺少个人基本信息 (personalInfo) 对象' };
  }

  const name = typeof personalInfo.name === 'string' ? personalInfo.name.trim() : '';
  if (!name) {
    return { success: false, error: '导入的简历个人信息缺少有效的姓名 (personalInfo.name)' };
  }

  if (candidate.workExperience !== undefined && !Array.isArray(candidate.workExperience)) {
    return { success: false, error: '工作经历 (workExperience) 格式错误，必须为数组' };
  }

  if (candidate.projectExperience !== undefined && !Array.isArray(candidate.projectExperience)) {
    return { success: false, error: '项目经历 (projectExperience) 格式错误，必须为数组' };
  }

  if (candidate.coreSkills !== undefined && !Array.isArray(candidate.coreSkills)) {
    return { success: false, error: '核心技能 (coreSkills) 格式错误，必须为数组' };
  }

  const edu = (candidate.education || {}) as Record<string, unknown>;

  const normalized: FinalResume = {
    personalInfo: {
      name,
      email: typeof personalInfo.email === 'string' ? personalInfo.email.trim() : '',
      phone: typeof personalInfo.phone === 'string' ? personalInfo.phone.trim() : '',
      location: typeof personalInfo.location === 'string' ? personalInfo.location.trim() : '',
      avatarUrl: typeof personalInfo.avatarUrl === 'string' ? personalInfo.avatarUrl.trim() : undefined,
    },
    jobIntent: typeof candidate.jobIntent === 'string' ? candidate.jobIntent.trim() : '',
    summary: typeof candidate.summary === 'string' ? candidate.summary.trim() : '',
    coreSkills: Array.isArray(candidate.coreSkills)
      ? candidate.coreSkills.map((s) => String(s || '').trim()).filter(Boolean)
      : [],
    workExperience: Array.isArray(candidate.workExperience)
      ? candidate.workExperience.map((item: unknown) => {
          const w = (item || {}) as Record<string, unknown>;
          const bullets = Array.isArray(w.bullets) ? w.bullets.map((b) => String(b || '').trim()).filter(Boolean) : [];
          return {
            company: String(w.company || '').trim(),
            role: String(w.role || '').trim(),
            period: String(w.period || '').trim(),
            bullets,
          };
        })
      : [],
    projectExperience: Array.isArray(candidate.projectExperience)
      ? candidate.projectExperience.map((item: unknown) => {
          const p = (item || {}) as Record<string, unknown>;
          const bullets = Array.isArray(p.bullets) ? p.bullets.map((b) => String(b || '').trim()).filter(Boolean) : [];
          return {
            name: String(p.name || '').trim(),
            role: String(p.role || '').trim(),
            period: String(p.period || '').trim(),
            bullets,
          };
        })
      : [],
    skillsAndTools: Array.isArray(candidate.skillsAndTools)
      ? candidate.skillsAndTools.map((s) => String(s || '').trim()).filter(Boolean)
      : [],
    education: {
      school: String(edu.school || '').trim(),
      degree: String(edu.degree || '').trim(),
      period: String(edu.period || '').trim(),
    },
  };

  return { success: true, data: normalized };
}
