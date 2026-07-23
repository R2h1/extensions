import { pad } from '../utils';

const WC_KEY = 'moyu_weather_city';
const WX_CACHE = 'moyu_weather_cache';
interface WCity {
  name: string;
  lat: number;
  lon: number;
}
interface WDaily {
  code: number;
  tmax: number;
  tmin: number;
  pop: number;
}
interface WAqi {
  usAqi: number;
  pm25: number;
  pm10: number;
}
interface WCache {
  temp: number;
  feel: number;
  hum: number;
  wind: number;
  code: number;
  ts: number;
  city: string;
  daily?: WDaily[];
  aqi?: WAqi | null;
}
const WMO: Record<number, { t: string; e: string }> = {
  0: { t: '晴', e: '☀️' },
  1: { t: '主要晴', e: '🌤️' },
  2: { t: '局部多云', e: '⛅' },
  3: { t: '阴', e: '☁️' },
  45: { t: '雾', e: '🌫️' },
  48: { t: '雾凇', e: '🌫️' },
  51: { t: '毛毛雨', e: '🌦️' },
  53: { t: '毛毛雨', e: '🌦️' },
  55: { t: '强毛毛雨', e: '🌧️' },
  56: { t: '冻毛毛雨', e: '🌧️' },
  57: { t: '强冻毛毛雨', e: '🌧️' },
  61: { t: '小雨', e: '🌦️' },
  63: { t: '中雨', e: '🌧️' },
  65: { t: '大雨', e: '🌧️' },
  66: { t: '冻雨', e: '🌧️' },
  67: { t: '强冻雨', e: '🌧️' },
  71: { t: '小雪', e: '🌨️' },
  73: { t: '中雪', e: '🌨️' },
  75: { t: '大雪', e: '❄️' },
  77: { t: '雪粒', e: '🌨️' },
  80: { t: '阵雨', e: '🌦️' },
  81: { t: '强阵雨', e: '🌧️' },
  82: { t: '暴雨', e: '⛈️' },
  85: { t: '阵雪', e: '🌨️' },
  86: { t: '强阵雪', e: '❄️' },
  95: { t: '雷暴', e: '⛈️' },
  96: { t: '雷暴伴冰雹', e: '⛈️' },
  99: { t: '强雷暴伴冰雹', e: '⛈️' },
};
let wCity: WCity | null = null;
let wLoading = false;
let wInited = false;
async function getWCity(): Promise<WCity | null> {
  const r = await chrome.storage.sync.get(WC_KEY);
  return (r[WC_KEY] as WCity) ?? null;
}
async function setWCity(c: WCity) {
  await chrome.storage.sync.set({ [WC_KEY]: c });
}
function loadWCache(): WCache | null {
  try {
    const raw = localStorage.getItem(WX_CACHE);
    return raw ? (JSON.parse(raw) as WCache) : null;
  } catch {
    return null;
  }
}
function saveWCache(c: WCache) {
  try {
    localStorage.setItem(WX_CACHE, JSON.stringify(c));
  } catch {}
}
function fmtWTime(ts: number) {
  const d = new Date(ts);
  return pad(d.getHours()) + ':' + pad(d.getMinutes());
}
function aqiLevel(v: number): { label: string; color: string } {
  if (v <= 50) return { label: '优', color: '#22c55e' };
  if (v <= 100) return { label: '良', color: '#eab308' };
  if (v <= 150) return { label: '轻度', color: '#f97316' };
  if (v <= 200) return { label: '中度', color: '#ef4444' };
  if (v <= 300) return { label: '重度', color: '#a855f7' };
  return { label: '严重', color: '#7f1d1d' };
}
function dailyWeekday(i: number): string {
  if (i === 0) return '今';
  if (i === 1) return '明';
  const d = new Date();
  d.setDate(d.getDate() + i);
  return '周' + ['日', '一', '二', '三', '四', '五', '六'][d.getDay()];
}
function renderWeather(c: WCache | null, error: boolean) {
  const cityEl = document.getElementById('weatherCity');
  const cityInputEl = document.getElementById('weatherCityInput') as HTMLInputElement | null;
  const iconEl = document.getElementById('weatherIcon');
  const tempEl = document.getElementById('weatherTemp');
  const descEl = document.getElementById('weatherDesc');
  const feelEl = document.getElementById('weatherFeel');
  const humEl = document.getElementById('weatherHum');
  const windEl = document.getElementById('weatherWind');
  const updEl = document.getElementById('weatherUpd');
  if (!c) {
    if (updEl) updEl.textContent = error ? '⚠ 获取失败 · 点刷新重试' : '加载中…';
    return;
  }
  const wmo = WMO[c.code] || { t: '未知', e: '🌡️' };
  if (cityEl) cityEl.textContent = c.city;
  if (cityInputEl && document.activeElement !== cityInputEl) cityInputEl.value = c.city;
  if (iconEl) iconEl.textContent = wmo.e;
  if (tempEl) tempEl.textContent = Math.round(c.temp) + '°';
  if (descEl) descEl.textContent = wmo.t;
  if (feelEl) feelEl.textContent = Math.round(c.feel) + '°';
  if (humEl) humEl.textContent = c.hum + '%';
  if (windEl) windEl.textContent = Math.round(c.wind) + ' km/h';
  if (updEl) updEl.textContent = (error ? '⚠ 更新失败 · ' : '') + fmtWTime(c.ts) + ' 更新';
  const aqiEl = document.getElementById('weatherAqi');
  if (aqiEl) {
    if (c.aqi) {
      const lv = aqiLevel(c.aqi.usAqi);
      aqiEl.textContent = `${Math.round(c.aqi.usAqi)} ${lv.label}`;
      aqiEl.style.color = lv.color;
      aqiEl.setAttribute('title', `PM2.5 ${Math.round(c.aqi.pm25)} · PM10 ${Math.round(c.aqi.pm10)}`);
    } else {
      aqiEl.textContent = '--';
      aqiEl.style.color = '';
    }
  }
  const dailyWrap = document.getElementById('weatherDaily');
  const gridEl = document.getElementById('weatherDailyGrid');
  if (dailyWrap && gridEl) {
    if (c.daily && c.daily.length) {
      gridEl.innerHTML = c.daily
        .map((d, i) => {
          const wmo = WMO[d.code] || { t: '', e: '🌡️' };
          return `<div class="weather-dcell"><span class="weather-dwd">${dailyWeekday(i)}</span><span class="weather-dicon">${wmo.e}</span><span class="weather-dtemp">${Math.round(d.tmax)}°/${Math.round(d.tmin)}°</span>${d.pop >= 30 ? `<span class="weather-dpop">${d.pop}%</span>` : ''}</div>`;
        })
        .join('');
      dailyWrap.style.display = '';
    } else {
      dailyWrap.style.display = 'none';
    }
  }
}
function cleanCityName(name: string): string {
  return name.replace(/市$/, '');
}
async function geocodeCity(name: string): Promise<WCity | null> {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1&language=zh`;
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), 10000);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) return null;
    const j = await res.json();
    const r = j?.results?.[0];
    if (!r) return null;
    return { name: cleanCityName(String(r.name)), lat: r.latitude, lon: r.longitude };
  } catch {
    return null;
  } finally {
    clearTimeout(to);
  }
}
async function refreshWeather() {
  if (wLoading) return;
  if (!document.getElementById('weatherTemp')) return;
  if (!wCity) return;
  const btn = document.getElementById('weatherRefresh');
  wLoading = true;
  btn?.classList.add('spin');
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${wCity.lat}&longitude=${wCity.lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&forecast_days=7&timezone=auto`;
    const aqiUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${wCity.lat}&longitude=${wCity.lon}&current=pm2_5,pm10,us_aqi&timezone=auto`;
    const [res, aRes] = await Promise.all([fetch(url), fetch(aqiUrl).catch(() => null)]);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const j = await res.json();
    const cur = j?.current;
    if (!cur) throw new Error('bad data');
    const daily: WDaily[] = (j?.daily?.time ?? []).map((_: string, i: number) => ({
      code: j.daily.weather_code[i],
      tmax: j.daily.temperature_2m_max[i],
      tmin: j.daily.temperature_2m_min[i],
      pop: j.daily.precipitation_probability_max[i] ?? 0,
    }));
    let aqi: WAqi | null = null;
    if (aRes && aRes.ok) {
      const aj = await aRes.json();
      const ac = aj?.current;
      if (ac && typeof ac.us_aqi === 'number') {
        aqi = { usAqi: ac.us_aqi, pm25: ac.pm2_5 ?? 0, pm10: ac.pm10 ?? 0 };
      }
    }
    const c: WCache = {
      temp: cur.temperature_2m,
      feel: cur.apparent_temperature,
      hum: cur.relative_humidity_2m,
      wind: cur.wind_speed_10m,
      code: cur.weather_code,
      ts: Date.now(),
      city: wCity.name,
      daily,
      aqi,
    };
    renderWeather(c, false);
    saveWCache(c);
  } catch {
    renderWeather(loadWCache(), true);
  } finally {
    wLoading = false;
    btn?.classList.remove('spin');
  }
}
function onWeatherVis() {
  if (document.visibilityState !== 'visible') return;
  const c = loadWCache();
  if (wCity && (!c || Date.now() - c.ts > 600000)) refreshWeather();
}
/** 浏览器定位 -> 反向地理编码取城市名，失败/拒绝/超时返回 null。坐标仅本地持有，分别发给 open-meteo 与 BigDataCloud。 */
function locateCity(): Promise<WCity | null> {
  return new Promise((resolve) => {
    if (!('geolocation' in navigator)) return resolve(null);
    let done = false;
    const finish = (v: WCity | null) => {
      if (!done) {
        done = true;
        resolve(v);
      }
    };
    const to = setTimeout(() => finish(null), 8000);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        clearTimeout(to);
        const { latitude, longitude } = pos.coords;
        const name = await revGeoName(latitude, longitude);
        finish({ name: name || '我的位置', lat: latitude, lon: longitude });
      },
      () => {
        clearTimeout(to);
        finish(null);
      },
      { timeout: 8000, maximumAge: 600000 },
    );
  });
}
async function revGeoName(lat: number, lon: number): Promise<string> {
  const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=zh`;
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) return '';
    const j = await res.json();
    return cleanCityName(String(j?.city || j?.locality || j?.principalSubdivision || ''));
  } catch {
    return '';
  } finally {
    clearTimeout(to);
  }
}
async function locateAndApply() {
  const btn = document.getElementById('weatherLocate');
  btn?.classList.add('spin');
  const c = await locateCity();
  btn?.classList.remove('spin');
  if (!c) {
    const upd = document.getElementById('weatherUpd');
    if (upd) upd.textContent = '⚠ 定位失败 · 点📍重试';
    return;
  }
  wCity = c;
  await setWCity(c);
  refreshWeather();
}
export async function initWeather() {
  wCity = await getWCity();
  renderWeather(loadWCache(), false);
  if (!wCity) {
    // 无已存城市：尝试定位，失败退回北京；定位期间先展示缓存，避免界面卡住
    wCity = (await locateCity()) ?? (await geocodeCity('北京'));
    if (wCity) await setWCity(wCity);
  }
  document.getElementById('weatherRefresh')?.addEventListener('click', refreshWeather);
  document.getElementById('weatherLocate')?.addEventListener('click', locateAndApply);
  const inputEl = document.getElementById('weatherCityInput') as HTMLInputElement | null;
  inputEl?.addEventListener('focus', () => inputEl.select());
  inputEl?.addEventListener('keydown', async (e) => {
    if ((e as KeyboardEvent).key !== 'Enter') return;
    const name = inputEl.value.trim();
    if (!name) return;
    const c = await geocodeCity(name);
    if (!c) {
      inputEl.classList.add('err');
      setTimeout(() => inputEl.classList.remove('err'), 600);
      return;
    }
    wCity = c;
    await setWCity(c);
    inputEl.value = c.name;
    inputEl.blur();
    refreshWeather();
  });
  if (wInited) return;
  wInited = true;
  refreshWeather();
  setInterval(refreshWeather, 600000);
  document.addEventListener('visibilitychange', onWeatherVis);
}

