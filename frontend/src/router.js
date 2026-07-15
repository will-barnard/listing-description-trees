import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from './stores/auth'

const routes = [
  {
    path: '/login',
    name: 'login',
    component: () => import('./views/LoginView.vue'),
    meta: { public: true }
  },
  {
    path: '/register',
    name: 'register',
    component: () => import('./views/RegisterView.vue'),
    meta: { public: true }
  },
  {
    path: '/',
    name: 'home',
    component: () => import('./views/HomeView.vue')
  },
  {
    path: '/navigate/:treeId',
    name: 'navigate',
    component: () => import('./views/NavigateView.vue'),
    props: true
  },
  {
    path: '/design/:treeId',
    name: 'design',
    component: () => import('./views/DesignView.vue'),
    props: true
  },
  {
    path: '/settings',
    name: 'settings',
    component: () => import('./views/SettingsView.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()

  if (!auth.loaded) {
    await auth.fetchUser()
  }

  if (to.meta.public) {
    // Already signed in — don't let a logged-in user sit on /login or /register
    if (auth.user && (to.name === 'login' || to.name === 'register')) {
      return { path: '/' }
    }
    return true
  }

  if (!auth.user) {
    return { path: '/login', query: to.fullPath !== '/' ? { redirect: to.fullPath } : undefined }
  }

  return true
})

export default router
