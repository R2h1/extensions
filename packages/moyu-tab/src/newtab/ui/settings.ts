// ── 设置弹窗：时间 / 发薪日 / 微信读书 / 喝水 四个设置页 ──
import { pad } from '../utils';
import { showMessage } from './toast';
import { renderWereadKeySetup, setWereadSettingsOpener } from '../widgets/weread-shared';
import { refreshWereadOverview } from '../widgets/weread-overview';
import { renderWaterSettings, setWaterSettingsOpener } from '../widgets/water';
import {
  getSchedule,
  saveSchedule,
  getSal,
  saveSalStt,
  salRate,
  rescaleSal,
  buildSalTimeline,
  tickSalary,
} from '../widgets/salary';

const sm = document.getElementById('settingsModal')!;
document.getElementById('smClose')!.addEventListener('click', () => sm.classList.remove('open'));
sm.addEventListener('click', (e) => {
  if (e.target === sm) sm.classList.remove('open');
});
document.querySelectorAll('#smSidebar .msb').forEach((b) =>
  b.addEventListener('click', function (this: HTMLElement) {
    document.querySelectorAll('#smSidebar .msb').forEach((x) => x.classList.remove('active'));
    this.classList.add('active');
    if (this.dataset.s === 'time') renderSetTime();
    else if (this.dataset.s === 'weread') renderSetWeread();
    else if (this.dataset.s === 'water') renderSetWater();
    else renderSetSalary();
  }),
);
export async function openSettings() {
  document.querySelectorAll('#smSidebar .msb').forEach((b) => b.classList.remove('active'));
  document.querySelector('#smSidebar [data-s="time"]')!.classList.add('active');
  renderSetTime();
  sm.classList.add('open');
}
export function closeSettings() {
  sm.classList.remove('open');
}
function renderSetWeread() {
  const body = document.getElementById('settingsBody');
  if (!body) return;
  renderWereadKeySetup(body, async () => {
    sm.classList.remove('open');
    refreshWereadOverview();
  });
}
function renderSetWater() {
  const body = document.getElementById('settingsBody');
  if (!body) return;
  renderWaterSettings(body, () => {
    showMessage('喝水设置已保存', 'success');
  });
}
function openSettingsWeread() {
  document.getElementById('wereadModal')?.classList.remove('open');
  document.querySelectorAll('#smSidebar .msb').forEach((b) => b.classList.remove('active'));
  document.querySelector('#smSidebar [data-s="weread"]')?.classList.add('active');
  renderSetWeread();
  sm.classList.add('open');
}
setWereadSettingsOpener(openSettingsWeread);
function openSettingsWater() {
  document.querySelectorAll('#smSidebar .msb').forEach((b) => b.classList.remove('active'));
  document.querySelector('#smSidebar [data-s="water"]')?.classList.add('active');
  renderSetWater();
  sm.classList.add('open');
}
setWaterSettingsOpener(openSettingsWater);
async function renderSetTime() {
  const s = await getSchedule();
  const wd: number[] = s.workDays ?? [1, 2, 3, 4, 5];
  const dhtml = ['一', '二', '三', '四', '五', '六', '日']
    .map((d, i) => {
      return `<label class="dc${wd.includes(i < 5 ? i + 1 : 0) ? ' active' : ''}" data-v="${i < 5 ? i + 1 : 0}"><span>${d}</span></label>`;
    })
    .join('');
  const t = (h: number, m: number) => `${pad(h)}:${pad(m)}`;
  document.getElementById('settingsBody')!.innerHTML =
    `<div class="f"><label>上班</label><input type="time" id="sStart" value="${t(s.startHour, s.startMinute)}"/></div><div class="f"><label>午餐</label><input type="time" id="sLunch" value="${t(s.lunchHour, s.lunchMinute)}"/></div><div class="f"><label>午休结束</label><input type="time" id="sRestEnd" value="${t(s.restEndHour, s.restEndMinute)}"/></div><div class="f"><label>下班</label><input type="time" id="sEnd" value="${t(s.endHour, s.endMinute)}"/></div><div class="f"><label>工作日</label><div style="display:flex;gap:5px" id="sDays">${dhtml}</div></div><button class="btn" id="sSave">保存</button>`;
  document.querySelectorAll('#sDays .dc').forEach((el) =>
    el.addEventListener('click', function (this: HTMLElement) {
      this.classList.toggle('active');
    }),
  );
  document.getElementById('sSave')!.addEventListener('click', async () => {
    const [sh, sm] = (document.getElementById('sStart') as HTMLInputElement).value
      .split(':')
      .map(Number);
    const [lh, lm] = (document.getElementById('sLunch') as HTMLInputElement).value
      .split(':')
      .map(Number);
    const [rh, rm] = (document.getElementById('sRestEnd') as HTMLInputElement).value
      .split(':')
      .map(Number);
    const [eh, em] = (document.getElementById('sEnd') as HTMLInputElement).value
      .split(':')
      .map(Number);
    if (isNaN(sh) || isNaN(lh) || isNaN(rh) || isNaN(eh)) {
      showMessage('请填写完整的工作时间', 'warning');
      return;
    }
    const oldRate = salRate();
    const wd: number[] = [];
    document
      .querySelectorAll('#sDays .dc.active')
      .forEach((el) => wd.push(Number((el as HTMLElement).dataset.v)));
    await saveSchedule({
      startHour: sh,
      startMinute: sm,
      lunchHour: lh,
      lunchMinute: lm,
      restEndHour: rh,
      restEndMinute: rm,
      endHour: eh,
      endMinute: em,
      workDays: wd,
    });
    rescaleSal(oldRate);
    buildSalTimeline();
    tickSalary();
    showMessage('工作时间已保存', 'success');
  });
}
async function renderSetSalary() {
  const s = await getSal();
  document.getElementById('settingsBody')!.innerHTML = `
    <div class="f"><label>月薪（元）</label><input type="number" id="sSalInc" value="${s.monthlyIncome}" min="1" style="width:100%;padding:9px 12px;font-size:13px;border:0.5px solid var(--glass-border);border-radius:var(--radius-xs);background:rgba(255,255,255,0.5);color:var(--text);outline:none;font-family:inherit"/></div>
    <div class="f"><label>发薪日</label><div style="display:flex;align-items:center;gap:8px"><span style="font-size:13px;color:var(--text-secondary)">每月</span><input type="number" id="sSalDay" value="${s.payDay}" min="1" max="31" style="width:80px;padding:9px 12px;font-size:13px;border:0.5px solid var(--glass-border);border-radius:var(--radius-xs);background:rgba(255,255,255,0.5);color:var(--text);outline:none;font-family:inherit;text-align:center"/><span style="font-size:13px;color:var(--text-secondary)">号</span></div></div>
    <div class="f" style="font-size:11px;color:var(--text-tertiary)">工作日 21.75 天/月，薪资按 上班~下班 时段计算（含午休带薪）</div>
    <button class="btn" id="sSalSave">保存</button>`;
  document.getElementById('sSalSave')!.addEventListener('click', async () => {
    const inc = Number((document.getElementById('sSalInc') as HTMLInputElement).value);
    const d = Number((document.getElementById('sSalDay') as HTMLInputElement).value);
    if (inc < 1 || d < 1 || d > 31) {
      showMessage('请输入有效的月薪和发薪日', 'warning');
      return;
    }
    const oldRate = salRate();
    await saveSalStt({ monthlyIncome: inc, payDay: d });
    rescaleSal(oldRate);
    tickSalary();
    showMessage('薪资设置已保存', 'success');
  });
}
