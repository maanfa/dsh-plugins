# dsh-plugins

DeepSeek Harness（DSH）客户端插件 monorepo。每个插件是 `plugins/` 下的一个 pnpm workspace 包，目录本身就是可安装的 bundle。

## 插件

| 包 | 说明 |
| --- | --- |
| [`dsh-ui-configure`](plugins/dsh-ui-configure) | 设置里增加「界面配置」：记住桌面窗口的尺寸与位置，或每次启动居中 |

## 开发

```bash
pnpm install          # 建立 workspace 链接（本仓库目前无第三方依赖）
pnpm check            # 对各插件的 client.js / index.js 做语法检查
```

插件无需构建：`client.js` 直接以 `__ModuleLoader__` 格式书写，装进 DSH 后由浏览器模块表加载。改完代码无需重新安装（profile 里是目录链接），重启桌面应用或刷新页面即可生效。

## 安装到 DSH

插件以本地目录形式安装，二选一：

1. **在 DSH 里装**：克隆本仓库后，打开 **Plugins → Add plugin**，选择对应插件目录（例如 `plugins/dsh-ui-configure`）。
2. **让 agent 装**：在会话里让 agent 用 `plugin_manager` 的 `install_bundle`，`target` 传插件目录的绝对路径。

安装写入当前 profile（`$DSH_HOME/profiles/<profile>/`），对该 profile 的所有会话生效；Client 侧改动需要重启桌面应用或刷新页面。

## 目录约定

```
plugins/<name>/
├── package.json        # name / exports / check 脚本 / dsh 字段（bundle patch、client 平台与注入）
├── cordis.patch.yml    # 把插件行插进 composition
├── index.js            # Host 半（纯 UI 插件为空 apply）
├── client.js           # Client 半，浏览器包
├── locale/{zh,en}.json # 插件列表里的标题与描述
├── icon.svg            # 插件图标
├── docs/DETAIL.md      # 实现细节与踩坑记录
└── README.md           # 插件自身说明
```

新增插件时复制一个现有目录，改 `package.json` 的 `name`、`cordis.patch.yml` 的行 id、`locale/*.json` 的标题，`pnpm install` 后即可安装。

## License

MIT
