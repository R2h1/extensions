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

// ── 程序化生成书本图标（纯像素操作，无外部文件） ──
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
  const pad = Math.max(2, Math.round(s * 0.18));
  const bookL = pad, bookR = s - pad;
  const bookT = Math.max(2, Math.round(s * 0.2)), bookB = Math.round(s * 0.82);
  const spineW = Math.max(1, Math.round((bookR - bookL) * 0.18));
  const rn = Math.max(1, Math.round((bookR - bookL) * 0.15));

  for (let y = 0; y < s; y++) {
    for (let x = 0; x < s; x++) {
      const idx = (y * s + x) * 4;
      const inX = x >= bookL && x < bookR;
      const inY = y >= bookT && y < bookB;
      if (!inX || !inY) { pixels[idx + 3] = 0; continue; }

      const dl = x - bookL, dr = bookR - 1 - x, dt = y - bookT, db = bookB - 1 - y;
      const isTL = dl < rn && dt < rn && dl * dl + dt * dt >= rn * rn;
      const isTR = dr < rn && dt < rn && dr * dr + dt * dt >= rn * rn;
      const isBL = dl < rn && db < rn && dl * dl + db * db >= rn * rn;
      const isBR = dr < rn && db < rn && dr * dr + db * db >= rn * rn;
      if (isTL || isTR || isBL || isBR) { pixels[idx + 3] = 0; continue; }

      // 书脊
      if (x < bookL + spineW) {
        pixels[idx] = 139; pixels[idx + 1] = 126; pixels[idx + 2] = 116; pixels[idx + 3] = 255;
        continue;
      }

      // 书页
      pixels[idx] = 253; pixels[idx + 1] = 250; pixels[idx + 2] = 247; pixels[idx + 3] = 255;

      // 文字线条
      if (s >= 48) {
        const margin = Math.round((bookR - bookL) * 0.16);
        const lineH = Math.max(1, Math.floor(s * 0.02));
        const lineL = bookL + spineW + margin;
        const lineR = bookR - margin;
        const y1 = bookT + Math.round((bookB - bookT) * 0.30);
        const y2 = bookT + Math.round((bookB - bookT) * 0.50);

        if (y >= y1 - lineH && y < y1 + lineH && x >= lineL && x < lineR) {
          pixels[idx] = 190; pixels[idx + 1] = 175; pixels[idx + 2] = 165;
        }
        if (y >= y2 - lineH && y < y2 + lineH && x >= lineL && x < lineL + (lineR - lineL) * 0.6) {
          pixels[idx] = 190; pixels[idx + 1] = 175; pixels[idx + 2] = 165;
        }
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