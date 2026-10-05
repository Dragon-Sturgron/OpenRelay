# OpenRelay v0.2.0

OpenRelay 是一个部署在 EdgeOne Makers 上的个人多厂商 AI API 中转站。

## v0.2.0

本版本将管理后台从原生 HTML / JavaScript 重构为：

- Vue 3
- Vite
- Vue Router（Hash History，避免静态站点刷新路由 404）
- Pinia
- 组件化 UI

后端仍然使用原来的 Edge Function，KV 结构、`OPENRELAY_PASSWORD`、厂商 API Key 加解密、模型和 Relay Key 接口保持兼容。

### 内置厂商

国外常用：

- OpenAI
- Anthropic / Claude
- Google Gemini
- xAI / Grok

国内常用：

- Alibaba Qwen
- DeepSeek
- 智谱 GLM
- 火山方舟 / 豆包
- Moonshot / Kimi

其他：

- 自定义（OpenAI Compatible）

选择“自定义”后，显示名称、API Base URL、Models URL、API Key 都由你自己填写。

## 项目结构

```text
OpenRelay/
├─ src/
│  ├─ components/
│  │  ├─ layout/
│  │  ├─ provider/
│  │  └─ ui/
│  ├─ config/
│  ├─ router/
│  ├─ services/
│  ├─ stores/
│  ├─ styles/
│  ├─ views/
│  ├─ App.vue
│  └─ main.js
├─ edge-functions/
│  └─ api/
│     └─ [[default]].js
├─ index.html
├─ vite.config.js
└─ package.json
```

## 本地运行

```bash
npm install
npm run dev
```

生产构建：

```bash
npm run build
```

输出目录：

```text
dist
```

## EdgeOne Makers

构建命令：

```text
npm run build
```

输出目录：

```text
dist
```

KV Binding Variable Name：

```text
OPENRELAY_KV
```

唯一环境变量：

```text
OPENRELAY_PASSWORD
```

## 安全设计

- `OPENRELAY_PASSWORD` 用于后台登录和派生厂商 API Key 的 AES-256-GCM 加密密钥。
- 厂商 API Key 可逆加密后存入 KV，可主动显示/复制。
- Relay Key `or_xxx` 仅保存 SHA-256 哈希，只在创建时显示一次。
- 客户端使用 Relay Key，不直接获取厂商 API Key。
