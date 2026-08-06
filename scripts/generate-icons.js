// 生成 闲页 扩展图标（蓝色水滴 PNG）。运行：npm run icons
// 通知、工具栏图标都需要真实 PNG（chrome.notifications 不支持 data: URL），故在本地生成。
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

const OUT = path.resolve(__dirname, '..', 'packages', 'moyu-tab', 'src', 'icons');
const SIZES = [16, 32, 48, 128];
const BLUE = [59, 130, 246, 255]; // #3b82f6
const DEEP = [37, 99, 235, 255]; // #2563eb

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    let c = (crc ^ buf[i]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const t = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crc]);
}
function encodePNG(size, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const raw = Buffer.alloc(size * (1 + size * 4));
  for (let y = 0; y < size; y++) {
    raw[y * (1 + size * 4)] = 0; // filter none
    rgba.copy(raw, y * (1 + size * 4) + 1, y * size * 4, (y + 1) * size * 4);
  }
  const idat = zlib.deflateSync(raw);
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

// 水滴：判断 (x,y) 是否落在水滴内。cx,cy 圆心；r 半径；顶部收窄成尖。
function inDrop(x, y, cx, cy, r) {
  const d = Math.hypot(x - cx, y - cy);
  if (d <= r) return true; // 圆形底部
  const topY = cy - 1.25 * r; // 尖点
  if (y < topY || y > cy) return false;
  // 尖点到圆顶之间的收窄段
  const cyTop = cy - r;
  const t = (y - topY) / (cyTop - topY);
  const half = r * 0.55 * t;
  return Math.abs(x - cx) <= half;
}

for (const size of SIZES) {
  const rgba = Buffer.alloc(size * size * 4);
  const cx = size * 0.5;
  const cy = size * 0.6;
  const r = size * 0.34;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      if (inDrop(x + 0.5, y + 0.5, cx, cy, r)) {
        // 简单垂直渐变：上部浅蓝、下部深蓝
        const t = Math.max(0, Math.min(1, (y - cy + r) / (2 * r)));
        rgba[i] = Math.round(BLUE[0] + (DEEP[0] - BLUE[0]) * t);
        rgba[i + 1] = Math.round(BLUE[1] + (DEEP[1] - BLUE[1]) * t);
        rgba[i + 2] = Math.round(BLUE[2] + (DEEP[2] - BLUE[2]) * t);
        rgba[i + 3] = 255;
      }
    }
  }
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, `icon${size}.png`), encodePNG(size, rgba));
  console.log(`✓ icon${size}.png`);
}
console.log('Done.');