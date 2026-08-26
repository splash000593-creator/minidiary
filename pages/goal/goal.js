const db = require('../../utils/db')
const util = require('../../utils/util')
Page({
  data: { goals: [], today: '', viewDate: '', viewLabel: '' },
  onShow() {
    if (!this.data.viewDate) this.setData({ viewDate: util.todayStr() })
    this.loadGoals()
  },
  loadGoals() {
    const today = util.todayStr()
    const date = this.data.viewDate || today
    Promise.all([db.fetchAllSafe(db.COLLECTIONS.goal, { status: 'active' }, { field: 'createdAt', direction: 'desc' }), db.fetchAllSafe(db.COLLECTIONS.checkin, { date })]).then(([goals, checkins]) => {
      const checked = {}; checkins.list.forEach(item => checked[item.goalId] = item)
      const list = goals.list.filter(goal => {
        const createdDate = goal.createdAt ? util.toDateStr(new Date(goal.createdAt)) : ''
        return createdDate === date || !!checked[goal._id]
      }).map(goal => Object.assign({}, goal, { checked: !!checked[goal._id], checkinId: checked[goal._id] ? checked[goal._id]._id : '', progressPct: goal.type === 'once' && goal.targetValue ? Math.min(100, Math.round((Number(goal.currentValue || 0) / Number(goal.targetValue)) * 100)) : 0 }))
      const visible = list.slice().sort((a, b) => (a.checked === b.checked) ? 0 : (a.checked ? 1 : -1))
      this.setData({ today, viewDate: date, viewLabel: util.dateLabel(date), goals: visible })
    }).catch(() => wx.showToast({ title: '请先开通云开发并创建数据表', icon: 'none' }))
  },

  chooseDate(e) {
    this.setData({ viewDate: e.detail.value })
    this.loadGoals()
  },

  backToday() {
    this.setData({ viewDate: util.todayStr() })
    this.loadGoals()
  },
  toggleCheckin(e) {
    if (this.data.viewDate !== this.data.today) {
      wx.showToast({ title: '只能为今天打卡', icon: 'none' })
      return
    }
    const id = e.currentTarget.dataset.id; const goal = this.data.goals.find(item => item._id === id)
    if (goal.checked) {
      db.remove(db.COLLECTIONS.checkin, goal.checkinId).then(() => this.loadGoals()).catch(() => wx.showToast({ title: '操作失败', icon: 'none' }))
    } else {
      const now = new Date()
      db.add(db.COLLECTIONS.checkin, { goalId: id, date: this.data.today, time: `${util.pad(now.getHours())}:${util.pad(now.getMinutes())}` }).then(() => { wx.showToast({ title: '已完成', icon: 'success' }); this.loadGoals() }).catch(() => wx.showToast({ title: '打卡失败', icon: 'none' }))
    }
  },
  addGoal() { wx.navigateTo({ url: '/pages/goal-edit/goal-edit' }) },
  editGoal(e) { wx.navigateTo({ url: '/pages/goal-edit/goal-edit?id=' + e.currentTarget.dataset.id }) }
})