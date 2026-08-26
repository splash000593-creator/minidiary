const db = require('../../utils/db')
const util = require('../../utils/util')

Page({
  data: { list: [], allList: [], loading: false, detailDate: '' },
  onShow() { this.loadList() },
  loadList() {
    this.setData({ loading: true })
    db.fetchAllSafe(db.COLLECTIONS.mood, {}, { field: 'date', direction: 'desc' }).then(async res => {
      const list = res.list.sort((a, b) => `${b.date} ${b.time || ''}`.localeCompare(`${a.date} ${a.time || ''}`))
      const ids = []
      list.forEach(item => (item.images || []).forEach(id => ids.push(id)))
      const urls = await db.getTempUrls(ids)
      const allList = list.map(item => Object.assign({}, item, { dateLabel: util.dateLabel(item.date), imageUrls: (item.images || []).map(id => urls[id]).filter(Boolean) }))
      this.allList = allList
      this.setData({ allList, list: this.filterList(), loading: false })
    }).catch(() => { this.setData({ loading: false }); wx.showToast({ title: '请先开通云开发并创建数据表', icon: 'none' }) })
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

  addItem() { wx.navigateTo({ url: '/pages/mood-edit/mood-edit' }) },
  editItem(e) { wx.navigateTo({ url: '/pages/mood-edit/mood-edit?id=' + e.currentTarget.dataset.id }) },
  previewImage(e) { const urls = e.currentTarget.dataset.urls; wx.previewImage({ current: e.currentTarget.dataset.url, urls }) }
})
