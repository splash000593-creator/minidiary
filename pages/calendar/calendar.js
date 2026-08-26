const util = require('../../utils/util')
const db = require('../../utils/db')

const WEEK_HEADERS = ['日', '一', '二', '三', '四', '五', '六']
const MEAL_NAMES = { breakfast: '早餐', lunch: '午餐', dinner: '晚餐', snack: '加餐' }

const buildTimeline = (expenses, moods, meals, checkins, goals) => {
  const goalMap = {}
  goals.forEach(goal => { goalMap[goal._id] = goal.title || '目标打卡' })
  const items = []
  expenses.forEach(item => {
    items.push({
      id: 'expense-' + item._id,
      time: item.time || '--:--',
      icon: item.type === 'income' ? '🪙' : '🧾',
      title: item.type === 'income' ? '收入' : '支出',
      desc: (item.category || '未分类') + (item.note ? ' · ' + item.note : ''),
      extra: (item.type === 'income' ? '+' : '-') + util.formatAmount(item.amount),
      colorClass: item.type === 'income' ? 'amount-income' : 'amount-expense',
      section: '账目'
    })
  })
  meals.forEach(item => {
    items.push({
      id: 'meal-' + item._id,
      time: item.time || '--:--',
      icon: '🍽️',
      title: MEAL_NAMES[item.mealType] || '餐食',
      desc: item.content || '记录了一餐',
      extra: '',
      colorClass: '',
      section: '三餐'
    })
  })
  moods.forEach(item => {
    items.push({
      id: 'mood-' + item._id,
      time: item.time || '--:--',
      icon: item.moodIcon || '💭',
      title: '随笔',
      desc: (item.content || '').slice(0, 30) || '写下了此刻的心情',
      extra: item.locationName || '',
      colorClass: '',
      section: '随笔'
    })
  })
  checkins.forEach(item => {
    items.push({
      id: 'checkin-' + item._id,
      time: item.time || '--:--',
      icon: '✓',
      title: '完成打卡',
      desc: goalMap[item.goalId] || '今日习惯',
      extra: '已完成',
      colorClass: 'amount-income',
      section: '打卡'
    })
  })
  return items
}

const dateFromParts = (year, month, day) => `${year}-${util.pad(month)}-${util.pad(day)}`

Page({
  data: {
    yearMonth: '',
    monthLabel: '',
    weekHeaders: WEEK_HEADERS,
    calendarWeeks: [],
    selectedDate: '',
    selectedLabel: '',
    daySections: [],
    dayRecordText: '这一天还没有留下记录',
    loading: true
  },

  onLoad() {
    const now = new Date()
    const today = util.todayStr()
    this.selectedDate = today
    this.skipFirstShow = true
    this.loadMonth(now.getFullYear(), now.getMonth() + 1, today)
  },

  onShow() {
    if (this.skipFirstShow) {
      this.skipFirstShow = false
      return
    }
    if (!this.data.yearMonth) return
    const parts = this.data.yearMonth.split('-').map(Number)
    this.loadMonth(parts[0], parts[1], this.selectedDate)
  },

  loadMonth(year, month, preferredDate) {
    const yearMonth = `${year}-${util.pad(month)}`
    const range = util.monthRange(yearMonth)
    const selectedDate = preferredDate && preferredDate.slice(0, 7) === yearMonth
      ? preferredDate
      : dateFromParts(year, month, 1)
    const requestKey = yearMonth + '-' + Date.now()
    this.requestKey = requestKey
    this.setData({ yearMonth, monthLabel: util.formatMonthCN(yearMonth), loading: true })

    const cmd = db.getCmd()
    const dateQuery = { date: cmd.gte(range.start).and(cmd.lte(range.end)) }
    Promise.all([
      db.fetchAllSafe(db.COLLECTIONS.expense, dateQuery),
      db.fetchAllSafe(db.COLLECTIONS.mood, dateQuery),
      db.fetchAllSafe(db.COLLECTIONS.meal, dateQuery),
      db.fetchAllSafe(db.COLLECTIONS.checkin, dateQuery),
      db.fetchAllSafe(db.COLLECTIONS.goal, {})
    ]).then(([expenses, moods, meals, checkins, goals]) => {
      if (this.requestKey !== requestKey) return
      this.monthRecords = {
        expenses: expenses.list,
        moods: moods.list,
        meals: meals.list,
        checkins: checkins.list,
        goals: goals.list
      }
      const recordMap = {}
      const addMarker = (list, key) => list.forEach(item => {
        if (!recordMap[item.date]) recordMap[item.date] = {}
        recordMap[item.date][key] = true
      })
      addMarker(expenses.list, 'hasExpense')
      addMarker(moods.list, 'hasMood')
      addMarker(meals.list, 'hasMeal')
      addMarker(checkins.list, 'hasCheckin')
      this.recordMap = recordMap
      const calendarWeeks = this.buildCalendar(year, month, recordMap, selectedDate)
      this.setData({ calendarWeeks, selectedDate, selectedLabel: util.formatDateCN(selectedDate), loading: false })
      this.loadDayTimeline(selectedDate)
    }).catch(() => {
      if (this.requestKey !== requestKey) return
      this.monthRecords = { expenses: [], moods: [], meals: [], checkins: [], goals: [] }
      this.recordMap = {}
      const calendarWeeks = this.buildCalendar(year, month, {}, selectedDate)
      this.setData({ calendarWeeks, selectedDate, selectedLabel: util.formatDateCN(selectedDate), daySections: [], dayRecordText: '暂时无法读取记录', loading: false })
    })
  },

  buildCalendar(year, month, recordMap, selectedDate) {
    const firstWeekday = new Date(year, month - 1, 1).getDay()
    const daysInMonth = new Date(year, month, 0).getDate()
    const prevDays = new Date(year, month - 1, 0).getDate()
    const today = util.todayStr()
    const cells = []
    for (let index = 0; index < 42; index += 1) {
      const offset = index - firstWeekday + 1
      let cellYear = year
      let cellMonth = month
      let day = offset
      let inMonth = true
      if (offset < 1) {
        inMonth = false
        cellMonth = month - 1
        if (cellMonth === 0) { cellYear -= 1; cellMonth = 12 }
        day = prevDays + offset
      } else if (offset > daysInMonth) {
        inMonth = false
        cellMonth = month + 1
        if (cellMonth === 13) { cellYear += 1; cellMonth = 1 }
        day = offset - daysInMonth
      }
      const date = dateFromParts(cellYear, cellMonth, day)
      const markers = recordMap[date] || {}
      cells.push(Object.assign({
        date,
        day,
        inMonth,
        isToday: date === today,
        selected: date === selectedDate
      }, markers))
    }
    const weeks = []
    for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
    return weeks
  },

  selectDate(e) {
    const date = e.currentTarget.dataset.date
    this.selectedDate = date
    const parts = date.split('-').map(Number)
    if (`${parts[0]}-${util.pad(parts[1])}` !== this.data.yearMonth) {
      this.loadMonth(parts[0], parts[1], date)
      return
    }
    this.setData({
      selectedDate: date,
      selectedLabel: util.formatDateCN(date),
      calendarWeeks: this.buildCalendar(parts[0], parts[1], this.recordMap || {}, date)
    })
    this.loadDayTimeline(date)
  },

  changeMonth(e) {
    const delta = Number(e.currentTarget.dataset.delta)
    const parts = this.data.yearMonth.split('-').map(Number)
    const target = new Date(parts[0], parts[1] - 1 + delta, 1)
    this.loadMonth(target.getFullYear(), target.getMonth() + 1, '')
  },

  backToday() {
    const now = new Date()
    const today = util.todayStr()
    this.selectedDate = today
    this.skipFirstShow = true
    this.loadMonth(now.getFullYear(), now.getMonth() + 1, today)
  },

  loadDayTimeline(date) {
    const records = this.monthRecords || { expenses: [], moods: [], meals: [], checkins: [], goals: [] }
    const pick = list => list.filter(item => item.date === date)
    const items = buildTimeline(
      pick(records.expenses),
      pick(records.moods),
      pick(records.meals),
      pick(records.checkins),
      records.goals
    )
    const order = ['账目', '随笔', '三餐', '打卡']
    const daySections = []
    order.forEach(name => {
      const list = items.filter(item => item.section === name).sort((a, b) => (b.time || '').localeCompare(a.time || ''))
      if (list.length) daySections.push({ name, list })
    })
    const total = daySections.reduce((sum, sec) => sum + sec.list.length, 0)
    this.setData({
      daySections,
      dayRecordText: total ? `这一天留下了 ${total} 条记录` : '这一天还没有留下记录'
    })
  }
})

