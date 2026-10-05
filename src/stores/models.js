import { defineStore } from 'pinia'
import { apiRequest } from '../services/api.js'

export const useModelsStore = defineStore('models', {
  state: () => ({
    items: [],
    loading: false,
  }),
  getters: {
    enabled: (state) => state.items.filter((item) => item.enabled !== false),
  },
  actions: {
    async load() {
      this.loading = true
      try {
        const result = await apiRequest('/api/admin/models')
        this.items = result.data || []
      } finally {
        this.loading = false
      }
    },
    async create(payload) {
      await apiRequest('/api/admin/models', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      await this.load()
    },
    async remove(id) {
      await apiRequest(`/api/admin/models/${id}`, { method: 'DELETE' })
      await this.load()
    },
  },
})
