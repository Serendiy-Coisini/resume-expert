/* eslint-disable @typescript-eslint/no-require-imports -- isolated CommonJS parsing worker */
// Isolated document/OCR parser. Never receives AI credentials.
function renderPageSmart(pageData) {
    return pageData
        .getTextContent({ normalizeWhitespace: true })
        .then((textContent) => {
        const items = textContent.items;
        if (!items || items.length === 0)
            return "";
        // Sort items primarily by visual Y position (top to bottom), secondarily by X (left to right)
        // Note: PDF Y coordinates start from bottom (0) to top (height)
        items.sort((a, b) => {
            const yDiff = b.transform[5] - a.transform[5];
            if (Math.abs(yDiff) > 6) {
                return yDiff;
            }
            return a.transform[4] - b.transform[4];
        });
        let lastY = null;
        let lastX = null;
        let text = "";
        for (const item of items) {
            const str = item.str;
            if (!str)
                continue;
            const currentY = item.transform[5];
            const currentX = item.transform[4];
            if (lastY === null) {
                text += str;
            }
            else {
                const yDiff = Math.abs(lastY - currentY);
                if (yDiff > 6) {
                    // Significant vertical gap -> new line
                    text += "\n" + str;
                }
                else {
                    // Same visual line -> check horizontal gap between elements/columns
                    const xGap = currentX - (lastX ?? 0);
                    if (xGap > 15) {
                        text += "   " + str;
                    }
                    else if (xGap > 2) {
                        text += " " + str;
                    }
                    else {
                        text += str;
                    }
                }
            }
            lastY = currentY;
            lastX = currentX + (item.width ?? str.length * 6);
        }
        return text;
    });
}
function extractTextFromBinaryDoc(buffer) {
    try {
        const utf16Text = buffer.toString("utf16le");
        const printableUtf16 = utf16Text.match(/[\u4E00-\u9FA5a-zA-Z0-9\s,.!?:;()\-–—"'\/\n\r\t]{4,}/g) || [];
        const joined = printableUtf16.join("\n").replace(/\n{3,}/g, "\n\n").trim();
        if (joined.length > 50) {
            return joined;
        }
    }
    catch {
        // Fallback
    }
    const latinStr = buffer.toString("binary");
    const printableMatches = latinStr.match(/[\x20-\x7E\u4E00-\u9FA5\u3000-\u303F\uFF00-\uFFEF\r\n\t]{4,}/g) || [];
    return printableMatches.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function validateDocxZip(buffer) {
  let total = 0, entries = 0;
  for (let i = 0; i + 46 <= buffer.length; i++) {
    if (buffer.readUInt32LE(i) !== 0x02014b50) continue;
    total += buffer.readUInt32LE(i + 24); entries++;
    if (total > 40 * 1024 * 1024 || entries > 2000) throw new Error('Word 解压大小或文件数超过限制');
    i += 45 + buffer.readUInt16LE(i + 28) + buffer.readUInt16LE(i + 30) + buffer.readUInt16LE(i + 32);
  }
  if (!entries) throw new Error('Word 文件格式无效');
}
process.once('message', async (job) => {
  let worker;
  try {
    let text = '';
    if (job.kind === 'ocr') {
      const { createWorker } = require('tesseract.js');
      worker = await createWorker('chi_sim', 1, { langPath: process.cwd(), cacheMethod: 'none', gzip: false });
      for (const buffer of job.buffers) {
        const result = await worker.recognize(buffer);
        text += (result.data.text || '') + '\n\n';
        if (text.length > 100000) throw new Error('识别文字超过限制');
      }
      await worker.terminate(); worker = null;
    } else {
      const { buffer, name } = job;
      if (name.endsWith('.pdf')) {
        if (buffer.subarray(0, 1024).indexOf('%PDF-') < 0) throw new Error('PDF 文件格式无效');
        const parse = require('pdf-parse/lib/pdf-parse.js');
        const result = await parse({ data: new Uint8Array(buffer), isEvalSupported: false }, { max: 40, pagerender: renderPageSmart });
        if (result.numpages > 40) throw new Error('PDF 最多支持 40 页，请拆分文件');
        text = result.text || '';
      } else if (name.endsWith('.docx')) {
        validateDocxZip(buffer);
        text = (await require('mammoth').extractRawText({ buffer })).value || '';
      } else if (name.endsWith('.doc')) {
        text = extractTextFromBinaryDoc(buffer);
      } else if (name.endsWith('.txt')) {
        text = buffer.toString('utf8');
      } else throw new Error('仅支持 PDF、DOCX、DOC 或 TXT 文件');
    }
    if (text.length > 100000) throw new Error('提取文字超过 10 万字，请拆分文件');
    process.send({ text: text.trim() });
  } catch (error) {
    if (worker) await worker.terminate().catch(() => {});
    process.send({ error: error instanceof Error ? error.message : '文件解析失败' });
  }
});
