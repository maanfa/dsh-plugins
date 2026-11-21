# dsh-ui-configure

在 **设置** 里增加「界面配置」一栏：让 DSH 桌面应用记住并恢复窗口的大小，以及记住位置或每次启动居中。

## 功能

- **记住窗口尺寸**：打开后，调整后的窗口大小写入本机浏览器存储，下次启动桌面应用时按记录恢复。
- **窗口位置**：三选一
  - 记住位置：停止拖动后记录窗口停靠点，启动时回到原处；记录点不在任何屏幕内时（比如换了显示器）自动改为居中。
  - 启动居中：每次启动都把窗口摆到当前屏幕工作区中央。
  - 不记录：位置交给系统，只恢复尺寸。
- **记录的窗口尺寸**：显示当前记录，可一键清除（同时清掉位置记录）。
- 窗口最大化时既不写尺寸也不写位置，避免下次启动被放大到全屏。

## 生效范围

桌面应用（`dshDesktop` 载体）内生效。纯 Web 页面无法调整窗口，设置项会显示说明并禁用。

## 实现

- Client 半：注册 `settings.section`（id `ui-configure`），组件自带开关与「窗口位置」三选一控件样式，读写 `localStorage`：
  - `dsh-ui-configure.enabled`（`1` / `0`）
  - `dsh-ui-configure.size`（`{"width":1100,"height":760}`）
  - `dsh-ui-configure.position`（`remember` / `center` / `off`，缺省 `remember`）
  - `dsh-ui-configure.point`（`{"x":500,"y":350}`）
- 启动时若开关打开，先恢复位置再恢复尺寸；`resize` 事件防抖 400ms 后记录尺寸，位置由 800ms 轮询记录（DOM 没有窗口拖动事件）。
- 恢复期间（700ms）暂停记录，避免把恢复过程中的中间帧写回去。

## 两个窗口几何坑（Windows，Electron 官方窗口）

1. **尺寸**：`titleBarStyle: "hidden"` + `titleBarOverlay` 的窗口有一圈不可见 resize 边框，`outerWidth` 比窗口 bounds 宽 14px，而 `resizeTo()` 按内容盒解释。记录 `outerWidth/outerHeight` 会让窗口每次启动胖一圈，所以记录 `innerWidth/innerHeight`。
2. **位置**：`moveTo(x, y)` 会把窗口内容盒撑大一圈，`resizeTo()` 又会把窗口左移半个边框，所以恢复位置时传给 `moveTo` 的 x 要加上 `2 * floor(边框宽 / 2)`，并在移动后再调用一次 `resizeTo` 把尺寸修回去。

两处都已在本机真实 Electron 窗口（含桌面端同款窗口参数）上连续启动验证：尺寸与位置完全复现、无累积漂移。

## 限制

- 只作用于主窗口，多窗口/平台视图不在范围内。
- 依赖渲染进程的 `window.resizeTo()` / `window.moveTo()`（桌面主进程没有几何持久化 IPC）。边框补偿系数按运行时 `outerWidth - innerWidth` 推算，macOS 上边框为 0 时补偿为 0。

## 本地化注意

`ctx.locale.register(ns, { zh, en })` 的字典是**扁平映射**，键就是传给 `t()` 的带点字符串（`'remember.title'`），内置字典也这么写（见 `@deepseek-ai/dsh-client-locale/src/locales/zh.ts`）。写成嵌套对象 `{ remember: { title } }` 时，单层键（`nav`）能查到，带点的键查不到并原地显示键名——这就是 0.2.0 在设置里出现 `remember.title` 的原因。0.2.1 起改为扁平键。

## 主题与选中态

三选一控件用**下划线**表示选中（文字 `label-primary` + 2px `brand-primary` 下划线），不给选中项铺底色。0.2.0/0.2.1 用的是「底色药丸」：`background: var(--dsw-alias-label-primary)`，但 `label-primary` 是**文字色**（浅色主题下接近黑），配 `label-inverted` 的兜底深色文字就变成黑底黑字，选中项直接看不清。教训：主题 token 只按语义用——背景用 `fill-*`，文字用 `label-*`，强调线用 `brand-*`；跨主题的选中态优先用下划线/描边而不是填充。


