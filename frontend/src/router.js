import { createRouter, createWebHistory } from 'vue-router'

const routes = [
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

export default router
