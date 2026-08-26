const util = require('../../utils/util')
const db = require('../../utils/db')
const categories = require('../../utils/categories')

Page({
  data: { id: '', type: 'expense', category: '餐饮', categoryList: [], amount: '', note: '', date: '', time: '', canDelete: false },
  onLoad(options) {
    const now = new Date()
    this.setData({ id: options.id || '', date: util.todayStr(), time: `${util.pad(now.getHours())}:${util.pad(now.getMinutes())}` })
    this.refreshCategories()
    if (options.id) { wx.setNavigationBarTitle({ title: '编辑账目' }); this.loadRecord(options.id) }
    else if (options.ym) {
      const ym = options.ym
      const current = util.toMonthStr(new Date())
      this.setData({ date: ym === current ? util.todayStr() : ym + '-01' })
    }
  },
  refreshCategories() { const list = categories.getCategories(this.data.type); this.setData({ categoryList: list, category: list[0].name }) },
  loadRecord(id) {
    db.getById(db.COLLECTIONS.expense, id).then(record => {
      this.setData({ type: record.type, category: record.category, amount: String(record.amount), note: record.note || '', date: record.date, time: record.time || '', canDelete: true, categoryList: categories.getCategories(record.type) })
    }).catch(() => wx.showToast({ title: '记录不存在或无法读取', icon: 'none' }))
  },
  chooseType(e) { const type = e.currentTarget.dataset.type; this.setData({ type }); this.refreshCategories() },
  chooseCategory(e) { this.setData({ category: e.currentTarget.dataset.name }) },
  inputAmount(e) { this.setData({ amount: e.detail.value }) },
  inputNote(e) { this.setData({ note: e.detail.value }) },
  chooseDate(e) { this.setData({ date: e.detail.value }) },
  chooseTime(e) { this.setData({ time: e.detail.value }) },
  save() {
    const amount = Number(this.data.amount)
    if (!amount || amount <= 0) return wx.showToast({ title: '请输入正确的金额', icon: 'none' })
    const record = { type: this.data.type, category: this.data.category, amount, note: this.data.note.trim(), date: this.data.date, time: this.data.time }
    const task = this.data.id ? db.update(db.COLLECTIONS.expense, this.data.id, record) : db.add(db.COLLECTIONS.expense, record)
    task.then(() => { wx.showToast({ title: '已保存', icon: 'success' }); setTimeout(() => wx.navigateBack(), 500) }).catch(() => wx.showToast({ title: '保存失败，请检查云开发设置', icon: 'none' }))
  },
  remove() {
    wx.showModal({ title: '删除账目', content: '删除后无法恢复，确认删除吗？', confirmColor: '#EB5757', success: res => { if (res.confirm) db.remove(db.COLLECTIONS.expense, this.data.id).then(() => { wx.showToast({ title: '已删除', icon: 'success' }); setTimeout(() => wx.navigateBack(), 500) }).catch(() => wx.showToast({ title: '删除失败', icon: 'none' })) } })
  }
})
