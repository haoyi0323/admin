// 统一封装对 uniCloud 阿里云云函数的 HTTP 访问
// 由于管理后台跑在 Vercel，无法直接调用 uniCloud SDK，这里通过 HTTP 云函数 URL 化 或 云对象 HTTP 化
// 先提供一个占位方案：通过 API 网关/服务空间 HTTP 入口进行调用。

import axios from 'axios'

// 使用同域反向代理路径，避免跨域和多域名配置
const BASE_URL = import.meta.env.VITE_UNICLOUD_HTTP_BASE || '/api'
// 本地代理不可用时的直连后备地址（与 vite.config.ts、api/index.ts 保持一致）
const GATEWAY_FALLBACK = 'https://fc-mp-07deb218-bf71-47a5-9cf0-10e81e399ed3.next.bspapp.com/http/api-gateway'

function getAdminToken() {
  return localStorage.getItem('ADMIN_TOKEN') || ''
}

export async function callFunction(name: string, data: any = {}) {
  if (!BASE_URL) throw new Error('未配置 VITE_UNICLOUD_HTTP_BASE')
  const payload = { name, data: { ...data, adminToken: getAdminToken() } }
  // 确保以 / 结尾，避免代理重写到空路径导致请求中断
  const apiUrl = BASE_URL.endsWith('/') ? BASE_URL : BASE_URL + '/'
  try {
    const res = await axios.post(apiUrl, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 15000
    })
    const result = res.data?.result || res.data
    if (result && result.success && result.result) return result.result
    return result
  } catch (err) {
    // 本地代理失败时，自动退回直连网关
    const res = await axios.post(GATEWAY_FALLBACK, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 15000
    })
    const result = res.data?.result || res.data
    if (result && result.success && result.result) return result.result
    return result
  }
}

export async function fetchStats() {
  const res = await callFunction('booking', { action: 'getAllBookings' })
  const list = res?.data || res || []
  const todayStr = new Date().toISOString().slice(0,10)
  const todayTotal = list.filter((b: any) => b.date === todayStr).length
  const pending = list.filter((b: any) => b.status === 'pending').length
  const completed = list.filter((b: any) => b.status === 'completed').length
  return { todayTotal, pending, completed }
}

export async function fetchRecentBookings(limit = 10) {
  const [bookings, services] = await Promise.all([
    callFunction('booking', { action: 'getAllBookings', pageSize: limit }),
    callFunction('services', { action: 'list', includeInactive: true })
  ])
  
  const serviceMap = new Map()
  const servicesList = services?.data || []
  servicesList.forEach((s: any) => serviceMap.set(s._id, s.name))
  
  const bookingsList = bookings?.data || bookings || []
  return bookingsList.slice(0, limit).map((booking: any) => ({
    date: booking.date,
    time: booking.time,
    serviceName: serviceMap.get(booking.serviceId) || `服务ID:${booking.serviceId}`,
    status: booking.status === 'pending' ? '待处理' : 
            booking.status === 'completed' ? '已完成' :
            booking.status === 'cancelled' ? '已取消' : 
            booking.status === 'confirmed' ? '已确认' : '未知状态'
  }))
}

export async function uploadImageByBase64(base64: string, fileName: string, fileType?: string) {
  const res = await callFunction('upload', { action: 'upload', fileBase64: base64, fileName, fileType })
  return res?.url || res?.data?.url || res?.data?.fileID
}

// 预约管理：获取所有预约
export async function fetchAllBookings() {
  const res = await callFunction('booking', { action: 'getAllBookings' })
  return res?.data || res || []
}

// 预约管理：更新预约状态
export async function updateBookingStatus(bookingId: string, status: 'pending'|'confirmed'|'completed'|'cancelled') {
  const res = await callFunction('booking', { action: 'updateBookingStatus', bookingId, status })
  // 云函数返回 success 布尔或 code:0 形式，做兼容
  if (res?.success === false) throw new Error(res?.message || '更新失败')
  if (res?.code && res.code !== 0 && res.code !== 200) throw new Error(res?.message || '更新失败')
  return true
}

// 预约管理：取消预约
export async function cancelBooking(bookingId: string) {
  const res = await callFunction('booking', { action: 'cancelBooking', bookingId })
  if (res?.success === false) throw new Error(res?.message || '取消失败')
  if (res?.code && res.code !== 0 && res.code !== 200) throw new Error(res?.message || '取消失败')
  return true
}

// 服务：获取服务列表（含禁用）
export async function fetchServices(includeInactive = true) {
  const res = await callFunction('services', { action: 'list', includeInactive })
  return res?.data || res || []
}

// 删除云存储中的图片
export async function deleteImage(fileID: string) {
  if (!fileID) return
  try {
    await callFunction('upload', { action: 'delete', fileID })
  } catch (e) {
    console.warn('删除图片失败，已忽略：', e)
  }
}

export async function fetchShopOpen() {
  const res = await callFunction('booking', { action: 'getShopOpen' })
  if (res?.code === 0) return res.data?.shopOpen ?? true
  return res?.data?.shopOpen ?? res?.shopOpen ?? true
}

export async function setShopOpen(open: boolean) {
  const res = await callFunction('booking', { action: 'setShopOpen', open })
  if (res?.code && res.code !== 0) throw new Error(res?.message || '设置失败')
  return Boolean(res?.data?.shopOpen ?? open)
}

// Token管理：获取管理员Token列表
export async function getAdminTokens() {
  const res = await callFunction('booking', { action: 'getAdminTokens' })
  if (res?.success === false) throw new Error(res?.message || '获取Token列表失败')
  if (res?.code && res.code !== 0 && res.code !== 200) throw new Error(res?.message || '获取Token列表失败')
  return res?.data?.tokens || res?.tokens || []
}

// Token管理：设置管理员Token列表
export async function setAdminTokens(tokens: string[]) {
  if (!Array.isArray(tokens) || tokens.length === 0) {
    throw new Error('Token列表不能为空')
  }
  
  // 验证Token格式
  for (const token of tokens) {
    if (!token || typeof token !== 'string' || token.length < 6) {
      throw new Error('每个Token必须是至少6位的字符串')
    }
  }
  
  const res = await callFunction('booking', { action: 'setAdminTokens', tokens })
  if (res?.success === false) throw new Error(res?.message || '设置Token失败')
  if (res?.code && res.code !== 0 && res.code !== 200) throw new Error(res?.message || '设置Token失败')
  return true
}

// 导出getAdminToken函数供其他组件使用
export { getAdminToken }