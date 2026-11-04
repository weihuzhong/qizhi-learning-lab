# PPTMaster 制作流程与当前接入状态

## 当前实际可用的流程

版本 `studio-3.1.0` 使用 **手动交接**，没有连接远程 PPTMaster 执行服务：

1. 网站“制作 PPT”填写整稿页数、视觉偏好，生成含当前完整教案的 Markdown 任务。
2. 用户在自己的 DeepSeek Harness 中粘贴/上传任务，实际调用已安装的 `ppt-master`。
3. 按该 skill 的设计方案确认、生成、检查和导出流程完成整份 PPTX。
4. 将原始 PPTX 导入网站。网站核对播放顺序中的实际页面与任务页数是否一致，展示逐页文字概览。
5. 原文件保存在当前浏览器 IndexedDB，可重新下载；不通过旧引擎重新排版。

此处的文件检查只验证结构与页数，**不验证 PPTMaster 调用来源、美观或教学正确性**。需在 PowerPoint 或 Harness 的整稿预览中检查实际版式。清除浏览器数据、切换设备后需重新导入原文件；原文件不进入账号云端快照或团队共享。

## 已停用的路径

- 网站不再加载 `ai-deck-client.js` 作为课件入口。
- `/api/deck/plan`、`/api/deck/slide` 及旧 `/api/deck/*` 返回 410，并明确说明手动交接。
- 所有旧 PPT 导出按钮引导至同一个 PPTMaster 入口，不能继续导出旧引擎成稿。
- 历史 AI scene 数据保留，相关结构校验器仍供云端旧快照读取使用。
- 教案生成、Word、对话、账号、团队与排课流程保留。

现有逐页生成路径会在任意一页请求/校验失败时停止，因此可能留下仅一页的进度；尚未取得此次用户失败记录，不能确定这就是该次故障原因。新流程不会将单页文件标为要求多页的整稿完成。

## 为什么现有 API Key 不会执行本机 skill

`pn1024/dsh-ppt-master` 是 DeepSeek Harness 的 skill provider，包含流程文档、Python 工具与资源；不是 DeepSeek Chat Completions 的模型参数。仅配置 Netlify 的 `LLM_API_KEY` 或在系统提示中写“使用 PPTMaster”，不会执行 Python 或读取用户电脑里已安装的 skill。

上游检查版本：`6.1.0`，提交 `3c956467cd053fec36816cb7d2ca973729a5d4d1`。本仓库不拷贝或改名模拟该 skill。

## 网页全自动制作仍待完成

要使评委不安装任何工具、在网站直接制作 PPT，需要部署可从公网网站调用的 **DeepSeek Harness + PPTMaster + Python 执行环境**，支持异步任务、设计确认、失败续作、完整文件交付。当前 Netlify Node 函数不具备这些执行能力。本机安装不能自动提供公网服务。

执行环境未连接、真实调用未验证前，`/api/status` 始终明确返回 `presentation.mode: manual-handoff`、`automaticExecution: false`。不应将此版本描述为“已完成网站全自动 PPTMaster 接入”，也不能保证评委能在网页直接生成 PPT。若运行在个人电脑，电脑离线时任务不能执行，因此不满足稳定公开评审的要求。

上游：
- https://github.com/pn1024/dsh-ppt-master
- https://github.com/deepseek-ai/deepseek-harness
