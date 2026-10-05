import { createRouter, createWebHashHistory } from 'vue-router'
import LoginView from '../views/LoginView.vue'
import ProvidersView from '../views/ProvidersView.vue'
import ModelsView from '../views/ModelsView.vue'
import RelayKeysView from '../views/RelayKeysView.vue'
import QuickStartView from '../views/QuickStartView.vue'

const routes = [
  { path: '/', redirect: '/providers' },
  { path: '/login', name: 'login', component: LoginView, meta: { public: true } },
  { path: '/providers', name: 'providers', component: ProvidersView, meta: { title: 'AI 厂商' } },
  { path: '/models', name: 'models', component: ModelsView, meta: { title: '模型' } },
  { path: '/relay-keys', name: 'relay-keys', component: RelayKeysView, meta: { title: 'Relay Key' } },
  { path: '/quickstart', name: 'quickstart', component: QuickStartView, meta: { title: '调用方式' } },
  { path: '/:pathMatch(.*)*', redirect: '/providers' },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

router.beforeEach((to) => {
  const password = sessionStorage.getItem('openrelay_admin_password') || ''
  if (!to.meta.public && !password) return '/login'
  if (to.name === 'login' && password) return '/providers'
})

export default router
