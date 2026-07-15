<template>
  <div class="auth-page">
    <div class="auth-card card">
      <template v-if="checking">
        <p class="auth-footnote">Checking…</p>
      </template>
      <template v-else>
        <h1>Create admin account</h1>
        <p class="auth-sub">You're the first person here — this account becomes the admin. Everyone else will be added by you afterward.</p>

        <p v-if="error" class="banner banner-danger">{{ error }}</p>

        <form @submit.prevent="submit">
          <div class="form-group">
            <label>Email</label>
            <input v-model="email" type="email" autocomplete="email" autofocus required />
          </div>
          <div class="form-group">
            <label>Username</label>
            <input v-model="username" type="text" autocomplete="username" required />
          </div>
          <div class="form-group">
            <label>Password</label>
            <input v-model="password" type="password" autocomplete="new-password" required minlength="8" />
            <p class="field-help">At least 8 characters.</p>
          </div>
          <button class="btn btn-primary auth-submit" type="submit" :disabled="submitting">
            {{ submitting ? 'Creating…' : 'Create admin account' }}
          </button>
        </form>

        <p class="auth-footnote">
          Already have an account? <router-link to="/login">Sign in</router-link>
        </p>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { api } from '../api'

const router = useRouter()
const auth = useAuthStore()

const email = ref('')
const username = ref('')
const password = ref('')
const error = ref('')
const submitting = ref(false)
const checking = ref(true)

onMounted(async () => {
  try {
    const status = await api.getAuthStatus()
    if (status.hasUsers) {
      router.replace('/login')
      return
    }
  } finally {
    checking.value = false
  }
})

async function submit() {
  error.value = ''
  submitting.value = true
  try {
    await auth.register(email.value.trim(), username.value.trim(), password.value)
    router.replace('/')
  } catch (err) {
    error.value = err.message || 'Registration failed'
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
  max-width: 420px;
}

.auth-card h1 {
  font-size: 1.4rem;
  margin-bottom: 6px;
}

.auth-sub {
  color: var(--text-muted);
  font-size: 0.85rem;
  margin-bottom: 20px;
  line-height: 1.5;
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

.field-help {
  font-size: 0.78rem;
  color: var(--text-muted);
  margin-top: 4px;
}

.banner {
  border-radius: var(--radius);
  padding: 8px 12px;
  font-size: 0.85rem;
  margin-bottom: 16px;
}

.banner-danger {
  background: var(--danger-bg);
  color: var(--danger);
}
</style>
