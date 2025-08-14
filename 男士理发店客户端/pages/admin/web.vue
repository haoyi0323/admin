<template>
  <view class="admin-page">
    <!-- 登录界面 -->
    <view v-if="!isLoggedIn" class="login-container">
      <view class="login-card">
        <view class="login-header">
          <text class="login-title">M·Y 理发店管理后台</text>
          <text class="login-subtitle">请输入管理员密码</text>
        </view>
        <view class="login-form">
          <input 
            class="password-input" 
            type="password" 
            placeholder="请输入管理员密码" 
            v-model="password" 
            @confirm="login"
          />
          <button class="login-btn" type="primary" @click="login">登录</button>
        </view>
      </view>
    </view>

    <!-- 管理界面 -->
    <view v-else class="admin-container">
      <!-- 头部 -->
      <view class="admin-header">
        <text class="admin-title">管理后台</text>
        <button class="logout-btn" size="mini" @click="logout">退出</button>
      </view>

      <!-- 统计卡片 -->
      <view class="stats-container">
        <view class="stat-card">
          <text class="stat-number">{{ stats.todayBookings }}</text>
          <text class="stat-label">今日预约</text>
        </view>
        <view class="stat-card">
          <text class="stat-number">{{ stats.totalBookings }}</text>
          <text class="stat-label">总预约数</text>
        </view>
        <view class="stat-card">
          <text class="stat-number">{{ stats.pendingBookings }}</text>
          <text class="stat-label">待处理</text>
        </view>
      </view>

      <!-- 筛选器 -->
      <view class="filter-container">
        <picker 
          mode="selector" 
          :value="statusFilterIndex" 
          :range="statusOptions" 
          @change="onStatusFilterChange"
        >
          <view class="filter-item">
            <text>状态：{{ statusOptions[statusFilterIndex] }}</text>
          </view>
        </picker>
        <picker 
          mode="date" 
          :value="dateFilter" 
          @change="onDateFilterChange"
        >
          <view class="filter-item">
            <text>日期：{{ dateFilter || '全部' }}</text>
          </view>
        </picker>
        <button class="refresh-btn" size="mini" @click="loadBookings">刷新</button>
      </view>

      <!-- 预约列表 -->
      <view class="bookings-container">
        <view class="section-title">预约管理</view>
        <view v-if="loading" class="loading">加载中...</view>
        <view v-else-if="filteredBookings.length === 0" class="empty">暂无预约记录</view>
        <view v-else>
          <view 
            v-for="booking in filteredBookings" 
            :key="booking._id" 
            class="booking-card"
          >
            <view class="booking-header">
              <text class="booking-service">{{ getServiceName(booking.serviceId) }}</text>
              <view class="booking-status" :class="getStatusClass(booking.status)">
                {{ getStatusText(booking.status) }}
              </view>
            </view>
            <view class="booking-info">
              <text class="booking-time">{{ booking.date }} {{ booking.time }}</text>
              <text class="booking-duration">时长：{{ booking.durationMin }}分钟</text>
            </view>
            <view class="booking-contact">
              <text class="booking-phone">电话：{{ booking.contactPhone }}</text>
              <text class="booking-user">用户ID：{{ booking.userId }}</text>
            </view>
            <view v-if="booking.remark" class="booking-remark">
              <text>备注：{{ booking.remark }}</text>
            </view>
            <view class="booking-actions">
              <button 
                v-if="booking.status === 'pending'" 
                class="action-btn confirm-btn" 
                size="mini" 
                @click="confirmBooking(booking._id)"
              >
                确认
              </button>
              <button 
                v-if="booking.status === 'pending' || booking.status === 'confirmed'" 
                class="action-btn cancel-btn" 
                size="mini" 
                @click="cancelBooking(booking._id)"
              >
                取消
              </button>
              <button 
                v-if="booking.status === 'confirmed'" 
                class="action-btn complete-btn" 
                size="mini" 
                @click="completeBooking(booking._id)"
              >
                完成
              </button>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { servicesData } from '../../common/services.js'

export default {
  name: 'AdminWeb',
  data() {
    return {
      isLoggedIn: false,
      password: '',
      adminPassword: 'admin123', // 管理员密码，实际项目中应该从服务器验证
      loading: false,
      bookings: [],
      stats: {
        todayBookings: 0,
        totalBookings: 0,
        pendingBookings: 0
      },
      statusFilterIndex: 0,
      statusOptions: ['全部', '待确认', '已确认', '已完成', '已取消'],
      statusMap: ['', 'pending', 'confirmed', 'completed', 'cancelled'],
      dateFilter: '',
      services: servicesData
    }
  },
  computed: {
    filteredBookings() {
      let filtered = this.bookings
      
      // 状态筛选
      if (this.statusFilterIndex > 0) {
        const status = this.statusMap[this.statusFilterIndex]
        filtered = filtered.filter(booking => booking.status === status)
      }
      
      // 日期筛选
      if (this.dateFilter) {
        filtered = filtered.filter(booking => booking.date === this.dateFilter)
      }
      
      return filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    }
  },
  onLoad() {
    // 检查是否已登录
    const loginStatus = uni.getStorageSync('ADMIN_LOGIN')
    if (loginStatus && loginStatus.timestamp > Date.now() - 24 * 60 * 60 * 1000) {
      this.isLoggedIn = true
      this.loadBookings()
    }
  },
  methods: {
    login() {
      if (this.password === this.adminPassword) {
        this.isLoggedIn = true
        // 保存登录状态（24小时有效）
        uni.setStorageSync('ADMIN_LOGIN', {
          timestamp: Date.now()
        })
        this.loadBookings()
        uni.showToast({ title: '登录成功', icon: 'success' })
      } else {
        uni.showToast({ title: '密码错误', icon: 'error' })
      }
    },
    logout() {
      this.isLoggedIn = false
      this.password = ''
      uni.removeStorageSync('ADMIN_LOGIN')
      uni.showToast({ title: '已退出', icon: 'success' })
    },
    async loadBookings() {
      this.loading = true
      try {
        const res = await uniCloud.callFunction({
          name: 'booking',
          data: { action: 'getAllBookings', adminToken: 'admin123' }
        })
        
        if (res.result && res.result.success) {
          this.bookings = res.result.data || []
          this.calculateStats()
        } else {
          uni.showToast({ title: res.result?.message || '加载失败', icon: 'error' })
        }
      } catch (error) {
        console.error('加载预约失败:', error)
        uni.showToast({ title: '加载失败', icon: 'error' })
      } finally {
        this.loading = false
      }
    },
    calculateStats() {
      const today = new Date().toISOString().split('T')[0]
      this.stats.totalBookings = this.bookings.length
      this.stats.todayBookings = this.bookings.filter(b => b.date === today).length
      this.stats.pendingBookings = this.bookings.filter(b => b.status === 'pending').length
    },
    async confirmBooking(bookingId) {
      try {
        const res = await uniCloud.callFunction({
          name: 'booking',
          data: { 
            action: 'updateBookingStatus', 
            bookingId, 
            status: 'confirmed',
            adminToken: 'admin123'
          }
        })
        
        if (res.result && res.result.success) {
          uni.showToast({ title: '已确认预约', icon: 'success' })
          this.loadBookings()
        } else {
          uni.showToast({ title: res.result?.message || '操作失败', icon: 'error' })
        }
      } catch (error) {
        console.error('确认预约失败:', error)
        uni.showToast({ title: '操作失败', icon: 'error' })
      }
    },
    async cancelBooking(bookingId) {
      try {
        const res = await uniCloud.callFunction({
          name: 'booking',
          data: { 
            action: 'updateBookingStatus', 
            bookingId, 
            status: 'cancelled',
            adminToken: 'admin123'
          }
        })
        
        if (res.result && res.result.success) {
          uni.showToast({ title: '已取消预约', icon: 'success' })
          this.loadBookings()
        } else {
          uni.showToast({ title: res.result?.message || '操作失败', icon: 'error' })
        }
      } catch (error) {
        console.error('取消预约失败:', error)
        uni.showToast({ title: '操作失败', icon: 'error' })
      }
    },
    async completeBooking(bookingId) {
      try {
        const res = await uniCloud.callFunction({
          name: 'booking',
          data: { 
            action: 'updateBookingStatus', 
            bookingId, 
            status: 'completed',
            adminToken: 'admin123'
          }
        })
        
        if (res.result && res.result.success) {
          uni.showToast({ title: '已完成服务', icon: 'success' })
          this.loadBookings()
        } else {
          uni.showToast({ title: res.result?.message || '操作失败', icon: 'error' })
        }
      } catch (error) {
        console.error('完成预约失败:', error)
        uni.showToast({ title: '操作失败', icon: 'error' })
      }
    },
    onStatusFilterChange(e) {
      this.statusFilterIndex = e.detail.value
    },
    onDateFilterChange(e) {
      this.dateFilter = e.detail.value
    },
    getServiceName(serviceId) {
      const service = this.services.find(s => s.id === serviceId)
      return service ? service.name : '未知服务'
    },
    getStatusText(status) {
      const statusMap = {
        pending: '待确认',
        confirmed: '已确认',
        completed: '已完成',
        cancelled: '已取消'
      }
      return statusMap[status] || status
    },
    getStatusClass(status) {
      return `status-${status}`
    }
  }
}
</script>

<style>
.admin-page {
  min-height: 100vh;
  background: #f5f5f5;
}

/* 登录界面样式 */
.login-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 40rpx;
}

.login-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 60rpx 40rpx;
  box-shadow: 0 8rpx 32rpx rgba(0,0,0,0.1);
  width: 100%;
  max-width: 600rpx;
}

.login-header {
  text-align: center;
  margin-bottom: 60rpx;
}

.login-title {
  display: block;
  font-size: 36rpx;
  font-weight: 600;
  color: #222;
  margin-bottom: 16rpx;
}

.login-subtitle {
  display: block;
  font-size: 28rpx;
  color: #666;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 32rpx;
}

.password-input {
  padding: 24rpx;
  border: 2rpx solid #e5e5e5;
  border-radius: 12rpx;
  font-size: 32rpx;
}

.login-btn {
  padding: 24rpx;
  font-size: 32rpx;
  font-weight: 600;
}

/* 管理界面样式 */
.admin-container {
  padding: 24rpx;
}

.admin-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fff;
  padding: 32rpx 24rpx;
  border-radius: 16rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.06);
}

.admin-title {
  font-size: 36rpx;
  font-weight: 600;
  color: #222;
}

.logout-btn {
  background: #f56565;
  color: #fff;
}

.stats-container {
  display: flex;
  gap: 16rpx;
  margin-bottom: 24rpx;
}

.stat-card {
  flex: 1;
  background: #fff;
  padding: 32rpx 24rpx;
  border-radius: 16rpx;
  text-align: center;
  box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.06);
}

.stat-number {
  display: block;
  font-size: 48rpx;
  font-weight: 700;
  color: #3b82f6;
  margin-bottom: 8rpx;
}

.stat-label {
  display: block;
  font-size: 24rpx;
  color: #666;
}

.filter-container {
  display: flex;
  align-items: center;
  gap: 16rpx;
  background: #fff;
  padding: 24rpx;
  border-radius: 16rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.06);
}

.filter-item {
  padding: 16rpx 24rpx;
  background: #f8f9fa;
  border-radius: 8rpx;
  font-size: 28rpx;
  color: #333;
}

.refresh-btn {
  background: #10b981;
  color: #fff;
  margin-left: auto;
}

.bookings-container {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.06);
}

.section-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #222;
  margin-bottom: 24rpx;
}

.loading, .empty {
  text-align: center;
  padding: 80rpx 0;
  color: #666;
  font-size: 28rpx;
}

.booking-card {
  border: 2rpx solid #f0f0f0;
  border-radius: 12rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
}

.booking-card:last-child {
  margin-bottom: 0;
}

.booking-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16rpx;
}

.booking-service {
  font-size: 32rpx;
  font-weight: 600;
  color: #222;
}

.booking-status {
  padding: 8rpx 16rpx;
  border-radius: 20rpx;
  font-size: 24rpx;
  color: #fff;
}

.status-pending {
  background: #f59e0b;
}

.status-confirmed {
  background: #3b82f6;
}

.status-completed {
  background: #10b981;
}

.status-cancelled {
  background: #ef4444;
}

.booking-info {
  display: flex;
  gap: 24rpx;
  margin-bottom: 12rpx;
}

.booking-time {
  font-size: 28rpx;
  color: #333;
  font-weight: 500;
}

.booking-duration {
  font-size: 26rpx;
  color: #666;
}

.booking-contact {
  display: flex;
  gap: 24rpx;
  margin-bottom: 12rpx;
}

.booking-phone, .booking-user {
  font-size: 26rpx;
  color: #666;
}

.booking-remark {
  margin-bottom: 16rpx;
  padding: 16rpx;
  background: #f8f9fa;
  border-radius: 8rpx;
  font-size: 26rpx;
  color: #555;
}

.booking-actions {
  display: flex;
  gap: 12rpx;
}

.action-btn {
  font-size: 24rpx;
  padding: 12rpx 24rpx;
}

.confirm-btn {
  background: #10b981;
  color: #fff;
}

.cancel-btn {
  background: #ef4444;
  color: #fff;
}

.complete-btn {
  background: #3b82f6;
  color: #fff;
}
</style>