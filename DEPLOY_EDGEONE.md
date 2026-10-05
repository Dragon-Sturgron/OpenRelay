# OpenRelay v0.2.0 — EdgeOne Makers 部署

## 1. 上传 Git 仓库

把 OpenRelay 项目根目录上传到 GitHub / Gitee。

## 2. EdgeOne Makers 导入仓库

创建项目并选择 OpenRelay 仓库。

构建配置：

```text
Framework: Vue / Vite
Build Command: npm run build
Output Directory: dist
Root Directory: ./
```

## 3. 创建并绑定 KV

创建 KV Namespace，例如：

```text
openrelay
```

绑定到项目时，Variable Name 必须填写：

```text
OPENRELAY_KV
```

`OPENRELAY_KV` 是 KV Binding，不需要在普通环境变量里再次创建。

## 4. 配置唯一环境变量

在 Project Settings → Environment Variables 添加：

```text
OPENRELAY_PASSWORD
```

值使用你自己设置的高强度密码。

建议 24 位以上，并包含大小写字母、数字和特殊符号。

## 5. 重新部署

环境变量或 KV Binding 设置完成后重新部署 Production。

## 6. 健康检查

访问：

```text
https://你的域名/api/health
```

正常应看到：

```json
{
  "ok": true,
  "app": "OpenRelay",
  "version": "0.2.0",
  "kvBound": true,
  "passwordConfigured": true
}
```

## 7. 登录

访问站点主页，输入 `OPENRELAY_PASSWORD`。

Vue 前端使用 Hash Router，因此后台页面地址形如：

```text
https://你的域名/#/providers
https://你的域名/#/models
https://你的域名/#/relay-keys
```

这样不需要额外配置 SPA Rewrite。

## 8. 从 v0.1.x 升级

v0.2.0 只重构前端架构，继续使用原 Edge Function 与 KV 数据。

升级后不需要：

- 重建 KV
- 修改 `OPENRELAY_PASSWORD`
- 重新录入已保存 Provider
- 重新创建 Relay Key

只需要把代码覆盖到仓库并重新部署即可。
