/**
 * 商品服务层：封装商品查询逻辑
 * 控制器只做参数校验与响应，业务查询集中在这里
 */
const { Op } = require('sequelize')
const { Goods, Category } = require('../models')
const AppError = require('../utils/appError')

/**
 * 分页查询商品列表
 * @param {object} params { categoryId, keyword, page, pageSize }
 * @returns {object} { list, total, page, pageSize, hasMore }
 */
async function listGoods({ categoryId, keyword, page = 1, pageSize = 10 }) {
  const where = { status: true } // 只展示上架商品

  if (categoryId) {
    where.category_id = categoryId
  }
  if (keyword) {
    where.name = { [Op.like]: `%${keyword}%` } // 名称模糊搜索
  }

  const { count, rows } = await Goods.findAndCountAll({
    where,
    order: [['sales', 'DESC']], // 默认按销量排序
    offset: (page - 1) * pageSize,
    limit: pageSize,
    attributes: { exclude: ['images', 'detail'] }, // 列表不返回大字段，详情接口单独取
  })

  return {
    list: rows,
    total: count,
    page,
    pageSize,
    hasMore: page * pageSize < count,
  }
}

/**
 * 商品详情（含轮播图与图文详情）
 */
async function getGoodsDetail(id) {
  const goods = await Goods.findByPk(id, {
    include: [{ model: Category, as: 'category', attributes: ['id', 'name'] }],
  })
  if (!goods) {
    throw new AppError('商品不存在或已下架', 404, 404)
  }
  if (!goods.status) {
    throw new AppError('商品已下架', 404, 404)
  }

  // 解析 JSON 字段（数据库存的是字符串）
  const data = goods.toJSON()
  try {
    data.images = JSON.parse(data.images || '[]')
  } catch {
    data.images = []
  }
  return data
}

/**
 * 热销商品（推荐位/首页横向滚动）
 */
async function listHot(limit = 10) {
  return Goods.findAll({
    where: { status: true, is_hot: true },
    order: [['sales', 'DESC']],
    limit,
    attributes: { exclude: ['images', 'detail'] },
  })
}

/**
 * 新品商品
 */
async function listNew(limit = 10) {
  return Goods.findAll({
    where: { status: true, is_new: true },
    order: [['created_at', 'DESC']],
    limit,
    attributes: { exclude: ['images', 'detail'] },
  })
}

module.exports = { listGoods, getGoodsDetail, listHot, listNew }
