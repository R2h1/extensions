/** 二维码渲染共享层：UTF-8 编码修正、实例生成、Canvas 绘制、下载/复制。
 *  qrcode-generator 默认 stringToBytes 是 Latin-1（c & 0xff），会损坏中文/Emoji，
 *  必须覆盖为 UTF-8。集中在此一处，避免多个 widget 各自覆盖导致行为漂移。 */
import qrcode from 'qrcode-generator';

/** UTF-8 编码：把字符串转为 UTF-8 字节数组（含代理对处理） */
export function utf8Bytes(s: string): number[] {
  const b: number[] = [];
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c < 0x80) b.push(c);
    else if (c < 0x800) b.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f));
    else if (c >= 0xd800 && c <= 0xdbff) {
      // 高位代理：与下一个低位代理拼成 4 字节码点
      const c2 = s.charCodeAt(++i);
      const cp = 0x10000 + ((c & 0x3ff) << 10) + (c2 & 0x3ff);
      b.push(
        0xf0 | (cp >> 18),
        0x80 | ((cp >> 12) & 0x3f),
        0x80 | ((cp >> 6) & 0x3f),
        0x80 | (cp & 0x3f),
      );
    } else b.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
  }
  return b;
}

let utf8Ensured = false;
/** 覆盖库默认 Latin-1 编码（幂等，多次调用安全） */
export function ensureQrUtf8Bytes(): void {
  if (utf8Ensured) return;
  qrcode.stringToBytes = utf8Bytes;
  utf8Ensured = true;
}

export type QrInstance = ReturnType<typeof qrcode>;
export type EcLevel = 'L' | 'M' | 'Q' | 'H';

/** 生成二维码实例；内容过长或异常时返回 null */
export function makeQr(text: string, ec: EcLevel): QrInstance | null {
  try {
    const qr = qrcode(0, ec);
    qr.addData(text);
    qr.make();
    return qr;
  } catch {
    return null;
  }
}

/** 把二维码渲染到 canvas，targetPx 为目标像素边长（cell 取整保证模块锐利） */
export function renderQrToCanvas(
  canvas: HTMLCanvasElement,
  qr: QrInstance,
  targetPx: number,
  fg: string,
  bg: string,
): void {
  const count = qr.getModuleCount();
  const margin = 4; // 静默区，保证可扫描
  const total = count + margin * 2;
  const cell = Math.max(1, Math.floor(targetPx / total));
  const dim = cell * total;
  canvas.width = dim;
  canvas.height = dim;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, dim, dim);
  ctx.fillStyle = fg;
  for (let r = 0; r < count; r++) {
    for (let c = 0; c < count; c++) {
      if (qr.isDark(r, c)) ctx.fillRect((c + margin) * cell, (r + margin) * cell, cell, cell);
    }
  }
}

/** 下载 canvas 为 PNG */
export function downloadCanvasPng(canvas: HTMLCanvasElement, filename: string): void {
  const a = document.createElement('a');
  a.download = filename;
  a.href = canvas.toDataURL('image/png');
  a.click();
}

/** 复制 canvas 图片到剪贴板，并在按钮上反馈结果 */
export async function copyCanvasImage(
  canvas: HTMLCanvasElement,
  btn: HTMLButtonElement,
): Promise<void> {
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'));
  if (!blob) return;
  const ok = await (async () => {
    try {
      if (navigator.clipboard && typeof ClipboardItem !== 'undefined') {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        return true;
      }
    } catch {}
    return false;
  })();
  const old = btn.textContent;
  btn.textContent = ok ? '✓ 已复制' : '复制失败';
  setTimeout(() => (btn.textContent = old), 1500);
}
