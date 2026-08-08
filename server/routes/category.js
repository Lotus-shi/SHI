/**
 * 分类路由
 * GET /api/categories 返回全部分类（按 sort_order 排序）
 */
const express = require('express')
const router = express.Router()
const { Category } = require('../models')
const { success } = require('../utils/response')

router.get('/', async (req, res, next) => {
  try {
    const categories = await Category.findAll({
      order: [['sort_order', 'ASC'], ['id', 'ASC']],
    })
    success(res, categories)
  } catch (err) {
    next(err)
  }
})

module.exports = router
