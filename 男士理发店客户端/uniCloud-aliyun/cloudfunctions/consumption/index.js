'use strict';

const db = uniCloud.database();
const consumptionCollection = db.collection('consumption_records');

exports.main = async (event, context) => {
  const { action, data } = event;
  
  try {
    switch (action) {
      case 'add':
        return await addConsumptionRecord(data);
      case 'list':
        return await getConsumptionRecords(data);
      case 'delete':
        return await deleteConsumptionRecord(data);
      default:
        return {
          code: 400,
          message: '无效的操作类型'
        };
    }
  } catch (error) {
    console.error('消费记录云函数错误:', error);
    return {
      code: 500,
      message: '服务器内部错误',
      error: error.message
    };
  }
};

// 添加消费记录
async function addConsumptionRecord(data) {
  const { 
    userId, 
    serviceId, 
    serviceName, 
    price, 
    paymentType = 'cash', // 'cash' | 'card'
    cardTimesBefore, 
    cardTimesAfter, 
    bookingId 
  } = data;
  
  if (!userId || !serviceName) {
    return {
      code: 400,
      message: '用户ID和服务名称不能为空'
    };
  }
  
  const record = {
    userId,
    serviceId: serviceId || null,
    serviceName,
    price: parseFloat(price) || 0,
    paymentType,
    cardTimesBefore: parseInt(cardTimesBefore) || 0,
    cardTimesAfter: parseInt(cardTimesAfter) || 0,
    bookingId: bookingId || null,
    consumedAt: Date.now(),
    createdAt: Date.now()
  };
  
  const result = await consumptionCollection.add(record);
  
  return {
    code: 200,
    message: '消费记录添加成功',
    data: { 
      id: result.id || result._id, 
      record 
    }
  };
}

// 获取消费记录列表
async function getConsumptionRecords(data) {
  const { userId, limit = 50, skip = 0 } = data;
  
  if (!userId) {
    return {
      code: 400,
      message: '用户ID不能为空'
    };
  }
  
  const result = await consumptionCollection
    .where({ userId })
    .orderBy('consumedAt', 'desc')
    .skip(skip)
    .limit(limit)
    .get();
  
  return {
    code: 200,
    message: '获取成功',
    data: result.data || []
  };
}

// 删除消费记录
async function deleteConsumptionRecord(data) {
  const { recordId } = data;
  
  if (!recordId) {
    return {
      code: 400,
      message: '记录ID不能为空'
    };
  }
  
  // 检查记录是否存在
  const existingRecord = await consumptionCollection.doc(recordId).get();
  if (existingRecord.data.length === 0) {
    return {
      code: 404,
      message: '记录不存在'
    };
  }
  
  await consumptionCollection.doc(recordId).remove();
  
  return {
    code: 200,
    message: '删除成功'
  };
}