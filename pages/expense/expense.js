const util = require('../../utils/util')
const db = require('../../utils/db')
const cat = require('../../utils/categories')

Page({
  data: {
    yearMonth: '', monthLabel: '', expense: '0.00', income: '0.00', balance: '0.00',
    budget: false, budgetAmount: '', budgetInput: '', budgetUsed: '0.00', budgetUsedPct: 0,
    budgetOver: false, editingBudget: false, categories: [], grouped: [], allGrouped: [], detailDate: '', monthEnd: ''
  },
  onShow() {
    if (!this.data.yearMonth) this.setData({ yearMonth: util.toMonthStr(new Date()) })
    this.loadMonth()
  },
  changeMonth(delta) {
    const [year, month] = this.data.yearMonth.split('-').map(Number)
    this.setData({ yearMonth: util.toMonthStr(new Date(year, month - 1 + delta, 1)), editingBudget: false, detailDate: '' })
    this.loadMonth()
  },
  prevMonth() { this.changeMonth(-1) },
  nextMonth() { this.changeMonth(1) },
  loadMonth() {
    const ym = this.data.yearMonth
    const { start, end } = util.monthRange(ym)
    const _ = db.getCmd()
    const where = { date: _.gte(start).and(_.lte(end)) }
    Promise.all([
      db.fetchAllSafe(db.COLLECTIONS.expense, where, { field: 'date', direction: 'desc' }),
      db.fetchAllSafe(db.COLLECTIONS.budget, { yearMonth: ym })
    ]).then(([records, budgetRecords]) => {
      let income = 0; let expense = 0; const categoryTotals = {}
      records.list.forEach(record => {
        const amount = Number(record.amount) || 0
        if (record.type === 'income') income += amount
        else { expense += amount; categoryTotals[record.category] = (categoryTotals[record.category] || 0) + amount }
      })
      const categories = Object.keys(categoryTotals).map(name => {
        const meta = cat.getCategory('expense', name)
        const amount = categoryTotals[name]
        return { name, icon: meta.icon, color: meta.color, amountText: util.formatAmount(amount), pct: expense ? Math.round(amount / expense * 100) : 0 }
      }).sort((a, b) => Number(b.amountText) - Number(a.amountText))
      const budgetRecord = budgetRecords.list[0]
      const budgetAmount = budgetRecord ? Number(budgetRecord.amount) || 0 : 0
      const usedPct = budgetAmount ? Math.min(100, Math.round(expense / budgetAmount * 100)) : 0
      const allGrouped = this.groupByDate(records.list)
      this.allGrouped = allGrouped
      this.setData({
        monthLabel: util.formatMonthCN(ym), income: util.formatAmount(income), expense: util.formatAmount(expense),
        balance: util.formatAmount(income - expense), categories, grouped: this.filterGrouped(), allGrouped, monthEnd: end,
        budget: !!budgetRecord, budgetAmount: budgetAmount ? util.formatAmount(budgetAmount) : '',
        budgetUsed: util.formatAmount(expense), budgetUsedPct: usedPct, budgetOver: budgetAmount > 0 && expense > budgetAmount
      })
    }).catch(this.showCloudError)
  },
  groupByDate(records) {
    const groups = {}
    records.forEach(record => {
      if (!groups[record.date]) groups[record.date] = []
      const meta = cat.getCategory(record.type, record.category)
      groups[record.date].push(Object.assign({}, record, { icon: meta.icon, amountText: util.formatAmount(record.amount) }))
    })
    return Object.keys(groups).sort().reverse().map(date => {
      let income = 0; let expense = 0
      const items = groups[date].sort((a, b) => (b.time || '').localeCompare(a.time || ''))
      items.forEach(item => item.type === 'income' ? income += Number(item.amount) : expense += Number(item.amount))
      return { date, label: util.dateLabel(date), incomeText: util.formatAmount(income), expenseText: util.formatAmount(expense), balanceText: util.formatAmount(income - expense), items }
    })
  },
  filterGrouped() {
    const list = this.allGrouped || []
    return this.data.detailDate ? list.filter(g => g.date === this.data.detailDate) : list
  },

  chooseDetailDate(e) {
    const date = e.detail.value
    this.setData({ detailDate: date, grouped: this.filterGrouped() })
  },

  clearDetailDate() {
    this.setData({ detailDate: '', grouped: this.allGrouped || [] })
  },

  toggleBudgetEdit() { this.setData({ editingBudget: !this.data.editingBudget, budgetInput: this.data.budgetAmount ? String(Number(this.data.budgetAmount)) : '' }) },
  onBudgetInput(e) { this.setData({ budgetInput: e.detail.value }) },
  saveBudget() {
    const amount = Number(this.data.budgetInput)
    if (!amount || amount <= 0) return wx.showToast({ title: '请输入有效的预算金额', icon: 'none' })
    db.fetchAllSafe(db.COLLECTIONS.budget, { yearMonth: this.data.yearMonth }).then(res => {
      return res.list[0] ? db.update(db.COLLECTIONS.budget, res.list[0]._id, { amount }) : db.add(db.COLLECTIONS.budget, { yearMonth: this.data.yearMonth, amount })
    }).then(() => { wx.showToast({ title: '预算已保存', icon: 'success' }); this.setData({ editingBudget: false }); this.loadMonth() }).catch(this.showCloudError)
  },
  addItem() { wx.navigateTo({ url: '/pages/expense-edit/expense-edit?ym=' + this.data.yearMonth }) },
  editItem(e) { wx.navigateTo({ url: '/pages/expense-edit/expense-edit?id=' + e.currentTarget.dataset.id }) },
  showCloudError() { wx.showToast({ title: '请先开通云开发并创建数据表', icon: 'none' }) }
})
