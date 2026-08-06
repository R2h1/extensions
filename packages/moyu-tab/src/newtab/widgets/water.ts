import * as THREE from 'three';

/** 喝水提醒：右下角量杯图标 + 点击弹出简洁打水层（3D 杯子）；设置（杯容量/提醒间隔/模拟提醒）在「全局设置 → 喝水」里。
 *  数据存 chrome.storage.local（SW 的定时提醒闹钟也读同一份，跨天自动重置累计、保留设置）。 */
const WATER_KEY = 'moyu_water';

interface WaterData {
  date: string; // 'YYYY-MM-DD' 该累计归属的日期
  total: number; // 今日累计 ml（只通过「喝一口」增加）
  goal: number; // 每日目标 ml，0=不设目标
  cupVolume: number; // 杯容量 ml（用户真实杯子，满杯时 level=cupVolume）
  level: number; // 当前杯内水量 ml（0 ~ cupVolume）
  interval: number; // 提醒间隔分钟，0=关闭
}

const SIP = 50; // 每「喝一口」固定 ml

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const DEFAULTS: WaterData = {
  date: todayStr(),
  total: 0,
  goal: 1500,
  cupVolume: 300,
  level: 300,
  interval: 60,
};

let data: WaterData = { ...DEFAULTS };

async function load(): Promise<WaterData> {
  try {
    const r = (await chrome.storage.local.get(WATER_KEY)) as Record<
      string,
      Record<string, any> | undefined
    >;
    const d = r?.[WATER_KEY];
    if (d && typeof d.total === 'number') {
      const cur = todayStr();
      const isNewDay = d.date !== cur;
      // 旧模型迁移：有 cup 无 cupVolume/level → 杯容量取旧 cup，当天从满杯开始
      const cupVolume =
        typeof d.cupVolume === 'number'
          ? d.cupVolume
          : typeof d.cup === 'number'
            ? d.cup
            : DEFAULTS.cupVolume;
      const level = isNewDay ? cupVolume : typeof d.level === 'number' ? d.level : cupVolume;
      return {
        date: cur, // 目标跨天保留（是设置，不是当日累计）
        total: isNewDay ? 0 : typeof d.total === 'number' ? d.total : 0,
        goal: typeof d.goal === 'number' && d.goal > 0 ? d.goal : DEFAULTS.goal,
        cupVolume,
        level,
        interval: typeof d.interval === 'number' ? d.interval : DEFAULTS.interval,
      };
    }
  } catch {}
  return { ...DEFAULTS, date: todayStr() };
}
async function save() {
  try {
    await chrome.storage.local.set({ [WATER_KEY]: data });
  } catch {}
}
/** 通知 SW 按当前间隔重建/清除提醒闹钟 */
function syncReminder() {
  void chrome.runtime
    .sendMessage({ type: 'WATER_SET_REMINDER', interval: data.interval })
    .catch(() => {});
}

// ── three.js 3D 杯子 ──
// 场景为一个开口圆台玻璃杯，内嵌实心蓝水柱，水位随 level/cupVolume 动画升降。
const WATER_MAX = 1.9; // 满杯时水柱高度（世界单位）
const WATER_BOTTOM = -1.05; // 水柱底部贴杯内底
interface CupScene {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  group: THREE.Group;
  water: THREE.Mesh;
  surface: THREE.Mesh;
  level: number; // 当前水柱高度
  target: number; // 目标水柱高度
  running: boolean;
  raf: number;
  last: number;
}
let waterCup: CupScene | null = null;

function initWaterCup() {
  const el = document.getElementById('waterGl3d');
  if (!el || waterCup || !window.WebGLRenderingContext) return;
  const width = el.clientWidth || 200;
  const height = el.clientHeight || 150;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(width, height);
  el.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
  camera.position.set(0, 0.15, 4.4);
  camera.lookAt(0, 0, 0);

  scene.add(new THREE.AmbientLight(0xffffff, 0.85));
  const key = new THREE.DirectionalLight(0xffffff, 1.15);
  key.position.set(2, 3, 3);
  scene.add(key);
  const back = new THREE.DirectionalLight(0xbfdbfe, 0.7);
  back.position.set(-2, 1, -2.5);
  scene.add(back);

  const group = new THREE.Group();
  scene.add(group);

  // 玻璃杯（开口圆台，透明）
  const glass = new THREE.Mesh(
    new THREE.CylinderGeometry(0.9, 1.05, 2.2, 48, 1, true),
    new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.26,
      roughness: 0.05,
      metalness: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  glass.renderOrder = 1; // 透明→水之后渲染，水透过玻璃可见
  group.add(glass);

  // 杯沿
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(0.9, 0.045, 12, 48),
    new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.5,
      roughness: 0.1,
    }),
  );
  rim.position.y = 1.1;
  rim.rotation.x = Math.PI / 2;
  rim.renderOrder = 1;
  group.add(rim);

  // 杯把（右侧 “(” 形半环）
  const handle = new THREE.Mesh(
    new THREE.TorusGeometry(0.42, 0.07, 10, 24, Math.PI),
    new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.4,
      roughness: 0.1,
    }),
  );
  handle.rotation.z = -Math.PI / 2;
  handle.position.x = 1.03;
  handle.renderOrder = 1;
  group.add(handle);

  // 水柱（实心蓝，保证不透明者在玻璃前先渲染）
  const water = new THREE.Mesh(
    new THREE.CylinderGeometry(0.9, 0.9, 1, 40),
    new THREE.MeshPhysicalMaterial({
      color: 0x3b82f6,
      roughness: 0.12,
      metalness: 0,
      side: THREE.DoubleSide,
    }),
  );
  group.add(water);

  // 水面高光（水柱顶部的浅蓝薄盘）
  const surface = new THREE.Mesh(
    new THREE.CircleGeometry(0.89, 40),
    new THREE.MeshPhysicalMaterial({ color: 0xa5cffc, roughness: 0.1 }),
  );
  surface.rotation.x = -Math.PI / 2;
  group.add(surface);

  waterCup = {
    renderer,
    scene,
    camera,
    group,
    water,
    surface,
    level: 0,
    target: 0,
    running: false,
    raf: 0,
    last: 0,
  };
}

/** 按当前水位重建水柱几何并重定位（水柱顶部贴水面盘） */
function updateWaterGeometry() {
  const c = waterCup;
  if (!c) return;
  const h = Math.max(0.02, c.level);
  c.water.geometry.dispose();
  c.water.geometry = new THREE.CylinderGeometry(0.9, 0.9, h, 40);
  c.water.position.y = WATER_BOTTOM + h / 2;
  c.surface.position.y = WATER_BOTTOM + h + 0.005;
}

/** 把 0~100% 映射为水柱目标高度，动画缓动追赶 */
function setWaterLevel(pct: number) {
  if (!waterCup) return;
  waterCup.target = (Math.max(0, Math.min(100, pct)) / 100) * WATER_MAX;
}

function cupFrame(now: number) {
  const c = waterCup;
  if (!c) return;
  c.raf = 0;
  const last = c.last || now;
  const dt = Math.min(0.1, (now - last) / 1000);
  c.last = now;
  const diff = c.target - c.level;
  if (Math.abs(diff) > 0.0005) {
    c.level += diff * Math.min(1, dt * 7);
    updateWaterGeometry();
  }
  c.group.rotation.y += dt * 0.3; // 杯子缓自转，更立体
  c.renderer.render(c.scene, c.camera);
  if (c.running && c.raf === 0) c.raf = requestAnimationFrame(cupFrame);
}
function waterCupStart() {
  const c = waterCup;
  if (!c) return;
  c.running = true;
  c.last = 0;
  if (c.raf === 0) c.raf = requestAnimationFrame(cupFrame);
}
function waterCupStop() {
  const c = waterCup;
  if (!c) return;
  c.running = false;
  if (c.raf) {
    cancelAnimationFrame(c.raf);
    c.raf = 0;
  }
}

/** 刷新右下角弹层内容：3D 杯水位 + 杯容量 + 百分比 */
function refreshWater() {
  const pctEl = document.getElementById('waterPopPct');
  const sizeEl = document.getElementById('waterCupSize');
  const add = document.getElementById('waterPopAdd') as HTMLButtonElement | null;
  const cupPct =
    data.cupVolume > 0
      ? Math.max(0, Math.min(100, Math.round((data.level / data.cupVolume) * 100)))
      : 0;
  if (pctEl) pctEl.textContent = `${cupPct}%`;
  if (sizeEl) sizeEl.textContent = `杯 ${data.cupVolume}ml`;
  if (add) add.disabled = data.level <= 0; // 见底后「喝一口」禁用
  setWaterLevel(cupPct);
}

function togglePop(open?: boolean) {
  const pop = document.getElementById('waterPop');
  if (!pop) return;
  const show = open ?? !pop.classList.contains('open');
  pop.classList.toggle('open', show);
  if (show) {
    if (!waterCup) initWaterCup();
    waterCupStart();
    refreshWater();
  } else {
    waterCupStop();
  }
}

/** 由 newtab.ts 注入：打开「全局设置 → 喝水」 */
let openSettingsFn: () => void = () => {};
export function setWaterSettingsOpener(fn: () => void): void {
  openSettingsFn = fn;
}

export async function initWater() {
  data = await load();
  refreshWater();
  document.getElementById('waterFab')?.addEventListener('click', () => togglePop());
  document.getElementById('waterPopSet')?.addEventListener('click', () => {
    togglePop(false);
    openSettingsFn();
  });
  document.getElementById('waterPopAdd')?.addEventListener('click', () => {
    if (data.level <= 0) return;
    // 喝一口：取 min(SIP, 剩余)，避免杯子喝到负
    const amt = Math.min(SIP, data.level);
    data.level -= amt;
    data.total += amt;
    void save().then(() => {
      refreshWater();
      syncReminder();
    });
  });
  document.getElementById('waterPopFill')?.addEventListener('click', () => {
    // 加水回满（不计入今日累计）
    data.level = data.cupVolume;
    void save().then(() => {
      refreshWater();
      syncReminder();
    });
  });
  document.addEventListener('click', (e) => {
    if (!(e.target as HTMLElement).closest('#waterDock')) togglePop(false);
  });
  document.addEventListener('keydown', (e) => {
    if ((e as KeyboardEvent).key === 'Escape') togglePop(false);
  });
  syncReminder(); // 页面打开即确保闹钟存在（SW 重启/浏览器重启后重新拉起）
}

/** 全局设置 → 喝水：杯容量 / 提醒间隔 + 模拟提醒；改动需点「保存」才生效 */
export function renderWaterSettings(body: HTMLElement, onSaved: () => void) {
  const inputStyle =
    'width:100%;padding:9px 12px;font-size:13px;border:0.5px solid var(--glass-border);border-radius:var(--radius-xs);background:rgba(255,255,255,0.5);color:var(--text);outline:none;font-family:inherit;box-sizing:border-box';
  body.innerHTML = '';
  const row = (label: string, input: HTMLInputElement) => {
    const f = document.createElement('div');
    f.className = 'f';
    const l = document.createElement('label');
    l.textContent = label;
    f.appendChild(l);
    f.appendChild(input);
    body.appendChild(f);
  };
  const cup = document.createElement('input');
  cup.type = 'number';
  cup.min = '1';
  cup.value = String(data.cupVolume);
  cup.style.cssText = inputStyle;
  row('杯容量（ml，你的真实杯子）', cup);

  const interval = document.createElement('input');
  interval.type = 'number';
  interval.min = '0';
  interval.value = String(data.interval);
  interval.style.cssText = inputStyle;
  row('提醒间隔（分钟，0=关闭）', interval);

  const goal = document.createElement('input');
  goal.type = 'number';
  goal.min = '0';
  goal.value = String(data.goal);
  goal.style.cssText = inputStyle;
  row('每日目标（ml，0=不设目标）', goal);

  const sim = document.createElement('button');
  sim.className = 'btn';
  sim.type = 'button';
  sim.textContent = '测试提醒';
  // 只触发 SW 的 Windows 系统通知，不弹「已保存」toast
  sim.addEventListener('click', () => {
    void chrome.runtime.sendMessage({ type: 'WATER_SIMULATE' });
  });

  const saveBtn = document.createElement('button');
  saveBtn.className = 'btn';
  saveBtn.type = 'button';
  saveBtn.textContent = '保存';
  saveBtn.addEventListener('click', () => {
    data.cupVolume = Math.max(1, Math.round(Number(cup.value) || data.cupVolume));
    data.level = Math.min(data.level, data.cupVolume); // 换小杯时水位不超过新杯量
    if (data.level <= 0) data.level = data.cupVolume; // 见底换杯则回满
    data.interval = Math.max(0, Math.round(Number(interval.value) || 0));
    data.goal = Math.max(0, Math.round(Number(goal.value) || 0));
    void save().then(() => {
      syncReminder();
      refreshWater();
      onSaved();
    });
  });

  // 测试 / 保存 并排一行
  const actions = document.createElement('div');
  actions.style.cssText = 'display:flex;gap:8px;margin-top:2px';
  sim.style.flex = '1';
  saveBtn.style.flex = '1';
  actions.appendChild(sim);
  actions.appendChild(saveBtn);
  body.appendChild(actions);
}
