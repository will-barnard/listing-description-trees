<template>
  <div class="app">
    <header class="app-header">
      <router-link to="/" class="logo">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <!-- shared trunk -->
          <line x1="12" y1="21" x2="12" y2="16"/>
          <!-- left: stem branching into a round, many-boughed canopy -->
          <line x1="12" y1="16" x2="9" y2="12"/>
          <line x1="9" y1="12" x2="6" y2="8"/>
          <line x1="9" y1="12" x2="9" y2="6"/>
          <line x1="9" y1="12" x2="6" y2="14"/>
          <circle cx="9" cy="11" r="2.4" fill="currentColor" stroke="none"/>
          <circle cx="5.3" cy="7" r="2.1" fill="currentColor" stroke="none"/>
          <circle cx="9" cy="5" r="1.9" fill="currentColor" stroke="none"/>
          <circle cx="5" cy="14.5" r="1.9" fill="currentColor" stroke="none"/>
          <!-- right: stem branching into a decision-tree node graph -->
          <line x1="12" y1="16" x2="15" y2="12"/>
          <circle cx="15" cy="12" r="1.2" fill="currentColor" stroke="none"/>
          <line x1="15" y1="12" x2="18" y2="6.5"/>
          <circle cx="18" cy="6.5" r="1.3" fill="currentColor" stroke="none"/>
          <line x1="15" y1="12" x2="17" y2="15"/>
          <circle cx="17" cy="15" r="1.2" fill="currentColor" stroke="none"/>
          <line x1="17" y1="15" x2="20" y2="12.5"/>
          <circle cx="20" cy="12.5" r="1.1" fill="currentColor" stroke="none"/>
          <line x1="17" y1="15" x2="20" y2="16.5"/>
          <circle cx="20" cy="16.5" r="1.1" fill="currentColor" stroke="none"/>
        </svg>
        <span>Listing Trees</span>
      </router-link>
      <nav class="app-nav" v-if="auth.user">
        <router-link to="/" class="nav-link">Home</router-link>
        <router-link to="/restoration-disclaimer" class="nav-link">Restoration Disclaimer</router-link>
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
