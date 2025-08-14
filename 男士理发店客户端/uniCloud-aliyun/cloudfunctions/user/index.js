"use strict";

// 云函数：用户档案与会员卡次
// actions:
// - upsertProfile: { nickname, avatar, phone, openId } → 创建/更新用户（含自增 seqNo）
// - getProfile: { openId } or { phone }
// - updateCardTimes: { userId|openId|phone, delta|value }
// - getOpenId: { code } → 根据微信登录凭证获取 openId

async function getNextSeq(db) {
  const coll = db.collection('configs')
  const key = 'userSeq'
  const id = 'userSeq'
  const now = Date.now()
  let seq = 1
  try {
    const cur = await coll.doc(id).get()
    if (cur && cur.data && cur.data[0] && typeof cur.data[0].value === 'number') {
      seq = cur.data[0].value + 1
    }
  } catch (e) {}
  await coll.doc(id).set({ _id: id, key, value: seq, updatedAt: now })
  return seq
}

exports.main = async (event, context) => {
  const db = uniCloud.database()
  let payload = event
  try { if (typeof payload === 'string') payload = JSON.parse(payload) } catch (e) {}
  let data = payload || {}
  if (data && data.data && typeof data.data === 'object') data = data.data
  else if (data && data.params && typeof data.params === 'object') data = data.params
  else if (data && data.body) {
    try { data = typeof data.body === 'string' ? JSON.parse(data.body) : data.body } catch (e) {}
  }

  const action = data.action

  if (action === 'upsertProfile') {
    const { userId = '', openId = '', phone = '', nickname = '', avatar = '' } = data
    if (!nickname) return { code: 400, message: 'nickname required' }
    const users = db.collection('users')
    const now = Date.now()
    if (userId) {
      await users.doc(userId).update({ nickname, avatar, phone, updatedAt: now })
      const updated = await users.doc(userId).get()
      const doc = updated && updated.data && updated.data[0]
      return { code: 0, data: { id: userId, seqNo: doc?.seqNo, updated: true } }
    }
    let target = null
    if (openId) {
      const res = await users.where({ openId }).get()
      target = res.data && res.data[0]
    } else if (phone) {
      const res = await users.where({ phone }).get()
      target = res.data && res.data[0]
    }
    if (target) {
      await users.doc(target._id).update({ nickname, avatar, phone, updatedAt: now })
      return { code: 0, data: { id: target._id, seqNo: target.seqNo, updated: true } }
    } else {
      const seqNo = await getNextSeq(db)
      const addRes = await users.add({ openId, phone, nickname, avatar, seqNo, cardTimes: 0, createdAt: now, updatedAt: now })
      return { code: 0, data: { id: addRes.id || addRes._id, seqNo } }
    }
  }

  if (action === 'getProfile') {
    const { userId = '', openId = '', phone = '' } = data
    if (!userId && !openId && !phone) return { code: 400, message: 'userId or openId or phone required' }
    const users = db.collection('users')
    const res = userId
      ? await users.doc(userId).get()
      : (openId ? await users.where({ openId }).get() : await users.where({ phone }).get())
    const doc = res.data && res.data[0]
    return { code: 0, data: doc || null }
  }

  if (action === 'updateCardTimes') {
    const { userId = '', openId = '', phone = '', delta, value } = data
    const users = db.collection('users')
    let docId = userId
    if (!docId) {
      const res = openId ? await users.where({ openId }).get() : await users.where({ phone }).get()
      const doc = res.data && res.data[0]
      if (!doc) return { code: 404, message: 'user not found' }
      docId = doc._id
    }
    
    if (typeof value === 'number') {
      await users.doc(docId).update({ cardTimes: value, updatedAt: Date.now() })
      return { code: 0, data: { ok: true, cardTimes: value } }
    } else if (typeof delta === 'number') {
      // 需要先获取当前 cardTimes
      const currentRes = await users.doc(docId).get()
      const currentDoc = currentRes.data && currentRes.data[0]
      if (!currentDoc) return { code: 404, message: 'user not found' }
      const newTimes = (currentDoc.cardTimes || 0) + delta
      await users.doc(docId).update({ cardTimes: newTimes, updatedAt: Date.now() })
      return { code: 0, data: { ok: true, cardTimes: newTimes } }
    }
    
    return { code: 400, message: 'invalid params' }
  }

  if (action === 'getOpenId') {
    const { code } = data
    if (!code) return { code: 400, message: 'code required' }
    try {
      const appid = process.env.WX_APPID || ''
      const secret = process.env.WX_APPSECRET || ''
      if (!appid || !secret) {
        return { code: 500, message: '微信配置缺失，请在云函数环境变量中配置 WX_APPID 和 WX_APPSECRET' }
      }
      const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${appid}&secret=${secret}&js_code=${code}&grant_type=authorization_code`
      const { data: resp } = await uniCloud.httpclient.request(url, { method: 'GET', dataType: 'json' })
      if (resp && resp.openid) {
        return { code: 0, data: { openId: resp.openid, unionId: resp.unionid || '' } }
      }
      return { code: 500, message: resp?.errmsg || 'jscode2session failed', data: resp }
    } catch (e) {
      return { code: 500, message: e.message }
    }
  }

  if (action === 'getConsumptionRecords') {
    const { userId, phone, openId, limit = 50, skip = 0 } = data || {};
    let finalUserId = userId;
    try {
      const usersCollection = db.collection('users');
      // 如果没有 userId，尝试根据 phone 或 openId 查找
      if (!finalUserId && (phone || openId)) {
        const where = phone ? { phone } : { openId };
        const userRes = await usersCollection.where(where).get();
        if (userRes.data && userRes.data.length > 0) {
          finalUserId = userRes.data[0]._id;
        }
      }
      
      if (!finalUserId) {
        return { code: 400, message: '缺少用户标识(userId/phone/openId)' };
      }
      
      // 从 consumption 集合读取
      const consumptionCollection = db.collection('consumption_records');
      const result = await consumptionCollection
        .where({ userId: finalUserId })
        .orderBy('consumedAt', 'desc')
        .skip(skip)
        .limit(limit)
        .get();
      
      const raw = result.data || [];
      // 转换为前端期望的字段结构
      const mapped = raw.map(r => ({
        date: r.consumedAt ? new Date(r.consumedAt).toISOString() : new Date().toISOString(),
        serviceName: r.serviceName || '未知服务',
        price: Number(r.price || 0),
        paymentType: r.paymentType === 'card' ? 'card' : 'cash',
        cardRemaining: r.paymentType === 'card' ? Number(r.cardTimesAfter || 0) : undefined,
        bookingId: r.bookingId || undefined
      }));
      
      return { code: 200, message: '获取成功', data: mapped };
    } catch (err) {
      console.error('getConsumptionRecords error:', err);
      return { code: 500, message: '服务器内部错误', error: err.message };
    }
  }

  if (action === 'getPhoneNumber') {
    const { code } = data
    if (!code) return { code: 400, message: 'code required' }
    
    try {
      // 首先需要获取 access_token
      const appid = process.env.WX_APPID || ''
      const secret = process.env.WX_APPSECRET || ''
      if (!appid || !secret) {
        return { code: 500, message: '微信配置缺失，请在云函数环境变量中配置 WX_APPID 和 WX_APPSECRET' }
      }
      
      // 获取 access_token
      const tokenUrl = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appid}&secret=${secret}`
      const { data: tokenResp } = await uniCloud.httpclient.request(tokenUrl, { method: 'GET', dataType: 'json' })
      
      if (!tokenResp || !tokenResp.access_token) {
        return { code: 500, message: '获取access_token失败', data: tokenResp }
      }
      
      // 解析手机号
      const phoneUrl = `https://api.weixin.qq.com/wxa/business/getuserphonenumber?access_token=${tokenResp.access_token}`
      const { data: phoneResp } = await uniCloud.httpclient.request(phoneUrl, { 
        method: 'POST', 
        dataType: 'json',
        data: JSON.stringify({ code }),
        headers: { 'Content-Type': 'application/json' }
      })
      
      if (phoneResp && phoneResp.errcode === 0 && phoneResp.phone_info) {
        return { 
          code: 0, 
          data: { 
            phoneNumber: phoneResp.phone_info.phoneNumber,
            purePhoneNumber: phoneResp.phone_info.purePhoneNumber,
            countryCode: phoneResp.phone_info.countryCode
          } 
        }
      }
      
      return { code: 500, message: phoneResp?.errmsg || 'getPhoneNumber failed', data: phoneResp }
    } catch (e) {
      return { code: 500, message: e.message }
    }
  }

  return { code: 400, message: 'unknown action' }
}


