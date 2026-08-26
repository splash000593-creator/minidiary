const db = require('../../utils/db')
const util = require('../../utils/util')

const FALLBACK_AVATAR = ''

Page({
  data: {
    expense: '0.00',
    income: '0.00',
    moodCount: 0,
    goalCount: 0,
    loggedIn: false,
    loginLoading: false,
    user: { nickName: '', avatarUrl: FALLBACK_AVATAR },
    avatarLetter: 'M'
  },

  onShow() {
    this.loadLocalProfile()
    this.loadCloudProfile()
    this.loadStats()
  },

  loadLocalProfile() {
    const profile = wx.getStorageSync('minidiary_profile')
    if (profile && profile.nickName) {
      this.setData({ user: profile, loggedIn: true, avatarLetter: (profile.nickName || 'M').slice(0, 1) })
    }
  },

  loadCloudProfile() {
    db.fetchAllSafe(db.COLLECTIONS.user, {}).then(res => {
      const profile = res.list[0]
      if (!profile || !profile.nickName) return
      const user = { nickName: profile.nickName, avatarUrl: profile.avatarUrl || FALLBACK_AVATAR }
      wx.setStorageSync('minidiary_profile', user)
      this.setData({ user, loggedIn: true, avatarLetter: (user.nickName || 'M').slice(0, 1) })
    }).catch(() => {})
  },

  loadStats() {
    const { start, end } = util.monthRange(util.toMonthStr(new Date()))
    const _ = db.getCmd()
    Promise.all([
      db.fetchAllSafe(db.COLLECTIONS.expense, { date: _.gte(start).and(_.lte(end)) }),
      db.fetchAllSafe(db.COLLECTIONS.mood, {}),
      db.fetchAllSafe(db.COLLECTIONS.goal, { status: 'active' })
    ]).then(([expenses, moods, goals]) => {
      let income = 0
      let expense = 0
      expenses.list.forEach(item => item.type === 'income' ? income += Number(item.amount) : expense += Number(item.amount))
      this.setData({
        income: util.formatAmount(income),
        expense: util.formatAmount(expense),
        moodCount: moods.total,
        goalCount: goals.total,
      })
    }).catch(() => {})
  },

  login() {
    const complete = user => {
      wx.setStorageSync('minidiary_profile', user)
      this.setData({ user, loggedIn: true, avatarLetter: (user.nickName || 'M').slice(0, 1) })
      this.saveProfile(user)
      wx.showToast({ title: '登录成功', icon: 'success' })
    }
    // 新版微信不再返回真实头像昵称，甚至可能直接失败；降级为占位资料，保证登录永远可用
    const fallback = () => complete({ nickName: '微信用户', avatarUrl: FALLBACK_AVATAR })
    if (!wx.getUserProfile) {
      this.setData({ loginLoading: true })
      setTimeout(() => {
        this.setData({ loginLoading: false })
        fallback()
      }, 300)
      return
    }
    this.setData({ loginLoading: true })
    wx.getUserProfile({
      desc: '用于展示你的 Minidiary 个人主页',
      success: res => {
        const raw = res.userInfo || {}
        complete({ nickName: raw.nickName || '微信用户', avatarUrl: raw.avatarUrl || FALLBACK_AVATAR })
      },
      fail: () => fallback(),
      complete: () => this.setData({ loginLoading: false })
    })
  },

  saveProfile(user) {
    this.upsertUser({ nickName: user.nickName, avatarUrl: user.avatarUrl })
  },

  upsertUser(patch) {
    return db.fetchAllSafe(db.COLLECTIONS.user, {}).then(res => {
      const data = Object.assign({}, patch, { updatedAt: db.getDB().serverDate() })
      return res.list[0]
        ? db.update(db.COLLECTIONS.user, res.list[0]._id, data)
        : db.add(db.COLLECTIONS.user, data)
    }).catch(() => {
      // 资料会保存在本机；创建 users 集合后下次授权会自动同步到云端。
    })
  },

  goProfileEdit() { wx.navigateTo({ url: '/pages/profile-edit/profile-edit' }) },

  goInsight() { wx.navigateTo({ url: '/pages/insight/insight' }) },

  about() {
    wx.showModal({
      title: 'Minidiary',
      content: '记录日常生活的小小日记本。\n\n包含记账、随笔、三餐和目标打卡。',
      showCancel: false
    })
  }
})
