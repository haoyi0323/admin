<template>
  <view class="page">
    <view class="header">
      <text class="title">账单记录</text>
      <text class="sub">仅记录到店充卡与消费</text>
    </view>
    <view class="list" v-if="bills.length">
      <view class="item" v-for="item in bills" :key="item.id">
        <view class="left">
          <text class="type" :class="item.type">{{ item.type === 'recharge' ? '充卡' : '消费' }}</text>
          <text class="remark">{{ item.remark || '-' }}</text>
        </view>
        <view class="right">
          <text class="amount" :class="item.type">{{ item.type === 'recharge' ? '+' : '-' }}¥{{ item.amount.toFixed(2) }}</text>
          <text class="time">{{ formatTime(item.time) }}</text>
        </view>
      </view>
    </view>
    <view class="empty" v-else>暂无记录</view>
  </view>
</template>

<script>
import { getBills } from '../../common/wallet.js'
export default {
  name: 'WalletBills',
  data() { return { bills: [] } },
  onShow() { this.bills = getBills() },
  methods: {
    formatTime(iso) {
      try {
        const d = new Date(iso)
        const y = d.getFullYear()
        const m = `${d.getMonth()+1}`.padStart(2,'0')
        const day = `${d.getDate()}`.padStart(2,'0')
        const hh = `${d.getHours()}`.padStart(2,'0')
        const mm = `${d.getMinutes()}`.padStart(2,'0')
        return `${y}-${m}-${day} ${hh}:${mm}`
      } catch(e) { return iso }
    }
  }
}
</script>

<style>
.page { padding: 24rpx; background: #f7f8fa; min-height: 100vh; }
.header { margin-bottom: 12rpx; }
.title { font-size: 32rpx; font-weight: 600; color: #222; }
.sub { margin-left: 8rpx; font-size: 24rpx; color: #999; }
.list { background: #fff; border-radius: 16rpx; overflow: hidden; box-shadow: 0 8rpx 24rpx rgba(0,0,0,0.06); }
.item { display: flex; align-items: center; justify-content: space-between; padding: 20rpx 24rpx; border-bottom: 1rpx solid #f0f0f0; }
.item:last-child { border-bottom-width: 0; }
.left { display: flex; flex-direction: column; }
.type { font-size: 28rpx; color: #333; }
.type.recharge { color: #10b981; }
.type.consume { color: #ef4444; }
.remark { margin-top: 4rpx; color: #666; font-size: 24rpx; }
.right { display: flex; flex-direction: column; align-items: flex-end; }
.amount { font-weight: 700; font-size: 30rpx; }
.amount.recharge { color: #10b981; }
.amount.consume { color: #ef4444; }
.time { margin-top: 4rpx; color: #999; font-size: 22rpx; }
.empty { text-align: center; color: #999; margin-top: 80rpx; }
</style>


