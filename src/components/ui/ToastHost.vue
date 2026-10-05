<script setup>
import { useToastStore } from '../../stores/toast.js'
const toast = useToastStore()
</script>

<template>
  <div class="toast-stack" aria-live="polite">
    <TransitionGroup name="toast-list">
      <button
        v-for="item in toast.items"
        :key="item.id"
        type="button"
        class="toast-item"
        :class="`toast-${item.type}`"
        @click="toast.dismiss(item.id)"
      >
        <span class="toast-dot"></span>
        <span>{{ item.message }}</span>
      </button>
    </TransitionGroup>
  </div>
</template>
