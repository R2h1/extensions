// 书搭子 — Service Worker
// 负责：侧边栏开关、图标生成、数据消息路由

interface NoteRecord {
  id: number;
  book: string;
  content: string;
  type: '笔记' | '摘录' | '书评';
  timestamp: number;
  likes: number;
}

interface UserProfile {
  name: string;
  bio: string;
  notes: number;
  favorites: number;
  booklists: number;
}

// ── 程序化生成图标：暖棕圆角背景 + 白色展开书本 ──
function generateIcons(): void {
  const imageData: Record<number, ImageData> = {};
  for (const size of [16, 32, 48, 128]) {
    imageData[size] = createBookIcon(size);
  }
  chrome.action.setIcon({ imageData }).catch(() => {});
}

function createBookIcon(size: number): ImageData {
  const s = size;
  const pixels = new Uint8ClampedArray(s * s * 4);
  const cx = s / 2, cy = s / 2;
  const br = Math.max(2, Math.round(s * 0.22));
  const maxR = cx - 1;

  // 配色
  const bgR = 196, bgG = 155, bgB = 122;   // #C49B7A 暖棕
  const pgR = 255, pgG = 252, pgB = 248;    // #FFFCF8 米白
  const spR = 120, spG = 100, spB = 80;     // 书脊深棕
  const lnR = 200, lnG = 185, lnB = 170;    // 文字线条

  const spine = Math.round(s * 0.5);
  const bookPad = Math.round(s * 0.14);
  const bookT = Math.round(s * 0.22);
  const bookB = Math.round(s * 0.78);
  const tilt = Math.round(s * 0.04);         // 展开透视偏移

  for (let y = 0; y < s; y++) {
    for (let x = 0; x < s; x++) {
      const idx = (y * s + x) * 4;
      const dx = x - cx, dy = y - cy;

      // 圆角背景裁剪
      const cd = Math.max(Math.abs(dx) - cx + br, Math.abs(dy) - cy + br, 0);
      const bgDist = cd > 0 ? cd : Math.max(Math.abs(dx), Math.abs(dy));
      const alpha = bgDist >= maxR ? 0 : Math.round(Math.max(0, (maxR - bgDist) / br) * 255);
      if (alpha === 0) { pixels[idx + 3] = 0; continue; }

      // 暖棕背景
      pixels[idx] = bgR; pixels[idx + 1] = bgG; pixels[idx + 2] = bgB; pixels[idx + 3] = alpha;

      // ── 画展开的书 ──
      const leftL = bookPad;
      const rightR = s - bookPad;
      const py = y - bookT;
      const ph = bookB - bookT;
      const ratio = ph > 0 ? py / ph : 0;

      // 左页右边界（斜线，上窄下宽）
      const leftR = spine - 1 - tilt + Math.round(ratio * tilt * 2);
      // 右页左边界（斜线）
      const rightL = spine + 1 + tilt - Math.round(ratio * tilt * 2);

      const inLeftPage = x >= leftL && x <= leftR && x < spine && y >= bookT && y < bookB;
      const inRightPage = x >= rightL && x <= rightR && x > spine && y >= bookT && y < bookB;
      const isSpine = Math.abs(x - spine) <= 2 && y >= bookT && y < bookB;

      if (inLeftPage || inRightPage) {
        // 书页渐变（边缘暗一点）
        const distFromCenter = Math.abs(x - spine) / Math.max(1, s / 2);
        const shade = 1 - distFromCenter * 0.08;
        pixels[idx] = Math.min(255, Math.round(pgR * shade));
        pixels[idx + 1] = Math.min(255, Math.round(pgG * shade));
        pixels[idx + 2] = Math.min(255, Math.round(pgB * shade));

        // 文字线条（≥48px 才画，否则太小看不清）
        if (s >= 48) {
          const lineH = Math.max(1, Math.floor(s * 0.02));
          const margins = Math.round(s * 0.02);
          const lines = [0.32, 0.48, 0.64];
          for (const ly of lines) {
            const yy = bookT + Math.round(ph * ly);
            if (Math.abs(y - yy) < lineH) {
              if (inLeftPage) {
                const lx2 = leftR - margins;
                if (x >= leftL + margins && x <= lx2) { pixels[idx] = lnR; pixels[idx + 1] = lnG; pixels[idx + 2] = lnB; }
              } else {
                const rx1 = rightL + margins;
                const rx2 = rightR - margins;
                const shorten = ly === lines[2] ? 1 : 0.6;
                if (x >= rx1 && x <= Math.round(rx1 + (rx2 - rx1) * shorten)) { pixels[idx] = lnR; pixels[idx + 1] = lnG; pixels[idx + 2] = lnB; }
              }
            }
          }
        }
      } else if (isSpine) {
        pixels[idx] = spR; pixels[idx + 1] = spG; pixels[idx + 2] = spB;
      }
    }
  }
  return new ImageData(pixels, s, s);
}

// ── 安装 / 更新时处理 ──
chrome.runtime.onInstalled.addListener(async () => {
  // 生成书本图标
  generateIcons();

  // 初始化默认数据（仅首次安装）
  const existing = await chrome.storage.local.get('notes');
  if (!existing.notes) {
    await chrome.storage.local.set({
      notes: getDefaultNotes(),
      userProfile: { name: '书友', bio: '读万卷书，行万里路。', notes: 5, favorites: 3, booklists: 1 },
      readingStatus: getDefaultReadingStatus(),
    });
  }

  // 配置侧边栏：点击工具栏图标自动打开右侧侧边栏
  try {
    await chrome.sidePanel.setOptions({ path: 'community/community.html', enabled: true });
    await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  } catch {
    // 旧版 Chrome 可能不支持
  }
});

// ── 消息路由 ──
chrome.runtime.onMessage.addListener((
  msg: { type: string; payload?: unknown },
  _sender: chrome.runtime.MessageSender,
  sendResponse: (response: unknown) => void,
) => {
  switch (msg.type) {
    case 'GET_NOTES':
      chrome.storage.local.get('notes').then((data) => {
        sendResponse(data.notes ?? []);
      });
      return true;

    case 'ADD_NOTE':
      chrome.storage.local.get('notes').then((data) => {
        const notes: NoteRecord[] = data.notes ?? [];
        notes.unshift(msg.payload as NoteRecord);
        chrome.storage.local.set({ notes });
        sendResponse({ ok: true });
      });
      return true;

    case 'DELETE_NOTE':
      chrome.storage.local.get('notes').then((data) => {
        const notes: NoteRecord[] = data.notes ?? [];
        const id = msg.payload as number;
        chrome.storage.local.set({ notes: notes.filter((n) => n.id !== id) });
        sendResponse({ ok: true });
      });
      return true;

    case 'LIKE_NOTE':
      chrome.storage.local.get('notes').then((data) => {
        const notes: NoteRecord[] = data.notes ?? [];
        const id = msg.payload as number;
        const note = notes.find((n) => n.id === id);
        if (note) note.likes = (note.likes ?? 0) + 1;
        chrome.storage.local.set({ notes });
        sendResponse({ ok: true });
      });
      return true;

    case 'GET_PROFILE':
      chrome.storage.local.get('userProfile').then((data) => {
        sendResponse(data.userProfile ?? { name: '书友', bio: '', notes: 0, favorites: 0, booklists: 0 });
      });
      return true;

    case 'GET_READING_STATUS':
      chrome.storage.local.get('readingStatus').then((data) => {
        sendResponse(data.readingStatus ?? []);
      });
      return true;

    default:
      sendResponse({ error: `Unknown message type: ${msg.type}` });
      return false;
  }
});

// ── 默认数据 ──
function getDefaultNotes(): NoteRecord[] {
  return [
    { id: 1, book: '百年孤独', content: '多年以后，面对行刑队，奥雷里亚诺·布恩迪亚上校将会回想起父亲带他去见识冰块的那个遥远的下午。', type: '摘录', timestamp: Date.now() - 86400000 * 2, likes: 23 },
    { id: 2, book: '局外人', content: '读完《局外人》，我忽然觉得，默尔索不是冷漠，他只是不愿意说谎。', type: '书评', timestamp: Date.now() - 86400000 * 5, likes: 18 },
    { id: 3, book: '追风筝的人', content: '为你，千千万万遍。', type: '摘录', timestamp: Date.now() - 86400000 * 7, likes: 31 },
    { id: 4, book: '活着', content: '福贵的一生让我明白，活着本身就是意义。不需要追问为什么，只需要好好活着。', type: '书评', timestamp: Date.now() - 86400000 * 10, likes: 15 },
    { id: 5, book: '月亮与六便士', content: '满地都是六便士，他却抬头看见了月亮。', type: '摘录', timestamp: Date.now() - 86400000 * 12, likes: 45 },
  ];
}

function getDefaultReadingStatus() {
  return [
    { book: '百年孤独', status: '在读', progress: 67 },
    { book: '局外人', status: '想读', progress: 0 },
    { book: '活着', status: '已读', rating: 4 },
    { book: '追风筝的人', status: '已读', rating: 5 },
  ];
}