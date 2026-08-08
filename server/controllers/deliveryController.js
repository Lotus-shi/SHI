/**
 * 配送控制器
 * 配送状态：0 待分配 | 1 已分配 | 2 取货中 | 3 配送中 | 4 已送达
 * 订单状态联动：配送中(3) → 订单=配送中(2)；已送达(4) → 订单=已完成(3)
 */
const { Op } = require('sequelize')
const { Order, Delivery, sequelize } = require('../models')
const { success } = require('../utils/response')
const AppError = require('../utils/appError')

// 配送状态文案（时间轴使用）
const DELIVERY_STATUS_TEXT = {
  0: '订单已支付，等待配送',
  1: '配送员已接单',
  2: '配送员正在取货',
  3: '商品配送中',
  4: '商品已送达',
}

/**
 * GET /api/orders/:id/logistics
 * 返回订单的配送信息（归属校验，只允许查看自己的订单）
 */
exports.getLogistics = async (req, res, next) => {
  try {
    const orderId = parseInt(req.params.id)
    if (!orderId) throw new AppError('订单 id 不合法', 400, 400)

    const order = await Order.findOne({
      where: { id: orderId, user_id: req.user.userId }, // 归属校验
      include: [{ model: Delivery, as: 'delivery' }],
    })
    if (!order) throw new AppError('订单不存在', 404, 404)
    if (!order.delivery) throw new AppError('该订单暂无配送信息', 404, 404)

    // 解析时间线 JSON
    const delivery = order.delivery.toJSON()
    try {
      delivery.timeline = JSON.parse(delivery.timeline || '[]')
    } catch {
      delivery.timeline = []
    }

    success(res, {
      order_id: order.id,
      order_no: order.order_no,
      order_status: order.status,
      delivery,
    })
  } catch (err) {
    next(err)
  }
}

/**
 * PUT /api/deliveries/:id/status
 * 更新配送状态（配送端调用，需鉴权；状态只能向后流转）
 * body: { status: 1-4, courier_name?, courier_phone?, estimated_time? }
 */
exports.updateStatus = async (req, res, next) => {
  const t = await sequelize.transaction()
  try {
    const deliveryId = parseInt(req.params.id)
    const newStatus = parseInt(req.body.status)
    const { courier_name, courier_phone, estimated_time } = req.body

    if (!deliveryId) throw new AppError('配送记录 id 不合法', 400, 400)
    if (![1, 2, 3, 4].includes(newStatus)) {
      throw new AppError('配送状态不合法（1-4）', 400, 400)
    }

    const delivery = await Delivery.findOne({
      where: { id: deliveryId },
      lock: t.LOCK.UPDATE,
      transaction: t,
    })
    if (!delivery) throw new AppError('配送记录不存在', 404, 404)

    // 状态只能向后流转（不允许回退）
    if (newStatus <= delivery.status) {
      throw new AppError('配送状态不可回退', 400, 400)
    }

    // 关联订单：已支付（1 待发货）或配送中（2）才允许更新配送状态；
    // 已完成/已取消/待支付订单不可更新
    const order = await Order.findOne({
      where: { id: delivery.order_id },
      lock: t.LOCK.UPDATE,
      transaction: t,
    })
    if (!order || (order.status !== 1 && order.status !== 2)) {
      throw new AppError('订单状态不允许更新配送信息', 400, 400)
    }

    // 更新配送员信息（分配时传入）
    if (courier_name !== undefined) delivery.courier_name = courier_name
    if (courier_phone !== undefined) delivery.courier_phone = courier_phone
    if (estimated_time !== undefined) delivery.estimated_time = estimated_time

    // 追加时间轴记录
    const timeline = (() => {
      try { return JSON.parse(delivery.timeline || '[]') } catch { return [] }
    })()
    timeline.push({ status: newStatus, text: DELIVERY_STATUS_TEXT[newStatus], time: new Date() })
    delivery.timeline = JSON.stringify(timeline)

    delivery.status = newStatus

    // 订单状态联动
    if (newStatus === 3) {
      order.status = 2 // 配送中
    } else if (newStatus === 4) {
      order.status = 3 // 已完成
      delivery.delivered_at = new Date()
    }

    await delivery.save({ transaction: t })
    await order.save({ transaction: t })
    await t.commit()

    const result = delivery.toJSON()
    result.timeline = timeline
    success(res, result, '配送状态已更新')
  } catch (err) {
    await t.rollback()
    next(err)
  }
}
