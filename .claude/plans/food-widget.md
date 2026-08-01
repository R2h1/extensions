# 闲页「今天吃什么」卡片

## 目标
在闲页(moyu-tab)新增「今天吃什么」卡片。参考 qoom(home.qoom.cn)样式:**闲页卡片框架 + 蓝色渐变内容区 + 橙色菜名 + 白色「换一个」胶囊按钮**。点击「换一个」时,多个候选菜名在蓝色背景上动态随机位置闪现飘动,最终收敛定格成一个居中结果。

## 设计决策(已与用户确认)
- **外观**:闲页 `.widget-card` 框架 + 顶部线性 SVG 标题(符合卡片标题图标规范),内容区为 qoom 标志性蓝色渐变块 `linear-gradient(135deg,#4996EE,#63CDF5)`。
- **动画**(用户原话:"所有菜名在卡片背景上动态随机位置变换"):点击「换一个」→ 在蓝色内容区生成 8 个候选菜名 span,各自随机位置/字号/角度,每 ~80ms 重新随机位置 + 换文字,持续 ~900ms → 清除飘动元素 → 最终菜名居中淡入弹现。
- **数据**:内置 ~100 道中餐菜品数组,纯随机抽取。当前结果存 localStorage,刷新后保持上次结果。
- **分类**:新增「生活」一级分类(`ICONS.life` 已预留但 CAT_TREE 未用),下挂 `food` 子类。**新增 widget 不 bump WV**(不改变已有 widget 归属,无需迁移);老用户在「添加组件」弹窗手动开启,新用户首次默认开启。

## 改动文件(4 个)

### 1. [config.ts](packages/moyu-tab/src/newtab/config.ts)
- `CAT_TREE` 末尾增加生活分类:
  ```ts
  { id: 'life', name: '生活', icon: ICONS.life, subs: [{ id: 'food', name: '今天吃什么' }] }
  ```
- `ALL_WIDGETS` 增加:
  ```ts
  { id: 'food', name: '今天吃什么', desc: '随机推荐一道菜', cat: 'life', sub: 'food' }
  ```

### 2. [widgets/food.ts](packages/moyu-tab/src/newtab/widgets/food.ts) (新建)
- `FOODS: string[]` — ~100 道中餐(红烧肉/宫保鸡丁/鱼香肉丝/麻婆豆腐/番茄炒蛋/酸辣土豆丝/红烧鱼头/蛋饺/米苔目/兰州拉面/黄焖鸡米饭/螺蛳粉/麻辣烫/火锅/烤肉/寿司/披萨/炸鸡/炒饭/饺子/馄饨/小笼包/煎饼果子/肉夹馍/凉皮/羊肉泡馍/过桥米线/重庆小面/热干面/北京烤鸭/东坡肉/水煮鱼/回锅肉/糖醋排骨/清蒸鲈鱼/白切鸡/梅菜扣肉/地三鲜/锅包肉/酸菜鱼/毛血旺/辣子鸡/干锅肥肠/咖喱鸡/韩式拌饭/日式拉面/石锅拌饭/冷面/章鱼小丸子/牛排/意面/罗宋汤/凯撒沙拉/墨西哥卷饼/羊肉串/烤鸡翅/烤茄子/铁板鱿鱼/臭豆腐/糖葫芦/锅贴/烧卖/叉烧包/菠萝包/蛋挞/双皮奶/杨枝甘露/芋圆烧仙草/冰粉/绿豆汤/豆腐花/肠粉/虾饺/凤爪/烧鹅/叉烧/豉汁蒸排骨/云吞面/牛杂/萝卜牛腩/咖喱鱼蛋/鸡蛋仔/钵仔糕 … 实现时补全到 ~100)
- `renderFoodCard()` 返回:
  ```html
  <div class="widget-card food-card">
    <div class="food-title"><svg ...餐具图标.../>今天吃什么</div>
    <div class="food-stage" id="foodStage">
      <div class="food-name" id="foodName">红烧鱼头</div>
      <button class="food-swap" id="foodSwap">换一个</button>
    </div>
  </div>
  ```
- `initFood()`:
  - 读 localStorage `moyu_food_last`,有则显示,无则随机一个并写入。
  - 绑定 `#foodSwap` 点击 → `spin()`:
    1. 隐藏 `#foodName`
    2. 在 `#foodStage` 生成 8 个 `.food-floater`(绝对定位,随机 left 5%~85% / top 10%~70% / 字号 14~22px / 旋转 -15°~15°,白色半透明)
    3. `setInterval(80ms)`:每个 floater 重新随机位置 + 随机菜品文字
    4. 900ms 后 `clearInterval`,移除所有 floater,`#foodName` 设为最终随机菜名,加 `.pop` 类做淡入弹现,写入 localStorage
  - 动画期间禁用按钮(防连点)。

### 3. [newtab.ts](packages/moyu-tab/src/newtab/newtab.ts)
- 顶部 import:`import { initFood, renderFoodCard } from './widgets/food';`
- `getCard()`(L273 附近)加:`if (w.id === 'food') return renderFoodCard();`
- `initW()` switch(L295 附近)加:`case 'food': initFood(); break;`
- 不改 `WV`(=8),不加迁移。

### 4. [newtab.html](packages/moyu-tab/src/newtab/newtab.html) 内联 `<style>`
- `.food-card{padding:12px 14px}`
- `.food-title` 同 `.market-title`(14px/600/flex/align-items:center/gap:6px,svg 16×16 stroke,currentColor)
- `.food-stage`:蓝色渐变 `linear-gradient(135deg,#4996EE,#63CDF5)`,圆角 `var(--radius)`,高 160px,position relative,overflow hidden,flex 居中(column)
- `.food-name`:26px/700,橙色 `#E6A23C`,居中,transition opacity/transform;`.food-name.pop{animation:foodPop .4s}`
- `@keyframes foodPop{from{opacity:0;transform:scale(.6)}to{opacity:1;transform:scale(1)}}`
- `.food-swap`:白底胶囊 `background:#fff`,圆角 40px,padding 8px 22px,字号 14px,色 `#4996EE`,`box-shadow:0 2px 6px rgba(96,196,246,.5)`(**外阴影,非内凹**);`:active{transform:scale(.95)}`
- `.food-floater`:绝对定位,`color:rgba(255,255,255,.7)`,`transition:left .25s ease,top .25s ease,transform .25s ease`,pointer-events none,white-space nowrap

## 标题图标(线性 SVG,lucide utensils)
```html
<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h0a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>
```

## 构建与测试
- `npm run build:moyu`(或 `cd packages/moyu-tab && npm run build`)
- 加载 `packages/moyu-tab/dist` 为已解压扩展,新标签页「添加组件」→「生活」开启「今天吃什么」。

## 注意
- 按钮用外阴影不凹陷(规范);标题用线性 SVG 不用 emoji(规范)。
- 老用户需手动开启;新用户默认开启。
- `getCard` 是 if 链、`initW` 是 switch,按现有模式加分支即可。
