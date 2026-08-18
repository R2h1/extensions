// ── 顶部搜索框：多搜索引擎切换 ──

const SB_KEY = 'moyu_search_engine';
const ENGINES: { name: string; url: string }[] = [
  { name: '百度', url: 'https://www.baidu.com/s?wd=' },
  { name: 'Google', url: 'https://www.google.com/search?q=' },
  { name: '必应', url: 'https://www.bing.com/search?q=' },
  { name: '搜狗', url: 'https://www.sogou.com/web?query=' },
];
let sbCur = ENGINES[0];
export function initWebSearch() {
  const found = ENGINES.find((e) => e.name === localStorage.getItem(SB_KEY));
  if (found) sbCur = found;
  const nameEl = document.getElementById('sbEngineName');
  const listEl = document.getElementById('sbEngineList');
  const ddEl = document.getElementById('sbEngine');
  const inputEl = document.getElementById('sbInput') as HTMLInputElement | null;
  if (!nameEl || !listEl || !ddEl || !inputEl) return;
  nameEl.textContent = sbCur.name;
  listEl.innerHTML = ENGINES.map(
    (e) =>
      `<div class="sb-engine-opt${e.name === sbCur.name ? ' active' : ''}" data-name="${e.name}">${e.name}</div>`,
  ).join('');
  document.getElementById('sbEngineBtn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    ddEl.classList.toggle('open');
  });
  listEl.querySelectorAll('.sb-engine-opt').forEach((opt) =>
    opt.addEventListener('click', (e) => {
      e.stopPropagation();
      const name = (opt as HTMLElement).dataset.name!;
      const eng = ENGINES.find((x) => x.name === name);
      if (!eng) return;
      sbCur = eng;
      localStorage.setItem(SB_KEY, eng.name);
      nameEl.textContent = eng.name;
      listEl
        .querySelectorAll('.sb-engine-opt')
        .forEach((o) => o.classList.toggle('active', (o as HTMLElement).dataset.name === name));
      ddEl.classList.remove('open');
      inputEl.focus();
    }),
  );
  document.addEventListener('click', () => ddEl.classList.remove('open'));
  const doSearch = () => {
    const q = inputEl.value.trim();
    if (!q) return;
    window.open(sbCur.url + encodeURIComponent(q), '_blank', 'noopener');
  };
  document.getElementById('sbGo')?.addEventListener('click', doSearch);
  inputEl.addEventListener('keydown', (e) => {
    if ((e as KeyboardEvent).key === 'Enter') doSearch();
  });
}
