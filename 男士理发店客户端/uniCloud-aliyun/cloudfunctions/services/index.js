'use strict';

const db = uniCloud.database();
const servicesCollection = db.collection('services');

exports.main = async (event, context) => {
  const { action, data } = event;
  
  try {
    switch (action) {
      case 'list':
        return await listServices(data);
      case 'get':
        return await getService(data);
      case 'create':
        return await createService(data);
      case 'update':
        return await updateService(data);
      case 'delete':
        return await deleteService(data);
      default:
        return {
          code: 400,
          message: '无效的操作类型'
        };
    }
  } catch (error) {
    console.error('服务管理云函数错误:', error);
    return {
      code: 500,
      message: '服务器内部错误',
      error: error.message
    };
  }
};

// 获取服务列表
async function listServices(data = {}) {
  const { includeInactive = false } = data;
  
  let query = servicesCollection;
  
  // 默认只返回启用的服务
  if (!includeInactive) {
    query = query.where({
      isActive: true
    });
  }
  
  const result = await query
    .orderBy('sortOrder', 'asc')
    .orderBy('createdAt', 'desc')
    .get();
  
  return {
    code: 200,
    message: '获取成功',
    data: result.data
  };
}

// 获取单个服务
async function getService(data) {
  const { id } = data;
  
  if (!id) {
    return {
      code: 400,
      message: '服务ID不能为空'
    };
  }
  
  const result = await servicesCollection.doc(id).get();
  
  if (result.data.length === 0) {
    return {
      code: 404,
      message: '服务不存在'
    };
  }
  
  return {
    code: 200,
    message: '获取成功',
    data: result.data[0]
  };
}

// 创建服务
async function createService(data) {
  const { name, description, image, duration, price, isActive = true, sortOrder = 0 } = data;
  
  // 验证必填字段
  if (!name || !duration || price === undefined) {
    return {
      code: 400,
      message: '服务名称、时长和价格不能为空'
    };
  }
  
  if (duration <= 0) {
    return {
      code: 400,
      message: '服务时长必须大于0'
    };
  }
  
  if (price < 0) {
    return {
      code: 400,
      message: '服务价格不能为负数'
    };
  }
  
  const serviceData = {
    name,
    description: description || '',
    image: image || '',
    duration: parseInt(duration),
    price: parseFloat(price),
    isActive,
    sortOrder: parseInt(sortOrder),
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  const result = await servicesCollection.add(serviceData);
  
  return {
    code: 200,
    message: '创建成功',
    data: {
      id: result.id,
      ...serviceData
    }
  };
}

// 更新服务
async function updateService(data) {
  const { id, name, description, image, duration, price, isActive, sortOrder } = data;
  
  if (!id) {
    return {
      code: 400,
      message: '服务ID不能为空'
    };
  }
  
  // 检查服务是否存在
  const existingService = await servicesCollection.doc(id).get();
  if (existingService.data.length === 0) {
    return {
      code: 404,
      message: '服务不存在'
    };
  }
  
  const updateData = {
    updatedAt: new Date()
  };
  
  // 只更新提供的字段
  if (name !== undefined) {
    if (!name) {
      return {
        code: 400,
        message: '服务名称不能为空'
      };
    }
    updateData.name = name;
  }
  
  if (description !== undefined) {
    updateData.description = description;
  }
  
  if (image !== undefined) {
    updateData.image = image;
  }
  
  if (duration !== undefined) {
    if (duration <= 0) {
      return {
        code: 400,
        message: '服务时长必须大于0'
      };
    }
    updateData.duration = parseInt(duration);
  }
  
  if (price !== undefined) {
    if (price < 0) {
      return {
        code: 400,
        message: '服务价格不能为负数'
      };
    }
    updateData.price = parseFloat(price);
  }
  
  if (isActive !== undefined) {
    updateData.isActive = isActive;
  }
  
  if (sortOrder !== undefined) {
    updateData.sortOrder = parseInt(sortOrder);
  }
  
  await servicesCollection.doc(id).update(updateData);
  
  return {
    code: 200,
    message: '更新成功'
  };
}

// 删除服务
async function deleteService(data) {
  const { id } = data;
  
  if (!id) {
    return {
      code: 400,
      message: '服务ID不能为空'
    };
  }
  
  // 检查服务是否存在
  const existingService = await servicesCollection.doc(id).get();
  if (existingService.data.length === 0) {
    return {
      code: 404,
      message: '服务不存在'
    };
  }
  
  await servicesCollection.doc(id).remove();
  
  return {
    code: 200,
    message: '删除成功'
  };
}