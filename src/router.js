import { createRouter, createWebHistory } from 'vue-router'
import Home from './views/Home.vue'

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
  }
]

export const router = createRouter({
  history: createWebHistory(),
  routes
})
