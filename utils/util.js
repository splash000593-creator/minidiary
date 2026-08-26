const formatNumber = n => {
  n = n.toString()
  return n[1] ? n : `0${n}`
}

const pad = formatNumber

const formatTime = date => {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hour = date.getHours()
  const minute = date.getMinutes()
  const second = date.getSeconds()
  return `${[year, month, day].map(formatNumber).join('-')} ${[hour, minute, second].map(formatNumber).join(':')}`
}

const toDateStr = date => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

const todayStr = () => toDateStr(new Date())

const toMonthStr = date => `${date.getFullYear()}-${pad(date.getMonth() + 1)}`

const formatMonthCN = monthStr => {
  const parts = monthStr.split('-')
  return `${parts[0]}年${Number(parts[1])}月`
}

const monthRange = monthStr => {
  const parts = monthStr.split('-').map(Number)
  const y = parts[0]
  const m = parts[1]
  const start = `${y}-${pad(m)}-01`
  const endDate = new Date(y, m, 0).getDate()
  const end = `${y}-${pad(m)}-${pad(endDate)}`
  return { start, end }
}

const formatAmount = n => {
  const v = Number(n || 0)
  return v.toFixed(2)
}

const WEEK = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

const weekDayText = date => WEEK[date.getDay()]

const formatDateCN = dateStr => {
  const d = new Date(`${dateStr}T00:00:00`)
  return `${d.getMonth() + 1}月${d.getDate()}日 ${weekDayText(d)}`
}

const dateLabel = dateStr => {
  const today = todayStr()
  const yesterday = toDateStr(new Date(Date.now() - 86400000))
  if (dateStr === today) return '今天'
  if (dateStr === yesterday) return '昨天'
  return formatDateCN(dateStr)
}

module.exports = {
  formatTime,
  pad,
  toDateStr,
  todayStr,
  toMonthStr,
  formatMonthCN,
  monthRange,
  formatAmount,
  weekDayText,
  formatDateCN,
  dateLabel
}
