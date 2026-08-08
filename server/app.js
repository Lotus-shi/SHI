/**
 * Express 应用入口
 * 阶段三：基础框架 + 鉴权模块（统一响应、错误处理、微信登录）
 */
require('dotenv').config()
const path = require('path')
const express = require('express')
const cors = require('cors')
const config = require('./config/config')
const authRoutes = require('./routes/auth')
const goodsRoutes = require('./routes/goods')
const categoryRoutes = require('./routes/category')
const cartRoutes = require('./routes/cart')
const addressRoutes = require('./routes/address')
const orderRoutes = require('./routes/order')
const payRoutes = require('./routes/pay')
const deliveryRoutes = require('./routes/delivery')
const orderService = require('./services/orderService')
const errorHandler = require('./middlewares/errorHandler')
const { apiLimiter, loginLimiter, notifyLimiter } = require('./middlewares/rateLimiter')

const app = express()

// ===== 全局中间件 =====
app.use(cors()) // 跨域（生产环境可收紧为指定域名）
app.use(express.json()) // JSON 请求体解析
app.use(express.urlencoded({ extended: true })) // 表单请求体解析

// 商品图片静态托管（/images/goods-1.jpg 等）
app.use('/images', express.static(path.join(__dirname, 'public/images')))

// 接口限流（阶段八：防止恶意请求）
app.use('/api', apiLimiter)

// ===== 路由 =====
// 健康检查：验收标准要求 /api/health 正常返回
app.get('/api/health', (req, res) => {
  res.json({ code: 0, message: 'ok', data: { status: 'up', time: new Date().toISOString() } })
})

// 鉴权模块（登录接口单独限流防暴力刷）
app.use('/api/auth/login', loginLimiter)
app.use('/api/auth', authRoutes)

// 商品与分类模块（阶段四）
app.use('/api/goods', goodsRoutes)
app.use('/api/categories', categoryRoutes)

// 购物车与收货地址模块（阶段五）
app.use('/api/cart', cartRoutes)
app.use('/api/addresses', addressRoutes)

// 订单与支付模块（阶段六）
app.use('/api/orders', orderRoutes)
app.use('/api/pay', notifyLimiter, payRoutes)

// 配送模块（阶段七）
app.use('/api', deliveryRoutes)

// ===== 404 处理 =====
app.use((req, res) => {
  res.status(404).json({ code: 404, message: '接口不存在' })
})

// ===== 全局错误处理中间件（最后挂载） =====
app.use(errorHandler)

// ===== 启动服务 =====
// 直接启动与 require 复用两用：被测试脚本引入时不重复监听端口
if (require.main === module) {
  // 启动超时未支付订单自动取消的定时任务
  orderService.startScheduler()

  app.listen(config.port, () => {
    console.log(`[服务已启动] http://localhost:${config.port}`)
  })
}

module.exports = app
