export const servicesData = [
  { id: 1, category: 'cut', name: '剪发', durationMin: 30, price: 79, image: '/static/剪发.jpg' },
  { id: 2, category: 'style', name: '洗吹', durationMin: 20, price: 29, image: '/static/洗吹.jpg' },
  { id: 3, category: 'shave', name: '修面', durationMin: 30, price: 58, image: '/static/修面.jpg' },
  { id: 4, category: 'perm', name: '黑人烫', durationMin: 120, price: 499, image: '/static/黑人烫.png' }
]

export const groupBuyUrl = 'https://v.douyin.com/Cs1wI9LhTPc/'

export const categoryLabels = {
  all: '全部',
  cut: '剪发',
  shave: '修面',
  style: '洗吹',
  perm: '烫发'
}

export async function fetchAvailableSlots(date, durationMin = 25) {
  return new Promise((resolve) => {
    if (typeof uniCloud !== 'undefined' && uniCloud && typeof uniCloud.callFunction === 'function') {
      uniCloud.callFunction({
        name: 'booking',
        data: { action: 'getSlots', date, durationMin },
        success: (res) => resolve(res.result?.data?.slots || []),
        fail: () => resolve([])
      })
    } else {
      resolve(['09:00','10:00','11:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00'])
    }
  })
}

export async function fetchEarliest(date, durationMin = 25) {
  return new Promise((resolve) => {
    if (typeof uniCloud !== 'undefined' && uniCloud && typeof uniCloud.callFunction === 'function') {
      uniCloud.callFunction({
        name: 'booking',
        data: { action: 'getEarliest', date, durationMin },
        success: (res) => resolve(res.result?.data?.earliest || ''),
        fail: () => resolve('')
      })
    } else {
      resolve('09:00')
    }
  })
}


