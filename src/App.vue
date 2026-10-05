<script setup>
import { onMounted } from 'vue'
import { RouterView, useRouter } from 'vue-router'
import { useAuthStore } from './stores/auth.js'
import { useHealthStore } from './stores/health.js'
import ToastHost from './components/ui/ToastHost.vue'

const router = useRouter()
const auth = useAuthStore()
const health = useHealthStore()

onMounted(async () => {
  await health.check()
  if (auth.password) {
    try {
      await auth.verify()
      if (router.currentRoute.value.name === 'login') router.replace('/providers')
    } catch {
      auth.logout()
      router.replace('/login')
    }
  }
})
</script>

<template>
  <RouterView />
  <ToastHost />
</template>
