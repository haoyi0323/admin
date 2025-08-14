<template>
  <view class="nav-wrap">
    <view
      v-for="tab in tabs"
      :key="tab.path"
      class="item"
      :class="{ active: activePath === tab.path }"
      @click="go(tab.path)"
    >
      <image class="icon" :src="activePath === tab.path ? tab.activeIcon : tab.icon" mode="widthFix" />
      <text class="label">{{ tab.label }}</text>
    </view>
  </view>
</template>

<script>
export default {
  name: 'BottomNav',
  data() {
    return {
      tabs: [
        { label: '首页', path: 'pages/home/index', icon: '/static/icons/home.svg', activeIcon: '/static/icons/home-fill.svg' },
        { label: '预约', path: 'pages/booking/index', icon: '/static/icons/book.svg', activeIcon: '/static/icons/book-fill.svg' },
        { label: '我的', path: 'pages/profile/index', icon: '/static/icons/user.svg', activeIcon: '/static/icons/user-fill.svg' }
      ],
      activePath: ''
    }
  },
  mounted() { this.refreshActive() },
  onShow() { this.refreshActive() },
  methods: {
    refreshActive() {
      try {
        const pages = getCurrentPages()
        const last = pages[pages.length - 1]
        this.activePath = last?.route || ''
      } catch(e) {
        this.activePath = ''
      }
    },
    go(path) {
      if (this.activePath === path) return
      // 自定义底栏使用 reLaunch 切换主页面，保证各端一致且不依赖系统 tabBar
      uni.reLaunch({ url: '/' + path })
    }
  }
}
</script>

<style>
.nav-wrap {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  height: 110rpx;
  padding-bottom: calc(env(safe-area-inset-bottom) + 10rpx);
  background: #fff;
  border-top: 1rpx solid #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: space-around;
  z-index: 999;
}
.item { display: flex; flex-direction: column; align-items: center; justify-content: center; color: #6b7280; min-width: 160rpx; }
.item.active { color: #22c55e; }
.icon { width: 44rpx; height: 44rpx; }
.label { font-size: 22rpx; margin-top: 6rpx; }
</style>


