# dsh-ui-configure

给 DSH 桌面应用的设置加一个「界面配置」分区：记住窗口大小、记住窗口位置，或每次启动居中。

## 功能

- **记住窗口尺寸**：调整窗口后自动记录，下次启动桌面应用时按记录恢复。
- **窗口位置**
  - 记住位置：松开拖动后记录停靠点，启动时回到原处；记录点已不在任何屏幕内时自动改为居中。
  - 启动居中：每次启动把窗口摆到当前屏幕工作区正中。
  - 不记录：位置交给系统，只恢复尺寸。
- **记录的窗口尺寸**：显示当前记录（如 `1100 × 760`），可一键清除。
- 窗口最大化时既不写尺寸也不写位置，避免下次启动被放大到全屏。

只在桌面应用（`dshDesktop` 载体）内生效；纯 Web 页面会显示说明并禁用设置项。

## 安装

```bash
git clone https://github.com/maanfa/dsh-plugins.git
```

然后在 DSH 里 **Plugins → Add plugin** 选择 `plugins/dsh-ui-configure`，或让 agent 用 `plugin_manager` 的 `install_bundle` 指向该目录。装好后重启桌面应用。

## 存储

全部写在渲染进程的 `localStorage`，不落 Host 配置：

| 键 | 值 |
| --- | --- |
| `dsh-ui-configure.enabled` | `1` / `0` |
| `dsh-ui-configure.size` | `{"width":1100,"height":760}` |
| `dsh-ui-configure.position` | `remember` / `center` / `off`（缺省 `remember`） |
| `dsh-ui-configure.point` | `{"x":500,"y":350}` |

## 实现要点

- Client 半注册 `settings.section`（id `ui-configure`，order 60），组件自带样式，不依赖内部 primitives 包。
- 启动时先恢复位置再恢复尺寸；`resize` 防抖 400ms 记录尺寸，位置靠 800ms 轮询记录（DOM 没有窗口拖动事件）。恢复后的 700ms 内暂停记录，避免写回中间帧。
- 桌面主进程没有窗口几何的持久化 IPC，因此全部走渲染进程的 `window.resizeTo()` / `window.moveTo()`。

## 两个窗口几何坑（Windows）

1. **尺寸**：`titleBarStyle: "hidden"` + `titleBarOverlay` 的窗口有一圈不可见 resize 边框，`outerWidth` 比 bounds 宽 14px，而 `resizeTo()` 按内容盒解释。记录 `outerWidth/outerHeight` 会让窗口每次启动胖一圈，所以记录 `innerWidth/innerHeight`。
2. **位置**：`moveTo(x, y)` 会把内容盒撑大一圈，紧接着的 `resizeTo()` 又把窗口左移半个边框。恢复位置时传给 `moveTo` 的 x 要加 `2 * floor(边框宽 / 2)`，移动后再补一次 `resizeTo` 修正尺寸。

## 本地化注意

DSH 的 locale 字典是**扁平表**，键就是传给 `t()` 的带点字符串（`'remember.title'`）。写成嵌套对象时单层键能命中、带点键全部落空并原样显示键名。详见 [`docs/DETAIL.md`](docs/DETAIL.md)。

## License

MIT
