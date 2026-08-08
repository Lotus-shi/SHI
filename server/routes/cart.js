/**
 * 购物车路由（全部需登录）
 * GET    /api/cart         当前用户购物车
 * POST   /api/cart         添加商品 { goods_id, quantity }
 * PUT    /api/cart/:id     修改数量 { quantity }（:id = goods_id）
 * DELETE /api/cart/:id     删除商品（:id = goods_id）
 */
const express = require('express')
const router = express.Router()
const auth = require('../middlewares/auth')
const cartService = require('../services/cartService')
const { success } = require('../utils/response')
const AppError = require('../utils/appError')

router.use(auth)

// 获取购物车
router.get('/', async (req, res, next) => {
  try {
    const list = await cartService.getCart(req.user.userId)
    success(res, list)
  } catch (err) {
    next(err)
  }
})

// 添加商品
router.post('/', async (req, res, next) => {
  try {
    const goodsId = parseInt(req.body.goods_id)
    const quantity = parseInt(req.body.quantity)

    if (!goodsId) throw new AppError('缺少商品 id', 400, 400)
    if (!quantity || quantity < 1) throw new AppError('数量必须大于 0', 400, 400)

    const current = await cartService.addToCart(req.user.userId, goodsId, quantity)
    success(res, { goods_id: goodsId, quantity: current }, '已加入购物车')
  } catch (err) {
    next(err)
  }
})

// 修改数量
router.put('/:id', async (req, res, next) => {
  try {
    const goodsId = parseInt(req.params.id)
    const quantity = parseInt(req.body.quantity)

    if (!goodsId) throw new AppError('商品 id 不合法', 400, 400)

    await cartService.updateQuantity(req.user.userId, goodsId, quantity)
    success(res, { goods_id: goodsId, quantity }, '修改成功')
  } catch (err) {
    next(err)
  }
})

// 删除商品
router.delete('/:id', async (req, res, next) => {
  try {
    const goodsId = parseInt(req.params.id)
    if (!goodsId) throw new AppError('商品 id 不合法', 400, 400)

    await cartService.removeFromCart(req.user.userId, goodsId)
    success(res, null, '已删除')
  } catch (err) {
    next(err)
  }
})

module.exports = router
