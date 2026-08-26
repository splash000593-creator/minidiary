const db = require('../../utils/db')
const util = require('../../utils/util')

Page({
  data: { list: [], allList: [], loading: false, detailDate: '' },

  onShow() { this.loadList() },

  loadList() {
    this.setData({ loading: true })
    db.fetchAllSafe(db.COLLECTIONS.insight, {}, { field: 'createdAt', direction: 'desc' }).then(res => {
      const allList = res.list.map(item => ({
        _id: item._id,
        content: item.content,
        date: item.date,
        dateLabel: util.dateLabel(item.date),
        time: item.time || ''
      }))
      this.allList = allList
      this.setData({ allList, list: this.filterList(), loading: false })
    }).catch(() => {
      this.setData({ loading: false })
      wx.showToast({ title: '请先开通云开发并创建数据表', icon: 'none' })
    })
  },

  filterList() {
    const all = this.allList || []
    return this.data.detailDate ? all.filter(item => item.date === this.data.detailDate) : all
  },

  chooseDetailDate(e) {
    const date = e.detail.value
    const list = date ? (this.allList || []).filter(item => item.date === date) : (this.allList || [])
    this.setData({ detailDate: date, list })
  },

  clearDetailDate() {
    this.setData({ detailDate: '', list: this.allList || [] })
  },

  addItem() { wx.navigateTo({ url: '/pages/insight-edit/insight-edit' }) },
  editItem(e) { wx.navigateTo({ url: '/pages/insight-edit/insight-edit?id=' + e.currentTarget.dataset.id }) }
})
