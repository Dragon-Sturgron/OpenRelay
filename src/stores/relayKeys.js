import { defineStore } from 'pinia'
import { apiRequest } from '../services/api.js'

export const useRelayKeysStore = defineStore('relayKeys', {
  state: () => ({
    items: [],
    loading: false,
  }),
  actions: {
    async load() {
      this.loading = true
      try {
        const result = await apiRequest('/api/admin/gateway-keys')
        this.items = result.data || []
      } finally {
        this.loading = false
      }
    },
    async create(name) {
      const result = await apiRequest('/api/admin/gateway-keys', {
        method: 'POST',
        body: JSON.stringify({ name }),
      })
      await this.load()
      return result
    },
    async remove(id) {
      await apiRequest(`/api/admin/gateway-keys/${id}`, { method: 'DELETE' })
      await this.load()
    },
  },
})
