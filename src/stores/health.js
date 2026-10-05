import { defineStore } from 'pinia'

export const useHealthStore = defineStore('health', {
  state: () => ({
    loading: false,
    ok: false,
    kvBound: false,
    passwordConfigured: false,
    error: '',
  }),
  actions: {
    async check() {
      this.loading = true
      this.error = ''
      try {
        const response = await fetch('/api/health')
        const payload = await response.json()
        this.ok = Boolean(payload.ok)
        this.kvBound = Boolean(payload.kvBound)
        this.passwordConfigured = Boolean(payload.passwordConfigured)
      } catch (error) {
        this.ok = false
        this.error = error?.message || '无法连接服务'
      } finally {
        this.loading = false
      }
    },
  },
})
