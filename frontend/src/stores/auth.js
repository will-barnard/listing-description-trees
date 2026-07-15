import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api, setUnauthorizedHandler } from '../api'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const loaded = ref(false)
  // Set when a request came back 401 because the token had expired (as
  // opposed to simply never having logged in) so the login screen can show
  // a friendlier message.
  const sessionExpired = ref(false)

  const isAdmin = computed(() => user.value?.role === 'admin')

  async function fetchUser() {
    try {
      user.value = await api.getMe()
    } catch {
      user.value = null
    } finally {
      loaded.value = true
    }
  }

  async function login(identifier, password) {
    const { user: loggedInUser } = await api.login({ identifier, password })
    user.value = loggedInUser
    loaded.value = true
    sessionExpired.value = false
    return loggedInUser
  }

  async function register(email, username, password) {
    const { user: newUser } = await api.register({ email, username, password })
    user.value = newUser
    loaded.value = true
    sessionExpired.value = false
    return newUser
  }

  async function logout() {
    try {
      await api.logout()
    } catch {
      // ignore — we're clearing local state regardless
    }
    user.value = null
    loaded.value = true
  }

  // Called by api.js whenever any request comes back 401. Clears local
  // session state; if it was specifically an expired token, flags it so the
  // login screen can say "your session expired" instead of just "log in".
  function handleUnauthorized(code) {
    user.value = null
    loaded.value = true
    sessionExpired.value = code === 'TOKEN_EXPIRED'
  }

  setUnauthorizedHandler(handleUnauthorized)

  return { user, loaded, sessionExpired, isAdmin, fetchUser, login, register, logout }
})
