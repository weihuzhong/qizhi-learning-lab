# PPTMaster 网页自动制作：实现与上线状态

## 已实现

- 网页端提交整稿任务、后台进度、停止任务、逐页预览、直接下载完整可编辑PPTX。
- 访客不需要安装插件、提供API密钥或登录维护者账号。生成任务通过独立访客会话隔离，文件读取有访问检查。
- Netlify保存队列、进度与交付文件；DeepSeek密钥继续留在Netlify。后台执行器以短时签名认证请求模型代理，浏览器与Python工具均拿不到模型密钥。
- 后台工具执行器让DeepSeek读取并运行真实 `pn1024/dsh-ppt-master` 包，版本6.1.0，固定上游提交 `3c956467cd053fec36816cb7d2ca973729a5d4d1`。不依赖访客电脑中的DeepSeek Harness桌面界面。
- 用户点击“直接生成整份PPT”即明确选择自动决定方案、跳过逐步策略确认，按PPTMaster Quick Generate路由运行。模型逐页编写SVG，实际调用原始Python完整性检查、质量检查、备注与原生PPTX导出工具。
- 交付必须满足实际PPTX页数、SVG页数与请求一致；每页有备注。未通过检查不会显示成功。任务的原始工具调用记录一并交付。
- 预览只读取任务内资源，并使用PPTMaster自己的图标解析辅助函数。不调用会修改作者SVG的`finalize_svg.py`，不改变已通过检查的源文件。已修复CairoSVG默认安全加载器不读取相对图片、以及`data-icon`无法直接渲染的问题。

## 真实验证

两次通过现有Netlify模型代理调用DeepSeek、真实运行PPTMaster，分别导出8页可编辑PPTX。第二次耗时约330秒，8页均有教师备注，PPTMaster整稿报告为0错误、0警告。全页预览已检查，照片与项目图标加载已修复验证。

代码检查：21项JavaScript测试、3项Python预览测试通过；构建通过。测试覆盖签名、访客隔离、取消任务、缺文件与页数不符拒绝交付、模型密钥保留在服务器、相对图片可见与外部文件读取拒绝。

## 尚未上线的部分

已按用户授权创建Railway项目`qizhi-pptmaster`与执行服务`pptmaster-executor`，配置1 vCPU、0.5GB内存及空闲休眠，未升级付费套餐。CLI登录已完成，但实际上传被Railway拒绝：`We limited this workspace after detecting unusual activity. Upgrade to a paid plan to lift this restriction automatically.` 初次上传返回HTTP 500，记录部署`cfab9f55-b280-47d1-b2ed-4546cb7471ae`为FAILED，构建日志为空。已停止部署重试；未升级付费，也未尝试绕过工作区限制。因此：

- `server/ppt-config.js`中的后台URL仍为空。
- `worker/ppt-online-config.js`的启用开关仍为false。
- 正式网站尚未切换到所有访客可直接生成的自动入口。
- 临时测试进程仅用于真实验证，不能作为公开评审的持续后台。

## 已授权的上线配置

Railway项目`8772b7a5-a9e0-4b46-9f28-f26d9ec99023`，执行服务`76dedfbe-4d05-44e1-aa84-514f1a358f0b`：

- 源码目录：`pptmaster-service/`，使用所附Dockerfile。
- 资源上限：1 vCPU、0.5GB内存，开启空闲休眠。
- 不创建数据库、存储卷或付费附加服务；保持试用/免费套餐，不升级付费。
- 执行器在启动时自行生成RSA签名私钥，只保存在服务内存；不上传本地私钥，不复制DeepSeek密钥。Netlify只通过固定HTTPS后台地址读取公钥并核验签名；模型仍通过现有Netlify后端调用。
- 在服务成功部署、健康检查通过后，写入实际后台地址，启用网页入口，再做公开访客的生成与下载验收。

免费资源额度有限，耗尽时服务可能暂停，不能宣传无限免费或永久在线。模型调用仍使用作品维护者已有的DeepSeek额度。

## 免费替代部署：Render（尚未连接）

仓库根目录已提供`render.yaml`，明确`plan: free`，只创建一个Docker Web Service；不创建数据库、磁盘或付费附加服务。后台使用同一份真实PPTMaster执行器。

[打开免费部署配置](https://render.com/deploy?repo=https://github.com/weihuzhong/qizhi-learning-lab)

1. 连接Render账号后，读取已有服务，避免重复创建。
2. 使用`render.yaml`部署，保持Free计算方案。服务根目录为`pptmaster-service`，Dockerfile与构建上下文相对此目录；环境变量只有公开网站地址、端口与运行模式。
3. 等待部署成功，检查实际HTTPS地址`/health`：需包含固定PPTMaster上游提交、完整性通过标志及服务自行生成的RSA公钥。
4. 将已验证的固定HTTPS地址写入`server/ppt-config.js`，启用`worker/ppt-online-config.js`，同步更新前端手动交接文案和状态接口。
5. 通过新的公开访客会话实际生成整份课件，核验页数、全部预览、教师备注、下载与访客隔离，再宣布上线。

限制：Render免费Web服务闲置15分钟后休眠，唤醒约1分钟；每工作区每月750小时，另有带宽和构建额度。Render说明免费方案适合测试及个人项目，不提供生产稳定性承诺。模型调用仍消耗维护者的DeepSeek额度。没有绑卡时超过带宽或构建额度会暂停服务或新构建；如账号已有付款方式，应在部署前核查支出上限。

官方资料：
- https://render.com/docs/free
- https://render.com/docs/blueprint-spec
- https://render.com/docs/monorepo-support
- https://docs.railway.com/platform/trust-and-safety
