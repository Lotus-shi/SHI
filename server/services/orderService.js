/**
 * 订单服务层：创建订单、列表、详情、取消、支付回调、超时关闭
 *
 * 库存策略：下单事务内预占（扣减）库存，支付回调确认，取消/超时释放
 * 订单状态：0 待支付 | 1 已支付 | 2 配送中 | 3 已完成 | 4 已取消
 */
const { Op } = require('sequelize')
const schedule = require('node-schedule')
const { Order, OrderItem, Goods, Address, Delivery, sequelize } = require('../models')
const cartService = require('./cartService')
const AppError = require('../utils/appError')

// ===== 常量 =====
const FREIGHT_FREE_THRESHOLD = 50 // 满 50 元免运费
const FREIGHT_PRICE = 5           // 不满 50 元运费 5 元
const PAY_TIMEOUT_MINUTES = 30    // 超时未支付自动取消时间（分钟）

// 生成订单号：时间戳 + 4 位随机数
function generateOrderNo() {
  return `${Date.now()}${Math.floor(Math.random() * 9000 + 1000)}`
}

// 计算运费：满额免邮
function calcFreight(totalAmount) {
  return totalAmount >= FREIGHT_FREE_THRESHOLD ? 0 : FREIGHT_PRICE
}

/**
 * 创建订单
 * @param {number} userId
 * @param {object} params { items: [{goods_id, quantity}], address_id, remark }
 */
async function createOrder(userId, { items, address_id, remark }) {
  if (!items || !items.length) {
    throw new AppError('订单商品不能为空', 400, 400)
  }

  // 归一化商品条目（去重合并同商品数量）
  const mergedMap = new Map()
  items.forEach((it) => {
    const gid = parseInt(it.goods_id)
    const qty = parseInt(it.quantity)
    if (!gid || !qty || qty < 1) throw new AppError('商品参数不合法', 400, 400)
    mergedMap.set(gid, (mergedMap.get(gid) || 0) + qty)
  })
  const mergedItems = [...mergedMap.entries()].map(([goods_id, quantity]) => ({ goods_id, quantity }))

  const t = await sequelize.transaction()
  try {
    // 1. 地址校验（归属）
    const address = await Address.findOne({
      where: { id: address_id, user_id: userId },
      transaction: t,
    })
    if (!address) throw new AppError('收货地址不存在', 404, 404)

    // 2. 商品校验 + 锁行 + 扣库存（FOR UPDATE 防并发超卖）
    const goodsList = await Goods.findAll({
      where: { id: mergedItems.map((i) => i.goods_id), status: true },
      lock: t.LOCK.UPDATE,
      transaction: t,
    })
    if (goodsList.length !== mergedItems.length) {
      throw new AppError('部分商品不存在或已下架', 400, 400)
    }
    const goodsMap = new Map(goodsList.map((g) => [g.id, g]))

    let totalAmount = 0
    const orderItems = []
    for (const item of mergedItems) {
      const goods = goodsMap.get(item.goods_id)
      if (goods.stock < item.quantity) {
        throw new AppError(`「${goods.name}」库存不足，当前仅剩 ${goods.stock}${goods.unit}`, 400, 400)
      }
      // 扣减库存（预占）
      goods.stock -= item.quantity
      goods.sales += item.quantity
      await goods.save({ transaction: t })

      const subtotal = parseFloat(goods.price) * item.quantity
      totalAmount += subtotal
      orderItems.push({
        goods_id: goods.id,
        goods_name: goods.name,
        goods_image: goods.image,
        price: goods.price,
        quantity: item.quantity,
        subtotal,
      })
    }

    // 3. 金额计算
    const freight = calcFreight(totalAmount)
    const payAmount = totalAmount + freight

    // 4. 创建订单 + 明细
    const order = await Order.create(
      {
        order_no: generateOrderNo(),
        user_id: userId,
        address_id: address.id,
        receiver: address.receiver,
        receiver_phone: address.phone,
        receiver_address: `${address.province}${address.city}${address.district}${address.detail}`,
        total_amount: totalAmount.toFixed(2),
        freight: freight.toFixed(2),
        pay_amount: payAmount.toFixed(2),
        status: 0,
        remark: remark || '',
      },
      { transaction: t }
    )
    await OrderItem.bulkCreate(
      orderItems.map((it) => ({ ...it, order_id: order.id })),
      { transaction: t }
    )

    // 5. 清空购物车中本次下单的商品
    await cartService.clearCartItems(userId, mergedItems.map((i) => i.goods_id))

    await t.commit()
    console.log(`[订单] 创建成功 id=${order.id} order_no=${order.order_no} 实付=${payAmount}`)
    return order
  } catch (err) {
    await t.rollback()
    throw err
  }
}

/**
 * 订单列表（支持状态筛选 + 分页）
 */
async function listOrders(userId, { status, page = 1, pageSize = 10 }) {
  const where = { user_id: userId }
  if (status !== undefined && status !== null && status !== '') {
    where.status = status
  }
  // count 与列表分开查询：findAndCountAll 在 hasMany include 时 count 会因 join 重复
  const count = await Order.count({ where })
  const rows = await Order.findAll({
    where,
    include: [{ model: OrderItem, as: 'items', attributes: ['goods_id', 'goods_name', 'goods_image', 'quantity', 'subtotal'] }],
    order: [['created_at', 'DESC']],
    offset: (page - 1) * pageSize,
    limit: pageSize,
  })
  return { list: rows, total: count, page, pageSize, hasMore: page * pageSize < count }
}

/**
 * 订单详情（含明细 + 配送信息）
 */
async function getOrderDetail(userId, orderId) {
  const order = await Order.findOne({
    where: { id: orderId, user_id: userId }, // 归属校验
    include: [
      { model: OrderItem, as: 'items' },
      { model: Delivery, as: 'delivery' },
    ],
  })
  if (!order) throw new AppError('订单不存在', 404, 404)
  return order
}

/**
 * 取消订单（仅待支付状态，释放库存）
 */
async function cancelOrder(userId, orderId) {
  const t = await sequelize.transaction()
  try {
    const order = await Order.findOne({
      where: { id: orderId, user_id: userId },
      lock: t.LOCK.UPDATE,
      transaction: t,
    })
    if (!order) throw new AppError('订单不存在', 404, 404)
    if (order.status !== 0) {
      throw new AppError(order.status === 4 ? '订单已取消' : '仅待支付订单可取消', 400, 400)
    }

    // 释放库存
    const items = await OrderItem.findAll({ where: { order_id: order.id }, transaction: t })
    for (const item of items) {
      await Goods.increment('stock', {
        by: item.quantity,
        where: { id: item.goods_id },
        transaction: t,
      })
    }

    order.status = 4
    await order.save({ transaction: t })
    await t.commit()
    console.log(`[订单] 取消成功 id=${order.id}`)
    return order
  } catch (err) {
    await t.rollback()
    throw err
  }
}

/**
 * 支付回调处理（幂等：已支付/已取消订单不重复处理）
 * 流程：状态 0 → 1（已支付），创建配送记录
 */
async function handlePayNotify(orderNo) {
  const t = await sequelize.transaction()
  try {
    const order = await Order.findOne({
      where: { order_no: orderNo },
      lock: t.LOCK.UPDATE,
      transaction: t,
    })
    // 订单不存在：返回 success 避免微信无限重试（必须回滚，否则事务挂起持有连接）
    if (!order) {
      console.log(`[支付回调] 订单不存在 order_no=${orderNo}`)
      await t.rollback()
      return { handled: false, reason: 'not_found' }
    }
    // 幂等：已支付 / 已取消不重复处理（必须回滚，否则事务挂起持有行锁）
    if (order.status !== 0) {
      console.log(`[支付回调] 订单已处理（status=${order.status}），跳过 order_no=${orderNo}`)
      await t.rollback()
      return { handled: false, reason: 'already_handled' }
    }

    // 状态更新为已支付
    order.status = 1
    order.paid_at = new Date()
    await order.save({ transaction: t })

    // 创建配送记录（初始：待分配）
    await Delivery.create({ order_id: order.id, status: 0 }, { transaction: t })

    await t.commit()
    console.log(`[支付回调] 订单已支付 id=${order.id} order_no=${orderNo}`)
    return { handled: true, order }
  } catch (err) {
    await t.rollback()
    throw err
  }
}

/**
 * 超时未支付订单自动取消并释放库存（定时任务，每分钟扫描一次）
 */
async function closeExpiredOrders() {
  const deadline = new Date(Date.now() - PAY_TIMEOUT_MINUTES * 60 * 1000)
  const expiredOrders = await Order.findAll({
    where: { status: 0, created_at: { [Op.lt]: deadline } },
  })
  for (const order of expiredOrders) {
    try {
      await cancelOrder(order.user_id, order.id)
      console.log(`[超时关闭] 订单 id=${order.id} 超时未支付已自动取消`)
    } catch (err) {
      console.error(`[超时关闭] 订单 id=${order.id} 处理失败：`, err.message)
    }
  }
  if (expiredOrders.length) {
    console.log(`[超时关闭] 本次处理 ${expiredOrders.length} 笔超时订单`)
  }
}

// 启动定时任务（每分钟扫描一次）
function startScheduler() {
  schedule.scheduleJob('*/1 * * * *', closeExpiredOrders)
  console.log(`[定时任务] 已启动：超时 ${PAY_TIMEOUT_MINUTES} 分钟未支付订单自动取消（每分钟扫描）`)
}

module.exports = {
  FREIGHT_FREE_THRESHOLD,
  FREIGHT_PRICE,
  createOrder,
  listOrders,
  getOrderDetail,
  cancelOrder,
  handlePayNotify,
  closeExpiredOrders,
  startScheduler,
}
