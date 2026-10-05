<script setup>
import { onMounted, ref } from 'vue'
import AppShell from '../components/layout/AppShell.vue'
import BaseButton from '../components/ui/BaseButton.vue'
import { useRelayKeysStore } from '../stores/relayKeys.js'
import { useToastStore } from '../stores/toast.js'
import { copyText } from '../services/api.js'

const keys = useRelayKeysStore()
const toast = useToastStore()
const revealedToken = ref('')
const creating = ref(false)

function formatTime(value) {
  if (!value) return '-'
  try { return new Date(value).toLocaleString() } catch { return value }
}

onMounted(async () => {
  if (!keys.items.length) {
    try { await keys.load() } catch (error) { toast.error(error.message) }
  }
})

async function createKey() {
  const name = window.prompt('给这个 Relay Key 起一个名称', 'Default') || 'Default'
  creating.value = true
  try {
    const result = await keys.create(name)
    revealedToken.value = result.token || ''
    toast.success('Relay Key 已创建')
  } catch (error) { toast.error(error.message) }
  finally { creating.value = false }
}
async function copyToken() {
  await copyText(revealedToken.value)
  toast.success('Relay Key 已复制')
}
async function removeKey(key) {
  if (!window.confirm('删除后使用这个 Key 的客户端会失效。继续？')) return
  try { await keys.remove(key.id); toast.success('Relay Key 已删除') }
  catch (error) { toast.error(error.message) }
}
</script>

<template>
  <AppShell>
    <div class="page-heading">
      <div><div class="panel-kicker">ACCESS</div><h2>Relay Key</h2><p>客户端只需要保存 OpenRelay Relay Key，不需要保存真实厂商 API Key。</p></div>
      <BaseButton variant="primary" :loading="creating" @click="createKey">+ 创建 Key</BaseButton>
    </div>

    <section v-if="revealedToken" class="secret-reveal-card">
      <div><div class="panel-kicker">ONLY SHOWN ONCE</div><h3>请立即保存这个 Relay Key</h3><p>Relay Key 只保存哈希，关闭此提示后不能重新恢复原文。</p></div>
      <div class="secret-reveal-row"><code>{{ revealedToken }}</code><BaseButton @click="copyToken">复制 Key</BaseButton><button type="button" class="icon-button" @click="revealedToken = ''">×</button></div>
    </section>

    <section class="content-card table-card">
      <div class="card-section-head"><div><h3>已创建的 Relay Key</h3><p>你可以按设备、应用或用途分别创建不同 Key。</p></div></div>
      <div class="table-wrap"><table class="data-table"><thead><tr><th>名称</th><th>标识</th><th>创建时间</th><th></th></tr></thead><tbody><tr v-if="!keys.items.length"><td colspan="4" class="empty-cell">还没有 Relay Key。</td></tr><tr v-for="key in keys.items" :key="key.id"><td>{{ key.name }}</td><td><code>{{ key.prefix }}••••{{ key.last4 }}</code></td><td>{{ formatTime(key.createdAt) }}</td><td class="cell-actions"><button type="button" class="text-danger" @click="removeKey(key)">删除</button></td></tr></tbody></table></div>
    </section>
  </AppShell>
</template>
