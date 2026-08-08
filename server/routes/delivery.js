/**
 * 配送路由
 * GET /api/orders/:id/logistics      查询订单配送信息（需登录，归属校验）
 * PUT /api/deliveries/:id/status     更新配送状态（需登录，配送端调用）
 */
const express = require('express')
const router = express.Router()
const auth = require('../middlewares/auth')
const deliveryController = require('../controllers/deliveryController')

router.get('/orders/:id/logistics', auth, deliveryController.getLogistics)
router.put('/deliveries/:id/status', auth, deliveryController.updateStatus)

module.exports = router
