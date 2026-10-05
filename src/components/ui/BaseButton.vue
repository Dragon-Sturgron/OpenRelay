<script setup>
defineProps({
  variant: { type: String, default: 'secondary' },
  loading: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  type: { type: String, default: 'button' },
})
</script>

<template>
  <button
    :type="type"
    class="btn"
    :class="`btn-${variant}`"
    :disabled="disabled || loading"
  >
    <span v-if="loading" class="spinner" aria-hidden="true"></span>
    <slot>{{ loading ? '处理中...' : '' }}</slot>
  </button>
</template>
