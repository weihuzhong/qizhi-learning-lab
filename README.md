# 启知未来教育智能体

面向青年教师与大学生支教团队的备课工具，支持 AI 对话、教案生成、Word 与可编辑 PPT 导出。当前用户数据保存在浏览器；团队通过备课包交换内容。

## 开发与发布

- 运行环境：Node.js 22 或更高版本。
- 构建：`npm run build`，静态资源输出至 `public`。
- 后端：`netlify/functions/api.mjs`，提供 `/api/status`、`/api/chat`、`/api/lesson`。
- Netlify 构建命令：`npm run build`，发布目录：`public`，生产分支：`main`。
- 使用现有 Netlify 项目连接本仓库；不要新建站点，以保留原网址和变量。
- 获授权协作者修改代码并推送至 main 后，Netlify 自动构建发布；仅保存本地文件不会发布。

## 服务端配置

在 Netlify 后台设置 `LLM_API_KEY` 为 Secret，作用范围包含 Functions，生产环境为 Production。
当前适配默认地址 https://api.deepseek.com，默认模型 deepseek-flash。可通过服务端变量 LLM_BASE_URL、LLM_MODEL 调整。
密钥不得提交到仓库、前端代码或聊天中。环境变量更新后需要新部署。

## 发布验证

检查无登录访问、真实对话、教案生成、Word 和 PPT 导出，并从评审常用网络测试。教案可能因模型响应或结构校验失败而需要重试。
免费托管具有额度限制，请在评审前确认余量。
