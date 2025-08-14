export function parseHoursIsOpen(hours, now = new Date()) {
  if (!hours) return { isOpen: false, start: null, end: null }
  const match = hours.match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/)
  if (!match) return { isOpen: false, start: null, end: null }
  const [_, startStr, endStr] = match
  const [sh, sm] = startStr.split(':').map(n => parseInt(n, 10))
  const [eh, em] = endStr.split(':').map(n => parseInt(n, 10))
  const start = new Date(now)
  start.setHours(sh, sm, 0, 0)
  const end = new Date(now)
  end.setHours(eh, em, 0, 0)
  if (end <= start) {
    // 处理跨天营业，如 20:00 - 02:00
    end.setDate(end.getDate() + 1)
  }
  const isOpen = now >= start && now <= end
  return { isOpen, start, end, startStr, endStr }
}


