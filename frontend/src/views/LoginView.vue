<template>
  <div class="auth-page">
    <div class="auth-card card">
      <h1>Sign in</h1>
      <p class="auth-sub">Listing Description Trees</p>

      <p v-if="auth.sessionExpired" class="banner banner-warning">
        Your session expired. Please sign in again.
      </p>
      <p v-if="error" class="banner banner-danger">{{ error }}</p>

      <form @submit.prevent="submit">
        <div class="form-group">
          <label>Email or username</label>
          <input v-model="identifier" type="text" autocomplete="username" autofocus required />
        </div>
        <div class="form-group">
          <label>Password</label>
          <input v-model="password" type="password" autocomplete="current-password" required />
        </div>
        <button class="btn btn-primary auth-submit" type="submit" :disabled="submitting">
          {{ submitting ? 'Signing in…' : 'Sign in' }}
        </button>
      </form>

      <p v-if="!statusLoaded" class="auth-footnote">&nbsp;</p>
      <p v-else-if="!hasUsers" class="auth-footnote">
        No accounts exist yet. <router-link to="/register">Create the admin account</router-link>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { api } from '../api'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const identifier = ref('')
const password = ref('')
const error = ref('')
const submitting = ref(false)
const hasUsers = ref(true)
const statusLoaded = ref(false)

onMounted(async () => {
  try {
    const status = await api.getAuthStatus()
    hasUsers.value = status.hasUsers
    if (!status.hasUsers) {
      router.replace('/register')
      return
    }
  } finally {
    statusLoaded.value = true
  }
})

async function submit() {
  error.value = ''
  submitting.value = true
  try {
    await auth.login(identifier.value.trim(), password.value)
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/'
    router.replace(redirect)
  } catch (err) {
    error.value = err.message || 'Login failed'
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.auth-page {
  min-height: 70vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.auth-card {
  width: 100%;
  max-width: 380px;
}

.auth-card h1 {
  font-size: 1.4rem;
  margin-bottom: 2px;
}

.auth-sub {
  color: var(--text-muted);
  font-size: 0.9rem;
  margin-bottom: 20px;
}

.auth-submit {
  width: 100%;
  justify-content: center;
  margin-top: 4px;
}

.auth-footnote {
  margin-top: 16px;
  font-size: 0.85rem;
  color: var(--text-muted);
  text-align: center;
}

.banner {
  border-radius: var(--radius);
  padding: 8px 12px;
  font-size: 0.85rem;
  margin-bottom: 16px;
}

.banner-warning {
  background: rgba(251, 191, 36, 0.12);
  color: var(--warning);
}

.banner-danger {
  background: var(--danger-bg);
  color: var(--danger);
}
</style>
