# 参与贡献

本仓库是 DSH（DeepSeek Harness）客户端插件的 monorepo。`plugins/` 下每个目录是一个独立、可直接安装的 bundle，通过 git 分发，不发布到 npm。

## 环境

- Node.js >= 22（`engines.node` 已声明）
- pnpm 12（`packageManager` 已固定，`corepack enable` 或自行安装）
- 一个可用的 DSH 桌面版或 Web 版，用来做真实环境验证

```bash
pnpm install     # 建立 workspace 链接，目前没有第三方依赖
pnpm check       # 逐插件做语法检查，CI 跑同一命令
```

## 本地开发

1. 把插件目录装进 DSH：**Plugins → Add plugin** 选目录，或让 agent 用 `plugin_manager` 的 `install_bundle` 传绝对路径。
2. 安装后 profile 里是**目录链接**（`link:<绝对路径>`），所以改 `client.js` 不需要重新安装。
3. 生效方式：Client 侧改动刷新页面或重启桌面应用；Host 侧改动需要重启。

不要手动改 `$DSH_HOME/profiles/<profile>/` 里的 `package.json` 或 `cordis.patch.yml`，安装和卸载交给 Plugin Manager，否则 profile 会和仓库状态分叉。

## 插件结构

```
plugins/<name>/
├── package.json         # name / version / exports / dsh.bundle.patch / dsh.client
├── cordis.patch.yml     # 把插件行插进 composition（行 id 与包名同名）
├── index.js             # Host 半：服务、配置、Node 能力；纯 UI 插件只放空 apply
├── client.js            # Client 半：__ModuleLoader__ 产物，组件、样式、读写存储
├── locale/{zh,en}.json  # 插件列表的标题与描述（meta.title / meta.description）
├── icon.svg             # 插件图标（<= 256 KiB，SVG/PNG/JPEG/WebP）
├── docs/DETAIL.md       # 行为契约、几何/主题等坑、验证方法
└── README.md            # 用户视角的用法
```

几条容易踩的：

- **入口名不等于文件名**：`exports["."]` 和 `exports["./client"]` 指向哪里都行，改文件名时同步改 `exports`。
- **Host 半必需**：Client 半依附于 Loader 行，没有 Host 半就没有那条行。纯 UI 插件写 `export function apply() {}` 即可。
- **locale 必须是扁平键**（`"remember.title"`），中英键集合要一致。
- **不要 require `@deepseek-ai/dsh-client-ui-primitives`**：它随 DSH 版本变化，且抛错会让整个 slot 条目崩溃。需要控件就复制宿主 markup/CSS，类名加插件前缀，只保留 `--dsw-alias-*` token。

## 新增插件

复制 `plugins/dsh-ui-configure` 作为起点，然后：

1. 改 `package.json` 的 `name`、`version`、`description`、`repository.directory`；
2. 改 `cordis.patch.yml` 的行 `id` 与 `name`，与包名一致；
3. 改 `locale/*.json` 的标题与描述、`icon.svg`；
4. 重写 `client.js` 的 `NS`、存储键前缀，避免与其他插件撞 key；
5. `pnpm install` 建立链接，装进 DSH 验证；
6. 更新根 `README.md` 的插件表格。

## 检查与 CI

- 每个插件在 `package.json` 里提供 `scripts.check`；根 `check` 是 `pnpm -r --if-present run check`。
- `.github/workflows/check.yml` 在 push 和 PR 上跑 `pnpm install --frozen-lockfile && pnpm check`。
- CI 只覆盖语法与 manifest 结构。**UI 正确性要在应用里看**：slot 是否出现、文案是否显示为 key、明暗主题下控件是否可读、卸载时有没有残留 listener。看不到界面时请在 PR 里写明“未在应用内验证”。

## 提交规范

Conventional Commits，subject 用英文，一行说清改了什么：

```
fix(dsh-ui-configure): show the selected position mode as an underline
docs: add contribution and agent conventions
```

正文写“为什么”，尤其是踩坑后的修正（例：`label-primary` 是文字色，不能当背景）。一个提交只做一件事。

## 发布

没有发布流程：打 tag 或直接在 `main` 上迭代即可。使用者通过 git clone + 安装插件目录获取更新；Hook 到 Plugin Manager 的升级流程不在本仓库范围内。

## 排查

| 现象 | 常见原因 |
| --- | --- |
| 设置里出现原始 key | locale 写成了嵌套对象，或中英键集合不一致 |
| 插件行出现但界面没变化 | `exports["./client"]` 路径错，或 `dsh.client` 缺失 |
| slot 条目崩溃 | `factory` 里有副作用，或 `require` 了非基线模块 |
| 安装后 profile 指向旧路径 | 目录被移动/重命名，重新 `install_bundle` |
