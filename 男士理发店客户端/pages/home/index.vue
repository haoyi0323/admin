<template>
  <view class="page">
    <swiper class="banner" indicator-dots autoplay interval="5000" duration="400">
      <swiper-item v-for="src in banners" :key="src">
        <image class="banner-img" :src="src" mode="scaleToFill" />
      </swiper-item>
    </swiper>

    <view class="hero">
      <view class="title">
        <text class="name">{{ shop.name }}</text>
        <text class="distance" v-if="distanceText">距离{{ distanceText }}</text>
      </view>
      <view class="row">
        <view class="stars">
          <text v-for="n in 5" :key="n" class="star" :class="{on: n <= Math.round(shop.rating)}">★</text>
        <text class="score">{{ shop.rating }}</text>
        <text class="reviews">({{ shop.reviews }}条)</text>
      </view>
      <text class="status" :class="{closed: !opening}">{{ opening ? '营业中' : '休息中' }}</text>
      </view>
      <view class="desc">欢迎来到 {{ shop.name }}，单人主理，建议提前预约。</view>
      
    </view>

    <view class="notice" v-if="notice">
      <image class="notice-icon" src="/static/icons/notice.svg" mode="widthFix" />
      <text class="notice-text">{{ notice }}</text>
    </view>

    <view class="mini-card" @click="goGroupBuy">
      <view class="left">
        <text class="mini-title">抖音团购</text>
        <text class="mini-sub">男士理发馆 · 人均 ¥58 · 点击领取优惠</text>
      </view>
      <text class="mini-action">去抖音 ›</text>
    </view>

    <view class="mini-card" @click="goProfile">
      <view class="left">
        <text class="mini-title">店铺信息</text>
        <text class="mini-sub">{{ shop.address }}</text>
      </view>
      <text class="mini-action">查看更多 ›</text>
    </view>

    

    <view class="section-title">热门服务</view>
    <view class="services-list">
      <view class="item" v-for="srv in services" :key="srv.id">
        <image class="cover-sm" :src="srv.image" mode="aspectFill" />
        <view class="info">
          <text class="srv-name">{{ srv.name }}</text>
          <text class="meta">约 {{ srv.durationMin }} 分钟</text>
          <view class="row-bottom">
            <view class="tags">
              <text class="staff">今日可预约</text>
              <text class="soon">最早可约{{ earliestText }}</text>
            </view>
            <view class="right">
              <view class="prices">
                <text class="price">¥{{ srv.price }}<text v-if="srv.id === 4">起</text></text>
                <text class="origin" v-if="srv.originalPrice">¥{{ srv.originalPrice }}</text>
              </view>
              <button class="reserve-btn" size="mini" type="primary" @click="goBooking(srv)">预约</button>
            </view>
          </view>
        </view>
      </view>
    </view>

    

    <view class="fab">
      <button class="fab-btn" @click="call"><image class="icon" src="/static/icons/phone.svg" mode="widthFix" /></button>
      <!-- #ifdef MP-WEIXIN -->
      <button class="fab-btn" open-type="contact"><image class="icon" src="/static/icons/service.svg" mode="widthFix" /></button>
      <!-- #endif -->
    </view>
    <BottomNav />
  </view>
</template>

<script>
import { shopInfo } from '../../common/shop.js'
import { parseHoursIsOpen } from '../../common/utils.js'
import { fetchEarliest, groupBuyUrl } from '../../common/services.js'
import BottomNav from '../../components/BottomNav.vue'
export default {
  name: 'HomeIndex',
  components: { BottomNav },
  data() {
    return { shop: shopInfo, services: [], distanceText: '', notice: '单人主理，建议提前预约，如需改期请至少提前2小时联系。', earliestText: '', opening: false, groupBuyLink: groupBuyUrl, banners: ['/static/banner1.jpg','/static/banner2.jpg','/static/banner3.jpg','/static/banner4.jpg'] }
  },
  onShow() {
    this.loadHours()
    this.calcDistance()
    this.updateEarliest()
    this.loadServices()
    const open = parseHoursIsOpen(this.shop.hours)
    this.opening = open.isOpen
  },
  methods: {
    async loadHours() {
      try {
        // 优先从后端读取营业时间配置
        const res = await uniCloud.callFunction({ name: 'booking', data: { action: 'getHours' } })
        const hours = res?.result?.data?.hours
        if (hours) {
          this.shop.hours = hours
          const open = parseHoursIsOpen(this.shop.hours)
          this.opening = open.isOpen
        }
      } catch (e) {}
    },
    calcDistance() {
      const { latitude, longitude } = this.shop
      if (!latitude || !longitude) return
      uni.getLocation({ type: 'gcj02', success: (pos) => {
        const d = this.haversine(pos.latitude, pos.longitude, latitude, longitude)
        this.distanceText = d > 1 ? `${d.toFixed(1)}km` : `${Math.round(d*1000)}m`
      } })
    },
    haversine(lat1, lon1, lat2, lon2) {
      const toRad = (v) => v * Math.PI / 180
      const R = 6371
      const dLat = toRad(lat2 - lat1)
      const dLon = toRad(lon2 - lon1)
      const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
      return R * c
    },
    async loadServices() {
      try {
        const res = await uniCloud.callFunction({
          name: 'services',
          data: {
            action: 'list',
            data: { includeInactive: false }
          }
        })
        if (res.result && res.result.code === 200) {
          this.services = res.result.data.map(service => ({
            id: service._id,
            category: service.category || 'cut',
            name: service.name,
            durationMin: service.duration,
            price: service.price,
            image: service.imageUrl || '/static/default-service.jpg'
          }))
        }
      } catch (error) {
        console.error('获取服务列表失败:', error)
        // 如果获取失败，使用默认服务数据
        this.services = [
          { id: 1, category: 'cut', name: '剪发', durationMin: 30, price: 79, image: '/static/剪发.jpg' },
          { id: 2, category: 'style', name: '洗吹', durationMin: 20, price: 29, image: '/static/洗吹.jpg' },
          { id: 3, category: 'shave', name: '修面', durationMin: 30, price: 58, image: '/static/修面.jpg' },
          { id: 4, category: 'perm', name: '黑人烫', durationMin: 120, price: 499, image: '/static/黑人烫.png' }
        ]
      }
    },
    async updateEarliest() {
      try {
        const now = new Date()
        const yyyy = now.getFullYear()
        const mm = `${now.getMonth() + 1}`.padStart(2,'0')
        const dd = `${now.getDate()}`.padStart(2,'0')
        const dateStr = `${yyyy}-${mm}-${dd}`
        const earliest = await fetchEarliest(dateStr, 25)
        this.earliestText = earliest || ''
      } catch(e) { this.earliestText = '' }
    },
    call() { uni.makePhoneCall({ phoneNumber: this.shop.phone }) },
    openMap() { this.$emit('openMap'); uni.$emit('openMap') },
    goBooking(srv) {
      if (srv) {
        try { uni.setStorageSync('MY_PRESELECT_SERVICE', srv.id) } catch(e) {}
      }
      uni.reLaunch({ url: '/pages/booking/index' })
    },

    goProfile() { uni.reLaunch({ url: '/pages/profile/index' }) },
    goGroupBuy() {
      // #ifdef MP-WEIXIN
      uni.setClipboardData({ data: this.groupBuyLink, success: () => {
        uni.showModal({ title: '前往抖音', content: '已复制团购链接，请前往抖音或系统浏览器打开查看优惠。', showCancel: false })
      } })
      // #endif
      // #ifdef H5
      if (typeof window !== 'undefined') {
        try { window.open(this.groupBuyLink, '_blank') } catch (e) { location.href = this.groupBuyLink }
      }
      // #endif
      // #ifdef APP-PLUS
      if (typeof plus !== 'undefined' && plus && plus.runtime) {
        plus.runtime.openURL(this.groupBuyLink)
      } else {
        uni.showToast({ title: '请在浏览器中打开', icon: 'none' })
      }
      // #endif
    }
  }
}
</script>

<style>
.page { padding: 16rpx; background: #f7f8fa; min-height: calc(100vh - 110rpx); padding-bottom: calc(110rpx + env(safe-area-inset-bottom)); }

.banner { height: 420rpx; overflow: hidden; margin-left: -16rpx; margin-right: -16rpx; width: calc(100% + 32rpx); }
.banner-img { width: 100%; height: 100%; display: block; }
.hero { background: #fff; border-radius: 16rpx; padding: 20rpx; box-shadow: 0 8rpx 24rpx rgba(0,0,0,0.06); }
.title { display: flex; align-items: baseline; justify-content: space-between; }
.name { font-size: 32rpx; font-weight: 700; color: #222; }
.distance { color: #666; font-size: 24rpx; }
.row { margin-top: 6rpx; display: flex; align-items: center; justify-content: space-between; }
.stars { display: flex; align-items: center; gap: 6rpx; color: #f6ad55; }
.star { color: #ddd; }
.star.on { color: #f6ad55; }
.score { color: #222; margin-left: 6rpx; }
.reviews { color: #999; font-size: 22rpx; margin-left: 4rpx; }
.status { background: #22c55e; color: #fff; font-size: 22rpx; padding: 6rpx 12rpx; border-radius: 999rpx; }
.status.closed { background: #9CA3AF; }
.desc { margin-top: 6rpx; color: #666; font-size: 26rpx; }
.quick button:nth-child(3) { background: #007AFF; color: #fff; }
.notice { margin-top: 12rpx; display: flex; align-items: center; background: #fff; border-radius: 12rpx; padding: 12rpx; box-shadow: 0 6rpx 18rpx rgba(0,0,0,0.04); }
.notice-icon { width: 28rpx; height: 28rpx; margin-right: 8rpx; }
.notice-text { color: #444; font-size: 24rpx; }
.mini-card { margin-top: 12rpx; background: #fff; border-radius: 12rpx; padding: 14rpx; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 6rpx 18rpx rgba(0,0,0,0.04); }
.mini-title { font-size: 26rpx; color: #222; }
.mini-sub { display: block; color: #999; font-size: 22rpx; margin-top: 4rpx; }
.mini-action { color: #007AFF; font-size: 24rpx; }
.quick { margin-top: 12rpx; display: flex; gap: 12rpx; }
/* 分类已取消，保留样式占位便于以后恢复 */
.section-title { margin: 20rpx 8rpx 8rpx; font-weight: 700; color: #222; }
.services { display: grid; grid-template-columns: 1fr 1fr; gap: 12rpx; }
.card { background: #fff; border-radius: 16rpx; overflow: hidden; display: flex; flex-direction: column; }
.cover { width: 100%; height: 200rpx; background: #eee; }
.info { padding: 12rpx; display: flex; flex-direction: column; gap: 8rpx; }
.srv-name { font-size: 28rpx; color: #222; }
.meta { color: #999; font-size: 22rpx; }
.bottom { display: flex; align-items: center; justify-content: space-between; }
.price { color: #ff5a00; font-weight: 700; }
.book-btn { font-size: 24rpx; }
.more { margin-top: 8rpx; color: #007AFF; font-size: 24rpx; }
.services-list { margin-top: 8rpx; }
.item { display: flex; background: #fff; border-radius: 16rpx; padding: 12rpx; margin-bottom: 12rpx; }
.cover-sm { width: 160rpx; height: 160rpx; border-radius: 12rpx; background: #eee; }
.item .info { flex: 1; padding: 0 12rpx; display: flex; flex-direction: column; }
.row-bottom { display: flex; align-items: center; justify-content: space-between; margin-top: 8rpx; }
.tags { display: flex; align-items: center; gap: 8rpx; }
.staff { color: #666; font-size: 22rpx; }
.soon { color: #ef4444; background: #fee2e2; border-radius: 8rpx; padding: 4rpx 8rpx; font-size: 20rpx; }
.right { display: flex; align-items: center; gap: 8rpx; }
.prices { display: flex; align-items: baseline; gap: 8rpx; }
.reserve-btn { font-size: 26rpx; background: #22c55e; color: #fff; }
.origin { color: #999; font-size: 22rpx; text-decoration: line-through; }
.see-more { text-align: center; color: #007AFF; margin: 8rpx 0 24rpx; }
.fab { position: fixed; right: 24rpx; bottom: 50vh; transform: translateY(65%); display: flex; flex-direction: column; gap: 12rpx; }
.fab-btn { background: #fff; border-radius: 999rpx; box-shadow: 0 6rpx 18rpx rgba(0,0,0,0.12); padding: 12rpx; width: 72rpx; height: 72rpx; display: flex; align-items: center; justify-content: center; }
.icon { width: 36rpx; height: 36rpx; display: block; }
</style>


