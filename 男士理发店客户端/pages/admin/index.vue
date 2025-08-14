<template>
  <view class="admin-container">
    <!-- 头部 -->
    <view class="header">
      <view class="header-top">
        <text class="title">管理后台</text>
        <view class="header-actions">
          <button class="reminder-btn" @click="sendReminders">发送提醒</button>
        </view>
      </view>
      <view class="stats">
        <view class="stat-item">
          <text class="stat-number">{{ stats.total }}</text>
          <text class="stat-label">总预约</text>
        </view>
        <view class="stat-item">
          <text class="stat-number">{{ stats.pending }}</text>
          <text class="stat-label">待处理</text>
        </view>
        <view class="stat-item">
          <text class="stat-number">{{ stats.completed }}</text>
          <text class="stat-label">已完成</text>
        </view>
      </view>
    </view>

    <!-- 筛选器 -->
    <view class="filter-bar">
      <view class="filter-tabs">
        <view 
          v-for="tab in statusTabs" 
          :key="tab.value"
          class="filter-tab"
          :class="{ active: currentStatus === tab.value }"
          @click="switchStatus(tab.value)"
        >
          {{ tab.label }}
        </view>
      </view>
      <view class="date-filter">
        <picker mode="date" :value="selectedDate" @change="onDateChange">
          <view class="date-picker">
            <text>{{ selectedDate || '选择日期' }}</text>
            <text class="icon">📅</text>
          </view>
        </picker>
        <view class="clear-date" @click="clearDate" v-if="selectedDate">
          <text>清除</text>
        </view>
      </view>
    </view>

    <!-- 预约列表 -->
    <view class="booking-list">
      <view 
        v-for="booking in bookings" 
        :key="booking._id"
        class="booking-item"
      >
        <view class="booking-header">
          <view class="booking-info">
            <text class="service-name">{{ getServiceName(booking.serviceId) }}</text>
            <text class="booking-time">{{ formatDateTime(booking.date, booking.time) }}</text>
          </view>
          <view class="status-badge" :class="booking.status">
            {{ getStatusText(booking.status) }}
          </view>
        </view>
        
        <view class="booking-details">
          <view class="detail-row">
            <text class="label">客户电话：</text>
            <text class="value">{{ booking.contactPhone }}</text>
          </view>
          <view class="detail-row" v-if="booking.remark">
            <text class="label">备注：</text>
            <text class="value">{{ booking.remark }}</text>
          </view>
          <view class="detail-row">
            <text class="label">时长：</text>
            <text class="value">{{ booking.durationMin }}分钟</text>
          </view>
          <view class="detail-row">
            <text class="label">预约时间：</text>
            <text class="value">{{ formatTimestamp(booking.createdAt) }}</text>
          </view>
        </view>

        <view class="booking-actions" v-if="booking.status === 'pending'">
          <button class="action-btn complete" @click="updateStatus(booking._id, 'completed')">
            标记完成
          </button>
          <button class="action-btn cancel" @click="updateStatus(booking._id, 'cancelled')">
            取消预约
          </button>
        </view>
      </view>

      <!-- 空状态 -->
      <view v-if="bookings.length === 0" class="empty-state">
        <text class="empty-text">暂无预约记录</text>
      </view>

      <!-- 加载更多 -->
      <view v-if="hasMore" class="load-more" @click="loadMore">
        <text>加载更多</text>
      </view>
    </view>
  </view>
</template>

<script>
import { servicesData } from '@/common/services.js'

export default {
  data() {
    return {
      bookings: [],
      stats: {
        total: 0,
        pending: 0,
        completed: 0
      },
      currentStatus: '',
      selectedDate: '',
      page: 1,
      pageSize: 20,
      hasMore: true,
      loading: false,
      statusTabs: [
        { label: '全部', value: '' },
        { label: '待处理', value: 'pending' },
        { label: '已完成', value: 'completed' },
        { label: '已取消', value: 'cancelled' }
      ]
    }
  },
  
  onLoad() {
    this.loadBookings()
    this.loadStats()
  },
  
  methods: {
    async loadBookings(reset = false) {
      if (this.loading) return
      this.loading = true
      
      try {
        if (reset) {
          this.page = 1
          this.bookings = []
        }
        
        const params = {
          action: 'getAllBookings',
          page: this.page,
          pageSize: this.pageSize
        }
        
        if (this.currentStatus) {
          params.status = this.currentStatus
        }
        
        if (this.selectedDate) {
          params.date = this.selectedDate
        }
        
        const res = await uniCloud.callFunction({
          name: 'booking',
          data: params
        })
        
        if (res.result.success) {
          const { bookings, totalPages } = res.result.data
          
          if (reset) {
            this.bookings = bookings
          } else {
            this.bookings.push(...bookings)
          }
          
          this.hasMore = this.page < totalPages
          this.page++
        } else {
          uni.showToast({
            title: res.result.message || '加载失败',
            icon: 'none'
          })
        }
      } catch (error) {
        console.error('加载预约列表失败:', error)
        uni.showToast({
          title: '加载失败',
          icon: 'none'
        })
      } finally {
        this.loading = false
      }
    },
    
    async loadStats() {
      try {
        // 获取各状态的统计数据
        const promises = [
          uniCloud.callFunction({ name: 'booking', data: { action: 'getAllBookings', pageSize: 1 } }),
          uniCloud.callFunction({ name: 'booking', data: { action: 'getAllBookings', status: 'pending', pageSize: 1 } }),
          uniCloud.callFunction({ name: 'booking', data: { action: 'getAllBookings', status: 'completed', pageSize: 1 } })
        ]
        
        const [totalRes, pendingRes, completedRes] = await Promise.all(promises)
        
        this.stats = {
          total: totalRes.result.success ? totalRes.result.data.total : 0,
          pending: pendingRes.result.success ? pendingRes.result.data.total : 0,
          completed: completedRes.result.success ? completedRes.result.data.total : 0
        }
      } catch (error) {
        console.error('加载统计数据失败:', error)
      }
    },
    
    switchStatus(status) {
      this.currentStatus = status
      this.loadBookings(true)
    },
    
    onDateChange(e) {
      this.selectedDate = e.detail.value
      this.loadBookings(true)
    },
    
    clearDate() {
      this.selectedDate = ''
      this.loadBookings(true)
    },
    
    loadMore() {
      if (!this.hasMore || this.loading) return
      this.loadBookings()
    },
    
    async updateStatus(bookingId, status) {
      try {
        uni.showLoading({ title: '处理中...' })
        
        const res = await uniCloud.callFunction({
          name: 'booking',
          data: {
            action: 'updateBookingStatus',
            bookingId,
            status
          }
        })
        
        if (res.result.success) {
          uni.showToast({
            title: '操作成功',
            icon: 'success'
          })
          
          // 刷新列表和统计
          this.loadBookings(true)
          this.loadStats()
        } else {
          uni.showToast({
            title: res.result.message || '操作失败',
            icon: 'none'
          })
        }
      } catch (error) {
        console.error('更新状态失败:', error)
        uni.showToast({
          title: '操作失败',
          icon: 'none'
        })
      } finally {
        uni.hideLoading()
      }
    },
    
    getServiceName(serviceId) {
      const service = servicesData.find(s => s.id === serviceId)
      return service ? service.name : '未知服务'
    },
    
    getStatusText(status) {
      const statusMap = {
        pending: '待处理',
        completed: '已完成',
        cancelled: '已取消'
      }
      return statusMap[status] || status
    },
    
    formatDateTime(date, time) {
      return `${date} ${time}`
    },
    
    formatTimestamp(timestamp) {
      const date = new Date(timestamp)
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
    },
    
    async sendReminders() {
      uni.showActionSheet({
        itemList: ['发送24小时前提醒', '发送2小时前提醒', '运行完整提醒调度'],
        success: async (res) => {
          let type = '';
          let actionText = '';
          
          switch (res.tapIndex) {
            case 0:
              type = 'before24h';
              actionText = '发送24小时前提醒';
              break;
            case 1:
              type = 'before2h';
              actionText = '发送2小时前提醒';
              break;
            case 2:
              return this.runFullScheduler();
          }
          
          try {
            uni.showLoading({ title: '发送中...' });
            
            const res = await uniCloud.callFunction({
              name: 'reminder',
              data: {
                action: 'batchSendReminders',
                data: { type }
              }
            });
            
            if (res.result.success) {
              const { data } = res.result;
              const successCount = data.filter(item => item.status === 'sent').length;
              const skipCount = data.filter(item => item.status === 'skipped').length;
              const failCount = data.filter(item => item.status === 'failed').length;
              
              let message = `${actionText}完成\n`;
              message += `成功: ${successCount}条\n`;
              if (skipCount > 0) message += `跳过: ${skipCount}条\n`;
              if (failCount > 0) message += `失败: ${failCount}条`;
              
              uni.showModal({
                title: '提醒发送结果',
                content: message,
                showCancel: false
              });
            } else {
              uni.showToast({
                title: res.result.message || '发送失败',
                icon: 'none'
              });
            }
          } catch (error) {
            console.error('发送提醒失败:', error);
            uni.showToast({
              title: '发送失败',
              icon: 'none'
            });
          } finally {
            uni.hideLoading();
          }
        }
      });
    },
    
    async runFullScheduler() {
      try {
        uni.showLoading({ title: '运行调度中...' });
        
        const res = await uniCloud.callFunction({
          name: 'reminder-scheduler',
          data: { action: 'runScheduler' }
        });
        
        if (res.result.success) {
          const { data } = res.result;
          let message = '调度执行完成\n\n';
          
          if (data.before24h) {
            const before24hData = data.before24h.data || [];
            const success24h = before24hData.filter(item => item.status === 'sent').length;
            message += `24小时前提醒: ${success24h}条\n`;
          }
          
          if (data.before2h) {
            const before2hData = data.before2h.data || [];
            const success2h = before2hData.filter(item => item.status === 'sent').length;
            message += `2小时前提醒: ${success2h}条\n`;
          }
          
          if (data.errors.length > 0) {
            message += `\n错误: ${data.errors.length}个`;
          }
          
          uni.showModal({
            title: '调度执行结果',
            content: message,
            showCancel: false
          });
        } else {
          uni.showToast({
            title: res.result.message || '调度失败',
            icon: 'none'
          });
        }
      } catch (error) {
        console.error('运行调度失败:', error);
        uni.showToast({
          title: '调度失败',
          icon: 'none'
        });
      } finally {
        uni.hideLoading();
      }
    }
  }
}
</script>

<style scoped>
.admin-container {
  min-height: 100vh;
  background-color: #f5f5f5;
}

.header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 40rpx 30rpx 30rpx;
  color: white;
}

.header-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30rpx;
}

.title {
  font-size: 36rpx;
  font-weight: bold;
}

.header-actions {
  display: flex;
  gap: 20rpx;
}

.reminder-btn {
  padding: 12rpx 24rpx;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: 1rpx solid rgba(255, 255, 255, 0.3);
  border-radius: 20rpx;
  font-size: 24rpx;
  backdrop-filter: blur(10rpx);
}

.reminder-btn:active {
  background: rgba(255, 255, 255, 0.3);
}

.stats {
  display: flex;
  justify-content: space-between;
}

.stat-item {
  text-align: center;
  flex: 1;
}

.stat-number {
  display: block;
  font-size: 32rpx;
  font-weight: bold;
  margin-bottom: 10rpx;
}

.stat-label {
  font-size: 24rpx;
  opacity: 0.9;
}

.filter-bar {
  background: white;
  padding: 20rpx 30rpx;
  border-bottom: 1rpx solid #eee;
}

.filter-tabs {
  display: flex;
  margin-bottom: 20rpx;
}

.filter-tab {
  padding: 12rpx 24rpx;
  margin-right: 20rpx;
  background: #f8f9fa;
  border-radius: 20rpx;
  font-size: 28rpx;
  color: #666;
}

.filter-tab.active {
  background: #667eea;
  color: white;
}

.date-filter {
  display: flex;
  align-items: center;
}

.date-picker {
  display: flex;
  align-items: center;
  padding: 12rpx 20rpx;
  background: #f8f9fa;
  border-radius: 8rpx;
  margin-right: 20rpx;
  font-size: 28rpx;
}

.date-picker .icon {
  margin-left: 10rpx;
}

.clear-date {
  padding: 12rpx 20rpx;
  background: #ff6b6b;
  color: white;
  border-radius: 8rpx;
  font-size: 24rpx;
}

.booking-list {
  padding: 20rpx 30rpx;
}

.booking-item {
  background: white;
  border-radius: 12rpx;
  padding: 30rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.1);
}

.booking-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20rpx;
}

.service-name {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  display: block;
  margin-bottom: 8rpx;
}

.booking-time {
  font-size: 28rpx;
  color: #666;
}

.status-badge {
  padding: 8rpx 16rpx;
  border-radius: 20rpx;
  font-size: 24rpx;
  color: white;
}

.status-badge.pending {
  background: #ffa726;
}

.status-badge.completed {
  background: #66bb6a;
}

.status-badge.cancelled {
  background: #ef5350;
}

.booking-details {
  margin-bottom: 20rpx;
}

.detail-row {
  display: flex;
  margin-bottom: 12rpx;
  font-size: 28rpx;
}

.detail-row .label {
  color: #666;
  width: 160rpx;
  flex-shrink: 0;
}

.detail-row .value {
  color: #333;
  flex: 1;
}

.booking-actions {
  display: flex;
  gap: 20rpx;
}

.action-btn {
  flex: 1;
  padding: 16rpx;
  border-radius: 8rpx;
  font-size: 28rpx;
  border: none;
  color: white;
}

.action-btn.complete {
  background: #66bb6a;
}

.action-btn.cancel {
  background: #ef5350;
}

.empty-state {
  text-align: center;
  padding: 100rpx 0;
}

.empty-text {
  font-size: 28rpx;
  color: #999;
}

.load-more {
  text-align: center;
  padding: 30rpx;
  color: #667eea;
  font-size: 28rpx;
}
</style>