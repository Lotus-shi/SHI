/**
 * 商品控制器：只做参数校验与响应组装，查询逻辑在 goodsService
 */
const goodsService = require('../services/goodsService')
const { success } = require('../utils/response')
const AppError = require('../utils/appError')

/**
 * GET /api/goods
 * 参数：category_id（可选）、keyword（可选）、page（默认1）、page_size（默认10）
 */
exports.list = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1
    const pageSize = parseInt(req.query.page_size) || 10

    // 参数范围校验
    if (page < 1) throw new AppError('page 必须大于等于 1', 400, 400)
    if (pageSize < 1 || pageSize > 50) throw new AppError('page_size 范围为 1-50', 400, 400)

    const categoryId = parseInt(req.query.category_id) || 0
    const keyword = (req.query.keyword || '').trim()

    const data = await goodsService.listGoods({ categoryId, keyword, page, pageSize })
    success(res, data)
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/goods/:id
 */
exports.detail = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id)
    if (!id) throw new AppError('商品 id 不合法', 400, 400)

    const data = await goodsService.getGoodsDetail(id)
    success(res, data)
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/goods/hot
 */
exports.hot = async (req, res, next) => {
  try {
    const list = await goodsService.listHot()
    success(res, list)
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/goods/new
 */
exports.new = async (req, res, next) => {
  try {
    const list = await goodsService.listNew()
    success(res, list)
  } catch (err) {
    next(err)
  }
}
