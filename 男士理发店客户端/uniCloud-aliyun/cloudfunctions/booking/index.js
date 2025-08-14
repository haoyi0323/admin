"use strict";

// 云函数：预约与可用时段/配置
// event = { action: 'getSlots'|'getEarliest'|'create'|'getHours'|'setHours', date: 'YYYY-MM-DD', time: 'HH:mm', durationMin: number, userId, serviceId, hours, phone }

function parseTimeToMinutes(hhmm) {
  const [h, m] = hhmm.split(":").map((n) => parseInt(n, 10));
  return h * 60 + m;
}

function formatMinutesToTime(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function listSlots({ startStr, endStr, durationMin, stepMin = 5 }) {
  const start = parseTimeToMinutes(startStr);
  const end = parseTimeToMinutes(endStr);
  const result = [];
  for (let t = start; t + durationMin <= end; t += stepMin) {
    result.push({ startMin: t, endMin: t + durationMin, time: formatMinutesToTime(t) });
  }
  return result;
}

// 简单重叠判断
function isOverlap(aStart, aEnd, bStart, bEnd) {
  return Math.max(aStart, bStart) < Math.min(aEnd, bEnd);
}

async function getBookedRanges(db, date) {
  const res = await db.collection("bookings").where({ date, status: db.command.neq("cancelled") }).get();
  const docs = res?.data || [];
  return docs.map((d) => {
    const startMin = parseTimeToMinutes(d.time);
    const endMin = startMin + (Number(d.durationMin) || 25);
    return { startMin, endMin };
  });
}

// 管理员权限验证函数
function verifyAdminToken(adminToken) {
  // 简单的token验证，实际项目中应该使用更安全的验证方式
  const validTokens = ['admin123', 'manager456'];
  return validTokens.includes(adminToken);
}

exports.main = async (event, context) => {
  const db = uniCloud.database();
  
  // 临时处理：当接收到空对象或无action时，设置默认测试参数
  if (!event || Object.keys(event).length === 0 || (!event.action && !event.data && !event.params && !event.body)) {
    event = { action: "getHours" };
    console.log('使用默认测试参数:', event);
  }
  
  // 兼容多种触发方式：直接对象、字符串、{data:{...}}
  // 统一解析调用参数
  let payload = event
  try { if (typeof payload === 'string') payload = JSON.parse(payload) } catch (e) {}
  let data = payload || {}
  // 兼容 { data: {...} } / { params: {...} } / { body: '{...}' }
  if (data && data.data && typeof data.data === 'object') data = data.data
  else if (data && data.params && typeof data.params === 'object') data = data.params
  else if (data && data.body) {
    try { data = typeof data.body === 'string' ? JSON.parse(data.body) : data.body } catch (e) {}
  }
  const action = data.action
  
  // 需要管理员权限的操作列表
  const adminActions = ['getAllBookings', 'updateBookingStatus'];
  
  // 检查是否需要管理员权限
  if (adminActions.includes(action)) {
    const { adminToken } = data;
    if (!adminToken || !verifyAdminToken(adminToken)) {
      return { success: false, message: "无权限访问，需要管理员身份验证" };
    }
  }

  // 店铺营业时间：优先读取数据库 configs(shopHours)，可由 data.hours 覆盖
  let hours = (data && data.hours) || "";
  if (!hours) {
    try {
      const conf = await db.collection('configs').doc('shopHours').get();
      const doc = conf && conf.data && conf.data[0];
      hours = (doc && (doc.value || doc.hours)) || "";
    } catch (e) { hours = "" }
  }
  if (!hours) hours = "09:00 - 20:00";
  const match = hours.match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/);
  const startStr = match ? match[1] : "09:00";
  const endStr = match ? match[2] : "20:00";

  if (action === "getSlots") {
    const { date, durationMin = 25, stepMin = 5 } = data;
    if (!date) return { code: 400, message: "date required" };
    const all = listSlots({ startStr, endStr, durationMin, stepMin });
    const busy = await getBookedRanges(db, date);
    const free = all.filter((s) => busy.every((b) => !isOverlap(s.startMin, s.endMin, b.startMin, b.endMin)));
    return { code: 0, data: { slots: free.map((s) => s.time) } };
  }

  if (action === "getEarliest") {
    const { date, durationMin = 25, stepMin = 5 } = data;
    if (!date) return { code: 400, message: "date required" };
    const all = listSlots({ startStr, endStr, durationMin, stepMin });
    const busy = await getBookedRanges(db, date);
    const free = all.filter((s) => busy.every((b) => !isOverlap(s.startMin, s.endMin, b.startMin, b.endMin)));
    const slots = free.map((s) => s.time);
    const now = new Date();
    const curMin = now.getHours() * 60 + now.getMinutes();
    const first = slots.find((t) => parseTimeToMinutes(t) >= curMin) || slots[0] || null;
    return { code: 0, data: { earliest: first || "" } };
  }

  if (action === "getHours") {
    return { code: 0, data: { hours } }
  }

  if (action === "setHours") {
    const value = data.hours
    if (!value) return { code: 400, message: "hours required" }
    // 使用固定 docId 便于管理端直接覆盖
    await db.collection('configs').doc('shopHours').set({ key: 'shopHours', value, updatedAt: Date.now(), _id: 'shopHours' })
    return { code: 0, data: { ok: true } }
  }

  if (action === "create") {
    const { userId = "", serviceId = 0, date, time, durationMin = 25, remark = "", phone = "" } = data;
    if (!date || !time) return { code: 400, message: "date/time required" };
    if (!userId) return { code: 400, message: "userId required" };

    // 冲突检测
    const startMin = parseTimeToMinutes(time);
    const endMin = startMin + durationMin;
    const busy = await getBookedRanges(db, date);
    const conflict = busy.some((b) => isOverlap(startMin, endMin, b.startMin, b.endMin));
    if (conflict) return { code: 409, message: "该时段已被预约，请选择其他时间" };

    const doc = {
      userId,
      serviceId,
      date,
      time,
      durationMin,
      remark,
      contactPhone: phone || "",
      status: "pending",
      createdAt: Date.now(),
    };
    const addRes = await db.collection("bookings").add(doc);
    if (phone && userId) {
      try { await db.collection('users').doc(userId).update({ phone, updatedAt: Date.now() }) } catch (e) {}
    }
    return { code: 0, data: { id: addRes.id || addRes._id, ok: true } };
  }

  if (action === "getUserBookings") {
    const { userId } = data;
    if (!userId) return { code: 400, message: "userId required" };
    
    try {
      const res = await db.collection("bookings")
        .where({ userId })
        .orderBy("createdAt", "desc")
        .get();
      
      const bookings = res.data || [];
      return { success: true, data: bookings };
    } catch (error) {
      console.error('获取用户预约列表失败:', error);
      return { success: false, message: "获取预约列表失败" };
    }
  }

  if (action === "cancelBooking") {
    const { bookingId } = data;
    if (!bookingId) return { code: 400, message: "bookingId required" };
    
    try {
      // 先查询预约是否存在
      const booking = await db.collection("bookings").doc(bookingId).get();
      if (!booking.data || booking.data.length === 0) {
        return { success: false, message: "预约不存在" };
      }
      
      const bookingData = booking.data[0];
      if (bookingData.status === "cancelled") {
        return { success: false, message: "预约已取消" };
      }
      
      if (bookingData.status === "completed") {
        return { success: false, message: "已完成的预约无法取消" };
      }
      
      // 更新预约状态为已取消
      await db.collection("bookings").doc(bookingId).update({
        status: "cancelled",
        cancelledAt: Date.now()
      });
      
      return { success: true, message: "预约已取消" };
    } catch (error) {
      console.error('取消预约失败:', error);
      return { success: false, message: "取消预约失败" };
    }
  }

  if (action === "updateBookingStatus") {
    const { bookingId, status } = data;
    if (!bookingId || !status) return { success: false, message: "bookingId and status required" };
    
    const validStatuses = ["pending", "confirmed", "completed", "cancelled"];
    if (!validStatuses.includes(status)) {
      return { success: false, message: "无效的状态值" };
    }
    
    try {
      // 先查询预约是否存在
      const booking = await db.collection("bookings").doc(bookingId).get();
      if (!booking.data || booking.data.length === 0) {
        return { success: false, message: "预约不存在" };
      }
      
      const bookingData = booking.data[0];
      
      const updateData = {
        status,
        updatedAt: Date.now()
      };
      
      if (status === "completed") {
        // 幂等：如果已是完成状态，则不重复扣次/记账
        const firstTimeComplete = bookingData.status !== 'completed' || !bookingData.completedAt;
        if (firstTimeComplete) {
          updateData.completedAt = Date.now();
          
          // 获取服务信息
          let serviceName = '未知服务';
          let servicePrice = 0;
          
          try {
            const serviceRes = await db.collection("services").doc(bookingData.serviceId).get();
            if (serviceRes.data && serviceRes.data.length > 0) {
              serviceName = serviceRes.data[0].name || '未知服务';
              servicePrice = serviceRes.data[0].price || 0;
            }
          } catch (serviceError) {
            console.warn('获取服务信息失败:', serviceError);
          }
          
          // 获取用户当前会员卡次数
          let cardTimesBefore = 0;
          let cardTimesAfter = 0;
          let paymentType = 'cash'; // 默认现金支付
          
          try {
            const userRes = await db.collection("users").doc(bookingData.userId).get();
            if (userRes.data && userRes.data.length > 0) {
              cardTimesBefore = userRes.data[0].cardTimes || 0;
              
              // 如果有会员卡次数，优先使用会员卡支付
              if (cardTimesBefore > 0) {
                cardTimesAfter = cardTimesBefore - 1;
                paymentType = 'card';
                
                // 扣减会员卡次数
                await db.collection("users").doc(bookingData.userId).update({
                  cardTimes: cardTimesAfter,
                  updatedAt: Date.now()
                });
              } else {
                cardTimesAfter = 0;
              }
            }
          } catch (userError) {
            console.warn('处理用户会员卡次数失败:', userError);
          }
          
          // 添加消费记录（若不存在）
          try {
            const existed = await db.collection('consumption_records').where({ bookingId }).limit(1).get();
            const hasRecord = existed && existed.data && existed.data.length > 0;
            if (!hasRecord) {
              await uniCloud.callFunction({
                name: 'consumption',
                data: {
                  action: 'add',
                  data: {
                    userId: bookingData.userId,
                    serviceId: bookingData.serviceId,
                    serviceName: serviceName,
                    price: servicePrice,
                    paymentType: paymentType,
                    cardTimesBefore: cardTimesBefore,
                    cardTimesAfter: cardTimesAfter,
                    bookingId: bookingId
                  }
                }
              });
            }
          } catch (consumptionError) {
            console.warn('添加消费记录失败:', consumptionError);
            // 消费记录失败不影响预约状态更新
          }
        } else {
          // 已完成过，保持原 completedAt，不做副作用
          updateData.completedAt = bookingData.completedAt;
        }
      } else if (status === "cancelled") {
        updateData.cancelledAt = Date.now();
      }
      
      // 更新预约状态
      await db.collection("bookings").doc(bookingId).update(updateData);
      
      return { success: true, message: "状态更新成功" };
    } catch (error) {
      console.error('更新预约状态失败:', error);
      return { success: false, message: "状态更新失败" };
    }
  }

  if (action === "getAllBookings") {
    try {
      // 获取所有预约记录，不分页（管理后台使用）
      const res = await db.collection("bookings")
        .orderBy("createdAt", "desc")
        .get();
      
      const bookings = res.data || [];
      return { 
        success: true, 
        data: bookings
      };
    } catch (error) {
      console.error('获取预约列表失败:', error);
      return { success: false, message: "获取预约列表失败" };
    }
  }

  return { code: 400, message: "unknown action", debug: { received: event } };
};


