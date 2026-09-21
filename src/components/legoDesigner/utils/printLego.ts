import { sanitizePrintHTML } from '@/lib/safe-html';
import { calculateA4PageHeight } from '@/lib/lego-adapter';

export interface PrintSliceInfo {
  canvasWidth: number;
  canvasHeight: number;
  sliceHeight: number;
  pageSlices: number;
  offsets: number[];
}

/**
 * Calculates print slices and vertical offsets according to standard A4 aspect ratio (297mm / 210mm).
 * For standard 820px width, sliceHeight is 1160px.
 * For custom widths, sliceHeight scales proportionally to match A4 paper height when scaled to 210mm.
 */
export function calculatePrintSlices(canvasWidth: number, canvasHeight: number): PrintSliceInfo {
  const safeWidth = Math.max(100, Math.round(canvasWidth || 820));
  const sliceHeight = calculateA4PageHeight(safeWidth);
  const safeHeight = Math.max(sliceHeight, Math.round(canvasHeight || sliceHeight));
  const pageSlices = Math.max(1, Math.ceil(safeHeight / sliceHeight));

  const offsets: number[] = [];
  for (let s = 0; s < pageSlices; s++) {
    offsets.push(s * sliceHeight);
  }

  return {
    canvasWidth: safeWidth,
    canvasHeight: safeHeight,
    sliceHeight,
    pageSlices,
    offsets
  };
}

/**
 * Generates self-contained, fully inline-styled HTML for printing Lego canvas pages.
 * Does NOT emit external <link rel="stylesheet"> elements (which would be stripped by sanitizer).
 * Instead, embeds explicit, comprehensive print CSS rules (resets, typography, flexbox, Tailwind utilities)
 * ensuring 100% deterministic layout across all browsers and print environments.
 */
export function generateLegoPrintHtml(pageElements: HTMLElement[], localStyles: string[] = []): string {
  // Build multi-page HTML slices across all canvas pages
  const pagesHtml: string[] = [];
  const totalPageCount = pageElements.length;

  pageElements.forEach((pageElement, pIdx) => {
    // Read pagePadding from the canvas page element's data attribute
    const pagePaddingAttr = pageElement.getAttribute('data-page-padding');
    let pagePaddingCSS = '';
    if (pagePaddingAttr) {
      try {
        const pp = JSON.parse(pagePaddingAttr);
        pagePaddingCSS = `padding: ${pp.top || 0}px ${pp.right || 0}px ${pp.bottom || 0}px ${pp.left || 0}px !important;`;
      } catch { /* ignore */ }
    }

    // Clone canvas content
    const clone = pageElement.cloneNode(true) as HTMLElement;

    // Remove selection outlines / handles / guidelines / page break badges from clone
    const handles = clone.querySelectorAll('.ring-2, .ring-1, [class*="cursor-"]');
    handles.forEach((el) => {
      el.classList.remove('ring-2', 'ring-blue-500', 'ring-1', 'ring-blue-300');
      const handleDots = el.querySelectorAll('div[class*="border-blue-600"]');
      handleDots.forEach((dot) => dot.remove());
    });

    // Remove guidelines, rubberband selection box, and page break indicators
    const uiHelpers = clone.querySelectorAll(
      '[data-canvas-ui="true"], [data-page-break-indicator="true"], .page-break-indicator-ui, [class*="border-rose-500"], [class*="border-blue-500"], [class*="border-amber-500"], [class*="bg-amber-600"]'
    );
    uiHelpers.forEach((el) => el.remove());

    // Ensure absolute positioning is explicitly set in inline style for all child widgets
    const childWidgets = clone.children;
    for (let i = 0; i < childWidgets.length; i++) {
      const child = childWidgets[i] as HTMLElement;
      if (child && child.style) {
        child.style.position = 'absolute';
      }
    }

    const rawWidth = parseFloat(pageElement.style.width || '') || pageElement.offsetWidth || 820;
    const rawHeight = parseFloat(pageElement.style.height || '') || pageElement.offsetHeight || 1160;
    const sliceInfo = calculatePrintSlices(rawWidth, rawHeight);
    const { canvasWidth, canvasHeight, pageSlices, offsets } = sliceInfo;
    const canvasBg = pageElement.style.backgroundColor || '#ffffff';

    for (let s = 0; s < pageSlices; s++) {
      const isGlobalLast = (pIdx === totalPageCount - 1) && (s === pageSlices - 1);
      const translateY = offsets[s];
      pagesHtml.push(`
        <div class="lego-print-page" style="page-break-after: ${isGlobalLast ? 'auto' : 'always'}; break-after: ${isGlobalLast ? 'auto' : 'page'};">
          <div class="lego-canvas-printed-page" style="transform: scale(calc(210mm / ${canvasWidth}px)) translateY(-${translateY}px); transform-origin: top left; width: ${canvasWidth}px; height: ${canvasHeight}px; position: relative; background: ${canvasBg}; ${pagePaddingCSS}">
            ${clone.innerHTML}
          </div>
        </div>
      `);
    }
  });

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>积木简历导出</title>
        ${localStyles.join('\n')}
        <style>
          @page {
            size: 210mm 297mm;
            margin: 0mm;
          }
          *, *::before, *::after {
            box-sizing: border-box !important;
          }
          html, body {
            width: 210mm !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          p, h1, h2, h3, h4, h5, h6 {
            margin: 0;
            padding: 0;
          }
          strong {
            font-weight: 700 !important;
          }
          em {
            font-style: italic !important;
          }
          mark {
            background-color: #fef08a !important;
            padding: 0 4px !important;
            border-radius: 3px !important;
          }
          ul.list-disc, .list-disc {
            list-style-type: disc !important;
          }
          ol.list-decimal, .list-decimal {
            list-style-type: decimal !important;
          }
          ul, ol {
            margin: 0;
            padding: 0;
          }
          .w-full { width: 100% !important; }
          .h-full { height: 100% !important; }
          .flex { display: flex !important; }
          .inline-flex { display: inline-flex !important; }
          .flex-col { flex-direction: column !important; }
          .flex-row { flex-direction: row !important; }
          .items-start { align-items: flex-start !important; }
          .items-center { align-items: center !important; }
          .items-end { align-items: flex-end !important; }
          .items-stretch { align-items: stretch !important; }
          .justify-start { justify-content: flex-start !important; }
          .justify-center { justify-content: center !important; }
          .justify-end { justify-content: flex-end !important; }
          .justify-between { justify-content: space-between !important; }
          .shrink-0 { flex-shrink: 0 !important; }
          .grow { flex-grow: 1 !important; }
          .pointer-events-none { pointer-events: none !important; }
          .select-none { user-select: none !important; }
          .overflow-hidden { overflow: hidden !important; }
          .overflow-visible { overflow: visible !important; }
          .relative { position: relative !important; }
          .absolute { position: absolute !important; }
          .m-0 { margin: 0 !important; }
          .p-0 { padding: 0 !important; }
          .p-1 { padding: 0.25rem !important; }
          .p-2 { padding: 0.5rem !important; }
          .p-3 { padding: 0.75rem !important; }
          .p-4 { padding: 1rem !important; }
          .pl-5 { padding-left: 1.25rem !important; }
          .gap-1 { gap: 0.25rem !important; }
          .gap-1\\.5 { gap: 0.375rem !important; }
          .gap-2 { gap: 0.5rem !important; }
          .gap-3 { gap: 0.75rem !important; }
          .gap-4 { gap: 1rem !important; }
          .rounded { border-radius: 0.25rem !important; }
          .rounded-sm { border-radius: 0.125rem !important; }
          .rounded-md { border-radius: 0.375rem !important; }
          .rounded-lg { border-radius: 0.5rem !important; }
          .rounded-xl { border-radius: 0.75rem !important; }
          .rounded-full { border-radius: 9999px !important; }
          .border-dashed { border-style: dashed !important; }
          .border-solid { border-style: solid !important; }
          .border-none { border-style: none !important; }
          .text-left { text-align: left !important; }
          .text-center { text-align: center !important; }
          .text-right { text-align: right !important; }
          .bg-slate-100 { background-color: #f1f5f9 !important; }
          .text-slate-400 { color: #94a3b8 !important; }
          .text-slate-500 { color: #64748b !important; }
          svg {
            display: inline-block !important;
            vertical-align: middle !important;
            stroke-width: 2 !important;
          }
          #print-container {
            width: 210mm !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
          }
          .lego-print-page {
            width: 210mm !important;
            height: 297mm !important;
            max-width: 210mm !important;
            max-height: 297mm !important;
            overflow: hidden !important;
            position: relative !important;
            margin: 0 !important;
            padding: 0 !important;
            box-sizing: border-box !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .lego-canvas-printed-page {
            position: relative !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
            box-sizing: border-box !important;
          }
          .lego-canvas-printed-page > * {
            position: absolute !important;
            box-sizing: border-box !important;
          }
          .lego-canvas-printed-page img {
            width: 100% !important;
            height: 100% !important;
            object-fit: cover !important;
            display: block !important;
            max-width: 100% !important;
            max-height: 100% !important;
          }
          .lego-canvas-printed-page img[src*="qr"],
          .lego-canvas-printed-page img[alt*="二维码"],
          .lego-canvas-printed-page img[alt*="QR"],
          .lego-canvas-printed-page .hj-qr-code img,
          .lego-canvas-printed-page [data-widget-type*="qr"] img {
            object-fit: contain !important;
          }
          [data-canvas-ui="true"],
          [data-page-break-indicator="true"],
          .page-break-indicator-ui,
          [class*="bg-amber-600"] {
            display: none !important;
            visibility: hidden !important;
            opacity: 0 !important;
            height: 0 !important;
            width: 0 !important;
            overflow: hidden !important;
          }
        </style>
      </head>
      <body>
        <div id="print-container">
          ${pagesHtml.join('\n')}
        </div>
      </body>
    </html>
  `;
}

export function printLegoCanvas() {
  let pageElements = Array.from(document.querySelectorAll('.canvas-page-bg')) as HTMLElement[];
  if (pageElements.length === 0) {
    const single = document.getElementById('lego-canvas-page') || document.querySelector('[id^="lego-canvas-page-"]');
    if (single) {
      pageElements = [single as HTMLElement];
    }
  }

  if (pageElements.length === 0) {
    alert('无法找到积木画布容器');
    return;
  }

  // Create a temporary hidden iframe for printing
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = 'none';

  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    alert('创建打印任务失败');
    if (document.body.contains(iframe)) {
      document.body.removeChild(iframe);
    }
    return;
  }

  // Collect local <style> blocks from main document (do NOT collect external <link> elements,
  // which would be removed by the sanitizer and cause silent style loss).
  const localStyles: string[] = [];
  document.querySelectorAll('style').forEach((node) => {
    const text = node.textContent || '';
    if (text.trim()) {
      localStyles.push(`<style>${text}</style>`);
    }
  });

  const rawHtml = generateLegoPrintHtml(pageElements, localStyles);
  const cleanHtml = sanitizePrintHTML(rawHtml);

  doc.open();
  doc.write(cleanHtml);
  doc.close();

  // Wait for images and fonts to fully load before triggering print
  let printTriggered = false;
  const cleanupIframe = () => {
    if (document.body.contains(iframe)) {
      document.body.removeChild(iframe);
    }
  };

  const triggerPrint = async () => {
    if (printTriggered) return;
    printTriggered = true;

    try {
      const iframeDoc = iframe.contentWindow?.document;
      if (iframeDoc) {
        if (iframeDoc.fonts) {
          await iframeDoc.fonts.ready;
        }
        const imgs = Array.from(iframeDoc.querySelectorAll('img'));
        await Promise.all(
          imgs.map((img) => {
            if (img.complete) return Promise.resolve();
            return new Promise<void>((resolve) => {
              img.onload = () => resolve();
              img.onerror = () => resolve();
              if ('decode' in img) {
                img.decode().then(resolve).catch(resolve);
              }
            });
          })
        );
      }
    } catch (err) {
      console.warn('等待打印资源加载异常：', err);
    }

    if (iframe.contentWindow) {
      iframe.contentWindow.onafterprint = () => {
        cleanupIframe();
      };
    }

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      // Fallback cleanup if onafterprint does not fire
      setTimeout(cleanupIframe, 5000);
    }, 350);
  };

  // Hard safety timeout: auto-remove iframe after 60s in all cases
  setTimeout(cleanupIframe, 60000);

  // Ensure iframe content window is loaded
  if (iframe.contentWindow) {
    iframe.contentWindow.onload = () => {
      triggerPrint();
    };
    setTimeout(triggerPrint, 600);
  }
}
