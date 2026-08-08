/**
 * 购物车服务层
 * 存储：Redis Hash，key = cart:{userId}，field = goods_id，value = quantity
 * 结构：{ goodsId: quantity }
 */
const { Op } = require('sequelize')
const redis = require('../utils/redis')
const { Goods } = require('../models')
const AppError = require('../utils/appError')

const cartKey = (userId) => `cart:${userId}`

// 校验商品是否存在且上架
async function checkGoods(goodsId) {
  const goods = await Goods.findOne({ where: { id: goodsId, status: true } })
  if (!goods) {
    throw new AppError('商品不存在或已下架', 404, 404)
  }
  return goods
}

/**
 * 添加商品到购物车（数量累加）
 * @returns {number} 该商品在购物车中的最新数量
 */
async function addToCart(userId, goodsId, quantity) {
  const goods = await checkGoods(goodsId)
  const key = cartKey(userId)

  const current = parseInt(await redis.hGet(key, String(goodsId))) || 0
  const total = current + quantity
  if (total > goods.stock) {
    throw new AppError(`商品库存不足，当前库存 ${goods.stock}${goods.unit}`, 400, 400)
  }

  await redis.hIncrBy(key, String(goodsId), quantity)
  return total
}

/**
 * 修改购物车中某商品数量（直接覆盖）
 */
async function updateQuantity(userId, goodsId, quantity) {
  if (quantity <= 0) {
    throw new AppError('数量必须大于 0', 400, 400)
  }
  const goods = await checkGoods(goodsId)
  if (quantity > goods.stock) {
    throw new AppError(`商品库存不足，当前库存 ${goods.stock}${goods.unit}`, 400, 400)
  }

  await redis.hSet(cartKey(userId), String(goodsId), quantity)
}

/**
 * 删除购物车中某商品
 */
async function removeFromCart(userId, goodsId) {
  await redis.hDel(cartKey(userId), String(goodsId))
}

/**
 * 获取购物车（关联商品信息，含小计）
 * @returns {Array<{goods_id, quantity, goods, subtotal}>}
 */
async function getCart(userId) {
  const raw = await redis.hGetAll(cartKey(userId))
  const entries = Object.entries(raw).map(([goodsId, quantity]) => ({
    goods_id: parseInt(goodsId),
    quantity: parseInt(quantity),
  }))
  if (!entries.length) return []

  // 批量查询商品，合并为 { 购物车条目, 商品信息, 小计 }
  const ids = entries.map((e) => e.goods_id)
  const goodsList = await Goods.findAll({
    where: { id: { [Op.in]: ids } },
    attributes: { exclude: ['images', 'detail'] },
  })
  const goodsMap = new Map(goodsList.map((g) => [g.id, g]))

  return entries
    .filter((e) => goodsMap.has(e.goods_id)) // 过滤已删除/下架商品
    .map((e) => {
      const goods = goodsMap.get(e.goods_id)
      return {
        ...e,
        goods,
        subtotal: parseFloat(goods.price) * e.quantity,
      }
    })
}

/**
 * 清空购物车（下单成功后调用）
 */
async function clearCart(userId) {
  await redis.del(cartKey(userId))
}

/**
 * 删除购物车中指定商品（下单后清除已下单商品）
 * @param {number} userId
 * @param {number[]} goodsIds
 */
async function clearCartItems(userId, goodsIds) {
  if (!goodsIds || !goodsIds.length) return
  await redis.hDel(cartKey(userId), goodsIds.map(String))
}

module.exports = { addToCart, updateQuantity, removeFromCart, getCart, clearCart, clearCartItems }
