import { defineStore } from 'pinia'
import { apiRequest } from '../services/api.js'

export const useProvidersStore = defineStore('providers', {
  state: () => ({
    items: [],
    loading: false,
  }),
  getters: {
    enabled: (state) => state.items.filter((item) => item.enabled !== false),
    byId: (state) => (id) => state.items.find((item) => item.id === id),
  },
  actions: {
    async load() {
      this.loading = true
      try {
        const result = await apiRequest('/api/admin/providers')
        this.items = result.data || []
      } finally {
        this.loading = false
      }
    },
    async save(payload, id = '') {
      await apiRequest(id ? `/api/admin/providers/${id}` : '/api/admin/providers', {
        method: id ? 'PUT' : 'POST',
        body: JSON.stringify(payload),
      })
      await this.load()
    },
    async remove(id) {
      await apiRequest(`/api/admin/providers/${id}`, { method: 'DELETE' })
      await this.load()
    },
    async test(id) {
      return apiRequest(`/api/admin/providers/${id}/test`, { method: 'POST' })
    },
    async syncModels(id) {
      return apiRequest(`/api/admin/providers/${id}/models?refresh=1`)
    },
    async listModels(id, refresh = false) {
      return apiRequest(`/api/admin/providers/${id}/models${refresh ? '?refresh=1' : ''}`)
    },
    async revealKey(id) {
      return apiRequest(`/api/admin/providers/${id}/reveal-key`, {
        method: 'POST',
        cache: 'no-store',
      })
    },
  },
})
