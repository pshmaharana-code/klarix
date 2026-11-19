import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from './stores/auth'
import Dashboard from './views/Dashboard.vue'
import Connect from './views/Connect.vue'

const routes = [
  {
    path: '/',
    name: 'Landing',
    component: () => import('./views/Landing.vue'),
    meta: { public: true }
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('./views/Login.vue'),
    meta: { guestOnly: true }
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: Dashboard,
    meta: { requiresAuth: true }
  },
  {
    path: '/analytics',
    name: 'AccountAnalytics',
    component: () => import('./views/AccountAnalytics.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/patterns',
    name: 'Patterns',
    component: () => import('./views/Patterns.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/patterns/:patternId',
    name: 'PatternDetail',
    component: () => import('./views/PatternDetail.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/memory',
    name: 'BrandMemory',
    component: () => import('./views/BrandMemory.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/onboarding/connect',
    name: 'Connect',
    component: Connect,
    meta: { requiresAuth: true }
  },
  {
    path: '/content',
    name: 'ContentCatalogue',
    component: () => import('./views/ContentCatalogue.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/content/:contentId',
    name: 'ContentDetail',
    component: () => import('./views/ContentDetail.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/strategy',
    name: 'Strategy',
    component: () => import('./views/Strategy.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/strategy/:strategyId/ideas',
    name: 'StrategyIdeas',
    component: () => import('./views/StrategyIdeas.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/strategy/:strategyId/ideas/:ideaId/script',
    name: 'StrategyScript',
    component: () => import('./views/StrategyScript.vue'),
    meta: { requiresAuth: true }
  },
  {
    // Catch-all fallback redirects unknown URLs to the public landing page
    path: '/:pathMatch(.*)*',
    redirect: '/'
  }
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    } else if (to.hash) {
      return { el: to.hash, behavior: 'smooth' }
    } else {
      return { top: 0, left: 0, behavior: 'instant' }
    }
  }
})

router.beforeEach(async (to) => {
  const authStore = useAuthStore()

  // Public landing route renders immediately while checking session silently in background
  if (to.meta.public) {
    if (authStore.isInitializing) {
      authStore.checkSession()
    }
    return true
  }

  // Strictly verify the HTTP-only session cookie before entering protected or guest-only routes
  if (authStore.isInitializing) {
    await authStore.checkSession()
  }

  // Block unauthenticated users from accessing any protected V2 route
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return { name: 'Login' }
  }

  // Redirect already-authenticated users away from the Login screen
  if (to.meta.guestOnly && authStore.isAuthenticated) {
    return { name: 'Dashboard' }
  }

  return true
})