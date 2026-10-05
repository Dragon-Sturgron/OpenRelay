import { defineStore } from 'pinia'

let nextId = 1

export const useToastStore = defineStore('toast', {
  state: () => ({ items: [] }),
  actions: {
    show(message, type = 'success', duration = 3200) {
      const id = nextId++
      this.items.push({ id, message, type })
      window.setTimeout(() => this.dismiss(id), duration)
      return id
    },
    success(message) { return this.show(message, 'success') },
    error(message) { return this.show(message, 'error', 4600) },
    dismiss(id) { this.items = this.items.filter((item) => item.id !== id) },
  },
})
