/**
 * 接口限流中间件（express-rate-limit）
 * - 全局限流：每 IP 每分钟 120 次，防止恶意请求打满服务
 * - 登录接口单独限流：每 IP 每 10 分钟 20 次，防止暴力刷登录
 * 超出限制返回 429，统一格式 { code, message }
 */
const rateLimit = require('express-rate-limit')

// 通用限流提示
const limiterHandler = (req, res) => {
  res.status(429).json({ code: 429, message: '请求过于频繁，请稍后再试' })
}

// 全局限流：每 IP 每分钟 120 次
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
  handler: limiterHandler,
})

// 登录接口限流：每 IP 每 10 分钟 20 次
const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: limiterHandler,
})

// 支付回调限流：防止恶意重复回调轰炸
const notifyLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  handler: limiterHandler,
})

module.exports = { apiLimiter, loginLimiter, notifyLimiter }
