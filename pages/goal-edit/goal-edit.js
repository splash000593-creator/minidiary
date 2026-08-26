const db = require('../../utils/db')
const ICONS = ['🎯','🏃','📚','💧','🧘','🌙','💪','🎨','💰','🌱']
Page({
  data: { id: '', title: '', icon: '🎯', icons: ICONS, canDelete: false },
  onLoad(options) {
    if (options.id) {
      this.setData({ id: options.id, canDelete: true })
      wx.setNavigationBarTitle({ title: '编辑目标' })
      db.getById(db.COLLECTIONS.goal, options.id).then(item => this.setData({ title: item.title, icon: item.icon || '🎯' })).catch(() => wx.showToast({ title: '无法读取目标', icon: 'none' }))
    }
  },
  chooseIcon(e) { this.setData({ icon: e.currentTarget.dataset.icon }) },
  input(e) { this.setData({ [e.currentTarget.dataset.field]: e.detail.value }) },
  save() {
    const title = this.data.title.trim(); if (!title) return wx.showToast({ title: '请填写目标名称', icon: 'none' })
    const data = { title, icon: this.data.icon, type: 'habit', status: 'active' }
    const task = this.data.id ? db.update(db.COLLECTIONS.goal, this.data.id, data) : db.add(db.COLLECTIONS.goal, data)
    task.then(() => { wx.showToast({ title: '已保存', icon: 'success' }); setTimeout(() => wx.navigateBack(), 500) }).catch(() => wx.showToast({ title: '保存失败，请检查云开发设置', icon: 'none' }))
  },
  remove() { wx.showModal({ title: '删除目标', content: '删除目标后，相关打卡记录也将不再显示。确认删除吗？', confirmColor: '#EB5757', success: res => { if(res.confirm) db.update(db.COLLECTIONS.goal, this.data.id, { status: 'archived' }).then(() => { wx.showToast({ title: '已删除', icon: 'success' }); setTimeout(() => wx.navigateBack(), 500) }) } }) }
})