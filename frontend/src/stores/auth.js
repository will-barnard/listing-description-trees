import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api } from '../api'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const loaded = ref(false)

  async function fetchUser() {
    try {
      user.value = await api.getMe()
    } catch {
      user.value = null
    } finally {
      loaded.value = true
    }
  }

  return { user, loaded, fetchUser }
})
