const db = require('../../utils/db')

Page({
  data: { nickName: '', avatarUrl: '', saving: false },

  onLoad() {
    const profile = wx.getStorageSync('minidiary_profile') || {}
    let avatarUrl = profile.avatarUrl || ''
    if (avatarUrl.indexOf('cloud://') === 0) {
      db.getTempUrls([avatarUrl]).then(map => {
        this.setData({ avatarUrl: map[avatarUrl] || avatarUrl })
      }).catch(() => {})
    }
    this.setData({ nickName: profile.nickName || '', avatarUrl })
  },

  inputNickname(e) { this.setData({ nickName: e.detail.value }) },

  chooseAvatar() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: res => {
        const file = res.tempFiles && res.tempFiles[0]
        if (file) this.setData({ avatarUrl: file.tempFilePath })
      }
    })
  },

  async save() {
    const nickName = this.data.nickName.trim()
    if (!nickName) return wx.showToast({ title: '请输入昵称', icon: 'none' })
    this.setData({ saving: true })
    try {
      let avatarUrl = this.data.avatarUrl
      // 本地临时路径（相册/拍照）→ 上传到云存储
      if (avatarUrl && avatarUrl.indexOf('cloud://') !== 0 && avatarUrl.indexOf('http') !== 0) {
        avatarUrl = await db.uploadImage(avatarUrl, 'avatars')
      }
      const user = { nickName, avatarUrl }
      wx.setStorageSync('minidiary_profile', user)
      this.syncCloud(user)
      wx.showToast({ title: '已保存', icon: 'success' })
      setTimeout(() => wx.navigateBack(), 500)
    } catch (err) {
      wx.showToast({ title: '保存失败，请检查云开发', icon: 'none' })
      this.setData({ saving: false })
    }
  },

  syncCloud(user) {
    db.fetchAllSafe(db.COLLECTIONS.user, {}).then(res => {
      const data = { nickName: user.nickName, avatarUrl: user.avatarUrl, updatedAt: db.getDB().serverDate() }
      return res.list[0]
        ? db.update(db.COLLECTIONS.user, res.list[0]._id, data)
        : db.add(db.COLLECTIONS.user, data)
    }).catch(() => {})
  }
})
