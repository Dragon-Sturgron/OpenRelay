export const providerGroups = [
  {
    label: '国外常用',
    items: ['openai', 'anthropic', 'gemini', 'xai'],
  },
  {
    label: '国内常用',
    items: ['qwen', 'deepseek', 'glm', 'doubao', 'kimi'],
  },
  {
    label: '其他',
    items: ['custom'],
  },
]

export const providerPresets = {
  openai: {
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    modelsUrl: 'https://api.openai.com/v1/models',
    hint: 'OpenAI 官方 API。模型列表会根据当前 API Key 从 /v1/models 获取。',
  },
  anthropic: {
    name: 'Anthropic / Claude',
    baseUrl: 'https://api.anthropic.com/v1',
    modelsUrl: 'https://api.anthropic.com/v1/models',
    hint: 'Claude 使用 Anthropic 原生鉴权，OpenRelay 会自动添加 x-api-key 与 anthropic-version。',
  },
  gemini: {
    name: 'Google Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    modelsUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/models',
    hint: '使用 Google Gemini 官方 OpenAI 兼容接口；Base URL 与 Models URL 均可按需修改。',
  },
  xai: {
    name: 'xAI / Grok',
    baseUrl: 'https://api.x.ai/v1',
    modelsUrl: 'https://api.x.ai/v1/models',
    hint: 'xAI 官方 API 兼容 OpenAI REST API，可查询当前 API Key 可用模型。',
  },
  qwen: {
    name: 'Alibaba Qwen',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    modelsUrl: 'https://dashscope.aliyuncs.com/api/v1/models',
    hint: '默认使用阿里云百炼中国区共享域名。API Key 与地域必须匹配；如使用 Workspace 专属域名，可直接修改。',
  },
  deepseek: {
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com',
    modelsUrl: 'https://api.deepseek.com/models',
    hint: 'DeepSeek 官方 API，兼容 OpenAI 格式。',
  },
  glm: {
    name: '智谱 GLM',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    modelsUrl: 'https://open.bigmodel.cn/api/paas/v4/models',
    hint: '智谱开放平台兼容地址；如账号或区域使用不同地址，可直接修改。',
  },
  doubao: {
    name: '火山方舟 / 豆包',
    baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    modelsUrl: 'https://ark.cn-beijing.volces.com/api/v3/models',
    hint: '默认使用火山方舟北京地域数据面地址；API Key 或地域不同可直接修改。',
  },
  kimi: {
    name: 'Moonshot / Kimi',
    baseUrl: 'https://api.moonshot.cn/v1',
    modelsUrl: 'https://api.moonshot.cn/v1/models',
    hint: 'Moonshot / Kimi OpenAI 兼容 API；可按开放平台配置修改 URL。',
  },
  custom: {
    name: '',
    baseUrl: '',
    modelsUrl: '',
    hint: '自定义类型不预填厂商信息。显示名称、API Base URL、Models URL 和 API Key 全部由你配置；当前按 OpenAI Compatible 协议转发。',
  },
}

export function providerTypeName(type) {
  if (type === 'openai_compatible') return '自定义'
  return providerPresets[type]?.name || type
}
