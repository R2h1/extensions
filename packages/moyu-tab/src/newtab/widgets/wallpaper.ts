// ── Wallpaper：默认 SVG 渐变 + 用户自定义（IndexedDB 存单张压缩 Blob）──

const WP_KEY = 'moyu_wallpaper';
// 默认壁纸：SVG 渐变（硬编码，零文件零存储）
const DEFAULT_WP_SVG = `<svg xmlns='http://www.w3.org/2000/svg' width='1440' height='900'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0%' stop-color='#fde68a'/><stop offset='50%' stop-color='#fca5a5'/><stop offset='100%' stop-color='#a5b4fc'/></linearGradient></defs><rect width='100%' height='100%' fill='url(#g)'/></svg>`;
const DEFAULT_WP_URL = `url("data:image/svg+xml,${encodeURIComponent(DEFAULT_WP_SVG)}")`;
const WP_DB = 'moyu_db';
const WP_STORE = 'wallpaper';
const WP_REC_ID = 'custom';
let curObjUrl = '';
let wpPreviewUrl = '';

// 右键菜单里「组件」入口由 newtab.ts 注入（避免本模块依赖 openWidgetModal）
let widgetOpener: () => void = () => {};
export function setWallpaperWidgetOpener(fn: () => void): void {
  widgetOpener = fn;
}

const ctxMenu = document.getElementById('ctxMenu')!;
const wpModal = document.getElementById('wallpaperModal')!;
document
  .getElementById('wpClose')!
  .addEventListener('click', () => wpModal.classList.remove('open'));
wpModal.addEventListener('click', (e) => {
  if (e.target === wpModal) wpModal.classList.remove('open');
});
document.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  ctxMenu.style.left = e.clientX + 'px';
  ctxMenu.style.top = e.clientY + 'px';
  ctxMenu.classList.add('open');
});
document.addEventListener('click', () => ctxMenu.classList.remove('open'));
document.getElementById('ctxWidgets')!.addEventListener('click', () => {
  ctxMenu.classList.remove('open');
  widgetOpener();
});
document.getElementById('ctxWallpaper')!.addEventListener('click', async () => {
  ctxMenu.classList.remove('open');
  await openWallpaperModal();
});

// IndexedDB 轻封装：单条 Blob 记录（用户壁纸）
function idbOpen(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(WP_DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(WP_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function idbPutBlob(blob: Blob) {
  const db = await idbOpen();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(WP_STORE, 'readwrite');
    tx.objectStore(WP_STORE).put(blob, WP_REC_ID);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}
async function idbGetBlob(): Promise<Blob | null> {
  const db = await idbOpen();
  const blob = await new Promise<Blob | null>((resolve) => {
    const tx = db.transaction(WP_STORE, 'readonly');
    const req = tx.objectStore(WP_STORE).get(WP_REC_ID);
    req.onsuccess = () => resolve((req.result as Blob) ?? null);
    req.onerror = () => resolve(null);
  });
  db.close();
  return blob;
}
async function idbDelBlob() {
  const db = await idbOpen();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(WP_STORE, 'readwrite');
    tx.objectStore(WP_STORE).delete(WP_REC_ID);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}
// 压缩图片：最大边 1920，JPEG 质量 0.85，避免 IndexedDB 占用过大
function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const u = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(u);
      const maxSide = 1920;
      let w = img.width,
        h = img.height;
      if (w > maxSide || h > maxSide) {
        if (w >= h) {
          h = Math.round((h * maxSide) / w);
          w = maxSide;
        } else {
          w = Math.round((w * maxSide) / h);
          h = maxSide;
        }
      }
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      c.getContext('2d')!.drawImage(img, 0, 0, w, h);
      c.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob'))), 'image/jpeg', 0.85);
    };
    img.onerror = () => {
      URL.revokeObjectURL(u);
      reject(new Error('load'));
    };
    img.src = u;
  });
}
// 应用壁纸：custom 读 IndexedDB Blob，default 用内置 SVG
async function applyWallpaper(mode: 'default' | 'custom') {
  if (curObjUrl) {
    URL.revokeObjectURL(curObjUrl);
    curObjUrl = '';
  }
  if (mode === 'custom') {
    const blob = await idbGetBlob();
    if (blob) {
      curObjUrl = URL.createObjectURL(blob);
      document.body.style.backgroundImage = `url(${curObjUrl})`;
      localStorage.setItem(WP_KEY, 'custom');
      return;
    }
  }
  document.body.style.backgroundImage = DEFAULT_WP_URL;
  localStorage.setItem(WP_KEY, 'default');
}

async function openWallpaperModal() {
  if (wpPreviewUrl) {
    URL.revokeObjectURL(wpPreviewUrl);
    wpPreviewUrl = '';
  }
  const mode = (localStorage.getItem(WP_KEY) as 'default' | 'custom') || 'default';
  let bg = DEFAULT_WP_URL;
  if (mode === 'custom') {
    const blob = await idbGetBlob();
    if (blob) {
      wpPreviewUrl = URL.createObjectURL(blob);
      bg = `url(${wpPreviewUrl})`;
    }
  }
  document.getElementById('wpBody')!.innerHTML = `
    <div class="wp-preview" style="background-image:${bg}"></div>
    <div class="wp-status">${mode === 'custom' ? '当前：自定义壁纸' : '当前：默认壁纸'}</div>
    <div class="wp-actions">
      <input type="file" id="wpUpload" accept="image/*" style="display:none"/>
      <button class="wp-btn" id="wpUploadBtn">上传壁纸</button>
      ${mode === 'custom' ? '<button class="wp-btn wp-btn-ghost" id="wpReset">恢复默认</button>' : ''}
    </div>
    <div class="wp-hint">上传将替换当前壁纸（仅保留一张）</div>`;
  wpModal.classList.add('open');
  const fileInput = document.getElementById('wpUpload') as HTMLInputElement;
  document.getElementById('wpUploadBtn')!.addEventListener('click', () => fileInput.click());
  fileInput.onchange = async () => {
    const f = fileInput.files?.[0];
    if (!f) return;
    try {
      const blob = await compressImage(f);
      await idbPutBlob(blob);
      await applyWallpaper('custom');
    } catch {
      const h = document.querySelector('.wp-hint');
      if (h) h.textContent = '⚠ 图片加载失败，请换一张';
      return;
    }
    fileInput.value = '';
    openWallpaperModal();
  };
  document.getElementById('wpReset')?.addEventListener('click', async () => {
    await idbDelBlob();
    await applyWallpaper('default');
    openWallpaperModal();
  });
}

export function loadWallpaper() {
  // 先立即应用默认壁纸，避免首屏空白；若用户设过自定义则异步加载替换
  document.body.style.backgroundImage = DEFAULT_WP_URL;
  const m = localStorage.getItem(WP_KEY);
  if (m === 'custom') {
    applyWallpaper('custom');
  } else if (m && m !== 'default') {
    // 旧版本曾把 dataUrl 直接写进 localStorage，清理残留并释放空间
    localStorage.removeItem(WP_KEY);
    chrome.storage.local.remove('moyu_wp_list');
  }
}
