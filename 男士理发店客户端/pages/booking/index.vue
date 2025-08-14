<template>
  <view class="page">
    <view class="form-card">
      <view class="form-item">
        <text class="label">服务类型</text>
        <picker :value="selectedServiceIndex" :range="serviceOptions" @change="onServiceChange">
          <view class="picker-value">{{ serviceOptions[selectedServiceIndex] }}</view>
        </picker>
      </view>
      <view class="service-desc" v-if="currentService">
        <text class="s-name">{{ currentService.name }}</text>
        <text class="s-time">约 {{ currentService.durationMin }} 分钟</text>
        <text class="s-price">价格：¥{{ currentService.price }}<text v-if="currentService.id === 4">起</text> <text v-if="currentService.originalPrice" class="s-origin">¥{{ currentService.originalPrice }}</text></text>
      </view>

      <view class="form-item">
        <text class="label">预约日期</text>
        <picker mode="date" :value="selectedDate" @change="onDateChange">
          <view class="picker-value">{{ selectedDate }}</view>
        </picker>
      </view>

      <view class="form-item">
        <text class="label">预约时间</text>
        <picker mode="time" :value="selectedTime" start="09:00" end="20:00" @change="onTimeChange">
          <view class="picker-value">{{ selectedTime }}</view>
        </picker>
        <button class="choose-btn" size="mini" @click="openTimeSheet">选择时段</button>
      </view>



      <view class="form-item">
        <text class="label">手机号</text>
        <input class="picker-value" type="number" maxlength="11" v-model="mobile" placeholder="可留空，或一键获取手机号" />
        <!-- #ifdef MP-WEIXIN -->
        <button size="mini" class="choose-btn" open-type="getPhoneNumber" @getphonenumber="onGetPhoneNumber">获取</button>
        <!-- #endif -->
      </view>

      <view class="form-item">
        <text class="label">备注</text>
        <input class="picker-value" v-model="remark" placeholder="如：需要修面/提前10分钟到店" />
      </view>
      <view class="tip">注：本店仅一名理发师服务，请尽量准时到店。</view>
    </view>
    <view class="bottom-bar">
      <view class="time">预约时间：{{ selectedDate }} {{ selectedTime }}</view>
      <button class="submit-btn" type="primary" @click="submitBooking">确认预约</button>
    </view>
    <BottomNav />
    
    <!-- 时间选择弹窗 -->
    <view class="time-modal" v-if="showTimeModal" @click="closeTimeModal">
      <view class="time-modal-content" @click.stop>
        <view class="time-modal-header">
          <text class="time-modal-title">选择预约时间</text>
          <text class="time-modal-close" @click="closeTimeModal">×</text>
        </view>
        <view class="time-modal-date">{{ selectedDate }}</view>
        <scroll-view class="time-grid-container" scroll-y>
          <view class="time-grid">
            <view 
              v-for="(slot, index) in timeSlots" 
              :key="index"
              class="time-slot"
              :class="{
                'available': slot.available,
                'unavailable': !slot.available,
                'selected': slot.time === selectedTime
              }"
              @click="selectTime(slot)"
            >
              {{ slot.time }}
            </view>
          </view>
        </scroll-view>
        <view class="time-modal-footer">
          <view class="time-legend">
            <view class="legend-item">
              <view class="legend-color available"></view>
              <text>可预约</text>
            </view>
            <view class="legend-item">
              <view class="legend-color unavailable"></view>
              <text>已预约</text>
            </view>
            <view class="legend-item" v-if="selectedTime">
              <view class="legend-color selected"></view>
              <text>已选择</text>
            </view>
          </view>
          <view class="time-modal-actions" v-if="selectedTime">
            <button class="book-now-btn" type="primary" @click="submitBookingFromModal">立即预约</button>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { fetchAvailableSlots } from '../../common/services.js'
import BottomNav from '../../components/BottomNav.vue'
export default {
  name: 'BookingIndex',
  components: { BottomNav },
  data() {
    const now = new Date()
    const yyyy = now.getFullYear()
    const mm = `${now.getMonth() + 1}`.padStart(2, '0')
    const dd = `${now.getDate()}`.padStart(2, '0')
    const hh = `${Math.max(9, now.getHours())}`.padStart(2, '0')
    const mi = `${now.getMinutes()}`.padStart(2, '0')
    return {
      serviceList: [],
      serviceOptions: [],
      selectedServiceIndex: 0,
      selectedDate: `${yyyy}-${mm}-${dd}`,
      selectedTime: `${hh}:${mi}`,
      mobile: '',
      remark: '',
      user: { loggedIn: false, nickname: '', avatar: '', phone: '' },
      showTimeModal: false,
      timeSlots: [],
      availableSlots: [],

    }
  },
  async onShow() {
    try {
      // 加载服务列表
      await this.loadServices()
      
      const preId = uni.getStorageSync('MY_PRESELECT_SERVICE')
      if (preId) {
        const idx = this.serviceList.findIndex(s => s.id === preId)
        if (idx >= 0) this.selectedServiceIndex = idx
        uni.removeStorageSync('MY_PRESELECT_SERVICE')
      }
      const cachedUser = uni.getStorageSync('MY_USER')
      if (cachedUser && typeof cachedUser === 'object') {
        this.user = cachedUser
        if (cachedUser.phone) this.mobile = cachedUser.phone
      }

    } catch(e) {}
  },
  computed: {
    currentService() { return this.serviceList[this.selectedServiceIndex] || null }
  },
  methods: {
    async loadServices() {
      try {
        const res = await uniCloud.callFunction({
          name: 'services',
          data: {
            action: 'listServices',
            enabledOnly: true
          }
        })
        
        if (res.result && res.result.code === 0 && Array.isArray(res.result.data)) {
          this.serviceList = res.result.data
          this.serviceOptions = this.serviceList.map(s => s.name)
        } else {
          // 如果获取失败，使用默认服务数据
          this.serviceList = [
            { id: 1, name: '剪发', durationMin: 30, price: 79 },
            { id: 2, name: '洗吹', durationMin: 20, price: 29 },
            { id: 3, name: '修面', durationMin: 30, price: 58 },
            { id: 4, name: '黑人烫', durationMin: 120, price: 499 }
          ]
          this.serviceOptions = this.serviceList.map(s => s.name)
        }
      } catch (error) {
        console.error('获取服务列表失败:', error)
        // 使用默认服务数据作为回退
        this.serviceList = [
          { id: 1, name: '剪发', durationMin: 30, price: 79 },
          { id: 2, name: '洗吹', durationMin: 20, price: 29 },
          { id: 3, name: '修面', durationMin: 30, price: 58 },
          { id: 4, name: '黑人烫', durationMin: 120, price: 499 }
        ]
        this.serviceOptions = this.serviceList.map(s => s.name)
      }
    },
    
    onGetPhoneNumber(e) {
      // #ifdef MP-WEIXIN
      // 需要配置绑定服务类目和获取手机号能力，演示中直接读取加密数据占位
      if (e.detail && e.detail.code) {
        // 这里通常发到服务端换取手机号；演示直接提示
        uni.showToast({ title: '已授权获取', icon: 'success' })
      }
      // #endif
    },

    onServiceChange(e) {
      this.selectedServiceIndex = Number(e.detail.value)
    },
    onDateChange(e) {
      this.selectedDate = e.detail.value
    },
    onTimeChange(e) {
      this.selectedTime = e.detail.value
    },


    async openTimeSheet() {
      try {
        uni.showLoading({ title: '获取可约时间', mask: true })
        const duration = (this.currentService && this.currentService.durationMin) || 25
        const availableSlots = await fetchAvailableSlots(this.selectedDate, duration)
        this.availableSlots = Array.isArray(availableSlots) && availableSlots.length ? availableSlots : []
        
        // 生成完整的时间表格（每15分钟一个时间段）
        this.generateTimeSlots()
        
        uni.hideLoading()
        this.showTimeModal = true
      } catch (e) {
        uni.hideLoading()
        uni.showToast({ title: '获取可约时间失败', icon: 'none' })
      }
    },
    
    generateTimeSlots() {
      const slots = []
      const startHour = 9
      const endHour = 20
      
      for (let hour = startHour; hour < endHour; hour++) {
        for (let minute = 0; minute < 60; minute += 15) {
          const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
          const available = this.availableSlots.includes(timeStr)
          slots.push({
            time: timeStr,
            available: available
          })
        }
      }
      
      this.timeSlots = slots
    },
    
    selectTime(slot) {
      if (!slot.available) {
        uni.showToast({ title: '该时间段已被预约', icon: 'none' })
        return
      }
      
      this.selectedTime = slot.time
      // 不自动关闭弹窗，让用户可以点击立即预约
    },
    
    async submitBookingFromModal() {
      // 先关闭弹窗
      this.closeTimeModal()
      // 调用原有的预约逻辑
      await this.submitBooking()
    },
    
    closeTimeModal() {
      this.showTimeModal = false
    },
     async submitBooking() {
       if (!this.user || !this.user.loggedIn || !this.user.id) {
         uni.showModal({
           title: '请先登录',
           content: '预约需登录，请先前往个人中心完成微信一键登录。',
           confirmText: '去登录',
           success: (res) => { if (res.confirm) uni.switchTab({ url: '/pages/profile/index' }) }
         })
         return
       }
       
       const service = this.serviceList[this.selectedServiceIndex]
       const timeText = `${this.selectedDate} ${this.selectedTime}`
       
       // 二次确认
       const ok = await new Promise((resolve) => {
         uni.showModal({
           title: '确认预约',
           content: `服务：${service?.name || '-'}\n时间：${timeText}\n手机：${this.mobile || '（未授权）'}\n备注：${this.remark || '-'}`,
           success: (res) => resolve(!!res.confirm)
         })
       })
       if (!ok) return
       try {
         uni.showLoading({ title: '提交中', mask: true })
         const duration = (service && service.durationMin) || 25
         const res = await uniCloud.callFunction({
           name: 'booking',
           data: {
             action: 'create',
             date: this.selectedDate,
             time: this.selectedTime,
             durationMin: duration,
             serviceId: service?.id || 0,
              userId: this.user?.id || '',
              phone: this.mobile || this.user?.phone || '',
              remark: this.remark || ''
           }
         })
         uni.hideLoading()
         const result = res?.result || {}
         if (result.code === 0) {
           uni.showToast({ title: '预约成功', icon: 'success' })
           setTimeout(() => {
             uni.switchTab({ url: '/pages/bookings/index' })
           }, 1500)
         } else {
           uni.showToast({ title: result.message || '预约失败', icon: 'none' })
         }
       } catch (e) {
         uni.hideLoading()
         uni.showToast({ title: '预约失败，请稍后再试', icon: 'none' })
       }
    }
  }
}
</script>

<style>
.page {
  padding: 24rpx;
  background: #f7f8fa;
  min-height: calc(100vh - 110rpx);
  padding-bottom: calc(110rpx + env(safe-area-inset-bottom));
}
.form-card {
  background: #ffffff;
  border-radius: 16rpx;
  margin-top: 0;
  padding: 16rpx 24rpx 32rpx;
  box-shadow: 0 8rpx 24rpx rgba(0,0,0,0.06);
}
.form-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 8rpx;
  border-bottom: 1rpx solid #f0f0f0;
}
.form-item:last-child {
  border-bottom-width: 0;
}
.label {
  font-size: 28rpx;
  color: #333;
}
.picker-value {
  font-size: 28rpx;
  color: #666;
}
.choose-btn { margin-left: 12rpx; background: #22c55e; color: #fff; }
.tip {
  margin: 24rpx 8rpx 0;
  font-size: 24rpx;
  color: #999;
}
.service-desc { margin: 12rpx 8rpx 0; color: #555; }
.s-name { display: block; font-size: 28rpx; color: #222; }
.s-time { margin-left: 8rpx; font-size: 24rpx; color: #999; }
.s-price { display: block; margin-top: 6rpx; }
.s-origin { color: #999; text-decoration: line-through; margin-left: 8rpx; }
.bottom-bar { position: fixed; left: 0; right: 0; bottom: env(safe-area-inset-bottom); bottom: 0; background: #fff; display: flex; align-items: center; justify-content: space-between; padding: 16rpx 24rpx calc(16rpx + env(safe-area-inset-bottom)); box-shadow: 0 -6rpx 18rpx rgba(0,0,0,0.08); }
.bottom-bar .time { color: #666; font-size: 26rpx; }
.submit-btn { min-width: 260rpx; background: #22c55e; color: #fff; }

/* 时间选择弹窗样式 */
.time-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.6));
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(8rpx);
  animation: modalFadeIn 0.3s ease-out;
}

@keyframes modalFadeIn {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.time-modal-content {
  background: linear-gradient(135deg, #ffffff, #fafbfc);
  border-radius: 32rpx;
  width: 95%;
  max-width: 640rpx;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 32rpx 64rpx rgba(0, 0, 0, 0.15), 0 16rpx 32rpx rgba(0, 0, 0, 0.1);
  border: 1rpx solid rgba(255, 255, 255, 0.8);
  overflow: hidden;
  animation: contentSlideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes contentSlideUp {
  from {
    opacity: 0;
    transform: translateY(60rpx) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.time-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 40rpx 40rpx 24rpx;
  background: linear-gradient(135deg, #667eea, #764ba2);
  position: relative;
}

.time-modal-header::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05));
  pointer-events: none;
}

.time-modal-title {
  font-size: 36rpx;
  font-weight: 700;
  color: #ffffff;
  text-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.2);
  letter-spacing: 1rpx;
}

.time-modal-close {
  font-size: 52rpx;
  color: rgba(255, 255, 255, 0.9);
  line-height: 1;
  cursor: pointer;
  width: 60rpx;
  height: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10rpx);
  transition: all 0.3s ease;
}

.time-modal-close:active {
  background: rgba(255, 255, 255, 0.2);
  transform: scale(0.95);
}

.time-modal-date {
  padding: 24rpx 40rpx;
  font-size: 32rpx;
  font-weight: 600;
  color: #2d3748;
  text-align: center;
  background: linear-gradient(135deg, #f7fafc, #edf2f7);
  border-bottom: 1rpx solid rgba(0, 0, 0, 0.05);
  position: relative;
}

.time-modal-date::before {
  content: '📅';
  margin-right: 12rpx;
  font-size: 28rpx;
}

.time-grid-container {
  flex: 1;
  padding: 16rpx 8rpx;
  max-height: 520rpx;
  background: linear-gradient(135deg, #f8fafc, #ffffff);
}

.time-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8rpx;
  padding: 4rpx;
}

.time-slot {
  padding: 20rpx 12rpx;
  text-align: center;
  border-radius: 20rpx;
  font-size: 28rpx;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 2rpx solid transparent;
  position: relative;
  overflow: hidden;
  min-height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  letter-spacing: 0.5rpx;
}

.time-slot::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.8), rgba(255, 255, 255, 0.4));
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
}

.time-slot.available {
  background: linear-gradient(135deg, #dcfce7, #bbf7d0);
  color: #166534;
  border-color: #22c55e;
  box-shadow: 0 4rpx 12rpx rgba(34, 197, 94, 0.15), 0 2rpx 4rpx rgba(34, 197, 94, 0.1);
}

.time-slot.available::before {
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(34, 197, 94, 0.05));
}

.time-slot.available:hover::before {
  opacity: 1;
}

.time-slot.available:active {
  background: linear-gradient(135deg, #22c55e, #16a34a);
  color: #ffffff;
  transform: scale(0.98);
  box-shadow: 0 2rpx 8rpx rgba(34, 197, 94, 0.3), inset 0 2rpx 4rpx rgba(0, 0, 0, 0.1);
}

.time-slot.unavailable {
  background: linear-gradient(135deg, #f1f5f9, #e2e8f0);
  color: #64748b;
  cursor: not-allowed;
  opacity: 0.6;
  box-shadow: 0 2rpx 4rpx rgba(0, 0, 0, 0.05);
  position: relative;
}

.time-slot.unavailable::after {
  content: '×';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 32rpx;
  color: #94a3b8;
  opacity: 0.7;
}

.time-slot.selected {
  background: linear-gradient(135deg, #dbeafe, #bfdbfe);
  color: #1e40af;
  border-color: #3b82f6;
  box-shadow: 0 8rpx 24rpx rgba(59, 130, 246, 0.25), 0 4rpx 8rpx rgba(59, 130, 246, 0.15);
  transform: scale(1.02);
  z-index: 10;
}

.time-slot.selected::before {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(59, 130, 246, 0.08));
  opacity: 1;
}

.time-slot.selected::after {
  content: '✓';
  position: absolute;
  top: 8rpx;
  right: 8rpx;
  font-size: 20rpx;
  color: #1e40af;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 50%;
  width: 24rpx;
  height: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
}

.time-modal-footer {
  padding: 24rpx 40rpx 40rpx;
  background: linear-gradient(135deg, #f8fafc, #ffffff);
  border-top: 1rpx solid rgba(0, 0, 0, 0.05);
}

.time-legend {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 40rpx;
  margin-bottom: 8rpx;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 12rpx;
  font-size: 26rpx;
  color: #4a5568;
  font-weight: 500;
  padding: 8rpx 16rpx;
  border-radius: 16rpx;
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(10rpx);
  border: 1rpx solid rgba(0, 0, 0, 0.05);
}

.legend-color {
  width: 28rpx;
  height: 28rpx;
  border-radius: 8rpx;
  box-shadow: 0 2rpx 4rpx rgba(0, 0, 0, 0.1);
  border: 2rpx solid rgba(255, 255, 255, 0.8);
}

.legend-color.available {
  background: linear-gradient(135deg, #22c55e, #16a34a);
}

.legend-color.unavailable {
  background: linear-gradient(135deg, #94a3b8, #64748b);
}

.legend-color.selected {
  background: linear-gradient(135deg, #3b82f6, #1e40af);
}

.time-modal-actions {
  margin-top: 32rpx;
  display: flex;
  justify-content: center;
}

.book-now-btn {
  width: 280rpx;
  height: 88rpx;
  background: linear-gradient(135deg, #22c55e, #16a34a);
  color: #ffffff;
  border-radius: 44rpx;
  font-size: 32rpx;
  font-weight: 700;
  border: none;
  box-shadow: 0 8rpx 24rpx rgba(34, 197, 94, 0.3), 0 4rpx 8rpx rgba(34, 197, 94, 0.15);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
  letter-spacing: 1rpx;
}

.book-now-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
  transition: left 0.6s ease;
}

.book-now-btn:hover::before {
  left: 100%;
}

.book-now-btn:active {
  background: linear-gradient(135deg, #16a34a, #15803d);
  transform: scale(0.98);
  box-shadow: 0 4rpx 12rpx rgba(34, 197, 94, 0.4), inset 0 2rpx 4rpx rgba(0, 0, 0, 0.1);
}
</style>


