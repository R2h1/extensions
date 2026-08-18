// ── 左下角媒体（♪ 图标 → 弹出 APlayer + 视频弹窗）──
import APlayer from 'aplayer';
import 'aplayer/dist/APlayer.min.css';

const MUSIC_API = 'https://api.i-meto.com/meting/api?server=netease&type=playlist&id=3778678&r=';
let musicInited = false;

async function ensureMusic() {
  if (musicInited) return;
  const container = document.getElementById('musicPlayer');
  if (!container) return;
  musicInited = true;
  container.innerHTML = '<div class="hot-empty">加载中…</div>';
  try {
    const res = await fetch(MUSIC_API + Math.random());
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = (await res.json()) as any[];
    if (!Array.isArray(data) || !data.length) throw new Error('empty');
    const audio = data.map((s) => ({
      name: s.title || '未知',
      artist: s.author || '',
      url: s.url,
      cover: s.pic,
      lrc: s.lrc,
    }));
    container.innerHTML = '';
    new APlayer({
      container: container as HTMLElement,
      audio,
      autoplay: false,
      theme: '#d97706',
      listFolded: false,
      loop: 'all',
      order: 'list',
      listMaxHeight: '260px',
      lrcType: 1,
    });
  } catch {
    container.innerHTML = '<div class="hot-empty">⚠ 加载失败 · 点击重试</div>';
    container.onclick = () => {
      musicInited = false;
      ensureMusic();
    };
    musicInited = false;
  }
}
function closeMediaPanel() {
  document.getElementById('mediaPanel')?.classList.remove('open');
  document.getElementById('mediaFab')?.classList.remove('active');
}
function toggleMediaPanel() {
  const panel = document.getElementById('mediaPanel');
  if (!panel) return;
  const willOpen = !panel.classList.contains('open');
  if (willOpen) {
    panel.classList.add('open');
    document.getElementById('mediaFab')?.classList.add('active');
    closeMePanel();
    ensureMusic();
  } else {
    closeMediaPanel();
  }
}
function closeMePanel() {
  document.getElementById('mePanel')?.classList.remove('open');
  document.getElementById('meFab')?.classList.remove('active');
}
function toggleMePanel() {
  const panel = document.getElementById('mePanel');
  if (!panel) return;
  const willOpen = !panel.classList.contains('open');
  if (willOpen) {
    panel.classList.add('open');
    document.getElementById('meFab')?.classList.add('active');
    closeMediaPanel();
  } else {
    closeMePanel();
  }
}
function openVideoModal() {
  const modal = document.getElementById('videoModal');
  if (!modal) return;
  const frame = document.getElementById('tvFrame') as HTMLIFrameElement | null;
  if (frame && !frame.src) {
    frame.src = `https://conan.js.cn/tv?v=${new Date().toISOString().slice(0, 10)}`;
  }
  modal.classList.add('open');
}
function closeVideoModal() {
  document.getElementById('videoModal')?.classList.remove('open');
}
export function initMedia() {
  document.getElementById('meFab')?.addEventListener('click', () => toggleMePanel());
  document.getElementById('mediaFab')?.addEventListener('click', () => toggleMediaPanel());
  document.getElementById('mbVideo')?.addEventListener('click', openVideoModal);
  document.getElementById('vmClose')?.addEventListener('click', closeVideoModal);
  document.getElementById('videoModal')?.addEventListener('click', (e) => {
    if (e.target === document.getElementById('videoModal')) closeVideoModal();
  });
  document.addEventListener('click', (e) => {
    const mp = document.getElementById('mediaPanel');
    const mep = document.getElementById('mePanel');
    const t = e.target as HTMLElement | null;
    if (
      mp?.classList.contains('open') &&
      !(t && (t.closest('.media-dock') || t.closest('.aplayer-lrc')))
    ) {
      closeMediaPanel();
    }
    if (mep?.classList.contains('open') && !(t && t.closest('.media-dock'))) {
      closeMePanel();
    }
  });
  document.addEventListener('keydown', (e) => {
    if ((e as KeyboardEvent).key !== 'Escape') return;
    closeMediaPanel();
    closeMePanel();
    closeVideoModal();
  });
}
