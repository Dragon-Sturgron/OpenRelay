<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps({
  modelValue: { type: [String, Number], default: '' },
  options: { type: Array, default: () => [] },
  placeholder: { type: String, default: '请选择' },
  searchPlaceholder: { type: String, default: '搜索...' },
  searchable: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  emptyText: { type: String, default: '暂无可选项' },
})

const emit = defineEmits(['update:modelValue', 'change', 'open', 'close'])
const root = ref(null)
const searchInput = ref(null)
const open = ref(false)
const query = ref('')
const activeIndex = ref(-1)

const normalizedOptions = computed(() => props.options.map((item) => ({
  value: item.value,
  label: item.label ?? String(item.value ?? ''),
  description: item.description || '',
  group: item.group || '',
  badge: item.badge || '',
  icon: item.icon || '',
  disabled: Boolean(item.disabled),
})))

const selectedOption = computed(() => normalizedOptions.value.find((item) => String(item.value) === String(props.modelValue)))
const filteredOptions = computed(() => {
  const keyword = query.value.trim().toLowerCase()
  if (!keyword) return normalizedOptions.value
  return normalizedOptions.value.filter((item) => `${item.label} ${item.value} ${item.description} ${item.group}`.toLowerCase().includes(keyword))
})
const groupedOptions = computed(() => {
  const groups = []
  const map = new Map()
  filteredOptions.value.forEach((item) => {
    const key = item.group || ''
    if (!map.has(key)) {
      const group = { label: key, items: [] }
      map.set(key, group)
      groups.push(group)
    }
    map.get(key).items.push(item)
  })
  return groups
})
const selectableOptions = computed(() => filteredOptions.value.filter((item) => !item.disabled))

function optionInitial(option) {
  if (option.icon) return option.icon
  return String(option.label || '?').trim().slice(0, 1).toUpperCase()
}

async function openMenu() {
  if (props.disabled || props.loading) return
  open.value = true
  query.value = ''
  activeIndex.value = Math.max(0, selectableOptions.value.findIndex((item) => String(item.value) === String(props.modelValue)))
  emit('open')
  if (props.searchable) {
    await nextTick()
    searchInput.value?.focus()
  }
}
function closeMenu() {
  if (!open.value) return
  open.value = false
  query.value = ''
  activeIndex.value = -1
  emit('close')
}
function toggleMenu() {
  if (open.value) closeMenu()
  else openMenu()
}
function selectOption(option) {
  if (option.disabled) return
  emit('update:modelValue', option.value)
  emit('change', option.value)
  closeMenu()
}
function moveActive(delta) {
  if (!open.value) {
    openMenu()
    return
  }
  const items = selectableOptions.value
  if (!items.length) return
  activeIndex.value = (activeIndex.value + delta + items.length) % items.length
  nextTick(() => root.value?.querySelector(`[data-select-index="${activeIndex.value}"]`)?.scrollIntoView({ block: 'nearest' }))
}
function selectActive() {
  const option = selectableOptions.value[activeIndex.value]
  if (option) selectOption(option)
}
function onKeydown(event) {
  if (props.disabled) return
  if (event.key === 'ArrowDown') { event.preventDefault(); moveActive(1) }
  else if (event.key === 'ArrowUp') { event.preventDefault(); moveActive(-1) }
  else if (event.key === 'Enter' || event.key === ' ') {
    if (event.target === searchInput.value && event.key === ' ') return
    event.preventDefault()
    if (!open.value) openMenu()
    else selectActive()
  } else if (event.key === 'Escape') { event.preventDefault(); closeMenu() }
  else if (event.key === 'Tab') closeMenu()
}
function onDocumentPointer(event) {
  if (open.value && root.value && !root.value.contains(event.target)) closeMenu()
}

watch(() => props.disabled, (disabled) => { if (disabled) closeMenu() })
watch(filteredOptions, () => { activeIndex.value = selectableOptions.value.length ? 0 : -1 })
onMounted(() => document.addEventListener('pointerdown', onDocumentPointer))
onBeforeUnmount(() => document.removeEventListener('pointerdown', onDocumentPointer))
</script>

<template>
  <div ref="root" class="base-select" :class="{ 'is-open': open, 'is-disabled': disabled, 'is-loading': loading }" @keydown="onKeydown">
    <button class="select-trigger" type="button" :disabled="disabled" :aria-expanded="open" aria-haspopup="listbox" @click="toggleMenu">
      <span v-if="selectedOption" class="select-value">
        <span class="select-avatar">{{ optionInitial(selectedOption) }}</span>
        <span class="select-value-copy">
          <strong>{{ selectedOption.label }}</strong>
          <small v-if="selectedOption.description">{{ selectedOption.description }}</small>
        </span>
      </span>
      <span v-else class="select-placeholder">{{ loading ? '加载中...' : placeholder }}</span>
      <span class="select-chevron" aria-hidden="true">
        <span v-if="loading" class="select-spinner"></span>
        <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="m7 10 5 5 5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </span>
    </button>

    <Transition name="select-pop">
      <div v-if="open" class="select-popover" role="listbox">
        <div v-if="searchable" class="select-search-wrap">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2"/><path d="m20 20-3.5-3.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
          <input ref="searchInput" v-model="query" class="select-search" :placeholder="searchPlaceholder" @keydown.stop="onKeydown" />
          <span v-if="query" class="search-count">{{ filteredOptions.length }}</span>
        </div>

        <div class="select-options">
          <div v-if="!filteredOptions.length" class="select-empty">
            <strong>没有找到匹配项</strong>
            <span>{{ query ? '换个关键词试试' : emptyText }}</span>
          </div>
          <template v-for="group in groupedOptions" :key="group.label || '__default'">
            <div v-if="group.label" class="select-group-label">{{ group.label }}</div>
            <button
              v-for="option in group.items"
              :key="String(option.value)"
              type="button"
              class="select-option"
              :class="{ selected: String(option.value) === String(modelValue), disabled: option.disabled, active: selectableOptions[activeIndex]?.value === option.value }"
              :disabled="option.disabled"
              :data-select-index="selectableOptions.findIndex((item) => item.value === option.value)"
              @mouseenter="activeIndex = selectableOptions.findIndex((item) => item.value === option.value)"
              @click="selectOption(option)"
            >
              <span class="select-avatar">{{ optionInitial(option) }}</span>
              <span class="select-option-copy">
                <span class="select-option-line"><strong>{{ option.label }}</strong><em v-if="option.badge">{{ option.badge }}</em></span>
                <small v-if="option.description">{{ option.description }}</small>
              </span>
              <svg v-if="String(option.value) === String(modelValue)" class="select-check" width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="m5 12 4 4L19 6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </button>
          </template>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.base-select{position:relative;width:100%;font-weight:400}
.select-trigger{width:100%;min-height:50px;border:1px solid var(--line);border-radius:14px;background:var(--input-bg,#f8fafc);color:var(--text);padding:7px 11px 7px 12px;display:flex;align-items:center;justify-content:space-between;gap:12px;text-align:left;cursor:pointer;transition:border-color .16s ease,box-shadow .16s ease,background .16s ease}
.select-trigger:hover:not(:disabled){border-color:var(--line-strong);background:var(--input-hover,#fff)}
.is-open .select-trigger{border-color:var(--primary,#2563eb);box-shadow:0 0 0 3px color-mix(in srgb,var(--primary,#2563eb) 12%,transparent);background:var(--input-hover,#fff)}
.is-disabled .select-trigger{opacity:.58;cursor:not-allowed;background:var(--surface-subtle,#f5f7fa)}
.select-value{display:flex;align-items:center;min-width:0;gap:10px}
.select-avatar{flex:0 0 auto;width:30px;height:30px;border-radius:9px;display:grid;place-items:center;background:color-mix(in srgb,var(--primary,#2563eb) 10%,var(--surface,#fff));border:1px solid color-mix(in srgb,var(--primary,#2563eb) 15%,var(--line));color:var(--primary,#2563eb);font-size:12px;font-weight:800}
.select-value-copy,.select-option-copy{min-width:0;display:grid;gap:2px}
.select-value-copy strong,.select-option-copy strong{font-size:13.5px;font-weight:650;line-height:1.25;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.select-value-copy small,.select-option-copy small{color:var(--text-muted,#718096);font-size:11.5px;line-height:1.35;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.select-placeholder{color:var(--text-muted,#718096);font-size:13.5px}
.select-chevron{display:grid;place-items:center;color:var(--text-muted,#718096);transition:transform .16s ease}
.is-open .select-chevron{transform:rotate(180deg)}
.select-spinner{width:16px;height:16px;border:2px solid var(--line);border-top-color:var(--primary,#2563eb);border-radius:50%;animation:spin .7s linear infinite}
.select-popover{position:absolute;z-index:80;top:calc(100% + 8px);left:0;right:0;min-width:260px;max-height:380px;border:1px solid var(--line);border-radius:16px;background:var(--surface,#fff);box-shadow:0 22px 60px rgba(15,23,42,.18),0 4px 14px rgba(15,23,42,.08);overflow:hidden;padding:7px}
.select-search-wrap{display:flex;align-items:center;gap:8px;margin:2px 2px 7px;padding:0 10px;border:1px solid var(--line);border-radius:11px;background:var(--surface-subtle,#f8fafc);color:var(--text-muted,#718096)}
.select-search{height:38px!important;min-height:38px!important;border:0!important;box-shadow:none!important;background:transparent!important;padding:0!important;font-size:13px!important;color:var(--text)!important}
.select-search:focus{outline:none}
.search-count{font-size:11px;padding:2px 6px;border-radius:999px;background:var(--surface,#fff);border:1px solid var(--line)}
.select-options{max-height:315px;overflow:auto;overscroll-behavior:contain;padding:1px}
.select-group-label{padding:10px 10px 6px;color:var(--text-muted,#718096);font-size:10.5px;font-weight:750;letter-spacing:.08em;text-transform:uppercase}
.select-option{width:100%;border:0;background:transparent;color:var(--text);border-radius:11px;padding:9px 10px;display:flex;align-items:center;gap:10px;text-align:left;cursor:pointer;transition:background .12s ease}
.select-option:hover,.select-option.active{background:var(--surface-subtle,#f5f7fb)}
.select-option.selected{background:color-mix(in srgb,var(--primary,#2563eb) 7%,var(--surface,#fff))}
.select-option.disabled{opacity:.45;cursor:not-allowed}
.select-option-copy{flex:1}
.select-option-line{display:flex;align-items:center;gap:7px;min-width:0}
.select-option-line em{font-style:normal;font-size:10px;color:var(--primary,#2563eb);padding:2px 6px;border-radius:999px;background:color-mix(in srgb,var(--primary,#2563eb) 9%,transparent);border:1px solid color-mix(in srgb,var(--primary,#2563eb) 13%,transparent);white-space:nowrap}
.select-check{flex:0 0 auto;color:var(--primary,#2563eb)}
.select-empty{padding:24px 14px;text-align:center;display:grid;gap:5px}
.select-empty strong{font-size:13px}.select-empty span{font-size:12px;color:var(--text-muted,#718096)}
.select-pop-enter-active,.select-pop-leave-active{transition:opacity .14s ease,transform .14s ease}
.select-pop-enter-from,.select-pop-leave-to{opacity:0;transform:translateY(-5px) scale(.985)}
@keyframes spin{to{transform:rotate(360deg)}}
@media(max-width:640px){.select-popover{position:fixed;left:14px;right:14px;top:auto;bottom:14px;max-height:min(62vh,480px);border-radius:18px}.select-options{max-height:calc(min(62vh,480px) - 60px)}}
</style>
