const db = require('../../utils/db')
const util = require('../../utils/util')
const MOODS = ['😊','🥰','😌','😐','😔','😤','😭','🤩']

Page({
  data: { id: '', content: '', moodIcon: '😊', moodList: MOODS, date: '', time: '', locationName: '', latitude: null, longitude: null, images: [], canDelete: false, saving: false },
  onLoad(options) {
    const now = new Date()
    this.setData({ id: options.id || '', date: util.todayStr(), time: `${util.pad(now.getHours())}:${util.pad(now.getMinutes())}` })
    if (options.id) { wx.setNavigationBarTitle({ title: '编辑随笔' }); this.loadRecord(options.id) }
  },
  loadRecord(id) {
    db.getById(db.COLLECTIONS.mood, id).then(async record => {
      const urlMap = await db.getTempUrls(record.images || [])
      this.setData({ content: record.content || '', moodIcon: record.moodIcon || '😊', date: record.date, time: record.time, locationName: record.locationName || '', latitude: record.latitude || null, longitude: record.longitude || null, images: (record.images || []).map(fileID => ({ fileID, url: urlMap[fileID] || '' })), canDelete: true })
    }).catch(() => wx.showToast({ title: '记录不存在或无法读取', icon: 'none' }))
  },
  inputContent(e) { this.setData({ content: e.detail.value }) },
  chooseMood(e) { this.setData({ moodIcon: e.currentTarget.dataset.icon }) },
  chooseDate(e) { this.setData({ date: e.detail.value }) },
  chooseTime(e) { this.setData({ time: e.detail.value }) },
  chooseLocation() {
    wx.chooseLocation({ success: res => this.setData({ locationName: res.name || res.address || '已选择地点', latitude: res.latitude, longitude: res.longitude }), fail: () => {} })
  },
  useCurrentLocation() {
    wx.getLocation({ type: 'gcj02', success: res => this.setData({ locationName: `当前位置（${res.latitude.toFixed(4)}, ${res.longitude.toFixed(4)}）`, latitude: res.latitude, longitude: res.longitude }), fail: () => wx.showToast({ title: '未获得定位权限', icon: 'none' }) })
  },
  clearLocation() { this.setData({ locationName: '', latitude: null, longitude: null }) },
  chooseImages() {
    const remain = 9 - this.data.images.length
    if (remain <= 0) return wx.showToast({ title: '最多可添加 9 张照片', icon: 'none' })
    wx.chooseMedia({ count: remain, mediaType: ['image'], sourceType: ['album', 'camera'], success: res => this.setData({ images: this.data.images.concat(res.tempFiles.map(file => ({ url: file.tempFilePath, local: true }))) }) })
  },
  removeImage(e) { const index = e.currentTarget.dataset.index; const images = this.data.images.slice(); images.splice(index, 1); this.setData({ images }) },
  async save() {
    const content = this.data.content.trim()
    if (!content && !this.data.images.length) return wx.showToast({ title: '写点文字或添加照片吧', icon: 'none' })
    if (this.data.saving) return
    this.setData({ saving: true })
    try {
      const images = []
      for (const image of this.data.images) images.push(image.local ? await db.uploadImage(image.url, 'moods') : image.fileID)
      const record = { content, moodIcon: this.data.moodIcon, date: this.data.date, time: this.data.time, locationName: this.data.locationName, latitude: this.data.latitude, longitude: this.data.longitude, images }
      if (this.data.id) await db.update(db.COLLECTIONS.mood, this.data.id, record)
      else await db.add(db.COLLECTIONS.mood, record)
      wx.showToast({ title: '已保存', icon: 'success' }); setTimeout(() => wx.navigateBack(), 500)
    } catch (err) { wx.showToast({ title: '保存失败，请检查云开发设置', icon: 'none' }) } finally { this.setData({ saving: false }) }
  },
  remove() { wx.showModal({ title: '删除随笔', content: '删除后无法恢复，确认删除吗？', confirmColor: '#EB5757', success: res => { if (res.confirm) db.remove(db.COLLECTIONS.mood, this.data.id).then(() => { wx.showToast({ title: '已删除', icon: 'success' }); setTimeout(() => wx.navigateBack(), 500) }) } }) }
})
