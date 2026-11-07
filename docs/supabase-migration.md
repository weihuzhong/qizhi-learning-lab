# 启知未来后端迁移

Render 负责网站 API 和 PPTMaster 执行，Supabase 保存 JSON 记录和私有文件。应用继续验证自己的会话和教研组成员权限。数据库与文件桶只供服务端使用。已部署的网关默认读取旧库，只有完成导入核验并设置 `QIZHI_DATA_BACKEND=supabase` 后才会使用新库。

## 导入旧数据

1. 在 Supabase 项目应用 `supabase/migrations/20261107095509_qizhi_private_storage.sql`。已应用过的项目可跳过。
2. 在有权限的电脑上检出本分支，用 Node.js 22 或更新版本运行 `npm ci`。在项目根目录建立本机文件 `.env.migration`，添加以下变量。通过各平台后台获取值，保存到本机安全位置。

   | 变量 | 来源 |
   | --- | --- |
   | `NETLIFY_SITE_ID` | Netlify 项目设置里的 Project ID |
   | `NETLIFY_AUTH_TOKEN` | 有权读取该项目 Blobs 的 Netlify 访问令牌 |
   | `SUPABASE_URL` | 目标 Supabase 项目的 Project URL |
   | `SUPABASE_SECRET_KEY` | 目标 Supabase 项目的服务端 Secret key |

3. 检查源库读取权限。命令只显示各类记录的数量。

   ```sh
   node --env-file=.env.migration scripts/migrate-netlify.mjs --inspect
   ```

4. 待现有 PPT 任务结束后，在停写窗口执行导入。正式 Render 网关可先部署本分支并设置 `QIZHI_MIGRATION_READ_ONLY=1`，同时暂停使用旧 Netlify 站点。导入前后会核对源记录清单，并逐条核对目标记录和原件的字节。只有全部一致才写入切换标记。

   ```sh
   node --env-file=.env.migration scripts/migrate-netlify.mjs --copy
   ```

   同一快照的部分导入可重试。若新旧同名记录的内容已不同，脚本会停止。保留两边的数据，检查差异后再继续。

## 切换正式服务

1. 在 Render 网站服务的 Environment 设置 `SUPABASE_URL`、`SUPABASE_SECRET_KEY` 和 `USER_MODEL_VAULT_SECRET`。保留原个人 DeepSeek 绑定需要使用旧 Netlify 部署实际使用的保险箱密钥（`USER_MODEL_VAULT_SECRET`，或旧部署用于兼容的 `LLM_API_KEY`）。在目标项目中有已绑定的账号时，先用实际账号验证该配置。找不到旧保险箱密钥时，需先安排用户重新绑定。
2. 设 `QIZHI_DATA_BACKEND=supabase`，先维持停写并重新部署 Render 网站。检查 `/healthz` 和 `/api/status`，确认正式 API 能从新库读取现有账号、教案和教研组。
3. 将 PPTMaster 服务的 `QIZHI_ORIGIN` 设为 `https://qizhi-learning-lab.onrender.com` 并重新部署。等待服务通过健康检查，再移除网站的停写配置并部署。
4. 验证登录、教案同步、共享原件上传与下载、删除权限、模型测试，以及 PPT 任务生成、预览和下载。网站开始接收新写入后，以新库为准。回退前先同步新增的数据。

导入结束后撤销本次使用的临时 Netlify 令牌，并清理本机迁移配置。
