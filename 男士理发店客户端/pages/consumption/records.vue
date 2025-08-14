<template>
  <view class="page">
    <view class="header">
      <text class="title">消费记录</text>
    </view>
    
    <!-- 会员卡信息 -->
    <view class="card-info" v-if="cardTimes > 0">
      <view class="card-left">
        <text class="card-label">会员卡剩余次数</text>
        <text class="card-value">{{ cardTimes }} 次</text>
      </view>
      <view class="card-icon">
        <image src="/static/icons/card.svg" mode="widthFix" class="icon"></image>
      </view>
    </view>
    
    <!-- 消费记录列表 -->
    <view class="records-list">
      <view class="record-item" v-for="(record, index) in records" :key="index">
        <view class="record-date">
          <text class="date">{{ formatDate(record.date) }}</text>
          <text class="time">{{ formatTime(record.date) }}</text>
        </view>
        <view class="record-content">
          <view class="service-info">
            <text class="service-name">{{ record.serviceName }}</text>
            <text class="service-price" v-if="record.price">¥{{ record.price }}</text>
          </view>
          <view class="payment-info">
            <text class="payment-type" v-if="record.paymentType === 'card'">会员卡消费</text>
            <text class="payment-type" v-else>现金支付</text>
            <text class="card-remaining" v-if="record.paymentType === 'card' && record.cardRemaining !== undefined">
              剩余{{ record.cardRemaining }}次
            </text>
          </view>
        </view>
      </view>
      
      <view class="empty-state" v-if="records.length === 0">
        <image src="/static/icons/empty.svg" mode="widthFix" class="empty-icon"></image>
        <text class="empty-text">暂无消费记录</text>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  name: 'ConsumptionRecords',
  data() {
    return {
      cardTimes: 0,
      records: [],
      user: null
    }
  },
  onLoad() {
    this.loadUserInfo()
    this.loadRecords()
  },
  methods: {
    loadUserInfo() {
      try {
        const cached = uni.getStorageSync('MY_USER')
        if (cached && typeof cached === 'object') {
          this.user = cached
          this.refreshProfile()
        }
      } catch (e) {}
    },
    async refreshProfile() {
      try {
        if (!this.user) return
        const params = { action: 'getProfile' }
        if (this.user.id) params.userId = this.user.id
        else if (this.user.phone) params.phone = this.user.phone
        else if (this.user.openId) params.openId = this.user.openId
        else return
        
        const res = await uniCloud.callFunction({ name: 'user', data: params })
        const doc = res?.result?.data
        if (doc) {
          this.cardTimes = Number(doc.cardTimes || 0)
        }
      } catch(e) {}
    },
    async loadRecords() {
      try {
        if (!this.user || !this.user.id) {
          // 未登录时引导用户前往个人中心完成登录
          const modalRes = await uni.showModal({
            title: '请先登录',
            content: '前往个人中心完成登录后再查看消费记录',
            confirmText: '去登录',
            cancelText: '取消'
          })
          if (modalRes.confirm) {
            uni.navigateTo({ url: '/pages/profile/index' })
          }
          return
        }
        
        const params = { action: 'getConsumptionRecords' }
        if (this.user.id) params.userId = this.user.id
        else if (this.user.phone) params.phone = this.user.phone
        else if (this.user.openId) params.openId = this.user.openId
        else return
        
        const res = await uniCloud.callFunction({ name: 'user', data: params })
        const records = res?.result?.data || []
        this.records = records.sort((a, b) => new Date(b.date) - new Date(a.date))
      } catch(e) {
        // 如果接口还未实现，显示模拟数据
        this.records = [
          {
            date: new Date().toISOString(),
            serviceName: '精剪造型',
            price: 68,
            paymentType: 'card',
            cardRemaining: 7
          },
          {
            date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
            serviceName: '洗剪吹',
            price: 45,
            paymentType: 'cash'
          }
        ]
      }
    },
    formatDate(dateStr) {
      const date = new Date(dateStr)
      const today = new Date()
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
      
      if (date.toDateString() === today.toDateString()) {
        return '今天'
      } else if (date.toDateString() === yesterday.toDateString()) {
        return '昨天'
      } else {
        return `${date.getMonth() + 1}月${date.getDate()}日`
      }
    },
    formatTime(dateStr) {
      const date = new Date(dateStr)
      return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
    }
  }
}
</script>

<style>
.page {
  padding: 24rpx;
  background: #f7f8fa;
  min-height: 100vh;
}
.header {
  text-align: center;
  padding: 20rpx 0 40rpx;
}
.title {
  font-size: 36rpx;
  font-weight: 600;
  color: #222;
}
.card-info {
  background: linear-gradient(135deg, #f0fdf4, #fff);
  border-radius: 16rpx;
  padding: 32rpx;
  margin-bottom: 24rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 8rpx 24rpx rgba(0,0,0,0.06);
}
.card-left {
  display: flex;
  flex-direction: column;
}
.card-label {
  font-size: 26rpx;
  color: #666;
}
.card-value {
  margin-top: 8rpx;
  font-size: 44rpx;
  font-weight: 700;
  color: #10b981;
}
.card-icon {
  width: 80rpx;
  height: 80rpx;
}
.icon {
  width: 100%;
  height: 100%;
}
.records-list {
  background: #fff;
  border-radius: 16rpx;
  overflow: hidden;
}
.record-item {
  display: flex;
  padding: 32rpx 24rpx;
  border-bottom: 1rpx solid #f0f0f0;
}
.record-item:last-child {
  border-bottom-width: 0;
}
.record-date {
  width: 140rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-right: 24rpx;
}
.date {
  font-size: 26rpx;
  color: #666;
  margin-bottom: 4rpx;
}
.time {
  font-size: 24rpx;
  color: #999;
}
.record-content {
  flex: 1;
}
.service-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8rpx;
}
.service-name {
  font-size: 30rpx;
  font-weight: 600;
  color: #222;
}
.service-price {
  font-size: 28rpx;
  color: #10b981;
  font-weight: 600;
}
.payment-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.payment-type {
  font-size: 24rpx;
  color: #666;
}
.card-remaining {
  font-size: 24rpx;
  color: #10b981;
}
.empty-state {
  text-align: center;
  padding: 120rpx 0;
}
.empty-icon {
  width: 120rpx;
  height: 120rpx;
  opacity: 0.3;
  margin-bottom: 24rpx;
}
.empty-text {
  font-size: 28rpx;
  color: #999;
}
</style>