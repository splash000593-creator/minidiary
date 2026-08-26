const util = require('../../utils/util')
const db = require('../../utils/db')

const MEAL_TYPES = [
  { key: 'breakfast', type: '早餐', icon: '🌤️' },
  { key: 'lunch', type: '午餐', icon: '☀️' },
  { key: 'dinner', type: '晚餐', icon: '🌙' }
]
const DAILY_NOTES = ['把周日留给自己，慢一点也很好。', '新的一周，记得先照顾好自己。', '碳基生物生活日志', '今天也在认真生活，这就很了不起。', '给自己一点甜，把日子过得可爱些。', '周五快乐，去收集一点小确幸吧。', '今天的温柔，要先留给自己。']

const buildTimeline = (expenses, moods, meals, checkins, goals) => {
  const goalMap = {}
  goals.forEach(goal => { goalMap[goal._id] = goal.title || '目标打卡' })
  const items = []
  expenses.forEach(r => {
    items.push({
      id: 'e' + r._id,
      time: r.time || '--:--',
      icon: r.type === 'income' ? '🪙' : '🧾',
      title: r.type === 'income' ? '收入' : '支出',
      desc: (r.category || '未分类') + (r.note ? ' · ' + r.note : ''),
      extra: (r.type === 'income' ? '+' : '-') + util.formatAmount(r.amount),
      colorClass: r.type === 'income' ? 'amount-income' : 'amount-expense'
    })
  })
  meals.forEach(r => {
    const names = { breakfast: '早餐', lunch: '午餐', dinner: '晚餐', snack: '加餐' }
    items.push({ id: 'm' + r._id, time: r.time || '--:--', icon: '🍽️', title: names[r.mealType] || '餐食', desc: r.content || '记录了一餐', extra: '', colorClass: '' })
  })
  moods.forEach(r => {
    items.push({ id: 'd' + r._id, time: r.time || '--:--', icon: r.moodIcon || '💭', title: '随笔', desc: (r.content || '').slice(0, 30), extra: r.locationName || '', colorClass: '' })
  })
  checkins.forEach(r => {
    items.push({ id: 'c' + r._id, time: r.time || '--:--', icon: '✓', title: '完成打卡', desc: goalMap[r.goalId] || '今日习惯', extra: '已完成', colorClass: 'amount-income' })
  })
  return items.sort((a, b) => (b.time || '').localeCompare(a.time || ''))
}

Page({
  data: {
    greeting: '',
    todayLabel: '',
    todayNote: '',
    expense: '0.00',
    income: '0.00',
    balance: '0.00',
    meals: MEAL_TYPES.map(item => Object.assign({}, item, { content: '', imageUrl: '' })),
    timeline: []
  },

  onShow() { this.loadData() },

  loadData() {
    const today = util.todayStr()
    const hour = new Date().getHours()
    let greeting = '你好'
    if (hour < 6) greeting = '夜深了'
    else if (hour < 11) greeting = '早上好'
    else if (hour < 14) greeting = '中午好'
    else if (hour < 18) greeting = '下午好'
    else greeting = '晚上好'
    this.setData({
      greeting,
      todayLabel: util.formatDateCN(today),
      todayNote: DAILY_NOTES[new Date().getDay()]
    })
    this.loadSummary(today)
    this.loadMeals(today)
    this.loadTimeline(today)
  },

  loadSummary(today) {
    db.fetchAllSafe(db.COLLECTIONS.expense, { date: today }, { field: 'createdAt', direction: 'desc' }).then(res => {
      let income = 0
      let expense = 0
      res.list.forEach(r => {
        const amount = Number(r.amount) || 0
        if (r.type === 'income') income += amount
        else expense += amount
      })
      this.setData({ income: util.formatAmount(income), expense: util.formatAmount(expense), balance: util.formatAmount(income - expense) })
    }).catch(() => {})
  },

  loadMeals(today) {
    db.fetchAllSafe(db.COLLECTIONS.meal, { date: today }).then(async res => {
      const map = {}
      const ids = []
      res.list.forEach(record => {
        map[record.mealType] = record
        if (record.images && record.images[0]) ids.push(record.images[0])
      })
      const urlMap = await db.getTempUrls(ids)
      const meals = MEAL_TYPES.map(meal => {
        const record = map[meal.key] || {}
        return Object.assign({}, meal, { content: record.content || '', imageUrl: record.images && record.images[0] ? (urlMap[record.images[0]] || '') : '' })
      })
      this.setData({ meals })
    }).catch(() => {})
  },

  loadTimeline(today) {
    Promise.all([
      db.fetchAllSafe(db.COLLECTIONS.expense, { date: today }, { field: 'createdAt', direction: 'desc' }),
      db.fetchAllSafe(db.COLLECTIONS.mood, { date: today }, { field: 'createdAt', direction: 'desc' }),
      db.fetchAllSafe(db.COLLECTIONS.meal, { date: today }, { field: 'createdAt', direction: 'desc' }),
      db.fetchAllSafe(db.COLLECTIONS.checkin, { date: today }),
      db.fetchAllSafe(db.COLLECTIONS.goal, {})
    ]).then(([expenses, moods, meals, checkins, goals]) => {
      const timeline = buildTimeline(expenses.list, moods.list, meals.list, checkins.list, goals.list)
      this.setData({ timeline })
    }).catch(() => {})
  },

  goExpense() { wx.switchTab({ url: '/pages/expense/expense' }) },
  goMood() { wx.switchTab({ url: '/pages/mood/mood' }) },
  goGoal() { wx.switchTab({ url: '/pages/goal/goal' }) },
  goMeal() { wx.navigateTo({ url: '/pages/meal/meal' }) },
  goCalendar() { wx.navigateTo({ url: '/pages/calendar/calendar' }) }
})
