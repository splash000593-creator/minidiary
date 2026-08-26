// 云数据库封装
const getDB = () => wx.cloud.database()
const getCmd = () => getDB().command

const COLLECTIONS = {
  expense: 'expenses',
  mood: 'moods',
  meal: 'meals',
  goal: 'goals',
  checkin: 'checkins',
  budget: 'budgets',
  insight: 'insights',
  user: 'users'
}

// 分页获取集合中满足条件的全部记录（客户端单次最多 100 条，这里自动翻页）
const fetchAll = (collection, where = {}, orderBy) => {
  const db = getDB()
  const countP = db.collection(collection).where(where).count()
  const listP = (async () => {
    const res = []
    const MAX = 100
    let skip = 0
    while (true) {
      let query = db.collection(collection).where(where).skip(skip).limit(MAX)
      if (orderBy) {
        query = query.orderBy(orderBy.field, orderBy.direction)
      }
      const batch = await query.get()
      res.push(...batch.data)
      if (batch.data.length < MAX) break
      skip += MAX
    }
    return res
  })()
  return Promise.all([countP, listP]).then(([countRes, list]) => ({
    total: countRes.total,
    list
  }))
}

// 集合不存在（如还未在云控制台创建）时不报错，返回空数据
const fetchAllSafe = (collection, where, orderBy) => {
  return fetchAll(collection, where, orderBy).catch(err => {
    const msg = (err && (err.errMsg || err.message)) || ''
    if (msg.indexOf('collection') > -1 || msg.indexOf('-502005') > -1 || msg.indexOf('not exist') > -1) {
      return { total: 0, list: [] }
    }
    throw err
  })
}

const getById = (collection, id) => {
  return getDB().collection(collection).doc(id).get().then(res => res.data)
}

const add = (collection, data) => {
  return getDB().collection(collection).add({
    data: Object.assign({}, data, { createdAt: getDB().serverDate() })
  })
}

const update = (collection, id, data) => {
  return getDB().collection(collection).doc(id).update({ data })
}

const remove = (collection, id) => {
  return getDB().collection(collection).doc(id).remove()
}

const uploadImage = (filePath, dir) => {
  const extMatch = filePath.match(/\.(\w+)$/)
  const ext = extMatch ? extMatch[1] : 'jpg'
  const cloudPath = `${dir || 'images'}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  return wx.cloud.uploadFile({ cloudPath, filePath }).then(res => res.fileID)
}

const getTempUrls = fileIDs => {
  if (!fileIDs || fileIDs.length === 0) return Promise.resolve({})
  return wx.cloud.getTempFileURL({ fileList: fileIDs }).then(res => {
    const map = {}
    res.fileList.forEach(f => {
      map[f.fileID] = f.tempFileURL || ''
    })
    return map
  })
}

module.exports = {
  COLLECTIONS,
  getDB,
  getCmd,
  fetchAll,
  fetchAllSafe,
  getById,
  add,
  update,
  remove,
  uploadImage,
  getTempUrls
}
