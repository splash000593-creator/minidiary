const db = require('../../utils/db')
const util = require('../../utils/util')

Page({
  data: { id: '', content: '', date: '', time: '', canDelete: false },

  onLoad(options) {
    const now = new Date()
    this.setData({
      id: options.id || '',
      date: util.todayStr(),
      time: `${util.pad(now.getHours())}:${util.pad(now.getMinutes())}`
    })
    if (options.id) {
      wx.setNavigationBarTitle({ title: '编辑感悟' })
      db.getById(db.COLLECTIONS.insight, options.id).then(item => {
        this.setData({ content: item.content, date: item.date, time: item.time || '', canDelete: true })
      }).catch(() => wx.showToast({ title: '无法读取感悟', icon: 'none' }))
    }
  },

  inputContent(e) { this.setData({ content: e.detail.value }) },

  save() {
    const content = this.data.content.trim()
    if (!content) return wx.showToast({ title: '写点什么吧', icon: 'none' })
    const record = { content, date: this.data.date, time: this.data.time }
    const task = this.data.id ? db.update(db.COLLECTIONS.insight, this.data.id, record) : db.add(db.COLLECTIONS.insight, record)
    task.then(() => { wx.showToast({ title: '已保存', icon: 'success' }); setTimeout(() => wx.navigateBack(), 500) })
      .catch(() => wx.showToast({ title: '保存失败，请检查云开发设置', icon: 'none' }))
  },

  remove() {
    wx.showModal({
      title: '删除感悟',
      content: '删除后无法恢复，确认删除吗？',
      confirmColor: '#EB5757',
      success: res => {
        if (res.confirm) db.remove(db.COLLECTIONS.insight, this.data.id).then(() => {
          wx.showToast({ title: '已删除', icon: 'success' })
          setTimeout(() => wx.navigateBack(), 500)
        }).catch(() => wx.showToast({ title: '删除失败', icon: 'none' }))
      }
    })
  }
})
