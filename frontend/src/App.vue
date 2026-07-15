<template>
  <div class="app">
    <header class="app-header">
      <router-link to="/" class="logo">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
        <span>Listing Trees</span>
      </router-link>
      <nav class="app-nav" v-if="auth.user">
        <router-link to="/" class="nav-link">Home</router-link>
        <router-link to="/settings" class="nav-link settings-link" title="Settings">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </router-link>
        <span class="user-badge" :class="{ 'user-badge-admin': auth.isAdmin }">{{ auth.user.username }}</span>
        <button class="btn btn-ghost btn-sm" @click="doLogout">Sign out</button>
      </nav>
    </header>
    <main class="app-main">
      <div v-if="!auth.loaded" class="loading-screen">Loading…</div>
      <router-view v-else />
    </main>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from './stores/auth'

const auth = useAuthStore()
const router = useRouter()

onMounted(() => {
  if (!auth.loaded) auth.fetchUser()
})

async function doLogout() {
  await auth.logout()
  router.replace('/login')
}
</script>

<style scoped>
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 24px;
  background: var(--bg-raised);
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
  z-index: 50;
}

.logo {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 700;
  font-size: 1.1rem;
  color: var(--text);
}

.logo:hover {
  color: var(--accent);
}

.app-nav {
  display: flex;
  align-items: center;
  gap: 16px;
}

.nav-link {
  color: var(--text-muted);
  font-size: 0.9rem;
  transition: color var(--transition);
}

.nav-link:hover,
.nav-link.router-link-active {
  color: var(--text);
}

.settings-link {
  display: flex;
  align-items: center;
}

.user-badge {
  font-size: 0.8rem;
  padding: 4px 10px;
  border-radius: 99px;
  background: var(--accent-bg);
  color: var(--accent);
  font-weight: 600;
}

.user-badge-admin {
  background: rgba(74, 222, 128, 0.12);
  color: var(--success);
}

.app-main {
  max-width: 1200px;
  margin: 0 auto;
  padding: 32px 24px;
}

.loading-screen {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 50vh;
  color: var(--text-muted);
  font-size: 1.1rem;
}
</style>
