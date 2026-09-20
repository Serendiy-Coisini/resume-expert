/**
 * Client-side PDF page renderer using pdfjs-dist.
 * Converts PDF pages into high-resolution images for AI Vision / OCR processing.
 * Automatically filters out blank trailing pages (such as empty page 2 from print margins).
 */

function isCanvasBlank(canvas: HTMLCanvasElement): boolean {
  const ctx = canvas.getContext('2d');
  if (!ctx) return false;
  const w = canvas.width;
  const h = canvas.height;
  try {
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;
    let nonWhiteCount = 0;
    const step = 16;
    for (let y = 0; y < h; y += step) {
      for (let x = 0; x < w; x += step) {
        const idx = (y * w + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const a = data[idx + 3];
        if (a > 20 && (r < 240 || g < 240 || b < 240)) {
          nonWhiteCount++;
          if (nonWhiteCount > 15) return false;
        }
      }
    }
    return true;
  } catch {
    return false;
  }
}

export async function renderPdfPagesToImages(
  fileOrBuffer: File | ArrayBuffer | Uint8Array,
  maxPages = 4,
  onTruncated?: (totalPages: number, processedPages: number) => void
): Promise<string[]> {
  if (typeof window === 'undefined') {
    return [];
  }

  let arrayBuffer: ArrayBuffer;
  if (fileOrBuffer instanceof File) {
    arrayBuffer = await fileOrBuffer.arrayBuffer();
  } else if (fileOrBuffer instanceof Uint8Array) {
    arrayBuffer = fileOrBuffer.buffer.slice(
      fileOrBuffer.byteOffset,
      fileOrBuffer.byteOffset + fileOrBuffer.byteLength
    ) as ArrayBuffer;
  } else {
    arrayBuffer = fileOrBuffer;
  }

  const pdfjsLib = await import('pdfjs-dist');

  // Set worker source to local public directory to avoid any CDN issues
  if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
  }

  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(arrayBuffer),
    isEvalSupported: false, // CVE-2024-4367: never compile PDF-provided font programs.
    disableFontFace: false,
  });

  const pdfDoc = await loadingTask.promise;
  const totalPages = Math.min(pdfDoc.numPages, maxPages);
  if (pdfDoc.numPages > maxPages) onTruncated?.(pdfDoc.numPages, maxPages);
  const images: string[] = [];

  try {
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
    // 2.0x scale ensures crystal clear text for OCR / Vision models
    const viewport = page.getViewport({ scale: 2.0 });

    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        page.cleanup();
        continue;
      }

    // Fill white background before rendering
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Render page to canvas
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const renderContext: any = {
      canvasContext: ctx,
      viewport: viewport,
    };

      await page.render(renderContext).promise;

    // Skip trailing blank pages (like print page-break blank 2nd page)
    if (pageNum > 1 && isCanvasBlank(canvas)) {
        page.cleanup();
        continue;
    }

    // High-quality JPEG data URL for compact and fast transmission
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      images.push(dataUrl);
      page.cleanup();
    }
  } finally {
    await pdfDoc.destroy();
  }

  return images;
}
