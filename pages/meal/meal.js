const db = require('../../utils/db')
const util = require('../../utils/util')

const TYPES = [
  { key: 'breakfast', name: '早餐', icon: '🌤️', tip: '元气满满的一天，从早餐开始' },
  { key: 'lunch', name: '午餐', icon: '☀️', tip: '好好吃饭，好好生活' },
  { key: 'dinner', name: '晚餐', icon: '🌙', tip: '为今天画一个温暖句号' }
]

Page({
  data: { date: '', dateLabel: '', meals: [], editing: '', content: '', images: [], saving: false },
  onShow() { this.loadMeals() },

  loadMeals() {
    const date = util.todayStr()
    db.fetchAllSafe(db.COLLECTIONS.meal, { date }).then(async res => {
      const map = {}
      res.list.forEach(item => { map[item.mealType] = item })
      const ids = []
      res.list.forEach(item => (item.images || []).forEach(id => ids.push(id)))
      const urlMap = await db.getTempUrls(ids)
      const meals = TYPES.map(item => {
        const record = map[item.key]
        return Object.assign({}, item, record || {}, {
          imageUrls: record ? (record.images || []).map(id => urlMap[id]).filter(Boolean) : []
        })
      })
      this.setData({ date, dateLabel: util.formatDateCN(date), meals })
    }).catch(() => wx.showToast({ title: '请先开通云开发并创建数据表', icon: 'none' }))
  },

  editMeal(e) {
    const key = e.currentTarget.dataset.key
    const meal = this.data.meals.find(item => item.key === key)
    this.setData({
      editing: key,
      content: meal.content || '',
      images: (meal.images || []).map((fileID, index) => ({ fileID, url: meal.imageUrls[index] || '' }))
    })
  },

  cancelEdit() { this.setData({ editing: '', content: '', images: [] }) },
  inputContent(e) { this.setData({ content: e.detail.value }) },

  chooseImages() {
    const remain = 3 - this.data.images.length
    if (remain <= 0) return wx.showToast({ title: '每餐最多 3 张照片', icon: 'none' })
    wx.chooseMedia({
      count: remain,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: res => this.setData({
        images: this.data.images.concat(res.tempFiles.map(file => ({ url: file.tempFilePath, local: true })))
      })
    })
  },

  removeImage(e) {
    const images = this.data.images.slice()
    images.splice(e.currentTarget.dataset.index, 1)
    this.setData({ images })
  },

  previewImages(e) {
    const urls = e.currentTarget.dataset.urls || []
    if (urls.length) wx.previewImage({ current: urls[0], urls })
  },

  async saveMeal() {
    const content = this.data.content.trim()
    const mealType = this.data.editing
    if (!content && !this.data.images.length) return wx.showToast({ title: '写下吃了什么，或加张照片吧', icon: 'none' })
    this.setData({ saving: true })
    try {
      const images = []
      for (const image of this.data.images) {
        images.push(image.local ? await db.uploadImage(image.url, 'meals') : image.fileID)
      }
      const existing = this.data.meals.find(item => item.key === mealType)
      const now = new Date()
      const data = {
        mealType,
        content,
        images,
        date: this.data.date,
        time: `${util.pad(now.getHours())}:${util.pad(now.getMinutes())}`
      }
      if (existing && existing._id) await db.update(db.COLLECTIONS.meal, existing._id, data)
      else await db.add(db.COLLECTIONS.meal, data)
      wx.showToast({ title: '已收藏这一餐', icon: 'success' })
      this.cancelEdit()
      this.loadMeals()
    } catch (err) {
      wx.showToast({ title: '保存失败，请检查云开发设置', icon: 'none' })
    } finally {
      this.setData({ saving: false })
    }
  }
})
