<script setup>
import { computed, reactive, watch } from 'vue'
import BaseButton from '../ui/BaseButton.vue'
import BaseSelect from '../ui/BaseSelect.vue'
import BaseDialog from '../ui/BaseDialog.vue'
import { providerGroups, providerPresets } from '../../config/providerPresets.js'

const props = defineProps({
  open: { type: Boolean, default: false },
  provider: { type: Object, default: null },
  saving: { type: Boolean, default: false },
})
const emit = defineEmits(['close', 'save'])

const form = reactive({
  id: '',
  type: 'openai',
  name: '',
  baseUrl: '',
  modelsUrl: '',
  apiKey: '',
  order: 100,
  enabled: true,
})

const isEditing = computed(() => Boolean(form.id))
const hint = computed(() => providerPresets[form.type]?.hint || providerPresets.custom.hint)
const providerTypeOptions = computed(() => providerGroups.flatMap((group) => group.items.map((type) => ({
  value: type,
  label: type === 'custom' ? '自定义' : providerPresets[type].name,
  description: providerPresets[type].hint,
  group: group.label,
  badge: type === 'custom' ? 'CUSTOM' : '',
}))))

function applyPreset(type, overwrite = true) {
  const preset = providerPresets[type] || providerPresets.custom
  if (overwrite) {
    form.name = preset.name
    form.baseUrl = preset.baseUrl
    form.modelsUrl = preset.modelsUrl
  }
}

function resetFromProvider() {
  if (props.provider) {
    const type = props.provider.type === 'openai_compatible' ? 'custom' : (providerPresets[props.provider.type] ? props.provider.type : 'custom')
    form.id = props.provider.id || ''
    form.type = type
    form.name = props.provider.name || ''
    form.baseUrl = props.provider.baseUrl || ''
    form.modelsUrl = props.provider.modelsUrl || ''
    form.apiKey = ''
    form.order = props.provider.order ?? 100
    form.enabled = props.provider.enabled !== false
  } else {
    form.id = ''
    form.type = 'openai'
    form.apiKey = ''
    form.order = 100
    form.enabled = true
    applyPreset('openai', true)
  }
}

watch(() => props.open, (open) => { if (open) resetFromProvider() })
function onTypeChange() { applyPreset(form.type, true) }

function submit() {
  emit('save', {
    id: form.id,
    type: form.type,
    name: form.name.trim(),
    baseUrl: form.baseUrl.trim(),
    modelsUrl: form.modelsUrl.trim(),
    apiKey: form.apiKey.trim(),
    order: Number(form.order || 100),
    enabled: Boolean(form.enabled),
  })
}
</script>

<template>
  <BaseDialog :open="open" :title="isEditing ? '编辑 AI 厂商' : '添加 AI 厂商'" width="700px" @close="$emit('close')">
    <form class="form-stack" @submit.prevent="submit">
      <label class="field">
        <span>厂商类型</span>
        <BaseSelect
          v-model="form.type"
          :options="providerTypeOptions"
          placeholder="请选择 AI 厂商类型"
          search-placeholder="搜索 OpenAI、Claude、Qwen..."
          searchable
          @change="onTypeChange"
        />
      </label>
      <div class="form-grid-two">
        <label class="field">
          <span>显示名称</span>
          <input v-model="form.name" required :placeholder="form.type === 'custom' ? '例如：我的 AI 平台' : ''" />
        </label>
        <label class="field">
          <span>排序</span>
          <input v-model.number="form.order" type="number" />
        </label>
      </div>
      <label class="field">
        <span>API Base URL</span>
        <input v-model="form.baseUrl" required :placeholder="form.type === 'custom' ? 'https://api.example.com/v1' : ''" />
      </label>
      <label class="field">
        <span>Models URL</span>
        <input v-model="form.modelsUrl" :placeholder="form.type === 'custom' ? 'https://api.example.com/v1/models' : '留空则使用 Base URL + /models'" />
      </label>
      <label class="field">
        <span>API Key</span>
        <input v-model="form.apiKey" type="password" :required="!isEditing" :placeholder="isEditing ? '留空表示不更换 API Key' : '输入厂商 API Key'" />
      </label>
      <label class="switch-row">
        <input v-model="form.enabled" type="checkbox" />
        <span><strong>启用厂商</strong><small>停用后不会作为可用 Provider 出现在模型选择中。</small></span>
      </label>
      <div class="form-hint">{{ hint }}</div>
    </form>
    <template #footer>
      <BaseButton @click="$emit('close')">取消</BaseButton>
      <BaseButton variant="primary" :loading="saving" @click="submit">保存厂商</BaseButton>
    </template>
  </BaseDialog>
</template>
