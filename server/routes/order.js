/**
 * 订单路由（全部需登录）
 * POST   /api/orders            创建订单 { items:[{goods_id,quantity}], address_id, remark }
 * GET    /api/orders            订单列表（?status=&page=&page_size=）
 * GET    /api/orders/:id        订单详情（含明细 + 配送）
 * PUT    /api/orders/:id/cancel 取消订单（仅待支付）
 * POST   /api/orders/:id/pay    发起支付，返回 wx.requestPayment 参数
 */
const express = require('express')
const router = express.Router()
const auth = require('../middlewares/auth')
const orderService = require('../services/orderService')
const { createPayment } = require('../utils/wechat')
const { success } = require('../utils/response')
const AppError = require('../utils/appError')

router.use(auth)

// 创建订单
router.post('/', async (req, res, next) => {
  try {
    const { items, address_id, remark } = req.body
    if (!address_id) throw new AppError('请选择收货地址', 400, 400)
    const order = await orderService.createOrder(req.user.userId, { items, address_id, remark })
    success(res, order, '下单成功')
  } catch (err) {
    next(err)
  }
})

// 订单列表
router.get('/', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1
    const pageSize = parseInt(req.query.page_size) || 10
    const status = req.query.status === undefined || req.query.status === '' ? undefined : parseInt(req.query.status)
    const data = await orderService.listOrders(req.user.userId, { status, page, pageSize })
    success(res, data)
  } catch (err) {
    next(err)
  }
})

// 订单详情
router.get('/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id)
    if (!id) throw new AppError('订单 id 不合法', 400, 400)
    const order = await orderService.getOrderDetail(req.user.userId, id)
    success(res, order)
  } catch (err) {
    next(err)
  }
})

// 取消订单
router.put('/:id/cancel', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id)
    if (!id) throw new AppError('订单 id 不合法', 400, 400)
    const order = await orderService.cancelOrder(req.user.userId, id)
    success(res, order, '订单已取消')
  } catch (err) {
    next(err)
  }
})

// 发起支付
router.post('/:id/pay', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id)
    if (!id) throw new AppError('订单 id 不合法', 400, 400)
    const order = await orderService.getOrderDetail(req.user.userId, id)
    if (order.status !== 0) {
      throw new AppError(order.status === 1 ? '订单已支付' : '当前状态不可支付', 400, 400)
    }

    const payment = await createPayment({
      openid: req.user.openid,
      orderNo: order.order_no,
      payAmount: order.pay_amount,
      description: `生鲜订单-${order.order_no}`,
    })
    success(res, { order_id: order.id, order_no: order.order_no, pay_amount: order.pay_amount, payment })
  } catch (err) {
    next(err)
  }
})

module.exports = router
