export function printLegoCanvas() {
  const canvasElement = document.getElementById('lego-canvas-page');
  if (!canvasElement) {
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
    document.body.removeChild(iframe);
    return;
  }

  // Read pagePadding from the canvas page element's data attribute (set by React)
  const pagePaddingAttr = canvasElement.getAttribute('data-page-padding');
  let pagePaddingCSS = '';
  if (pagePaddingAttr) {
    try {
      const pp = JSON.parse(pagePaddingAttr);
      pagePaddingCSS = `padding: ${pp.top || 0}px ${pp.right || 0}px ${pp.bottom || 0}px ${pp.left || 0}px !important;`;
    } catch { /* ignore */ }
  }

  // Clone canvas content
  const clone = canvasElement.cloneNode(true) as HTMLElement;

  // Remove selection outlines / handles / guidelines / page break badges from clone
  const handles = clone.querySelectorAll('.ring-2, .ring-1, [class*="cursor-"]');
  handles.forEach((el) => {
    el.classList.remove('ring-2', 'ring-blue-500', 'ring-1', 'ring-blue-300');
    // Hide handles
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

  // Collect all styles & stylesheets from main document
  const headStyles: string[] = [];
  document.querySelectorAll('style, link[rel="stylesheet"]').forEach((node) => {
    headStyles.push(node.outerHTML);
  });

  // Construct print document HTML
  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>积木简历导出</title>
        ${headStyles.join('\n')}
        <style>
          @page {
            size: A4 portrait;
            margin: 0;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          #lego-canvas-page {
            position: relative !important;
            margin: 0 auto !important;
            background: #ffffff !important;
            box-shadow: none !important;
            border: none !important;
            page-break-after: always;
            box-sizing: border-box;
            ${pagePaddingCSS}
          }
          #lego-canvas-page * {
            box-sizing: border-box;
          }
          #lego-canvas-page img {
            width: 100% !important;
            height: 100% !important;
            object-fit: cover !important;
            display: block !important;
            max-width: 100% !important;
            max-height: 100% !important;
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
        ${clone.outerHTML}
      </body>
    </html>
  `);
  doc.close();

  // Wait for images and fonts to fully load before triggering print
  let printTriggered = false;
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

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 3000);
    }, 350);
  };

  // Ensure iframe content window is loaded
  if (iframe.contentWindow) {
    iframe.contentWindow.onload = () => {
      triggerPrint();
    };
    setTimeout(triggerPrint, 600);
  }
}
