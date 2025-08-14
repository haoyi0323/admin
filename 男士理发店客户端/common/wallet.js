const BALANCE_KEY = 'MY_WALLET_BALANCE'
const BILLS_KEY = 'MY_WALLET_BILLS'

export function getBalance() {
  try {
    const v = uni.getStorageSync(BALANCE_KEY)
    return typeof v === 'number' ? v : 0
  } catch (e) {
    return 0
  }
}

export function setBalance(value) {
  const safe = Number(value) || 0
  uni.setStorageSync(BALANCE_KEY, safe)
  return safe
}

export function getBills() {
  try {
    const list = uni.getStorageSync(BILLS_KEY)
    return Array.isArray(list) ? list : []
  } catch (e) {
    return []
  }
}

export function addBill(bill) {
  const list = getBills()
  const record = {
    id: Date.now(),
    type: bill.type, // 'recharge'(充卡) | 'consume'(消费)
    amount: Number(bill.amount) || 0,
    remark: bill.remark || '',
    time: bill.time || new Date().toISOString()
  }
  list.unshift(record)
  uni.setStorageSync(BILLS_KEY, list)
  return record
}


