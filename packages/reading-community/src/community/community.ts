// 书搭子 — 主界面逻辑

// ── 类型定义 ──
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

interface ReadingItem {
  book: string;
  status: '在读' | '想读' | '已读';
  progress?: number;
  rating?: number;
}

// ── 工具函数 ──
function formatDate(ts: number): string {
  const diff = Date.now() - ts;
  const days = Math.floor(diff / 86400000);
  if (days === 0) return '今天';
  if (days === 1) return '昨天';
  if (days < 7) return `${days}天前`;
  return new Date(ts).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}

// ── 发送消息给 Service Worker ──
async function sendMessage<T>(type: string, payload?: unknown): Promise<T> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type, payload }, (response) => {
      resolve(response as T);
    });
  });
}

// ── Toast ──
let toastTimer: ReturnType<typeof setTimeout> | null = null;

function showToast(msg: string): void {
  const el = document.getElementById('toast')!;
  el.textContent = msg;
  el.classList.add('show');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 1800);
}

// ── 页面切换 ──
function switchPage(pageId: string): void {
  document.querySelectorAll('.page').forEach((p) => p.classList.remove('active'));
  const target = document.getElementById('page-' + pageId);
  if (target) target.classList.add('active');

  document.querySelectorAll('.nav-item').forEach((btn) => btn.classList.remove('active'));
  const activeBtn = document.querySelector(`.nav-item[data-page="${pageId}"]`);
  if (activeBtn) activeBtn.classList.add('active');

  document.getElementById('pageContainer')!.scrollTop = 0;

  // 页面切换时刷新数据
  if (pageId === 'home') loadHomeFeed();
  if (pageId === 'profile') loadProfile();
}

// ── 点赞 ──
function handleLike(likeSpan: HTMLElement, noteId: number): void {
  const icon = likeSpan.querySelector('i')!;
  const text = likeSpan.textContent!.trim();
  const count = parseInt(text.replace(/[^0-9]/g, '')) || 0;

  if (icon.classList.contains('far')) {
    icon.classList.remove('far');
    icon.classList.add('fas');
    likeSpan.innerHTML = `<i class="fas fa-heart" style="color:#e07a5f;"></i> ${count + 1}`;
    likeSpan.classList.add('liked');
    sendMessage('LIKE_NOTE', noteId);
    showToast('❤️ 收藏了这份感动');
  } else {
    icon.classList.remove('fas');
    icon.classList.add('far');
    likeSpan.innerHTML = `<i class="far fa-heart"></i> ${count - 1}`;
    likeSpan.classList.remove('liked');
  }
}

// ── 事件委托：处理所有动态生成的卡片点击 ──
function setupEventDelegation(): void {
  const container = document.getElementById('pageContainer')!;

  container.addEventListener('click', (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    const card = target.closest('.card-note, .card-booklist, .quote-card');

    // 如果点了点赞按钮
    const likeBtn = target.closest('.actions span:first-child, .actions > span');
    if (likeBtn && card?.classList.contains('card-note')) {
      e.stopPropagation();
      // 从 data 属性读取 note id
      const noteId = parseInt(card.getAttribute('data-note-id') || '0');
      if (noteId) handleLike(likeBtn as HTMLElement, noteId);
      return;
    }

    // 点击卡片 → toast
    if (card) {
      const isBooklist = card.classList.contains('card-booklist');
      const isQuote = card.classList.contains('quote-card');
      if (isBooklist) showToast('📚 查看书单详情');
      else if (isQuote) showToast('✨ 收藏这句金句');
      else showToast('📖 查看笔记详情');
    }
  });
}

// ── 渲染卡片组件（无 onclick） ──
function escapeHtml(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function renderNoteCard(note: NoteRecord, isMyNote = false): string {
  const timeAgo = formatDate(note.timestamp);
  const isQuote = note.type === '摘录';
  const contentClass = isQuote ? 'content quote' : 'content';
  const userLabel = isMyNote ? '我' : escapeHtml(note.book.charAt(0));

  return `
    <div class="card-note" data-note-id="${note.id}">
      <div class="book-title"><i class="fas fa-book-open"></i> 《${escapeHtml(note.book)}》</div>
      <div class="${contentClass}">${escapeHtml(note.content)}</div>
      <div class="meta">
        <span class="user">
          <span class="avatar">${userLabel}</span>
          ${isMyNote ? '我' : userLabel}
        </span>
        <span class="actions">
          <span data-like="true">
            <i class="${note.likes > 0 ? 'fas' : 'far'} fa-heart" ${note.likes > 0 ? 'style="color:#e07a5f;"' : ''}></i> ${note.likes}
          </span>
          <span><i class="far fa-comment"></i> 0</span>
          <span style="font-size:10px;color:var(--accent-light);">${escapeHtml(note.type)}</span>
        </span>
      </div>
    </div>
  `;
}

function renderQuoteCard(book: string, text: string, likes: number): string {
  return `
    <div class="quote-card">
      <div class="quote-text">“${escapeHtml(text)}”</div>
      <div class="quote-source">—— 《${escapeHtml(book)}》</div>
      <div class="quote-meta">
        <span><i class="far fa-heart"></i> ${likes}</span>
        <span><i class="far fa-bookmark"></i> 收藏</span>
      </div>
    </div>
  `;
}

// ── 首页 ──
async function loadHomeFeed(): Promise<void> {
  const feed = document.getElementById('home-feed')!;
  feed.innerHTML = '<div class="loading"><div class="spinner"></div>加载中…</div>';

  const notes = await sendMessage<NoteRecord[]>('GET_NOTES');
  if (!notes || notes.length === 0) {
    feed.innerHTML = '<div class="empty-state"><i class="far fa-book-open"></i><p>还没有笔记，来写第一篇吧</p></div>';
    return;
  }

  // 取前3条热读笔记 + 金句插入
  const hot = notes.sort((a, b) => b.likes - a.likes).slice(0, 3);
  let html = '';

  // 书单卡片
  html += `
    <div class="card-booklist">
      <div class="title"><i class="fas fa-list-ul"></i> 改变人生的 5 本书</div>
      <div class="desc">这些书在某个深夜，悄悄重塑了我看待世界的方式。</div>
      <div class="book-strip">
        <span class="book-tag">《活着》</span>
        <span class="book-tag">《局外人》</span>
        <span class="book-tag">《百年孤独》</span>
        <span class="book-tag">《追风筝的人》</span>
        <span class="book-tag">《小王子》</span>
      </div>
      <div class="meta">
        <span>由 苏远 创建 · 12 人收藏</span>
      </div>
    </div>
  `;

  for (let i = 0; i < hot.length; i++) {
    html += renderNoteCard(hot[i]);
    // 第二条后面插金句
    if (i === 1) {
      const quoteNote = notes.find((n) => n.type === '摘录' && n.id !== hot[i].id);
      if (quoteNote) {
        html += renderQuoteCard(quoteNote.book, quoteNote.content, quoteNote.likes);
      }
    }
  }

  feed.innerHTML = html;
}

// ── 发布笔记 ──
async function publishNote(): Promise<void> {
  const bookInput = document.getElementById('bookInput') as HTMLInputElement;
  const contentArea = document.getElementById('noteContent') as HTMLTextAreaElement;
  const book = bookInput.value.trim() || '未命名书籍';
  const content = contentArea.value.trim();

  if (!content) {
    showToast('✍️ 写点什么再发布吧');
    contentArea.focus();
    return;
  }

  const typeRadio = document.querySelector<HTMLInputElement>(
    'input[name="noteType"]:checked',
  );
  const type = (typeRadio?.value as NoteRecord['type']) || '笔记';

  const newNote: NoteRecord = {
    id: Date.now() + Math.floor(Math.random() * 1000),
    book,
    content,
    type,
    timestamp: Date.now(),
    likes: 0,
  };

  await sendMessage('ADD_NOTE', newNote);
  showToast(`📖 笔记已发布 · 《${book}》`);

  // 清空表单
  contentArea.value = '';
  bookInput.value = '';
  updateCharCount();

  // 切换回首页
  setTimeout(() => switchPage('home'), 400);
}

function updateCharCount(): void {
  const area = document.getElementById('noteContent') as HTMLTextAreaElement;
  const count = document.getElementById('charCount')!;
  count.textContent = `${area.value.length} / 2000`;
}

// ── 我的页面 ──
async function loadProfile(): Promise<void> {
  // 加载用户信息
  const profile = await sendMessage<UserProfile>('GET_PROFILE');
  if (profile) {
    (document.getElementById('profile-name')!).textContent = profile.name;
    (document.getElementById('profile-bio')!).textContent = profile.bio || '读万卷书，行万里路。';
    (document.getElementById('stat-notes')!).textContent = String(profile.notes);
    (document.getElementById('stat-favorites')!).textContent = String(profile.favorites);
    (document.getElementById('stat-booklists')!).textContent = String(profile.booklists);
  }

  // 加载阅读记录
  const readingStatus = await sendMessage<ReadingItem[]>('GET_READING_STATUS');
  const readingList = document.getElementById('reading-list')!;
  if (readingStatus && readingStatus.length > 0) {
    readingList.innerHTML = readingStatus
      .map((item) => {
        if (item.status === '已读') {
          const stars = '★'.repeat(item.rating ?? 0) + '☆'.repeat(5 - (item.rating ?? 0));
          return `
            <div class="item">
              <span><span class="tag">${item.status}</span> 《${escapeHtml(item.book)}》</span>
              <span style="font-size:12px;color:var(--accent);">${stars}</span>
            </div>
          `;
        }
        if (item.status === '在读') {
          return `
            <div class="item">
              <span><span class="tag">${item.status}</span> 《${escapeHtml(item.book)}》</span>
              <div class="progress-bar"><div class="fill" style="width:${item.progress ?? 0}%;"></div></div>
            </div>
          `;
        }
        return `
          <div class="item">
            <span><span class="tag">${item.status}</span> 《${escapeHtml(item.book)}》</span>
            <span style="font-size:12px;color:var(--text-muted);">—</span>
          </div>
        `;
      })
      .join('');
  } else {
    readingList.innerHTML = '<div class="empty-state" style="padding:16px 0;"><p>还没有阅读记录</p></div>';
  }

  // 加载我的笔记
  const notes = await sendMessage<NoteRecord[]>('GET_NOTES');
  const myNotes = document.getElementById('my-notes-list')!;
  if (notes && notes.length > 0) {
    myNotes.innerHTML = notes.map((n) => renderNoteCard(n, true)).join('');
    (document.getElementById('my-notes-count')!).textContent = `共 ${notes.length} 篇笔记`;
  } else {
    myNotes.innerHTML = '<div class="empty-state" style="padding:16px 0;"><i class="far fa-pen"></i><p>还没有笔记</p></div>';
    (document.getElementById('my-notes-count')!).textContent = '0 篇笔记';
  }
}

// ── 加载最近发布（写笔记页底部） ──
async function loadRecentNotes(): Promise<void> {
  const container = document.getElementById('recent-notes')!;
  const notes = await sendMessage<NoteRecord[]>('GET_NOTES');
  if (notes && notes.length > 0) {
    const recent = notes.slice(0, 3);
    container.innerHTML = recent
      .map(
        (n) => `
        <div class="card-note" style="opacity:0.7;cursor:default;" data-note-id="${n.id}">
          <div class="book-title"><i class="fas fa-book-open"></i> 《${escapeHtml(n.book)}》</div>
          <div class="content" style="font-size:13px;">${escapeHtml(n.content)}</div>
          <div class="meta">
            <span><span class="avatar" style="display:inline-flex;width:18px;height:18px;border-radius:50%;background:var(--accent-light);align-items:center;justify-content:center;font-size:9px;color:var(--accent);">我</span> 我</span>
            <span>${formatDate(n.timestamp)}</span>
          </div>
        </div>
      `,
      )
      .join('');
  } else {
    container.innerHTML = '<div class="empty-state" style="padding:20px 0;"><p>发布你的第一篇笔记吧</p></div>';
  }
}

// ── 初始化 ──
document.addEventListener('DOMContentLoaded', () => {
  // 底部导航点击
  document.getElementById('bottomNav')!.addEventListener('click', (e: MouseEvent) => {
    const btn = (e.target as HTMLElement).closest('.nav-item') as HTMLElement;
    if (btn) {
      const page = btn.getAttribute('data-page');
      if (page) switchPage(page);
    }
  });

  // 添加图片按钮
  document.getElementById('addImageBtn')!.addEventListener('click', () => {
    showToast('🖼️ 图片功能即将上线');
  });

  // 事件委托：处理所有卡片点击
  setupEventDelegation();

  // 加载首页
  loadHomeFeed();
  loadRecentNotes();

  // 字数统计
  const noteContent = document.getElementById('noteContent') as HTMLTextAreaElement;
  noteContent.addEventListener('input', updateCharCount);

  // Ctrl+Enter 快速发布
  noteContent.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.ctrlKey && e.key === 'Enter') {
      e.preventDefault();
      publishNote();
    }
  });

  // 书名输入框 Enter → 跳到内容
  document.getElementById('bookInput')!.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      noteContent.focus();
    }
  });

  // 发布按钮
  document.getElementById('publishBtn')!.addEventListener('click', publishNote);

  console.log('📖 书搭子已加载');
});