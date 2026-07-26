import { esc } from '../utils';
/** 微信读书卡片共享：API Key 读写 + 输入 UI + 书评下钻 */

export const WR_KEY_STORAGE = 'moyu_weread_key';

export async function loadWereadKey(): Promise<string> {
  const r = await chrome.storage.sync.get(WR_KEY_STORAGE);
  return (r[WR_KEY_STORAGE] as string) || '';
}

export async function saveWereadKey(k: string): Promise<void> {
  await chrome.storage.sync.set({ [WR_KEY_STORAGE]: k });
}

/** 在 container 内渲染 API Key 输入 UI；用 class 而非 id，避免多卡同时渲染时冲突。 */
export function renderWereadKeySetup(container: HTMLElement, onSaved: () => void): void {
  container.innerHTML = `<div class="weread-setup">
      <div class="weread-setup-hint">填入微信读书 API Key</div>
      <div class="weread-setup-row">
        <input class="weread-key-input" type="text" placeholder="wrk-xxxxxxxx" autocomplete="off" />
        <button class="weread-key-btn weread-key-save">保存</button>
      </div>
      <div class="weread-setup-tip">Key 绑定你的微信读书账号，三张卡片共用。<a class="weread-setup-link" href="https://weread.qq.com/r/weread-skills" target="_blank" rel="noopener">获取 API Key ↗</a>；失效时可在此更换</div>
    </div>`;
  const inp = container.querySelector('.weread-key-input') as HTMLInputElement | null;
  const btn = container.querySelector('.weread-key-save');
  const submit = async () => {
    if (!inp) return;
    const k = inp.value.trim();
    if (!k) return;
    await saveWereadKey(k);
    onSaved();
  };
  btn?.addEventListener('click', submit);
  inp?.addEventListener('keydown', (e) => {
    if ((e as KeyboardEvent).key === 'Enter') submit();
  });
}

/** 书评下钻：进入该书的公开书评，支持返回，内含"在微信读书打开"。书信息由调用方提供。 */
export async function openBookReviewIn(
  container: HTMLElement,
  book: { bid: string; title: string; cover: string; deepLink: string },
  onBack?: () => void,
): Promise<void> {
  container.onclick = null;
  container.innerHTML = '<div class="hot-empty">加载中…</div>';
  const key = await loadWereadKey();
  if (!key) {
    renderWereadKeySetup(container, () => openBookReviewIn(container, book, onBack));
    return;
  }
  try {
    const res = (await chrome.runtime.sendMessage({
      type: 'WEREAD_REVIEW_FETCH',
      apiKey: key,
      bookId: book.bid,
    })) as
      | {
          success: boolean;
          data?: {
            reviews: { author: string; star: number; content: string; time: number }[];
            total: number;
          };
          error?: string;
        }
      | undefined;
    if (res?.success && res.data) {
      renderBookReviewIn(container, book, res.data.reviews, res.data.total, onBack);
    } else {
      container.innerHTML = `<div class="hot-empty">${
        res?.error === 'invalid_key'
          ? 'API Key 无效'
          : res?.error === 'empty'
            ? '暂无书评'
            : '加载失败'
      }</div>`;
    }
  } catch {
    container.innerHTML = '<div class="hot-empty">加载失败 · 点击重试</div>';
    container.onclick = () => openBookReviewIn(container, book, onBack);
  }
}

export function renderBookReviewIn(
  container: HTMLElement,
  book: { bid: string; title: string; cover: string; deepLink: string },
  reviews: { author: string; star: number; content: string; time: number }[],
  total: number,
  onBack?: () => void,
): void {
  const cover = book.cover
    ? `<img src="${esc(book.cover)}" alt="" loading="lazy" referrerpolicy="no-referrer"/>`
    : '<div class="wr-rec-cover-ph">📖</div>';
  const openLink = book.deepLink
    ? `<a class="wr-notes-open" href="${esc(book.deepLink)}" target="_blank" rel="noopener">在微信读书打开 ↗</a>`
    : '';
  const rows = reviews
    .map((r) => {
      const star = fmtStar(r.star);
      const content = r.content.length > 80 ? r.content.slice(0, 80) + '…' : r.content;
      return `<div class="review-row"><div class="review-meta"><span class="review-author">${esc(r.author)}</span>${star ? `<span class="review-star">${star}</span>` : ''}</div><div class="review-content">${esc(content)}</div></div>`;
    })
    .join('');
  const backBtn = onBack ? '<button class="wr-notes-back" type="button">‹ 返回</button>' : '';
  container.innerHTML = `${backBtn}
      <div class="wr-rv-book"><div class="wr-rec-cover wr-rv-cover">${cover}</div><div class="wr-rv-info"><div class="wr-rv-title">《${esc(book.title)}》</div>${openLink}<div class="wr-rv-meta">${total} 条书评</div></div></div>
      ${rows || '<div class="hot-empty">暂无书评</div>'}`;
  if (onBack) container.querySelector('.wr-notes-back')?.addEventListener('click', onBack);
}

function fmtStar(star: number): string {
  const n = Math.round(star / 20);
  return n > 0 ? '★'.repeat(n) : '';
}
