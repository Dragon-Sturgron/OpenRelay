<script setup>
import { computed, onMounted } from 'vue'
import AppShell from '../components/layout/AppShell.vue'
import BaseButton from '../components/ui/BaseButton.vue'
import { useModelsStore } from '../stores/models.js'
import { useToastStore } from '../stores/toast.js'
import { copyText } from '../services/api.js'

const models = useModelsStore()
const toast = useToastStore()
const baseUrl = `${location.origin}/v1`
const modelAlias = computed(() => models.enabled[0]?.alias || '你的模型别名')
const curl = computed(() => `curl ${location.origin}/v1/chat/completions \\\n  -H "Authorization: Bearer or_xxxxxxxxx" \\\n  -H "Content-Type: application/json" \\\n  -d '{"model":"${modelAlias.value}","messages":[{"role":"user","content":"你好"}]}'`)

onMounted(async () => { if (!models.items.length) { try { await models.load() } catch {} } })
async function copy(value, message) { await copyText(value); toast.success(message) }
</script>

<template>
  <AppShell>
    <div class="page-heading"><div><div class="panel-kicker">DEVELOPER</div><h2>调用方式</h2><p>OpenAI Compatible 客户端统一使用 OpenRelay Base URL 与 Relay Key。</p></div></div>
    <div class="quick-grid">
      <section class="content-card"><div class="card-section-head"><div><h3>Base URL</h3><p>填入 Cherry Studio、Dify、脚本或你自己的系统。</p></div></div><div class="copy-field"><code>{{ baseUrl }}</code><BaseButton @click="copy(baseUrl, 'Base URL 已复制')">复制</BaseButton></div></section>
      <section class="content-card"><div class="card-section-head"><div><h3>curl 示例</h3><p>将示例中的 Relay Key 替换为你创建的 or_xxx。</p></div><BaseButton @click="copy(curl, 'curl 示例已复制')">复制示例</BaseButton></div><pre class="code-block">{{ curl }}</pre></section>
    </div>
    <section class="content-card note-card"><h3>协议说明</h3><p>OpenAI、Qwen 以及 OpenAI Compatible Provider 使用 <code>/v1/chat/completions</code>。Claude 可直接使用 <code>/v1/messages</code>；通过 OpenAI 格式调用 Claude 时，当前版本主要用于非流式文本场景。</p></section>
  </AppShell>
</template>
