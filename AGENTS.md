# AGENTS.md

给在本仓库里改代码的模型/代理的约定。人读的流程在 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 这个仓库是什么

DSH（DeepSeek Harness）客户端插件的 monorepo。`plugins/<name>/` 是一个 pnpm workspace 包，**目录本身就是可安装的 bundle**：DSH 的 Plugin Manager 直接装这个目录，不走 npm 发布。

改代码前先读 `plugins/<name>/` 下的 `package.json`、`cordis.patch.yml`、`client.js`、`docs/DETAIL.md`；不要凭目录名猜实现。

## 硬约束（违反会装不上或运行时崩）

1. **入口只由 `exports` 决定**，文件名随意：
   - `"."` → Host 半（Cordis 插件模块）
   - `"./client"` → Client 半（浏览器产物）
   - `"./locale/*.json"`、`"./icon"` → 插件列表的标题/描述/图标
2. **Host 半必须有**，哪怕纯 UI 插件。Client 半是被“Loader 行 + `dsh.client`”发现的，没有 Host 半就没有那条行。空实现就是 `export function apply() {}`。
3. `dsh.client` 里 `platform: "web"` 是唯一必填字段；`inject` 只决定客户端激活顺序，**不是依赖注入**，不要依赖它拿服务。
4. `client.js` 必须是 `window.__ModuleLoader__.load({ id: "<包名>", factory(require) { ... } })`，`id` 与包名逐字一致，`factory` 返回 `{ inject, apply }`，且 `factory` 本身无副作用（注册 listener/timer/style 一律放 `apply` 里，用 `ctx.effect`/`ctx.on` 并返回清理函数）。
5. **只能 `require` 浏览器模块表里的模块**：`react`、`react/jsx-runtime`、`react-dom`、`react-dom/client`、`@deepseek-ai/cordis`、`zod`、`@tanstack/react-virtual`、`@deepseek-ai/dsh-client-store`、`@deepseek-ai/dsh-client-ui-slots`、`@deepseek-ai/dsh-client-ui-primitives`（后者只许 `inject` 排序，**禁止 require**，会随版本变化且抛错会清空整个 slot）。需要控件就抄宿主 markup/CSS，类名换成插件前缀。
6. **locale 字典是扁平带点键**：`{"remember.title": "…"}`，不是嵌套对象。`zh` / `en` 键集合必须完全一致，否则中文界面会露出 key。插值用 `t('k', { width })` 对应 `"宽 {width}"`。
7. **主题只用 `--dsw-alias-*` token**：底色用 `fill-*`，文字用 `label-*`，强调用 `brand-*`。跨主题的选中态优先下划线/描边，不要用文字色当底色（会黑底黑字）。
8. **不要碰 profile**：不写 `$DSH_HOME`、不改 profile 的 `package.json`/`cordis.patch.yml`、不在 profile 里跑 pnpm。安装/卸载只用 `plugin_manager` 或让用户在 **Plugins → Add plugin** 里装目录。

## 改代码时的流程

1. 先读再改；改 user-visible 行为时同步更新 `docs/DETAIL.md`（行为契约、坑）和插件 `README.md`（用户视角），不要只改代码。
2. 语法检查：`pnpm check`（等价于 `node --check client.js && node --check index.js`）。CI 跑同一命令。
3. 版本：`package.json` 的 `version` 用 semver，行为修复 +0.0.1，新能力 +0.1.0；同一个 commit 里别混两件事。
4. 提交信息用 Conventional Commits（`fix(dsh-ui-configure): …`、`feat(…)`、`docs(…)`、`ci(…)`），**subject 用英文**，body 写 why 而不是 what。
5. 不要在 `client.js` 里新增运行时依赖；确实需要（如打包进来的 Vue/日期库）时说明体积代价，并接受它不再是无构建插件。
6. 不提交 `node_modules/`、临时测试目录、`pnpm-lock.yaml` 之外生成的产物。

## 验证要求

- CI 只保证语法和 manifest 结构，不保证 UI 正确。
- 有机会看到应用时：重启桌面应用（或刷新页面），确认新 slot 出现、文案不是 key、明暗主题都正常。
- 看不到 UI 时必须明说“未在应用内验证”，不要用“安装成功/CI 绿”冒充界面正确。

## 新增插件

复制 `plugins/dsh-ui-configure`，改 `package.json` 的 `name`、`cordis.patch.yml` 的行 `id`、`locale/*.json` 的标题，跑 `pnpm install` 建立 workspace 链接，再装进 DSH 验证。
