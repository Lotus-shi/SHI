/**
 * 商品路由
 * 注意：/hot、/new 必须定义在 /:id 之前，否则会被当作 id 匹配
 */
const express = require('express')
const router = express.Router()
const goodsController = require('../controllers/goodsController')

router.get('/', goodsController.list) // GET /api/goods 分页列表
router.get('/hot', goodsController.hot) // GET /api/goods/hot 热销
router.get('/new', goodsController.new) // GET /api/goods/new 新品
router.get('/:id', goodsController.detail) // GET /api/goods/:id 详情

module.exports = router
