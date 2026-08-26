// 云开发环境配置
// 真实环境 ID 放在 config.local.js（已被 gitignore，不会上传），这里只保留占位符
let local = {}
try { local = require('./config.local.js') } catch (e) { local = {} }

module.exports = {
  envId: local.envId || 'your-env-id'
}