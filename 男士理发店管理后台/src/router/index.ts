import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'
import Login from '../views/Login.vue'
import Dashboard from '../views/Dashboard.vue'
import Services from '../views/Services.vue'

const routes: RouteRecordRaw[] = [
  { path: '/login', name: 'login', component: Login },
  { path: '/', name: 'dashboard', component: Dashboard },
  { path: '/services', name: 'services', component: Services }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router