'use strict';

/**
 * 数据同步云函数
 * 用于获取指定时间后的数据更新
 */
exports.main = async (event, context) => {
  const { lastSyncTime = 0, collections = [] } = event;
  
  // 获取数据库引用
  const db = uniCloud.database();
  const updates = [];
  
  try {
    // 遍历需要同步的集合
    for (const collection of collections) {
      let collectionRef;
      
      switch (collection) {
        case 'bookings':
          collectionRef = db.collection('bookings');
          break;
        case 'services':
          collectionRef = db.collection('services');
          break;
        case 'users':
          collectionRef = db.collection('users');
          break;
        default:
          continue;
      }
      
      // 查询更新时间大于lastSyncTime的记录
      const result = await collectionRef
        .where({
          update_time: db.command.gt(lastSyncTime)
        })
        .orderBy('update_time', 'asc')
        .limit(100) // 限制每次同步的数据量
        .get();
      
      // 处理查询结果
      if (result.data && result.data.length > 0) {
        for (const item of result.data) {
          updates.push({
            collection,
            action: item.is_deleted ? 'delete' : (item.create_time === item.update_time ? 'create' : 'update'),
            data: item
          });
        }
      }
    }
    
    return {
      success: true,
      updates,
      timestamp: Date.now()
    };
    
  } catch (error) {
    console.error('数据同步失败:', error);
    return {
      success: false,
      error: error.message,
      updates: []
    };
  }
};