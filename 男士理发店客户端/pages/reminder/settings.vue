<template>
  <view class="reminder-settings">
    <uni-nav-bar title="提醒设置" left-icon="back" @clickLeft="goBack" />
    
    <view class="content">
      <view class="section">
        <view class="section-title">提醒时间</view>
        <view class="setting-item">
          <view class="setting-label">提前24小时提醒</view>
          <switch :checked="preferences.before24h" @change="onBefore24hChange" />
        </view>
        <view class="setting-item">
          <view class="setting-label">提前2小时提醒</view>
          <switch :checked="preferences.before2h" @change="onBefore2hChange" />
        </view>
      </view>
      
      <view class="section">
        <view class="section-title">提醒方式</view>
        <view class="setting-item">
          <view class="setting-label">微信消息提醒</view>
          <switch :checked="preferences.wechatEnabled" @change="onWechatChange" />
        </view>
        <view class="setting-item">
          <view class="setting-label">短信提醒</view>
          <switch :checked="preferences.smsEnabled" @change="onSmsChange" />
        </view>
      </view>
      
      <view class="section">
        <view class="section-title">提醒历史</view>
        <view class="history-list">
          <view v-for="reminder in reminderHistory" :key="reminder._id" class="history-item">
            <view class="history-content">
              <view class="history-message">{{ reminder.message }}</view>
              <view class="history-time">{{ formatTime(reminder.sentAt) }}</view>
            </view>
            <view class="history-status" :class="reminder.status">{{ getStatusText(reminder.status) }}</view>
          </view>
          <view v-if="reminderHistory.length === 0" class="empty-state">
            <text>暂无提醒记录</text>
          </view>
        </view>
      </view>
    </view>
    
    <view class="footer">
      <button class="save-btn" @click="saveSettings" :loading="saving">保存设置</button>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      preferences: {
        before24h: true,
        before2h: true,
        smsEnabled: false,
        wechatEnabled: true
      },
      reminderHistory: [],
      saving: false,
      loading: true
    }
  },
  
  onLoad() {
    this.loadSettings();
    this.loadReminderHistory();
  },
  
  methods: {
    goBack() {
      uni.navigateBack();
    },
    
    getUserId() {
      // 优先读取 MY_USER 缓存中的 id，兼容旧的 userId 缓存
      try {
        const user = uni.getStorageSync('MY_USER');
        if (user && user.id) return user.id;
      } catch (e) {}
      const legacy = uni.getStorageSync('userId');
      return legacy || '';
    },
    
    async ensureLogin() {
      const userId = this.getUserId();
      if (!userId) {
        const res = await uni.showModal({
          title: '请先登录',
          content: '前往个人中心完成登录后再进行提醒设置',
          confirmText: '去登录',
          cancelText: '取消'
        });
        if (res.confirm) {
          uni.navigateTo({ url: '/pages/profile/index' });
        }
        return false;
      }
      return true;
    },
    
    async loadSettings() {
      try {
        const userId = this.getUserId();
        if (!userId) {
          await this.ensureLogin();
          return;
        }
        
        const res = await uniCloud.callFunction({
          name: 'reminder',
          data: {
            action: 'getReminderPreference',
            data: { userId }
          }
        });
        
        if (res.result && res.result.success) {
          this.preferences = { ...this.preferences, ...res.result.data };
        }
      } catch (error) {
        console.error('加载设置失败:', error);
        uni.showToast({ title: '加载设置失败', icon: 'none' });
      } finally {
        this.loading = false;
      }
    },
    
    async loadReminderHistory() {
      try {
        const userId = this.getUserId();
        if (!userId) return;
        
        const res = await uniCloud.callFunction({
          name: 'reminder',
          data: {
            action: 'getReminderHistory',
            data: { userId, pageSize: 10 }
          }
        });
        
        if (res.result && res.result.success) {
          this.reminderHistory = res.result.data.reminders || [];
        }
      } catch (error) {
        console.error('加载提醒历史失败:', error);
      }
    },
    
    onBefore24hChange(e) {
      this.preferences.before24h = e.detail.value;
    },
    
    onBefore2hChange(e) {
      this.preferences.before2h = e.detail.value;
    },
    
    onWechatChange(e) {
      this.preferences.wechatEnabled = e.detail.value;
    },
    
    onSmsChange(e) {
      this.preferences.smsEnabled = e.detail.value;
    },
    
    async saveSettings() {
      if (this.saving) return;
      
      try {
        this.saving = true;
        const userId = this.getUserId();
        
        if (!userId) {
          const ok = await this.ensureLogin();
          if (!ok) return;
        }
        
        const finalUserId = this.getUserId();
        const res = await uniCloud.callFunction({
          name: 'reminder',
          data: {
            action: 'setReminderPreference',
            data: {
              userId: finalUserId,
              preferences: this.preferences
            }
          }
        });
        
        if (res.result && res.result.success) {
          uni.showToast({ title: '设置保存成功', icon: 'success' });
        } else {
          uni.showToast({ title: (res.result && res.result.message) || '保存失败', icon: 'none' });
        }
      } catch (error) {
        console.error('保存设置失败:', error);
        uni.showToast({ title: '保存设置失败', icon: 'none' });
      } finally {
        this.saving = false;
      }
    },
    
    formatTime(timestamp) {
      const date = new Date(timestamp);
      const now = new Date();
      const diff = now - date;
      
      if (diff < 60000) {
        return '刚刚';
      } else if (diff < 3600000) {
        return Math.floor(diff / 60000) + '分钟前';
      } else if (diff < 86400000) {
        return Math.floor(diff / 3600000) + '小时前';
      } else {
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString().slice(0, 5);
      }
    },
    
    getStatusText(status) {
      const statusMap = {
        'sent': '已发送',
        'failed': '发送失败',
        'pending': '待发送'
      };
      return statusMap[status] || status;
    }
  }
}
</script>

<style scoped>
.reminder-settings {
  min-height: 100vh;
  background-color: #f5f5f5;
}

.content {
  padding: 20rpx;
  padding-bottom: 120rpx;
}

.section {
  background: white;
  border-radius: 16rpx;
  margin-bottom: 20rpx;
  overflow: hidden;
}

.section-title {
  padding: 30rpx;
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
  border-bottom: 1px solid #f0f0f0;
}

.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 30rpx;
  border-bottom: 1px solid #f0f0f0;
}

.setting-item:last-child {
  border-bottom: none;
}

.setting-label {
  font-size: 30rpx;
  color: #333;
}

.history-list {
  padding: 0 30rpx;
}

.history-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 30rpx 0;
  border-bottom: 1px solid #f0f0f0;
}

.history-item:last-child {
  border-bottom: none;
}

.history-content {
  flex: 1;
}

.history-message {
  font-size: 28rpx;
  color: #333;
  margin-bottom: 10rpx;
}

.history-time {
  font-size: 24rpx;
  color: #999;
}

.history-status {
  padding: 8rpx 16rpx;
  border-radius: 8rpx;
  font-size: 24rpx;
  color: white;
}

.history-status.sent {
  background-color: #4CAF50;
}

.history-status.failed {
  background-color: #f44336;
}

.history-status.pending {
  background-color: #ff9800;
}

.empty-state {
  text-align: center;
  padding: 60rpx 0;
  color: #999;
  font-size: 28rpx;
}

.footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 20rpx;
  background: white;
  border-top: 1px solid #f0f0f0;
}

.save-btn {
  width: 100%;
  height: 88rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 44rpx;
  font-size: 32rpx;
  font-weight: 600;
}

.save-btn:active {
  opacity: 0.8;
}
</style>