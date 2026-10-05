<script setup>
import { onMounted, ref } from 'vue'
import AppShell from '../components/layout/AppShell.vue'
import ProviderCard from '../components/provider/ProviderCard.vue'
import ProviderDialog from '../components/provider/ProviderDialog.vue'
import ApiKeyDialog from '../components/provider/ApiKeyDialog.vue'
import BaseButton from '../components/ui/BaseButton.vue'
import { useProvidersStore } from '../stores/providers.js'
import { useToastStore } from '../stores/toast.js'
import { copyText } from '../services/api.js'

const providers = useProvidersStore()
const toast = useToastStore()
const dialogOpen = ref(false)
const editingProvider = ref(null)
const saving = ref(false)
const revealOpen = ref(false)
const revealedKey = ref('')
const revealedProviderName = ref('')
const busy = ref({ id: '', action: '' })

onMounted(async () => {
  if (!providers.items.length) {
    try { await providers.load() } catch (error) { toast.error(error.message) }
  }
})

function addProvider() {
  editingProvider.value = null
  dialogOpen.value = true
}
function editProvider(provider) {
  editingProvider.value = provider
  dialogOpen.value = true
}
async function saveProvider(payload) {
  saving.value = true
  try {
    const { id, ...body } = payload
    await providers.save(body, id)
    dialogOpen.value = false
    toast.success('厂商已保存')
  } catch (error) {
    toast.error(error.message)
  } finally {
    saving.value = false
  }
}
async function testProvider(provider) {
  busy.value = { id: provider.id, action: 'test' }
  try {
    const result = await providers.test(provider.id)
    toast.success(`连接成功，可查询 ${result.modelCount} 个模型`)
  } catch (error) { toast.error(error.message) }
  finally { busy.value = { id: '', action: '' } }
}
async function syncProvider(provider) {
  busy.value = { id: provider.id, action: 'sync' }
  try {
    const result = await providers.syncModels(provider.id)
    toast.success(`已同步 ${result.data?.models?.length || 0} 个模型`)
  } catch (error) { toast.error(error.message) }
  finally { busy.value = { id: '', action: '' } }
}
async function revealProvider(provider) {
  busy.value = { id: provider.id, action: 'reveal' }
  try {
    const result = await providers.revealKey(provider.id)
    revealedProviderName.value = provider.name
    revealedKey.value = result.data?.apiKey || ''
    revealOpen.value = true
  } catch (error) { toast.error(error.message) }
  finally { busy.value = { id: '', action: '' } }
}
async function copyProvider(provider) {
  busy.value = { id: provider.id, action: 'copy' }
  try {
    const result = await providers.revealKey(provider.id)
    await copyText(result.data?.apiKey || '')
    toast.success(`${provider.name} API Key 已复制`)
  } catch (error) { toast.error(error.message) }
  finally { busy.value = { id: '', action: '' } }
}
async function deleteProvider(provider) {
  if (!window.confirm(`确定删除 ${provider.name}？`)) return
  busy.value = { id: provider.id, action: 'delete' }
  try {
    await providers.remove(provider.id)
    toast.success('厂商已删除')
  } catch (error) { toast.error(error.message) }
  finally { busy.value = { id: '', action: '' } }
}
function closeReveal() {
  revealOpen.value = false
  revealedKey.value = ''
  revealedProviderName.value = ''
}
</script>

<template>
  <AppShell>
    <div class="page-heading">
      <div>
        <div class="panel-kicker">PROVIDERS</div>
        <h2>AI 厂商</h2>
        <p>集中管理上游 AI Provider、API Key、连接状态和模型同步。</p>
      </div>
      <BaseButton variant="primary" @click="addProvider">+ 添加厂商</BaseButton>
    </div>

    <div v-if="providers.loading && !providers.items.length" class="empty-panel">正在加载厂商…</div>
    <div v-else-if="!providers.items.length" class="empty-panel">
      <div class="panel-kicker">GET STARTED</div>
      <h3>还没有配置 AI 厂商</h3>
      <p>建议先添加 OpenAI 测试连接与模型同步，再继续接入 Claude、Gemini、Grok、Qwen 等平台。</p>
      <BaseButton variant="primary" @click="addProvider">添加第一个厂商</BaseButton>
    </div>
    <div v-else class="provider-list">
      <ProviderCard
        v-for="provider in providers.items"
        :key="provider.id"
        :provider="provider"
        :busy-action="busy.id === provider.id ? busy.action : ''"
        @test="testProvider"
        @sync="syncProvider"
        @reveal="revealProvider"
        @copy="copyProvider"
        @edit="editProvider"
        @delete="deleteProvider"
      />
    </div>

    <ProviderDialog
      :open="dialogOpen"
      :provider="editingProvider"
      :saving="saving"
      @close="dialogOpen = false"
      @save="saveProvider"
    />
    <ApiKeyDialog
      :open="revealOpen"
      :provider-name="revealedProviderName"
      :api-key="revealedKey"
      @close="closeReveal"
      @expired="revealedKey = ''"
    />
  </AppShell>
</template>
