/**
 * Generate TimeRank extension icons
 * Three-bar chart on indigo rounded square — represents "ranking".
 * Node.js built-ins only (no dependencies).
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const SIZES = [16, 32, 48, 128];
const BRAND = '#6366f1';
const WHITE = '#ffffff';
const ICONS_DIR = path.resolve(__dirname, '..', 'src', 'icons');

function createPNG(size, hexBrand, hexWhite) {
  const rB = parseInt(hexBrand.slice(1, 3), 16);
  const gB = parseInt(hexBrand.slice(3, 5), 16);
  const bB = parseInt(hexBrand.slice(5, 7), 16);
  const rW = parseInt(hexWhite.slice(1, 3), 16);
  const gW = parseInt(hexWhite.slice(3, 5), 16);
  const bW = parseInt(hexWhite.slice(5, 7), 16);

  const cx = size / 2, cy = size / 2, maxR = size / 2 - 1;

  // Three ascending bars — ranking chart
  const barW = Math.max(2, size * 0.16);
  const barGap = Math.max(2, size * 0.08);
  const totalW = 3 * barW + 2 * barGap;
  const startX = Math.round(cx - totalW / 2);
  const bottom = Math.round(cy + size * 0.28);
  const heights = [0.28, 0.52, 0.80];

  const rowLen = 1 + size * 4;
  const raw = Buffer.alloc(rowLen * size);

  for (let y = 0; y < size; y++) {
    raw[y * rowLen] = 0;

    for (let x = 0; x < size; x++) {
      const px = y * rowLen + 1 + x * 4;
      const dx = x - cx, dy = y - cy;

      // Rounded square alpha
      const br = size / 4;
      const cd = Math.max(Math.abs(dx) - cx + br, Math.abs(dy) - cy + br, 0);
      const bgDist = cd > 0 ? Math.sqrt(cd * cd * 2) : Math.max(Math.abs(dx), Math.abs(dy));
      const alpha = bgDist >= maxR ? 0 : Math.round(Math.max(0, (maxR - bgDist) / br) * 255);
      if (alpha === 0) { raw[px + 3] = 0; continue; }

      // Check bars
      let inBar = false, barH = 0;
      for (let b = 0; b < 3; b++) {
        const bx = startX + b * (barW + barGap);
        const h = Math.round(size * heights[b]);
        if (x >= bx && x < bx + barW && y >= bottom - h && y < bottom) {
          inBar = true; barH = h; break;
        }
      }

      if (inBar) {
        // White bars, slightly graduated
        const grad = 0.90 - 0.15 * (bottom - y) / (bottom - (bottom - barH + 1));
        raw[px] = Math.round(rW * (1 - grad) + rB * grad);
        raw[px + 1] = Math.round(gW * (1 - grad) + gB * grad);
        raw[px + 2] = Math.round(bW * (1 - grad) + bB * grad);
        raw[px + 3] = Math.round(alpha * 0.92);
      } else {
        const g = 0.85 + 0.15 * (1 - Math.sqrt(dx*dx + dy*dy) / maxR);
        raw[px] = Math.round(rB * g); raw[px + 1] = Math.round(gB * g);
        raw[px + 2] = Math.round(bB * g); raw[px + 3] = alpha;
      }
    }
  }

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6;
  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', zlib.deflateRawSync(raw, { level: 9 }));
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));
  return Buffer.concat([sig, ihdrChunk, idatChunk, iendChunk]);
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crcBuf = Buffer.alloc(4); crcBuf.writeUInt32BE(crc32(typeAndData));
  return Buffer.concat([len, typeAndData, crcBuf]);
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

if (!fs.existsSync(ICONS_DIR)) fs.mkdirSync(ICONS_DIR, { recursive: true });
for (const size of SIZES) {
  const png = createPNG(size, BRAND, WHITE);
  fs.writeFileSync(path.join(ICONS_DIR, `icon${size}.png`), png);
  console.log(`  ✓ icon${size}.png (${png.length}b)`);
}
console.log('Done — bar chart icons generated.');