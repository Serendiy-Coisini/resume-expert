import React from 'react';
import type { IWidget } from '@/types/lego';
import { User, Image as ImageIcon, Smile, Mail, MapPin, Phone, Github, Linkedin, Camera, Star } from 'lucide-react';

export function renderFormattedText(text: string) {
  if (!text) return null;

  const cleaned = text.replace(/\*{4,}/g, '').replace(/\*\*\*\*/g, '');

  const html = cleaned
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\[color=(.*?)\](.*?)\[\/color\]/g, '<span style="color:$1;font-weight:bold;">$2</span>')
    .replace(/\[size=(.*?)\](.*?)\[\/size\]/g, '<span style="font-size:$1px;">$2</span>')
    .replace(/\[bg=(.*?)\](.*?)\[\/bg\]/g, '<mark style="background-color:$1;padding:0 4px;border-radius:3px;">$2</mark>');

  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

interface WidgetRendererProps {
  widget: IWidget;
}

export const WidgetRenderer: React.FC<WidgetRendererProps> = ({ widget }) => {
  const { componentName, css, dataSource } = widget;
  const avatarSrc = (dataSource.avatarSrc || dataSource.src) as string | undefined;

  const isTextType =
    componentName.startsWith('hj-text') ||
    componentName === 'hj-[#exper-1]' ||
    componentName === 'hj-li' ||
    componentName.startsWith('hj-date');

  const style: React.CSSProperties = {
    width: '100%',
    height: isTextType ? 'auto' : '100%',
    minHeight: isTextType ? '100%' : undefined,
    boxSizing: 'border-box',
    color: css.fontColor,
    backgroundColor: css.backgroundColor || 'transparent',
    fontSize: css.fontSize ? `${css.fontSize}px` : undefined,
    fontWeight: css.fontWeight,
    fontFamily: css.fontFamily,
    letterSpacing: css.letterSpace ? `${css.letterSpace}px` : undefined,
    lineHeight: css.lineHeight || (isTextType ? 1.6 : undefined),
    textAlign: css.textAlign,
    borderColor: css.borderColor || 'transparent',
    borderStyle: (css.borderStyle as React.CSSProperties['borderStyle']) || 'none',
    borderWidth: css.borderWidth !== undefined ? `${css.borderWidth}px` : '0px',
    borderRadius: typeof css.borderRadius === 'number' ? `${css.borderRadius}px` : css.borderRadius || undefined,
    opacity: css.opacity,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    display: 'flex',
    alignItems: componentName.includes('text') || componentName.includes('rectangle') ? 'flex-start' : 'center',
    justifyContent: css.textAlign === 'center' ? 'center' : css.textAlign === 'right' ? 'flex-end' : 'flex-start',
    overflow: isTextType ? 'visible' : 'hidden',
    position: 'relative'
  };

  // Avatar clip paths
  const clipPaths: Record<string, string> = {
    'hj-avatar-3': 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)', // Hexagon
    'hj-avatar-4': 'polygon(50% 0%, 80% 10%, 100% 35%, 100% 70%, 80% 90%, 50% 100%, 20% 90%, 0% 70%, 0% 35%, 20% 10%)', // Flower approx
    'hj-avatar-5': 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)', // Octagon
    'hj-avatar-6': 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)', // Rhombus
    'hj-triangle': 'polygon(50% 0%, 0% 100%, 100% 100%)',
    'hj-trapezoid': 'polygon(20% 0%, 80% 0%, 100% 100%, 0% 100%)',
    'hj-parallelogram': 'polygon(25% 0%, 100% 0%, 75% 100%, 0% 100%)',
    'hj-rhombus': 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
    'hj-pentagon': 'polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)',
    'hj-hexagon': 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
    'hj-star': 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)',
    'hj-leftArrow': 'polygon(40% 0%, 40% 20%, 100% 20%, 100% 80%, 40% 80%, 40% 100%, 0% 50%)',
    'hj-rightArrow': 'polygon(0% 20%, 60% 20%, 60% 0%, 100% 50%, 60% 100%, 60% 80%, 0% 80%)',
    'hj-cross': 'polygon(33% 0%, 67% 0%, 67% 33%, 100% 33%, 100% 67%, 67% 67%, 67% 100%, 33% 100%, 33% 67%, 0% 67%, 0% 33%, 33% 33%)',
    'hj-message': 'polygon(0% 0%, 100% 0%, 100% 75%, 75% 75%, 75% 100%, 50% 75%, 0% 75%)',
  };

  if (componentName.startsWith('hj-avatar')) {
    const avatarStyle = { ...style };
    if (clipPaths[componentName]) {
      avatarStyle.clipPath = clipPaths[componentName];
    }
    return (
      <div style={avatarStyle}>
        {avatarSrc ? (
          <img
            src={avatarSrc}
            alt="Avatar"
            className="w-full h-full pointer-events-none"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
              maxWidth: '100%',
              maxHeight: '100%'
            }}
          />
        ) : (
          <div className="w-full h-full bg-slate-100 flex flex-col items-center justify-center text-slate-400 p-2 text-center select-none">
            <User className="w-8 h-8 text-slate-300 mb-1 shrink-0" />
            <span className="text-[11px] font-medium text-slate-500">点此上传</span>
          </div>
        )}
      </div>
    );
  }

  if (componentName.startsWith('hj-text')) {
    const textStyle = { ...style };
    if (componentName === 'hj-text-7') {
      textStyle.writingMode = 'vertical-rl';
    }
    if (componentName === 'hj-text-4' && css.textDecoration) {
      textStyle.textDecoration = css.textDecoration as string;
    }
    if (componentName === 'hj-text-8') {
      textStyle.borderLeftWidth = css.borderLeftWidth !== undefined ? `${css.borderLeftWidth}px` : '3px';
      textStyle.borderLeftColor = css.borderLeftColor || '#3b82f6';
      textStyle.borderLeftStyle = (css.borderLeftStyle as React.CSSProperties['borderLeftStyle']) || 'solid';
      textStyle.paddingLeft = css.paddingLeft !== undefined ? `${css.paddingLeft}px` : '12px';
    }
    return (
      <div style={textStyle}>
        {dataSource.text ? renderFormattedText(dataSource.text as string) : '双击编辑'}
      </div>
    );
  }

  if (componentName === 'hj-icon') {
    const IconMap: Record<string, React.ElementType> = { User, Smile, Image: ImageIcon, Mail, MapPin, Phone, Github, Linkedin, Camera, Star };
    const IconComp = IconMap[(dataSource.icon as string) || 'Smile'] || Smile;
    return (
      <div style={{ ...style, justifyContent: 'center', alignItems: 'center' }}>
        <IconComp style={{ width: '100%', height: '100%' }} />
      </div>
    );
  }

  if (componentName === 'hj-li') {
    const list = (dataSource.list as string[]) || ['项目一'];
    return (
      <div style={{ ...style, flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'flex-start' }}>
        <ul className="list-disc pl-5 m-0 p-0" style={{ paddingLeft: '20px' }}>
          {list.map((item, idx) => (
            <li key={idx}>{renderFormattedText(item)}</li>
          ))}
        </ul>
      </div>
    );
  }

  if (componentName === 'hj-image') {
    return (
      <div style={style}>
        {avatarSrc ? (
          <img
            src={avatarSrc}
            alt="Image"
            className="w-full h-full pointer-events-none"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
              maxWidth: '100%',
              maxHeight: '100%'
            }}
          />
        ) : (
          <div className="w-full h-full bg-slate-100 flex flex-col items-center justify-center text-slate-400 p-2 text-center select-none">
            <ImageIcon className="w-8 h-8 text-slate-300 mb-1 shrink-0" />
            <span className="text-[11px] font-medium text-slate-500">点此传图</span>
          </div>
        )}
      </div>
    );
  }

  if (componentName === 'hj-frame') {
    return <div style={{ ...style, backgroundColor: 'transparent' }} />;
  }

  if (['hj-rectangle', 'hj-circle', 'hj-square', 'hj-oval', 'hj-triangle', 'hj-trapezoid', 'hj-parallelogram', 'hj-rhombus', 'hj-pentagon', 'hj-hexagon', 'hj-star', 'hj-leftArrow', 'hj-rightArrow', 'hj-cross', 'hj-message'].includes(componentName)) {
    const shapeStyle = { ...style };
    if (clipPaths[componentName]) {
      shapeStyle.clipPath = clipPaths[componentName];
    }
    return (
      <div style={shapeStyle}>
        {dataSource.text && <div style={{ maxWidth: '100%', wordBreak: 'break-word', overflowWrap: 'break-word', whiteSpace: 'pre-wrap', padding: '2px 4px' }}>{renderFormattedText(dataSource.text as string)}</div>}
      </div>
    );
  }

  if (componentName.startsWith('hj-rate')) {
    const rate = Number(dataSource.rate || 0);
    const maxRate = Number(dataSource.maxRate || 5);
    const shape = dataSource.shape as string;

    if (shape === 'bar') {
      const percentage = (rate / maxRate) * 100;
      return (
        <div style={{ ...style, backgroundColor: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
          <div style={{ width: `${percentage}%`, height: '100%', backgroundColor: css.fontColor || '#3b82f6' }} />
        </div>
      );
    }

    const items = [];
    for (let i = 0; i < maxRate; i++) {
      const filled = i < rate;
      const itemStyle: React.CSSProperties = {
        width: '16px', height: '16px', marginRight: '4px',
        backgroundColor: filled ? (css.fontColor || '#f59e0b') : '#e2e8f0',
      };
      if (shape === 'circle') itemStyle.borderRadius = '50%';
      if (shape === 'diamond') itemStyle.clipPath = clipPaths['hj-rhombus'];
      if (shape === 'star') itemStyle.clipPath = clipPaths['hj-star'];
      
      items.push(<div key={i} style={itemStyle} />);
    }
    return <div style={{ ...style, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start' }}>{items}</div>;
  }

  if (componentName.startsWith('hj-date')) {
    return (
      <div style={{ ...style, alignItems: 'center', justifyContent: 'center' }}>
        {dataSource.text ? renderFormattedText(dataSource.text as string) : '日期'}
      </div>
    );
  }

  if (componentName === 'hj-other-1') {
    return <div style={style} />; // Divider
  }

  if (componentName === 'hj-other-2') {
    const qrSrc = (dataSource.qrCodeSrc || dataSource.src || dataSource.avatarSrc) as string | undefined;
    return (
      <div style={{ ...style, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: css.backgroundColor || '#f8fafc', padding: '4px' }}>
        {qrSrc ? (
          <img src={qrSrc} alt="QR Code" className="w-full h-full pointer-events-none" style={{ objectFit: 'contain' }} />
        ) : (
          <div className="w-full h-full border-2 border-dashed border-slate-300 rounded flex flex-col items-center justify-center text-slate-400 p-1 select-none">
            <span className="text-[11px] font-bold text-slate-500">{dataSource.text || 'QR Code'}</span>
            <span className="text-[9px] text-slate-400 mt-0.5">点击右侧上传二维码</span>
          </div>
        )}
      </div>
    );
  }

  if (componentName === 'hj-[#exper-1]') {
    const company = (dataSource.companyName || '') as string;
    const role = (dataSource.jobTitle || '') as string;
    const time = (dataSource.workTime || '') as string;
    const content = (dataSource.workContent || dataSource.text || '') as string;
    const align = (css.textAlign as React.CSSProperties['textAlign']) || 'left';

    // Header title styles (defaults to bold title, independent of body css.fontWeight)
    const headerFontSize = dataSource.headerFontSize !== undefined ? Number(dataSource.headerFontSize) : 13.5;
    const headerFontWeight = dataSource.headerFontWeight !== undefined ? (dataSource.headerFontWeight as string | number) : 'bold';
    const headerFontColor = dataSource.headerFontColor !== undefined ? (dataSource.headerFontColor as string) : (css.fontColor || '#0f172a');

    // Header time styles (defaults to bold/semibold time)
    const headerTimeFontSize = dataSource.headerTimeFontSize !== undefined ? Number(dataSource.headerTimeFontSize) : 12.5;
    const headerTimeFontWeight = dataSource.headerTimeFontWeight !== undefined ? (dataSource.headerTimeFontWeight as string | number) : 'bold';
    const headerTimeFontColor = dataSource.headerTimeFontColor !== undefined ? (dataSource.headerTimeFontColor as string) : '#475569';

    return (
      <div style={{ ...style, flexDirection: 'column', gap: '4px', padding: '6px 8px', alignItems: 'stretch', justifyContent: 'flex-start' }}>
        {(company || role || time) && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: '100%',
            fontWeight: headerFontWeight,
            fontFamily: css.fontFamily,
            fontSize: `${headerFontSize}px`,
            color: headerFontColor
          }}>
            <span>{renderFormattedText(company)} {role ? `· ${role}` : ''}</span>
            {time && (
              <span style={{
                color: headerTimeFontColor,
                fontWeight: headerTimeFontWeight,
                fontSize: `${headerTimeFontSize}px`,
                textAlign: 'right'
              }}>
                {time}
              </span>
            )}
          </div>
        )}
        <div style={{ fontSize: css.fontSize ? `${css.fontSize}px` : '12.5px', fontWeight: css.fontWeight || 'normal', fontFamily: css.fontFamily, color: css.fontColor || '#334155', lineHeight: 1.6, whiteSpace: 'pre-wrap', textAlign: align, width: '100%' }}>
          {content ? renderFormattedText(content) : '双击/在右侧编辑经历内容'}
        </div>
      </div>
    );
  }

  return (
    <div style={{ ...style, textAlign: (css.textAlign as React.CSSProperties['textAlign']) || 'left' }}>
      {dataSource.text ? renderFormattedText(dataSource.text as string) : '未识别的组件'}
    </div>
  );
};
