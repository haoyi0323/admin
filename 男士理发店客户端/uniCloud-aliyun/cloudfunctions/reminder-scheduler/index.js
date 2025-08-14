'use strict';

// 预约提醒定时任务云函数
exports.main = async (event, context) => {
  const { action = 'runScheduler' } = event;
  
  if (action === 'runScheduler') {
    return await runReminderScheduler();
  }
  
  return { success: false, message: 'unknown action' };
};

// 运行提醒调度器
async function runReminderScheduler() {
  const results = {
    before24h: null,
    before2h: null,
    errors: []
  };
  
  try {
    // 发送24小时前提醒
    console.log('开始发送24小时前提醒...');
    const before24hResult = await uniCloud.callFunction({
      name: 'reminder',
      data: {
        action: 'batchSendReminders',
        data: { type: 'before24h' }
      }
    });
    
    results.before24h = before24hResult.result;
    console.log('24小时前提醒结果:', before24hResult.result);
    
  } catch (error) {
    console.error('发送24小时前提醒失败:', error);
    results.errors.push({
      type: 'before24h',
      error: error.message
    });
  }
  
  try {
    // 发送2小时前提醒
    console.log('开始发送2小时前提醒...');
    const before2hResult = await uniCloud.callFunction({
      name: 'reminder',
      data: {
        action: 'batchSendReminders',
        data: { type: 'before2h' }
      }
    });
    
    results.before2h = before2hResult.result;
    console.log('2小时前提醒结果:', before2hResult.result);
    
  } catch (error) {
    console.error('发送2小时前提醒失败:', error);
    results.errors.push({
      type: 'before2h',
      error: error.message
    });
  }
  
  // 记录调度执行日志
  try {
    const db = uniCloud.database();
    await db.collection('scheduler_logs').add({
      type: 'reminder_scheduler',
      executedAt: Date.now(),
      results,
      success: results.errors.length === 0
    });
  } catch (error) {
    console.error('记录调度日志失败:', error);
  }
  
  return {
    success: true,
    message: '提醒调度执行完成',
    data: results
  };
}

// 清理过期的调度日志（保留最近30天）
async function cleanupSchedulerLogs() {
  try {
    const db = uniCloud.database();
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    
    const res = await db.collection('scheduler_logs')
      .where({
        executedAt: db.command.lt(thirtyDaysAgo)
      })
      .remove();
    
    console.log(`清理了 ${res.deleted} 条过期日志`);
    return res.deleted;
  } catch (error) {
    console.error('清理调度日志失败:', error);
    return 0;
  }
}