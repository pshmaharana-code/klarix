import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from './stores/auth'
import Home from './views/Home.vue'
import Dashboard from './views/Dashboard.vue'
import Connect from './views/Connect.vue'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home
  },
  {
    path: '/analyse',
    name: 'Analyse',
    component: () => import('./views/Analyse.vue')
  },
  {
    path: '/demo',
    name: 'Demo',
    component: () => import('./views/Demo.vue')
  },
  {
    path: '/about',
    name: 'About',
    component: () => import('./views/About.vue')
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('./views/Login.vue')
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
  const authStore = useAuthStore();
  
  if (authStore.isInitializing) {
    await authStore.checkSession();
  }

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return { name: 'Login' };
  } else if (to.name === 'Login' && authStore.isAuthenticated) {
    return { name: 'Dashboard' };
  }

  return true;
});
