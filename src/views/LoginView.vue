<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth.js'
import { useToastStore } from '../stores/toast.js'
import BaseButton from '../components/ui/BaseButton.vue'

const password = ref('')
const auth = useAuthStore()
const toast = useToastStore()
const router = useRouter()

async function submit() {
  try {
    await auth.login(password.value)
    toast.success('登录成功')
    router.replace('/providers')
  } catch (error) {
    toast.error(error.message)
  }
}
</script>

<template>
  <div class="login-page">
    <section class="login-hero">
      <div class="login-brand-mark">OR</div>
      <div class="login-eyebrow">OPENRELAY AI GATEWAY</div>
      <h1>一个入口，管理多个 AI 厂商。</h1>
      <p>集中管理 Provider API Key、可用模型与 Relay Key。真实厂商密钥加密后存入 KV，客户端无需直接保存上游密钥。</p>
      <div class="login-feature-grid">
        <article><strong>Provider</strong><span>OpenAI、Claude、Gemini、Grok、Qwen 等</span></article>
        <article><strong>Models</strong><span>根据厂商 API Key 动态获取可用模型</span></article>
        <article><strong>Relay Key</strong><span>统一给客户端使用 OpenRelay 凭据</span></article>
      </div>
    </section>

    <section class="login-card">
      <div class="panel-kicker">SECURE ACCESS</div>
      <h2>进入管理后台</h2>
      <p>请输入部署时配置的 <code>OPENRELAY_PASSWORD</code>。</p>
      <form class="login-form" @submit.prevent="submit">
        <label class="field">
          <span>OpenRelay 密码</span>
          <input v-model="password" type="password" autocomplete="current-password" placeholder="输入 OPENRELAY_PASSWORD" required autofocus />
        </label>
        <BaseButton variant="primary" type="submit" :loading="auth.busy">登录后台</BaseButton>
      </form>
      <div class="login-security-note">密码只保存在当前浏览器会话中，同时用于后台鉴权和厂商 API Key 加解密。</div>
    </section>
  </div>
</template>
