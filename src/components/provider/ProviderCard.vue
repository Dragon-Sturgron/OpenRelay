<script setup>
import BaseButton from '../ui/BaseButton.vue'
import StatusBadge from '../ui/StatusBadge.vue'
import { providerTypeName } from '../../config/providerPresets.js'

defineProps({
  provider: { type: Object, required: true },
  busyAction: { type: String, default: '' },
})
defineEmits(['test', 'sync', 'reveal', 'copy', 'edit', 'delete'])
</script>

<template>
  <article class="provider-card">
    <div class="provider-card-head">
      <div>
        <div class="provider-title-row">
          <h3>{{ provider.name }}</h3>
          <span class="provider-type-pill">{{ providerTypeName(provider.type) }}</span>
        </div>
        <p class="provider-id">{{ provider.id }}</p>
      </div>
      <StatusBadge :status="provider.enabled ? 'success' : 'neutral'">{{ provider.enabled ? '已启用' : '已停用' }}</StatusBadge>
    </div>

    <div class="provider-meta-grid">
      <div class="meta-block">
        <span>API Key</span>
        <strong>{{ provider.apiKeyMasked || '未配置' }}</strong>
      </div>
      <div class="meta-block wide">
        <span>Base URL</span>
        <strong :title="provider.baseUrl">{{ provider.baseUrl }}</strong>
      </div>
      <div class="meta-block wide">
        <span>Models URL</span>
        <strong :title="provider.modelsUrl || `${provider.baseUrl}/models`">{{ provider.modelsUrl || `${provider.baseUrl}/models` }}</strong>
      </div>
    </div>

    <div class="provider-primary-actions">
      <BaseButton :loading="busyAction === 'test'" @click="$emit('test', provider)">测试连接</BaseButton>
      <BaseButton :loading="busyAction === 'sync'" @click="$emit('sync', provider)">同步模型</BaseButton>
    </div>

    <div class="provider-secondary-actions">
      <button type="button" :disabled="Boolean(busyAction)" @click="$emit('reveal', provider)">{{ busyAction === 'reveal' ? '解密中...' : '显示 Key' }}</button>
      <button type="button" :disabled="Boolean(busyAction)" @click="$emit('copy', provider)">{{ busyAction === 'copy' ? '复制中...' : '复制 Key' }}</button>
      <button type="button" :disabled="Boolean(busyAction)" @click="$emit('edit', provider)">编辑</button>
      <button type="button" class="danger-link" :disabled="Boolean(busyAction)" @click="$emit('delete', provider)">{{ busyAction === 'delete' ? '删除中...' : '删除' }}</button>
    </div>
  </article>
</template>
