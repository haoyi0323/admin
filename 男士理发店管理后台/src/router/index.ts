import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'
import Login from '../views/Login.vue'
import Dashboard from '../views/Dashboard.vue'
import Services from '../views/Services.vue'
import Bookings from '../views/Bookings.vue'
import Settings from '../views/Settings.vue'

const routes: RouteRecordRaw[] = [
  { path: '/login', name: 'login', component: Login },
  { path: '/', name: 'dashboard', component: Dashboard },
  { path: '/services', name: 'services', component: Services },
  { path: '/bookings', name: 'bookings', component: Bookings },
  { path: '/settings', name: 'settings', component: Settings }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 登录守卫：除 /login 外必须有 ADMIN_TOKEN 才可访问
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('ADMIN_TOKEN')
  if (to.path === '/login') {
    if (token) {
      next({ path: '/' })
    } else {
      next()
    }
    return
  }
  if (!token) {
    next({ path: '/login', query: { redirect: to.fullPath } })
  } else {
    next()
  }
})

export default router