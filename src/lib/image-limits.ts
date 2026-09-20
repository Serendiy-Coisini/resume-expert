import { RequestValidationError } from "@/lib/ai/request-validation";

/** Reject unknown/corrupt headers rather than bypassing pixel limits. */
export function validateImageDimensions(buffer: Buffer): void {
  let width = 0, height = 0;
  if (buffer.length >= 24 && buffer.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) {
    width = buffer.readUInt32BE(16); height = buffer.readUInt32BE(20);
  } else if (buffer.length >= 10 && /^GIF8[79]a$/.test(buffer.subarray(0, 6).toString())) {
    width = buffer.readUInt16LE(6); height = buffer.readUInt16LE(8);
  } else if (buffer.length >= 26 && buffer.subarray(0, 2).toString() === "BM") {
    const dib = buffer.readUInt32LE(14);
    if (dib === 12) { width = buffer.readUInt16LE(18); height = buffer.readUInt16LE(20); }
    else if (dib >= 40) { width = buffer.readInt32LE(18); height = Math.abs(buffer.readInt32LE(22)); }
  } else if (buffer.length >= 30 && buffer.subarray(0, 4).toString() === "RIFF" && buffer.subarray(8, 12).toString() === "WEBP") {
    const kind = buffer.subarray(12, 16).toString();
    if (kind === "VP8X") { width = 1 + buffer.readUIntLE(24, 3); height = 1 + buffer.readUIntLE(27, 3); }
    else if (kind === "VP8 " && buffer.subarray(23, 26).equals(Buffer.from([157,1,42]))) {
      width = buffer.readUInt16LE(26) & 0x3fff; height = buffer.readUInt16LE(28) & 0x3fff;
    } else if (kind === "VP8L" && buffer[20] === 0x2f) {
      const bits = buffer.readUInt32LE(21); width = (bits & 0x3fff) + 1; height = ((bits >>> 14) & 0x3fff) + 1;
    }
  } else if (buffer.length >= 4 && buffer[0] === 255 && buffer[1] === 216) {
    let offset = 2;
    while (offset + 4 <= buffer.length) {
      if (buffer[offset] !== 255) break;
      const marker = buffer[offset + 1];
      if (marker === 255) { offset++; continue; }
      if (marker === 218 || marker === 217) break;
      const length = buffer.readUInt16BE(offset + 2);
      if (length < 2 || offset + 2 + length > buffer.length) break;
      if ([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(marker) && length >= 8) {
        height = buffer.readUInt16BE(offset + 5); width = buffer.readUInt16BE(offset + 7); break;
      }
      offset += 2 + length;
    }
  }
  if (width <= 0 || height <= 0 || width > 12000 || height > 12000 || width * height > 25_000_000) {
    throw new RequestValidationError("图片格式无效或像素过大（单边最多 12000，总像素最多 2500 万）");
  }
}
