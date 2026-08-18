/** 全局消息提示（Toast，页面顶部居中） */

export type MsgType = 'success' | 'warning' | 'error' | 'info';
const MSG_ICONS: Record<MsgType, string> = { success: '✓', warning: '!', error: '✕', info: 'i' };
function ensureMsgContainer(): HTMLElement {
  let c = document.getElementById('msgContainer');
  if (!c) {
    c = document.createElement('div');
    c.id = 'msgContainer';
    c.className = 'msg-container';
    document.body.appendChild(c);
  }
  return c;
}
function dismissMsg(toast: HTMLElement) {
  if (!toast.parentNode) return;
  toast.classList.add('out');
  toast.addEventListener('animationend', () => toast.remove(), { once: true });
}
export function showMessage(text: string, type: MsgType = 'info') {
  const c = ensureMsgContainer();
  const toast = document.createElement('div');
  toast.className = `msg-toast ${type}`;
  const icon = document.createElement('span');
  icon.className = 'msg-icon';
  icon.textContent = MSG_ICONS[type];
  const txt = document.createElement('span');
  txt.className = 'msg-text';
  txt.textContent = text;
  toast.append(icon, txt);
  toast.addEventListener('click', () => dismissMsg(toast));
  c.appendChild(toast);
  setTimeout(() => dismissMsg(toast), 2500);
}
