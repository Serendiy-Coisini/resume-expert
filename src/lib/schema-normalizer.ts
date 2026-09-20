import type { IHJSchema, IWidget, IPageComponent, IWidgetCss, IWidgetDataSource } from '@/types/lego';

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

export function ensureValidWidget(rawWidget: Record<string, unknown> | null | undefined, index?: number): IWidget {
  if (!rawWidget || typeof rawWidget !== 'object') {
    return {
      id: `widget-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
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

  const parsedLeft = parseFiniteNumber(css.left, 40);
  const parsedTop = parseFiniteNumber(css.top, 40 + (index || 0) * 50);
  const parsedWidth = parseFiniteNumber(css.width, defaultFallbackWidth);
  const parsedHeight = parseFiniteNumber(css.height, defaultFallbackHeight);

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
    borderWidth: typeof css.borderWidth === 'number' ? css.borderWidth : (css.borderStyle && css.borderStyle !== 'none' ? 1 : 0),
    borderRadius: typeof css.borderRadius === 'number' ? css.borderRadius : ((css.borderRadius as string | number) || 0),
    borderColor: (css.borderColor as string) || '#eee',
    borderStyle: (css.borderStyle as string) || (css.borderWidth || (typeof css.borderWidth === 'number' && css.borderWidth > 0) ? 'solid' : 'none'),
    clipPath: (css.clipPath as string) || undefined,
    borderLeftWidth: typeof css.borderLeftWidth === 'number' ? css.borderLeftWidth : undefined,
    borderLeftColor: (css.borderLeftColor as string) || undefined,
    borderLeftStyle: (css.borderLeftStyle as string) || undefined,
    paddingLeft: typeof css.paddingLeft === 'number' ? css.paddingLeft : undefined
  };



  const dataSource: IWidgetDataSource = rawWidget.dataSource && typeof rawWidget.dataSource === 'object'
    ? { ...(rawWidget.dataSource as Record<string, unknown>) }
    : {};

  if (componentName.startsWith('hj-avatar')) {
    dataSource.avatarSrc = (dataSource.avatarSrc || dataSource.avatar || dataSource.url || dataSource.src || '') as string;
  }
  if (componentName.startsWith('hj-text')) {
    if (dataSource.text === undefined && rawWidget.title) {
      dataSource.text = rawWidget.title as string;
    } else if (dataSource.text !== undefined) {
      dataSource.text = String(dataSource.text);
    }
  }
  if (componentName === 'hj-li') {
    if (!Array.isArray(dataSource.list)) {
      dataSource.list = ['列表项'];
    }
  }

  return {
    id: (rawWidget.id as string) || `widget-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
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
    customProps: (rawWidget.customProps as Record<string, unknown>) || {}
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

  let data = JSON.parse(JSON.stringify(rawJson)) as Record<string, unknown>;

  // Unwrap potential wrapper objects
  if (data.template_json && typeof data.template_json === 'object') data = data.template_json as Record<string, unknown>;
  if (data.lego_json && typeof data.lego_json === 'object') data = data.lego_json as Record<string, unknown>;
  if (data.HJSchemaJsonStore && typeof data.HJSchemaJsonStore === 'object') data = data.HJSchemaJsonStore as Record<string, unknown>;
  if (data.data && typeof data.data === 'object' && ((data.data as Record<string, unknown>).componentsTree || (data.data as Record<string, unknown>).children)) {
    data = data.data as Record<string, unknown>;
  }

  const cssObj = (data.css || {}) as Record<string, unknown>;
  const parsedWidth = parseInt(String(cssObj.width));
  const safeWidth = typeof cssObj.width === 'number' && cssObj.width >= 300 ? cssObj.width : (!isNaN(parsedWidth) && parsedWidth >= 300 ? parsedWidth : 820);

  const parsedHeight = parseInt(String(cssObj.height));
  const safeHeight = typeof cssObj.height === 'number' && cssObj.height >= 500 ? cssObj.height : (!isNaN(parsedHeight) && parsedHeight >= 500 ? parsedHeight : 1160);

  const background = (cssObj.background as string) || (cssObj.backgroundColor as string) || '#ffffff';

  const safeCss = {
    width: safeWidth,
    height: safeHeight,
    background,
    opacity: typeof cssObj.opacity === 'number' ? cssObj.opacity : 1,
    backgroundImage: (cssObj.backgroundImage as string) || '',
    fontFamily: (cssObj.fontFamily as string) || 'Inter, sans-serif',
    themeColor: (cssObj.themeColor as string) || '#2563eb'
  };

  const configObj = (data.config || {}) as Record<string, unknown>;
  const safeConfig = {
    title: (configObj.title as string) || '我的简历'
  };

  let pages: IPageComponent[] = [];

  if (Array.isArray(data.componentsTree) && data.componentsTree.length > 0) {
    const hasPages = data.componentsTree.some(
      (item: unknown) =>
        item &&
        typeof item === 'object' &&
        ((item as Record<string, unknown>).componentName === 'page' ||
          (item as Record<string, unknown>).commentType === 'page')
    );

    if (hasPages) {
      pages = data.componentsTree.map((pageItem: unknown, pIdx: number) => {
        const pObj = (pageItem || {}) as Record<string, unknown>;
        const childrenList = Array.isArray(pObj.children) ? pObj.children : [];
        return {
          id: (pObj.id as string) || `page-${pIdx + 1}`,
          componentName: 'page',
          commentType: 'page',
          children: childrenList.map((w: unknown, wIdx: number) =>
            ensureValidWidget(w as Record<string, unknown>, wIdx)
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
        const moduleWidgets: IWidget[] = [];
        let currentTop = 40;
        data.componentsTree.forEach((mod: unknown) => {
          if (mod && typeof mod === 'object') {
            const { widgets, nextTop } = convertResumeModuleToLegoWidgets(mod as Record<string, unknown>, currentTop);
            moduleWidgets.push(...widgets);
            currentTop = nextTop;
          }
        });
        pages = [{ id: 'page-1', componentName: 'page', commentType: 'page', children: moduleWidgets }];
      } else {
        // componentsTree is directly an array of Lego widgets
        const widgets = data.componentsTree.map((w: unknown, wIdx: number) =>
          ensureValidWidget(w as Record<string, unknown>, wIdx)
        );
        pages = [{ id: 'page-1', componentName: 'page', commentType: 'page', children: widgets }];
      }
    }
  } else if (Array.isArray(data.children)) {
    const widgets = data.children.map((w: unknown, wIdx: number) =>
      ensureValidWidget(w as Record<string, unknown>, wIdx)
    );
    pages = [{ id: 'page-1', componentName: 'page', commentType: 'page', children: widgets }];
  } else if (Array.isArray(data.widgets)) {
    const widgets = data.widgets.map((w: unknown, wIdx: number) =>
      ensureValidWidget(w as Record<string, unknown>, wIdx)
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

    pages = [{ id: 'page-1', componentName: 'page', commentType: 'page', children: fallbackWidgets }];
  }

  if (pages.length === 0) {
    pages = [{ id: 'page-1', componentName: 'page', commentType: 'page', children: [] }];
  }

  // Ensure canvas height expands to fit all widgets cleanly
  let maxWidgetBottom = 0;
  pages.forEach((page) => {
    (page.children || []).forEach((w) => {
      const b = (w.css?.top || 0) + (w.css?.height || 40);
      if (b > maxWidgetBottom) maxWidgetBottom = b;
    });
  });

  if (maxWidgetBottom > 0) {
    safeCss.height = Math.max(safeHeight, maxWidgetBottom + 80);
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
