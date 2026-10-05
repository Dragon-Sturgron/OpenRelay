<script setup>
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth.js'
import { useHealthStore } from '../../stores/health.js'
import { useProvidersStore } from '../../stores/providers.js'
import { useModelsStore } from '../../stores/models.js'
import { useRelayKeysStore } from '../../stores/relayKeys.js'
import StatusBadge from '../ui/StatusBadge.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const health = useHealthStore()
const providers = useProvidersStore()
const models = useModelsStore()
const relayKeys = useRelayKeysStore()

const nav = [
  { to: '/providers', label: 'AI 厂商', caption: 'Provider' },
  { to: '/models', label: '模型', caption: 'Models' },
  { to: '/relay-keys', label: 'Relay Key', caption: 'Access' },
  { to: '/quickstart', label: '调用方式', caption: 'Developer' },
]

const title = computed(() => route.meta.title || 'OpenRelay')

function logout() {
  auth.logout()
  router.replace('/login')
}

onMounted(async () => {
  await Promise.allSettled([
    health.check(),
    providers.items.length ? Promise.resolve() : providers.load(),
    models.items.length ? Promise.resolve() : models.load(),
    relayKeys.items.length ? Promise.resolve() : relayKeys.load(),
  ])
})
</script>

<template>
  <div class="app-shell">
    <aside class="sidebar">
      <div class="brand">
        <div class="brand-mark">OR</div>
        <div class="brand-copy">
          <strong>OpenRelay</strong>
          <span>AI Gateway</span>
        </div>
      </div>

      <div class="sidebar-section-title">GATEWAY</div>
      <nav class="sidebar-nav">
        <RouterLink v-for="item in nav.slice(0, 3)" :key="item.to" :to="item.to" class="nav-item">
          <span class="nav-copy"><strong>{{ item.label }}</strong><small>{{ item.caption }}</small></span>
        </RouterLink>
      </nav>

      <div class="sidebar-section-title">DEVELOPER</div>
      <nav class="sidebar-nav">
        <RouterLink :to="nav[3].to" class="nav-item">
          <span class="nav-copy"><strong>{{ nav[3].label }}</strong><small>{{ nav[3].caption }}</small></span>
        </RouterLink>
      </nav>

      <div class="sidebar-spacer"></div>
      <div class="sidebar-status">
        <div class="sidebar-status-head">
          <span>服务状态</span>
          <StatusBadge :status="health.ok ? 'success' : 'danger'">{{ health.ok ? '正常' : '异常' }}</StatusBadge>
        </div>
        <p>{{ health.ok ? 'Edge Function 与 KV 正常工作' : '请检查 KV 或环境变量配置' }}</p>
      </div>
      <button class="sidebar-logout" type="button" @click="logout">退出管理</button>
    </aside>

    <main class="workspace">
      <header class="workspace-header">
        <div>
          <div class="workspace-kicker">OPENRELAY CONSOLE</div>
          <h1>{{ title }}</h1>
        </div>
        <div class="workspace-header-actions">
          <StatusBadge :status="health.ok ? 'success' : 'danger'">{{ health.ok ? '服务正常' : '服务异常' }}</StatusBadge>
        </div>
      </header>

      <section class="stats-row">
        <article class="stat-card">
          <span>AI 厂商</span>
          <strong>{{ providers.items.length }}</strong>
          <small>已配置 Provider</small>
        </article>
        <article class="stat-card">
          <span>启用模型</span>
          <strong>{{ models.enabled.length }}</strong>
          <small>客户端可调用</small>
        </article>
        <article class="stat-card">
          <span>Relay Key</span>
          <strong>{{ relayKeys.items.length }}</strong>
          <small>客户端凭据</small>
        </article>
      </section>

      <section class="page-content"><slot /></section>
    </main>
  </div>
</template>
