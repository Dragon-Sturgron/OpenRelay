<script setup>
import { onBeforeUnmount, watch } from 'vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, default: '' },
  width: { type: String, default: '640px' },
})
const emit = defineEmits(['close'])

function onKeydown(event) {
  if (event.key === 'Escape' && props.open) emit('close')
}

watch(() => props.open, (open) => {
  document.body.classList.toggle('dialog-open', open)
  if (open) document.addEventListener('keydown', onKeydown)
  else document.removeEventListener('keydown', onKeydown)
}, { immediate: true })

onBeforeUnmount(() => {
  document.body.classList.remove('dialog-open')
  document.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="dialog-fade">
      <div v-if="open" class="dialog-backdrop" @mousedown.self="$emit('close')">
        <section class="dialog-panel" :style="{ maxWidth: width }" role="dialog" aria-modal="true">
          <header class="dialog-header">
            <div>
              <slot name="eyebrow" />
              <h3>{{ title }}</h3>
            </div>
            <button class="icon-button" type="button" aria-label="关闭" @click="$emit('close')">×</button>
          </header>
          <div class="dialog-body"><slot /></div>
          <footer v-if="$slots.footer" class="dialog-footer"><slot name="footer" /></footer>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>
