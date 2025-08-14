'use strict';

// 统一 API 网关，为管理后台提供 HTTP 访问入口
// 支持跨域、权限验证、云函数转发

// 管理员权限验证

async function verifyAdminToken(adminToken) {
  if (!adminToken) return false;
  
  try {
    const db = uniCloud.database();
    // 从数据库configs表读取管理员Token列表
    const tokenConf = await db.collection('configs').doc('adminTokens').get();
    const tokenDoc = tokenConf && tokenConf.data && tokenConf.data[0];
    
    if (tokenDoc && tokenDoc.value && Array.isArray(tokenDoc.value)) {
      return tokenDoc.value.includes(adminToken);
    }
    
    // 如果数据库中没有配置，使用默认Token（向后兼容）
    const defaultTokens = ['admin123', 'manager456', 'youyi2024'];
    return defaultTokens.includes(adminToken);
  } catch (error) {
    console.error('验证管理员Token失败:', error);
    // 发生错误时使用默认Token（向后兼容）
    const defaultTokens = ['admin123', 'manager456', 'youyi2024'];
    return defaultTokens.includes(adminToken);
  }
}

exports.main = async (event, context) => {
  // 处理跨域
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Requested-With',
    'Content-Type': 'application/json'
  };

  // 处理 OPTIONS 预检请求
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { name, data = {} } = body;

    // 验证管理员权限（对于敏感操作）
    const adminActions = ['getAllBookings', 'setHours', 'updateBooking'];
    if (adminActions.some(action => data.action === action)) {
      if (!(await verifyAdminToken(data.adminToken))) {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({ error: '无权限访问' })
        };
      }
    }

    // 调用目标云函数
    const invokeRes = await uniCloud.callFunction({ name, data })
    const result = invokeRes?.result

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, result })
    };

  } catch (error) {
    console.error('API Gateway Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        success: false, 
        error: error.message || '服务器内部错误' 
      })
    };
  }
};