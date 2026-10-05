import { defineStore } from 'pinia'
import { apiRequest } from '../services/api.js'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    password: sessionStorage.getItem('openrelay_admin_password') || '',
    busy: false,
  }),
  actions: {
    async login(password) {
      this.busy = true
      this.password = password
      sessionStorage.setItem('openrelay_admin_password', password)
      try {
        await apiRequest('/api/admin/providers')
      } catch (error) {
        this.logout()
        throw error
      } finally {
        this.busy = false
      }
    },
    async verify() {
      if (!this.password) throw new Error('未登录')
      await apiRequest('/api/admin/providers')
      return true
    },
    logout() {
      this.password = ''
      sessionStorage.removeItem('openrelay_admin_password')
    },
  },
})
