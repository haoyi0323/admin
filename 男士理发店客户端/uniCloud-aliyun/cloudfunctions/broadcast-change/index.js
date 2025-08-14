'use strict';

/**
 * 数据变更广播云函数
 * 用于通知其他客户端数据发生变更
 */
exports.main = async (event, context) => {
  const { collection, action, data, timestamp, clientId } = event;
  
  // 获取数据库引用
  const db = uniCloud.database();
  
  try {
    // 记录数据变更日志
    await db.collection('data_change_log').add({
      collection,
      action,
      data_id: data._id || data.id,
      timestamp,
      client_id: clientId,
      create_time: Date.now()
    });
    
    // 这里可以添加推送通知逻辑
    // 例如：向其他在线客户端发送推送消息
    
    return {
      success: true,
      message: '数据变更广播成功',
      timestamp: Date.now()
    };
    
  } catch (error) {
    console.error('数据变更广播失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
};