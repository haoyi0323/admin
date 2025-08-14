'use strict';

exports.main = async (event, context) => {
  const { action, data = {} } = event;
  const db = uniCloud.database();
  
  // 发送预约提醒
  if (action === 'sendReminder') {
    const { bookingId, type = 'before24h' } = data;
    
    if (!bookingId) {
      return { success: false, message: 'bookingId required' };
    }
    
    try {
      // 获取预约信息
      const bookingRes = await db.collection('bookings').doc(bookingId).get();
      if (!bookingRes.data || bookingRes.data.length === 0) {
        return { success: false, message: '预约不存在' };
      }
      
      const booking = bookingRes.data[0];
      
      // 检查预约状态
      if (booking.status !== 'pending') {
        return { success: false, message: '只能为待处理的预约发送提醒' };
      }
      
      // 获取用户信息
      const userRes = await db.collection('users').doc(booking.userId).get();
      const user = userRes.data && userRes.data[0];
      
      // 构建提醒消息
      const reminderMessage = buildReminderMessage(booking, user, type);
      
      // 记录提醒发送
      const reminderRecord = {
        bookingId,
        userId: booking.userId,
        type,
        message: reminderMessage,
        sentAt: Date.now(),
        status: 'sent'
      };
      
      await db.collection('reminders').add(reminderRecord);
      
      // 这里可以集成实际的消息发送服务（如短信、微信模板消息等）
      // 目前只是记录提醒
      
      return {
        success: true,
        message: '提醒发送成功',
        data: reminderRecord
      };
    } catch (error) {
      console.error('发送提醒失败:', error);
      return { success: false, message: '发送提醒失败' };
    }
  }
  
  // 批量发送提醒
  if (action === 'batchSendReminders') {
    const { date, type = 'before24h' } = data;
    
    try {
      let targetDate;
      
      if (type === 'before24h') {
        // 提前24小时提醒：查找明天的预约
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        targetDate = tomorrow.toISOString().split('T')[0];
      } else if (type === 'before2h') {
        // 提前2小时提醒：查找今天的预约
        targetDate = new Date().toISOString().split('T')[0];
      } else if (date) {
        targetDate = date;
      } else {
        return { success: false, message: '无效的提醒类型或日期' };
      }
      
      // 查找目标日期的待处理预约
      const bookingsRes = await db.collection('bookings')
        .where({
          date: targetDate,
          status: 'pending'
        })
        .get();
      
      const bookings = bookingsRes.data || [];
      const results = [];
      
      for (const booking of bookings) {
        // 检查是否已发送过此类型的提醒
        const existingReminderRes = await db.collection('reminders')
          .where({
            bookingId: booking._id,
            type
          })
          .get();
        
        if (existingReminderRes.data && existingReminderRes.data.length > 0) {
          results.push({
            bookingId: booking._id,
            status: 'skipped',
            message: '已发送过提醒'
          });
          continue;
        }
        
        // 发送提醒
        const reminderResult = await exports.main({
          action: 'sendReminder',
          data: { bookingId: booking._id, type }
        }, context);
        
        results.push({
          bookingId: booking._id,
          status: reminderResult.success ? 'sent' : 'failed',
          message: reminderResult.message
        });
      }
      
      return {
        success: true,
        message: `批量提醒完成，处理了${results.length}个预约`,
        data: results
      };
    } catch (error) {
      console.error('批量发送提醒失败:', error);
      return { success: false, message: '批量发送提醒失败' };
    }
  }
  
  // 获取提醒记录
  if (action === 'getReminderHistory') {
    const { bookingId, userId, page = 1, pageSize = 20 } = data;
    
    try {
      let query = db.collection('reminders');
      
      if (bookingId) {
        query = query.where({ bookingId });
      } else if (userId) {
        query = query.where({ userId });
      }
      
      const res = await query
        .orderBy('sentAt', 'desc')
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .get();
      
      const countRes = await query.count();
      const total = countRes.total || 0;
      
      return {
        success: true,
        data: {
          reminders: res.data || [],
          total,
          page,
          pageSize,
          totalPages: Math.ceil(total / pageSize)
        }
      };
    } catch (error) {
      console.error('获取提醒记录失败:', error);
      return { success: false, message: '获取提醒记录失败' };
    }
  }
  
  // 设置提醒偏好
  if (action === 'setReminderPreference') {
    const { userId, preferences } = data;
    
    if (!userId || !preferences) {
      return { success: false, message: 'userId and preferences required' };
    }
    
    try {
      // 查找现有偏好设置
      const existingRes = await db.collection('reminder_preferences')
        .where({ userId })
        .get();
      
      const preferenceData = {
        userId,
        ...preferences,
        updatedAt: Date.now()
      };
      
      if (existingRes.data && existingRes.data.length > 0) {
        // 更新现有设置
        await db.collection('reminder_preferences')
          .doc(existingRes.data[0]._id)
          .update(preferenceData);
      } else {
        // 创建新设置
        preferenceData.createdAt = Date.now();
        await db.collection('reminder_preferences').add(preferenceData);
      }
      
      return { success: true, message: '提醒偏好设置成功' };
    } catch (error) {
      console.error('设置提醒偏好失败:', error);
      return { success: false, message: '设置提醒偏好失败' };
    }
  }
  
  // 获取提醒偏好
  if (action === 'getReminderPreference') {
    const { userId } = data;
    
    if (!userId) {
      return { success: false, message: 'userId required' };
    }
    
    try {
      const res = await db.collection('reminder_preferences')
        .where({ userId })
        .get();
      
      const preference = res.data && res.data[0];
      
      // 默认偏好设置
      const defaultPreference = {
        before24h: true,
        before2h: true,
        smsEnabled: false,
        wechatEnabled: true
      };
      
      return {
        success: true,
        data: preference ? { ...defaultPreference, ...preference } : defaultPreference
      };
    } catch (error) {
      console.error('获取提醒偏好失败:', error);
      return { success: false, message: '获取提醒偏好失败' };
    }
  }
  
  return { success: false, message: 'unknown action' };
};

// 构建提醒消息
function buildReminderMessage(booking, user, type) {
  const userName = user ? (user.nickname || user.phone || '客户') : '客户';
  const serviceNames = {
    'haircut': '理发',
    'wash': '洗头',
    'style': '造型',
    'beard': '修胡须'
  };
  const serviceName = serviceNames[booking.serviceId] || '服务';
  
  let timeText = '';
  if (type === 'before24h') {
    timeText = '明天';
  } else if (type === 'before2h') {
    timeText = '2小时后';
  }
  
  return `${userName}，您好！提醒您${timeText}${booking.time}有${serviceName}预约，请准时到店。如需取消或改期，请及时联系我们。`;
}