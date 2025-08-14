<template>
  <view class="page">
    <view class="header">
      <text class="title">我的预约</text>
    </view>
    
    <view class="tabs">
      <view 
        class="tab" 
        :class="{ active: activeTab === 'all' }"
        @click="switchTab('all')"
      >
        全部
      </view>
      <view 
        class="tab" 
        :class="{ active: activeTab === 'pending' }"
        @click="switchTab('pending')"
      >
        进行中
      </view>
      <view 
        class="tab" 
        :class="{ active: activeTab === 'completed' }"
        @click="switchTab('completed')"
      >
        已完成
      </view>
      <view 
        class="tab" 
        :class="{ active: activeTab === 'cancelled' }"
        @click="switchTab('cancelled')"
      >
        已取消
      </view>
    </view>

    <view class="booking-list" v-if="filteredBookings.length > 0">
      <view 
        class="booking-item" 
        v-for="booking in filteredBookings" 
        :key="booking._id"
      >
        <view class="booking-header">
          <text class="service-name">{{ getServiceName(booking.serviceId) }}</text>
          <view class="status" :class="booking.status">
            {{ getStatusText(booking.status) }}
          </view>
        </view>
        
        <view class="booking-info">
          <view class="info-row">
            <text class="label">预约时间：</text>
            <text class="value">{{ formatDateTime(booking.date, booking.time) }}</text>
          </view>
          <view class="info-row">
            <text class="label">服务时长：</text>
            <text class="value">{{ booking.durationMin }}分钟</text>
          </view>
          <view class="info-row" v-if="booking.contactPhone">
            <text class="label">联系电话：</text>
            <text class="value">{{ booking.contactPhone }}</text>
          </view>
          <view class="info-row" v-if="booking.remark">
            <text class="label">备注：</text>
            <text class="value">{{ booking.remark }}</text>
          </view>
        </view>
        
        <view class="booking-actions" v-if="booking.status === 'pending'">
          <button 
            class="cancel-btn" 
            size="mini" 
            @click="cancelBooking(booking._id)"
          >
            取消预约
          </button>
        </view>
      </view>
    </view>
    
    <view class="empty" v-else>
      <image class="empty-icon" src="/static/icons/empty.png" mode="widthFix"></image>
      <text class="empty-text">暂无预约记录</text>
      <button class="book-now-btn" type="primary" @click="goToBooking">
        立即预约
      </button>
    </view>
    
    <view class="loading" v-if="loading">
      <text>加载中...</text>
    </view>
  </view>
</template>

<script>
import { servicesData } from '../../common/services.js'

export default {
  name: 'MyBookings',
  data() {
    return {
      activeTab: 'all',
      bookings: [],
      loading: false,
      user: null
    }
  },
  computed: {
    filteredBookings() {
      if (this.activeTab === 'all') {
        return this.bookings
      }
      return this.bookings.filter(booking => booking.status === this.activeTab)
    }
  },
  onLoad() {
    this.loadUser()
    this.loadBookings()
  },
  onShow() {
    this.loadBookings()
  },
  methods: {
    loadUser() {
      try {
        const cached = uni.getStorageSync('MY_USER')
        if (cached && typeof cached === 'object') {
          this.user = cached
        }
      } catch (e) {
        console.error('加载用户信息失败:', e)
      }
    },
    
    async loadBookings() {
      if (!this.user || !this.user.id) {
        // 未登录时引导用户前往个人中心完成登录
        const modalRes = await uni.showModal({
          title: '请先登录',
          content: '前往个人中心完成登录后再查看预约记录',
          confirmText: '去登录',
          cancelText: '取消'
        })
        if (modalRes.confirm) {
          uni.navigateTo({ url: '/pages/profile/index' })
        }
        return
      }
      
      this.loading = true
      try {
        const res = await uniCloud.callFunction({
          name: 'booking',
          data: {
            action: 'getUserBookings',
            userId: this.user.id
          }
        })
        
        if (res.result && res.result.success) {
          this.bookings = res.result.data || []
        } else {
          uni.showToast({
            title: res.result?.message || '加载失败',
            icon: 'none'
          })
        }
      } catch (error) {
        console.error('加载预约记录失败:', error)
        uni.showToast({
          title: '加载失败',
          icon: 'none'
        })
      } finally {
        this.loading = false
      }
    },
    
    switchTab(tab) {
      this.activeTab = tab
    },
    
    getServiceName(serviceId) {
      const service = servicesData.find(s => s.id === serviceId)
      return service ? service.name : '未知服务'
    },
    
    getStatusText(status) {
      const statusMap = {
        'pending': '进行中',
        'completed': '已完成',
        'cancelled': '已取消'
      }
      return statusMap[status] || status
    },
    
    formatDateTime(date, time) {
      return `${date} ${time}`
    },
    
    async cancelBooking(bookingId) {
      const result = await uni.showModal({
        title: '确认取消',
        content: '确定要取消这个预约吗？',
        confirmText: '确定',
        cancelText: '取消'
      })
      
      if (!result.confirm) {
        return
      }
      
      try {
        const res = await uniCloud.callFunction({
          name: 'booking',
          data: {
            action: 'cancelBooking',
            bookingId: bookingId
          }
        })
        
        if (res.result && res.result.success) {
          uni.showToast({
            title: '取消成功',
            icon: 'success'
          })
          this.loadBookings() // 重新加载数据
        } else {
          uni.showToast({
            title: res.result?.message || '取消失败',
            icon: 'none'
          })
        }
      } catch (error) {
        console.error('取消预约失败:', error)
        uni.showToast({
          title: '取消失败',
          icon: 'none'
        })
      }
    },
    
    goToBooking() {
      uni.navigateTo({
        url: '/pages/booking/index'
      })
    }
  }
}
</script>

<style>
.page {
  background: #f7f8fa;
  min-height: 100vh;
}

.header {
  background: #fff;
  padding: 24rpx;
  text-align: center;
  border-bottom: 1rpx solid #f0f0f0;
}

.title {
  font-size: 36rpx;
  font-weight: 600;
  color: #222;
}

.tabs {
  display: flex;
  background: #fff;
  border-bottom: 1rpx solid #f0f0f0;
}

.tab {
  flex: 1;
  padding: 24rpx 0;
  text-align: center;
  font-size: 28rpx;
  color: #666;
  position: relative;
}

.tab.active {
  color: #22c55e;
  font-weight: 600;
}

.tab.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 60rpx;
  height: 4rpx;
  background: #22c55e;
  border-radius: 2rpx;
}

.booking-list {
  padding: 24rpx;
}

.booking-item {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.05);
}

.booking-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}

.service-name {
  font-size: 32rpx;
  font-weight: 600;
  color: #222;
}

.status {
  padding: 8rpx 16rpx;
  border-radius: 20rpx;
  font-size: 24rpx;
  color: #fff;
}

.status.pending {
  background: #3b82f6;
}

.status.completed {
  background: #22c55e;
}

.status.cancelled {
  background: #ef4444;
}

.booking-info {
  margin-bottom: 16rpx;
}

.info-row {
  display: flex;
  margin-bottom: 8rpx;
}

.label {
  color: #666;
  font-size: 26rpx;
  width: 160rpx;
}

.value {
  color: #333;
  font-size: 26rpx;
  flex: 1;
}

.booking-actions {
  display: flex;
  justify-content: flex-end;
  padding-top: 16rpx;
  border-top: 1rpx solid #f0f0f0;
}

.cancel-btn {
  background: #ef4444;
  color: #fff;
  border: none;
}

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120rpx 24rpx;
}

.empty-icon {
  width: 200rpx;
  opacity: 0.5;
  margin-bottom: 24rpx;
}

.empty-text {
  font-size: 28rpx;
  color: #999;
  margin-bottom: 32rpx;
}

.book-now-btn {
  background: #22c55e;
  color: #fff;
  border-radius: 24rpx;
  padding: 16rpx 48rpx;
}

.loading {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 48rpx;
  color: #999;
}
</style>