<script setup>
import { onBeforeUnmount, ref, watch } from 'vue'
import BaseButton from '../ui/BaseButton.vue'
import BaseDialog from '../ui/BaseDialog.vue'
import { copyText } from '../../services/api.js'
import { useToastStore } from '../../stores/toast.js'

const props = defineProps({
  open: Boolean,
  providerName: { type: String, default: '' },
  apiKey: { type: String, default: '' },
})
const emit = defineEmits(['close', 'expired'])
const remaining = ref(60)
let timer = null
const toast = useToastStore()

function stop() {
  if (timer) window.clearInterval(timer)
  timer = null
}
function start() {
  stop()
  remaining.value = 60
  timer = window.setInterval(() => {
    remaining.value -= 1
    if (remaining.value <= 0) {
      stop()
      emit('expired')
      emit('close')
    }
  }, 1000)
}
watch(() => props.open, (open) => open ? start() : stop())
onBeforeUnmount(stop)

async function copy() {
  if (!props.apiKey) return
  await copyText(props.apiKey)
  toast.success('API Key 已复制到剪贴板')
}
</script>

<template>
  <BaseDialog :open="open" title="查看厂商 API Key" @close="$emit('close')">
    <div class="security-note">
      完整 API Key 仅在你主动查看时从 KV 密文解密返回。关闭窗口或倒计时结束后，页面会清除明文。
    </div>
    <div class="field">
      <span>{{ providerName }} · 完整 API Key</span>
      <div class="secret-row">
        <input :value="apiKey" readonly autocomplete="off" spellcheck="false" />
        <BaseButton variant="primary" @click="copy">复制</BaseButton>
      </div>
    </div>
    <p class="countdown">将在 {{ remaining }} 秒后自动隐藏并清除。</p>
    <template #footer>
      <BaseButton @click="$emit('close')">关闭并清除</BaseButton>
    </template>
  </BaseDialog>
</template>
