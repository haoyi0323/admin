<template>
  <view class="page">
    <view class="card">
      <view class="row">
        <text class="label">当前余额</text>
        <text class="value">¥ {{ balance.toFixed(2) }}</text>
      </view>
      <view class="row">
        <text class="label">充卡金额</text>
        <input class="input" type="number" v-model.number="amount" placeholder="请输入充卡金额(元)" />
      </view>
      <view class="row">
        <text class="label">备注</text>
        <input class="input" v-model="remark" placeholder="如：店内现金充值" />
      </view>
      <button class="btn" type="primary" @click="doRecharge">确认充卡入账</button>
      <text class="tip">说明：仅记录到店充卡入账，不涉及在线支付。</text>
    </view>
  </view>
</template>

<script>
import { getBalance, setBalance, addBill } from '../../common/wallet.js'
export default {
  name: 'WalletRecharge',
  data() {
    return { balance: 0, amount: null, remark: '' }
  },
  onShow() {
    this.balance = getBalance()
  },
  methods: {
    doRecharge() {
      const money = Number(this.amount)
      if (!money || money <= 0) {
        uni.showToast({ title: '请输入有效金额', icon: 'none' })
        return
      }
      const newBalance = setBalance(this.balance + money)
      addBill({ type: 'recharge', amount: money, remark: this.remark || '线下充值' })
      this.balance = newBalance
      this.amount = null
      this.remark = ''
      uni.showToast({ title: '充值已记录', icon: 'success' })
    }
  }
}
</script>

<style>
.page { padding: 24rpx; background: #f7f8fa; min-height: 100vh; }
.card { background: #fff; border-radius: 16rpx; padding: 24rpx; box-shadow: 0 8rpx 24rpx rgba(0,0,0,0.06); }
.row { display: flex; align-items: center; justify-content: space-between; padding: 18rpx 0; }
.label { color: #333; font-size: 28rpx; width: 180rpx; }
.value { color: #222; font-size: 32rpx; font-weight: 600; }
.input { flex: 1; background: #f5f5f5; border-radius: 12rpx; padding: 16rpx; margin-left: 12rpx; }
.btn { margin-top: 24rpx; background: #22c55e; color: #fff; }
.tip { margin-top: 12rpx; color: #999; font-size: 24rpx; display: block; }
</style>


