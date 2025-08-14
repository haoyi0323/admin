<template>
  <view class="page">
    <view class="profile-card">
      <image class="avatar" :src="user.avatar || '/static/logo.png'" mode="aspectFill"></image>
      <view class="info">
        <text class="name">{{ user.nickname || '顾客' + maskedUid }}</text>
        <text class="role">{{ user.loggedIn ? '已登录' : '未登录' }}</text>
      </view>
      <button class="login-btn" size="mini" type="primary" v-if="!user.loggedIn" @click="wxLogin">微信一键登录</button>
    </view>

    <view class="balance-card">
      <view class="balance-left">
        <text class="balance-label">会员卡次数</text>
        <text class="balance-value">{{ cardTimes }} 次</text>
        <text class="balance-tip">剪发卡：500 元 / 8 次</text>
      </view>
      <view class="balance-actions">
        <button size="mini" type="primary" @click="recharge">购卡</button>
      </view>
    </view>

    <view class="shop-card">
      <view class="shop-header">
        <text class="shop-name">M·Y 男士理发店</text>
        <text class="owner">主理人：杨先生</text>
      </view>
      <view class="shop-row clickable" @click="navigateToShop">
        <view class="label-wrap">
          <image class="addr-icon" src="/static/icons/nav-blue.svg" mode="widthFix" />
          <text class="shop-label">地址</text>
        </view>
        <text class="shop-text">{{ shop.address }}</text>
        <view class="nav-wrap" @click.stop="navigateToShop">
          <image class="nav-svg" src="/static/icons/nav-blue.svg" mode="widthFix" />
        </view>
      </view>
      <view class="shop-row">
        <text class="shop-label">电话</text>
        <text class="shop-text">{{ shop.phone }}</text>
        <button class="call" size="mini" type="primary" @click="callPhone">拨打</button>
      </view>
      <view class="shop-row">
        <text class="shop-label">营业时间</text>
        <text class="shop-text">{{ shop.hours }}</text>
      </view>
    </view>

    <view class="menu">
      <view class="menu-item" @click="toMyBookings">
        <text>我的预约</text>
      </view>
      <view class="menu-item" @click="toReminderSettings">
        <text>提醒设置</text>
      </view>
      <view class="menu-item" @click="showWechatQR">
        <text>联系客服（老板微信）</text>
      </view>
      <view class="menu-item" @click="toConsumptionRecords">
        <text>消费记录</text>
      </view>
      <view class="about">
        <text class="about-title">关于本店</text>
        <text class="about-content">{{ shop.about }}</text>
        <text class="about-hours">营业时间：{{ shop.hours }}</text>
      </view>
    </view>
    
    <!-- 微信二维码弹窗 -->
    <view class="qr-modal" v-if="showQRModal" @click="hideWechatQR">
      <view class="qr-content" @click.stop>
        <view class="qr-header">
          <text class="qr-title">老板微信</text>
          <text class="qr-close" @click="hideWechatQR">×</text>
        </view>
        <view class="qr-body">
          <image class="qr-image" src="/static/微信二维码.jpg" mode="aspectFit" @longpress="saveQRCode"></image>
          <text class="qr-tip">长按二维码保存或识别</text>
        </view>
      </view>
    </view>
    
    <BottomNav />
  </view>
</template>

<script>
import { shopInfo } from '../../common/shop.js'
import BottomNav from '../../components/BottomNav.vue'
export default {
  name: 'ProfileIndex',
  components: { BottomNav },
  data() {
    return { 
      shop: shopInfo, 
      balance: 0, 
      cardTimes: 0, 
      showQRModal: false,
      user: { loggedIn: false, id: '', seqNo: null, avatar: '', nickname: '', openId: '', phone: '' }
    }
  },
  onShow() {
    try {
      const cached = uni.getStorageSync('MY_USER')
      if (cached && typeof cached === 'object') {
        this.user = cached
        this.refreshProfile()
      }
    } catch (e) {}
  },
  computed: {
    maskedUid() { return Math.floor(Math.random()*1e8).toString().slice(0,6) }
  },
  methods: {
    callPhone() { uni.makePhoneCall({ phoneNumber: this.shop.phone }) },
    copyAddress() { uni.setClipboardData({ data: this.shop.address, success: () => uni.showToast({ title: '已复制' }) }) },
    openMap() {
      const { latitude, longitude, name, address } = this.shop
      if (latitude && longitude) {
        uni.openLocation({
          latitude: Number(latitude),
          longitude: Number(longitude),
          name,
          address,
          fail: () => {
            const url = `https://uri.amap.com/marker?position=${longitude},${latitude}&name=${encodeURIComponent(name)}&callnative=1&src=uniapp`
            if (typeof window !== 'undefined') {
              window.location.href = url
            } else {
              this.copyAddress()
            }
          }
        })
      } else {
        const url = `https://uri.amap.com/search?keyword=${encodeURIComponent(address)}&src=uniapp&callnative=1`
        if (typeof window !== 'undefined') {
          window.location.href = url
        } else {
          this.copyAddress()
        }
      }
    },
    navigateToShop() {
      const { latitude, longitude, name, address } = this.shop
      if (latitude && longitude) {
        const url = `https://uri.amap.com/navigation?to=${longitude},${latitude},${encodeURIComponent(name)}&mode=car&policy=1&src=uniapp&callnative=1`
        if (typeof window !== 'undefined') {
          window.location.href = url
        } else {
          uni.openLocation({ latitude: Number(latitude), longitude: Number(longitude), name, address })
        }
      } else {
        const url = `https://uri.amap.com/navigation?to=${encodeURIComponent(address)}&mode=car&src=uniapp&callnative=1`
        if (typeof window !== 'undefined') {
          window.location.href = url
        } else {
          this.copyAddress()
        }
      }
    },
    recharge() {
      uni.showToast({ title: '请到店购卡/续次', icon: 'none' })
    },

    toMyBookings() { uni.navigateTo({ url: '/pages/booking/my-bookings' }) },
    toReminderSettings() { uni.navigateTo({ url: '/pages/reminder/settings' }) },

    showWechatQR() {
      this.showQRModal = true
    },
    hideWechatQR() {
      this.showQRModal = false
    },
    saveQRCode() {
      uni.showToast({ title: '长按识别二维码', icon: 'none' })
    },
    toConsumptionRecords() {
      uni.navigateTo({ url: '/pages/consumption/records' })
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
          this.user.seqNo = doc.seqNo || this.user.seqNo
          this.user.nickname = doc.nickname || this.user.nickname
          this.user.avatar = doc.avatar || this.user.avatar
          this.user.phone = doc.phone || this.user.phone
          uni.setStorageSync('MY_USER', this.user)
        }
      } catch(e) {}
    },
    wxLogin() {
      // 小程序环境使用 getUserProfile 和 wx.login
      // #ifdef MP-WEIXIN
      // 先获取 openId
      wx.login({
        success: (loginRes) => {
          if (loginRes.code) {
            // 获取用户信息
            wx.getUserProfile({ 
              desc: '用于完善会员资料', 
              success: async (profileRes) => {
                const { avatarUrl, nickName } = profileRes.userInfo || {}
                try {
                  // 通过云函数获取 openId
                  const authRes = await uniCloud.callFunction({ 
                    name: 'user', 
                    data: { 
                      action: 'getOpenId', 
                      code: loginRes.code 
                    } 
                  })
                  const openId = authRes?.result?.data?.openId || ''
                  
                  // 一键获取手机号
                  let phoneNumber = ''
                  try {
                    // 获取新的微信登录凭证用于手机号
                    const phoneLoginRes = await new Promise((resolve, reject) => {
                      wx.login({
                        success: resolve,
                        fail: reject
                      })
                    })
                    
                    if (phoneLoginRes.code) {
                      const phoneRes = await uniCloud.callFunction({
                        name: 'user',
                        data: {
                          action: 'getPhoneNumber',
                          code: phoneLoginRes.code
                        }
                      })
                      
                      if (phoneRes?.result?.code === 0) {
                        phoneNumber = phoneRes.result.data.purePhoneNumber || ''
                      }
                    }
                  } catch (phoneError) {
                    console.log('自动获取手机号失败，可以手动输入:', phoneError)
                  }
                  
                  // 创建或更新用户档案（包含手机号）
                  const up = await uniCloud.callFunction({ 
                    name: 'user', 
                    data: { 
                      action: 'upsertProfile', 
                      nickname: nickName || '微信用户', 
                      avatar: avatarUrl || '', 
                      openId: openId,
                      phone: phoneNumber
                    } 
                  })
                  const id = up?.result?.data?.id
                  const seqNo = up?.result?.data?.seqNo
                  this.user = { 
                    loggedIn: true, 
                    id: id || '', 
                    seqNo: seqNo || null, 
                    avatar: avatarUrl || '', 
                    nickname: nickName || '微信用户', 
                    openId: openId, 
                    phone: phoneNumber
                  }
                  uni.setStorageSync('MY_USER', this.user)
                  this.refreshProfile()
                  
                  const message = phoneNumber ? 
                    `登录成功！已自动获取手机号：${phoneNumber}` : 
                    '登录成功！'
                  uni.showToast({ title: message, icon: 'success', duration: 2000 })
                } catch (e) {
                  console.error('登录失败:', e)
                  uni.showToast({ title: '登录失败，请重试', icon: 'none' })
                }
              },
              fail: () => {
                uni.showToast({ title: '需要授权才能登录', icon: 'none' })
              }
            })
          } else {
            uni.showToast({ title: '获取登录凭证失败', icon: 'none' })
          }
        },
        fail: () => {
          uni.showToast({ title: '微信登录失败', icon: 'none' })
        }
      })
      // #endif
      // #ifndef MP-WEIXIN
      (async () => {
        try {
          const up = await uniCloud.callFunction({ name: 'user', data: { action: 'upsertProfile', nickname: '微信用户', avatar: '', openId: '' } })
          const id = up?.result?.data?.id
          const seqNo = up?.result?.data?.seqNo
          this.user = { loggedIn: true, id: id || '', seqNo: seqNo || null, avatar: '', nickname: '微信用户', openId: '', phone: '' }
        } catch (e) {
          this.user = { loggedIn: true, id: '', seqNo: null, avatar: '', nickname: '微信用户', openId: '', phone: '' }
        }
        uni.setStorageSync('MY_USER', this.user)
        this.refreshProfile()
      })()
      // #endif
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
.profile-card {
  display: flex;
  align-items: center;
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  box-shadow: 0 8rpx 24rpx rgba(0,0,0,0.06);
}
.login-btn { margin-left: auto; }
.shop-card {
  margin-top: 24rpx;
  background: #fff;
  border-radius: 16rpx;
  padding: 16rpx;
}
.balance-card {
  margin-top: 24rpx;
  background: linear-gradient(135deg, #f0fdf4, #fff);
  border-radius: 16rpx;
  padding: 24rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 8rpx 24rpx rgba(0,0,0,0.06);
}
.balance-left { display: flex; flex-direction: column; }
.balance-label { font-size: 26rpx; color: #666; }
.balance-value { margin-top: 6rpx; font-size: 44rpx; font-weight: 700; color: #222; }
.balance-tip { margin-top: 4rpx; color: #10b981; font-size: 24rpx; }
.balance-actions { display: flex; gap: 12rpx; }
.shop-header { display: flex; align-items: baseline; gap: 12rpx; margin-bottom: 8rpx; }
.shop-name { font-size: 32rpx; font-weight: 700; color: #222; }
.owner { color: #999; font-size: 24rpx; }
.shop-row { display: flex; align-items: center; padding: 18rpx 0; border-bottom: 1rpx solid #f5f5f5; }
.shop-row:last-child { border-bottom-width: 0; }
.label-wrap { display: flex; align-items: center; width: 160rpx; }
.addr-icon { width: 32rpx; height: 32rpx; margin-right: 8rpx; }
.shop-label { color: #666; font-size: 26rpx; }
.shop-text { flex: 1; color: #333; font-size: 28rpx; }
.nav-wrap { padding: 0 8rpx; }
.nav-svg { width: 36rpx; height: 36rpx; }
.call { background: #22c55e; color: #fff; }
.avatar {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  background: #eee;
}
.info {
  margin-left: 24rpx;
}
.name {
  font-size: 34rpx;
  font-weight: 600;
  color: #222;
}
.role {
  margin-top: 8rpx;
  font-size: 26rpx;
  color: #666;
}
.menu {
  margin-top: 24rpx;
  background: #fff;
  border-radius: 16rpx;
}
.menu-item {
  padding: 28rpx 24rpx;
  border-bottom: 1rpx solid #f0f0f0;
  font-size: 30rpx;
  color: #333;
}
.menu-item:last-child {
  border-bottom-width: 0;
}
.about { padding: 20rpx 24rpx 28rpx; }
.about-title { display: block; font-size: 30rpx; font-weight: 600; color: #222; margin-bottom: 8rpx; }
.about-content { display: block; font-size: 26rpx; color: #666; line-height: 1.6; }
.about-hours { display: block; margin-top: 10rpx; font-size: 26rpx; color: #444; }

/* 微信二维码弹窗样式 */
.qr-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.qr-content {
  background: #fff;
  border-radius: 16rpx;
  width: 600rpx;
  max-width: 90vw;
}
.qr-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 32rpx 32rpx 0;
}
.qr-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #222;
}
.qr-close {
  font-size: 48rpx;
  color: #999;
  line-height: 1;
}
.qr-body {
  padding: 32rpx;
  text-align: center;
}
.qr-image {
  width: 400rpx;
  height: 400rpx;
  border-radius: 12rpx;
  background: #f5f5f5;
}
.qr-tip {
  display: block;
  margin-top: 24rpx;
  font-size: 26rpx;
  color: #666;
}
</style>


