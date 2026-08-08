/**
 * 鉴权控制器：微信登录、用户信息
 */
const jwt = require('jsonwebtoken')
const config = require('../config/config')
const { User } = require('../models')
const { code2Session } = require('../utils/wechat')
const { success } = require('../utils/response')
const AppError = require('../utils/appError')

// 签发 JWT
function signToken(user) {
  return jwt.sign(
    { userId: user.id, openid: user.openid },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  )
}

/**
 * POST /api/auth/login
 * 接收小程序 code → 换取 openid → 查询或创建用户 → 签发 JWT
 */
exports.login = async (req, res, next) => {
  try {
    const { code } = req.body
    const { openid } = await code2Session(code)

    // 查询用户，不存在则自动注册
    let user = await User.findOne({ where: { openid } })
    if (!user) {
      user = await User.create({
        openid,
        nickname: `用户${openid.slice(-6)}`, // 默认昵称，可后续修改
      })
      console.log('[鉴权] 新用户注册，id =', user.id)
    }

    const token = signToken(user)
    success(res, {
      token,
      userInfo: {
        id: user.id,
        nickname: user.nickname,
        avatar_url: user.avatar_url,
        phone: user.phone,
      },
    }, '登录成功')
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/auth/profile
 * 返回当前登录用户信息（需鉴权）
 */
exports.getProfile = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.userId)
    if (!user) {
      throw new AppError('用户不存在', 404, 404)
    }
    success(res, {
      id: user.id,
      nickname: user.nickname,
      avatar_url: user.avatar_url,
      phone: user.phone,
    })
  } catch (err) {
    next(err)
  }
}

/**
 * PUT /api/auth/profile
 * 更新昵称、头像、手机号（需鉴权，只更新传了的字段）
 */
exports.updateProfile = async (req, res, next) => {
  try {
    const { nickname, avatar_url, phone } = req.body
    const user = await User.findByPk(req.user.userId)
    if (!user) {
      throw new AppError('用户不存在', 404, 404)
    }

    // 手机号格式校验（宽松校验，微信端可能带 +86 前缀）
    if (phone !== undefined && phone !== '' && !/^\+?\d{6,15}$/.test(phone)) {
      throw new AppError('手机号格式不正确', 400, 400)
    }

    if (nickname !== undefined) user.nickname = nickname
    if (avatar_url !== undefined) user.avatar_url = avatar_url
    if (phone !== undefined) user.phone = phone
    await user.save()

    success(res, {
      id: user.id,
      nickname: user.nickname,
      avatar_url: user.avatar_url,
      phone: user.phone,
    }, '更新成功')
  } catch (err) {
    next(err)
  }
}
