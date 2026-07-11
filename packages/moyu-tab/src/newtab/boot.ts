// 在 <head> 中加载（早于 body 渲染）。MV3 CSP 禁止内联脚本，故用此外部脚本判定锁屏态。
// 必须在首帧前给 <html> 加上 locked 类，否则锁屏刷新会先闪现侧边栏、或丢失锁屏态。
if (localStorage.getItem('moyu_locked') === '1') {
  document.documentElement.classList.add('locked');
}
