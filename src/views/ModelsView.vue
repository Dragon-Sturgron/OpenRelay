<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import AppShell from '../components/layout/AppShell.vue'
import BaseButton from '../components/ui/BaseButton.vue'
import BaseSelect from '../components/ui/BaseSelect.vue'
import StatusBadge from '../components/ui/StatusBadge.vue'
import { useProvidersStore } from '../stores/providers.js'
import { useModelsStore } from '../stores/models.js'
import { useToastStore } from '../stores/toast.js'

const providers = useProvidersStore()
const models = useModelsStore()
const toast = useToastStore()
const upstreamModels = ref([])
const modelLoading = ref(false)
const sourceNote = ref('')
const saving = ref(false)

const form = reactive({ providerId: '', upstreamModel: '', alias: '', displayName: '', order: 100 })
const providerName = (id) => providers.byId(id)?.name || id
const selectedUpstream = computed(() => upstreamModels.value.find((item) => item.id === form.upstreamModel))
const providerOptions = computed(() => providers.enabled.map((provider) => ({
  value: provider.id,
  label: provider.name,
  description: provider.type || 'AI Provider',
})))
const upstreamModelOptions = computed(() => upstreamModels.value.map((model) => ({
  value: model.id,
  label: model.name === model.id ? model.id : model.name,
  description: model.name === model.id ? '' : model.id,
  badge: 'MODEL',
})))

onMounted(async () => {
  try {
    await Promise.all([
      providers.items.length ? Promise.resolve() : providers.load(),
      models.items.length ? Promise.resolve() : models.load(),
    ])
  } catch (error) { toast.error(error.message) }
})

watch(() => form.providerId, async (id) => {
  form.upstreamModel = ''
  upstreamModels.value = []
  sourceNote.value = ''
  if (id) await loadUpstream(false)
})
watch(() => form.upstreamModel, (value) => {
  if (!value) return
  if (!form.alias) form.alias = value
  if (!form.displayName) form.displayName = selectedUpstream.value?.name || value
})

async function loadUpstream(refresh) {
  if (!form.providerId) return
  modelLoading.value = true
  try {
    const result = await providers.listModels(form.providerId, refresh)
    upstreamModels.value = result.data?.models || []
    sourceNote.value = `${result.cached ? '缓存' : '实时'} · ${upstreamModels.value.length} 个模型 · ${result.data?.sourceUrl || ''}${result.warning ? ` · 已回退缓存：${result.warning}` : ''}`
  } catch (error) {
    upstreamModels.value = []
    sourceNote.value = error.message
    toast.error(error.message)
  } finally { modelLoading.value = false }
}

async function createModel() {
  if (!form.providerId) { toast.error('请先选择 AI 厂商'); return }
  if (!form.upstreamModel) { toast.error('请选择厂商可用模型'); return }
  saving.value = true
  try {
    await models.create({ ...form, order: Number(form.order || 100), enabled: true })
    form.upstreamModel = ''
    form.alias = ''
    form.displayName = ''
    toast.success('模型已启用')
  } catch (error) { toast.error(error.message) }
  finally { saving.value = false }
}
async function removeModel(model) {
  if (!window.confirm(`确定删除模型映射 ${model.alias}？`)) return
  try { await models.remove(model.id); toast.success('模型映射已删除') }
  catch (error) { toast.error(error.message) }
}
</script>

<template>
  <AppShell>
    <div class="page-heading">
      <div><div class="panel-kicker">MODELS</div><h2>模型</h2><p>选择 Provider，并从该 API Key 当前可查询到的模型列表中启用模型。</p></div>
    </div>

    <section class="content-card">
      <div class="card-section-head"><div><h3>启用模型</h3><p>模型别名是客户端实际调用时使用的名称。</p></div></div>
      <form class="model-form" @submit.prevent="createModel">
        <label class="field">
          <span>AI 厂商</span>
          <BaseSelect
            v-model="form.providerId"
            :options="providerOptions"
            placeholder="请选择 AI 厂商"
            search-placeholder="搜索已启用厂商"
            searchable
          />
        </label>
        <label class="field">
          <span>厂商可用模型</span>
          <BaseSelect
            v-model="form.upstreamModel"
            :options="upstreamModelOptions"
            :disabled="!form.providerId"
            :loading="modelLoading"
            :placeholder="form.providerId ? '请选择模型' : '请先选择 AI 厂商'"
            search-placeholder="搜索模型名称或 Model ID"
            empty-text="当前厂商没有返回可用模型"
            searchable
          />
        </label>
        <label class="field"><span>模型别名</span><input v-model="form.alias" placeholder="例如：gpt-main" required /></label>
        <label class="field"><span>显示名称</span><input v-model="form.displayName" placeholder="例如：GPT 主模型" /></label>
        <label class="field"><span>排序</span><input v-model.number="form.order" type="number" /></label>
        <div class="form-actions-inline"><BaseButton :disabled="!form.providerId" :loading="modelLoading" @click="loadUpstream(true)">刷新厂商模型</BaseButton><BaseButton variant="primary" type="submit" :loading="saving">启用模型</BaseButton></div>
      </form>
      <p v-if="sourceNote" class="source-note">{{ sourceNote }}</p>
    </section>

    <section class="content-card table-card">
      <div class="card-section-head"><div><h3>已启用模型</h3><p>这些模型会出现在 OpenRelay 的模型列表中。</p></div></div>
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr><th>别名</th><th>显示名称</th><th>厂商</th><th>上游 Model ID</th><th>状态</th><th></th></tr></thead>
          <tbody>
            <tr v-if="!models.items.length"><td colspan="6" class="empty-cell">还没有启用模型。</td></tr>
            <tr v-for="model in models.items" :key="model.id"><td><code>{{ model.alias }}</code></td><td>{{ model.displayName }}</td><td>{{ providerName(model.providerId) }}</td><td><code>{{ model.upstreamModel }}</code></td><td><StatusBadge :status="model.enabled ? 'success' : 'neutral'">{{ model.enabled ? '启用' : '停用' }}</StatusBadge></td><td class="cell-actions"><button class="text-danger" type="button" @click="removeModel(model)">删除</button></td></tr>
          </tbody>
        </table>
      </div>
    </section>
  </AppShell>
</template>
