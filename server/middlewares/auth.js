/**
 * JWT 鉴权中间件
 * 解析请求头 Authorization: Bearer <token>，验证通过后将 userId/openid 挂载到 req.user
 * 失败统一返回 401，前端 request.js 收到 401 后跳转登录
 */
const jwt = require('jsonwebtoken')
const config = require('../config/config')
const AppError = require('../utils/appError')

module.exports = (req, res, next) => {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''

  if (!token) {
    return next(new AppError('未登录或登录已过期', 401, 401))
  }

  try {
    const payload = jwt.verify(token, config.jwt.secret)
    // 挂载当前用户身份，后续控制器/服务通过 req.user 取用
    req.user = { userId: payload.userId, openid: payload.openid }
    next()
  } catch (err) {
    // token 过期 / 篡改 / 无效
    return next(new AppError('未登录或登录已过期', 401, 401))
  }
}
