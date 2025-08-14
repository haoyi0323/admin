'use strict';

// 统一 API 网关，为管理后台提供 HTTP 访问入口
// 支持跨域、权限验证、云函数转发

// 管理员权限验证
function verifyAdminToken(adminToken) {
  const validTokens = ['admin123', 'manager456', 'youyi2024']; // 建议改成复杂token
  return validTokens.includes(adminToken);
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
      if (!verifyAdminToken(data.adminToken)) {
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