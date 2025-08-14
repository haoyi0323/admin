// 统一封装对 uniCloud 阿里云云函数的 HTTP 访问
// 由于管理后台跑在 Vercel，无法直接调用 uniCloud SDK，这里通过 HTTP 云函数 URL 化 或 云对象 HTTP 化
// 先提供一个占位方案：通过 API 网关/服务空间 HTTP 入口进行调用。

import axios from 'axios'

// 使用同域反向代理路径，避免跨域和多域名配置
const BASE_URL = import.meta.env.VITE_UNICLOUD_HTTP_BASE || '/api'

function getAdminToken() {
  // 开发环境提供一个默认 token，避免未登录时 403
  const devToken = import.meta.env.DEV ? 'admin123' : ''
  return localStorage.getItem('ADMIN_TOKEN') || devToken
}

export async function callFunction(name: string, data: any = {}) {
  if (!BASE_URL) throw new Error('未配置 VITE_UNICLOUD_HTTP_BASE')
  const payload = { name, data: { ...data, adminToken: getAdminToken() } }
  const res = await axios.post(`${BASE_URL}`, payload)
  // 兼容直接返回与封装返回
  const result = res.data?.result || res.data
  // API 网关统一返回 { success, result } 形式时，解开一层
  if (result && result.success && result.result) return result.result
  return result
}

export async function fetchStats() {
  const [all, pending, completed] = await Promise.all([
    callFunction('booking', { action: 'getAllBookings', pageSize: 1 }),
    callFunction('booking', { action: 'getAllBookings', status: 'pending', pageSize: 1 }),
    callFunction('booking', { action: 'getAllBookings', status: 'completed', pageSize: 1 })
  ])
  const getTotal = (x: any) => x?.data?.total ?? x?.total ?? 0
  return { todayTotal: getTotal(all), pending: getTotal(pending), completed: getTotal(completed) }
}

export async function fetchRecentBookings(limit = 10) {
  const res = await callFunction('booking', { action: 'getAllBookings', pageSize: limit })
  return res?.data?.bookings || res?.data || []
}

export async function uploadImageByBase64(base64: string, fileName: string, fileType?: string) {
  const res = await callFunction('upload', { action: 'upload', fileBase64: base64, fileName, fileType })
  return res?.url || res?.data?.url || res?.data?.fileID
}