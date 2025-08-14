'use strict';

// 文件上传云函数
// 支持图片上传到云存储，并返回 URL 供前端使用

exports.main = async (event, context) => {
  const { action, data } = event;

  try {
    switch (action) {
      case 'upload':
        return await uploadFile(data);
      case 'delete':
        return await deleteFile(data);
      default:
        return {
          code: 400,
          message: '无效的操作类型'
        };
    }
  } catch (error) {
    console.error('文件上传云函数错误:', error);
    return {
      code: 500,
      message: '服务器内部错误',
      error: error.message
    };
  }
};

// 上传文件
async function uploadFile(data) {
  const { fileBase64, fileName, fileType = 'image/jpeg' } = data;

  if (!fileBase64 || !fileName) {
    return {
      code: 400,
      message: '文件内容和文件名不能为空'
    };
  }

  try {
    // 生成唯一文件名
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const ext = fileName.split('.').pop() || 'jpg';
    const cloudFileName = `services/${timestamp}_${randomStr}.${ext}`;

    // 将 base64 转换为 Buffer
    const base64Data = fileBase64.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    // 上传到云存储
    const uploadResult = await uniCloud.uploadFile({
      cloudPath: cloudFileName,
      fileContent: buffer
    });

    if (uploadResult.fileID) {
      return {
        code: 200,
        message: '上传成功',
        data: {
          fileID: uploadResult.fileID,
          url: uploadResult.fileID, // uniCloud 会自动转换为可访问的 URL
          fileName: cloudFileName
        }
      };
    } else {
      return {
        code: 500,
        message: '上传失败'
      };
    }

  } catch (error) {
    console.error('文件上传失败:', error);
    return {
      code: 500,
      message: '文件上传失败',
      error: error.message
    };
  }
}

// 删除文件
async function deleteFile(data) {
  const { fileID } = data;

  if (!fileID) {
    return {
      code: 400,
      message: '文件ID不能为空'
    };
  }

  try {
    await uniCloud.deleteFile({
      fileList: [fileID]
    });

    return {
      code: 200,
      message: '删除成功'
    };

  } catch (error) {
    console.error('文件删除失败:', error);
    return {
      code: 500,
      message: '文件删除失败',
      error: error.message
    };
  }
}