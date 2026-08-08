/**
 * 鉴权路由
 * POST /api/auth/login          微信登录
 * GET  /api/auth/profile        获取当前用户信息（需鉴权）
 * PUT  /api/auth/profile        更新昵称/头像/手机号（需鉴权）
 */
const express = require('express')
const router = express.Router()
const authController = require('../controllers/authController')
const auth = require('../middlewares/auth')

router.post('/login', authController.login)
router.get('/profile', auth, authController.getProfile)
router.put('/profile', auth, authController.updateProfile)

module.exports = router
