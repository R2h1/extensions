/** 微信读书三张卡（书架/统计/推荐）共享的 API Key 读写 + 输入 UI */

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
