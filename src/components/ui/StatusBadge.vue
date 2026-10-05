<script setup>
defineProps({
  status: { type: String, default: 'neutral' },
})
</script>

<template>
  <span class="status-badge" :class="`status-${status}`"><slot /></span>
</template>
