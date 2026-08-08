/**
 * 收货地址路由（全部需登录，只操作自己的数据，防止越权）
 * GET    /api/addresses        地址列表（默认地址在前）
 * POST   /api/addresses        新增地址（第一条自动设为默认；传 is_default 可指定）
 * PUT    /api/addresses/:id    修改地址（is_default=true 时清除其他默认，事务处理）
 * DELETE /api/addresses/:id    删除地址
 */
const express = require('express')
const router = express.Router()
const auth = require('../middlewares/auth')
const { Address } = require('../models')
const { success } = require('../utils/response')
const AppError = require('../utils/appError')

router.use(auth)

// 地址列表
router.get('/', async (req, res, next) => {
  try {
    const list = await Address.findAll({
      where: { user_id: req.user.userId },
      order: [
        ['is_default', 'DESC'], // 默认地址排最前
        ['created_at', 'DESC'],
      ],
    })
    success(res, list)
  } catch (err) {
    next(err)
  }
})

// 新增地址
router.post('/', async (req, res, next) => {
  const t = await Address.sequelize.transaction()
  try {
    const { receiver, phone, province, city, district, detail, is_default } = req.body

    // 必填校验
    if (!receiver) throw new AppError('请填写收货人姓名', 400, 400)
    if (!phone) throw new AppError('请填写收货人电话', 400, 400)
    if (!detail) throw new AppError('请填写详细地址', 400, 400)
    if (!/^\+?\d{6,15}$/.test(phone)) throw new AppError('手机号格式不正确', 400, 400)

    // 该用户已有地址数量
    const count = await Address.count({ where: { user_id: req.user.userId }, transaction: t })

    const wantDefault = is_default === true || is_default === 1 || count === 0
    if (wantDefault && count > 0) {
      // 事务：先清除该用户其他地址的默认标记
      await Address.update(
        { is_default: false },
        { where: { user_id: req.user.userId }, transaction: t }
      )
    }

    const address = await Address.create(
      {
        user_id: req.user.userId,
        receiver,
        phone,
        province: province || '',
        city: city || '',
        district: district || '',
        detail,
        is_default: wantDefault,
      },
      { transaction: t }
    )

    await t.commit()
    success(res, address, '新增成功')
  } catch (err) {
    await t.rollback()
    next(err)
  }
})

// 修改地址（含设置默认）
router.put('/:id', async (req, res, next) => {
  const t = await Address.sequelize.transaction()
  try {
    const id = parseInt(req.params.id)
    const { receiver, phone, province, city, district, detail, is_default } = req.body

    // 归属校验：只能操作自己的地址
    const address = await Address.findOne({
      where: { id, user_id: req.user.userId },
      transaction: t,
    })
    if (!address) throw new AppError('地址不存在', 404, 404)

    if (receiver !== undefined) {
      if (!receiver) throw new AppError('请填写收货人姓名', 400, 400)
      address.receiver = receiver
    }
    if (phone !== undefined) {
      if (!/^\+?\d{6,15}$/.test(phone)) throw new AppError('手机号格式不正确', 400, 400)
      address.phone = phone
    }
    if (province !== undefined) address.province = province
    if (city !== undefined) address.city = city
    if (district !== undefined) address.district = district
    if (detail !== undefined) {
      if (!detail) throw new AppError('请填写详细地址', 400, 400)
      address.detail = detail
    }

    // 设置为默认时：事务内清除其他默认
    if (is_default === true || is_default === 1) {
      await Address.update(
        { is_default: false },
        { where: { user_id: req.user.userId, id: { [require('sequelize').Op.ne]: id } }, transaction: t }
      )
      address.is_default = true
    }

    await address.save({ transaction: t })
    await t.commit()
    success(res, address, '修改成功')
  } catch (err) {
    await t.rollback()
    next(err)
  }
})

// 删除地址
router.delete('/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id)
    // 归属校验
    const deleted = await Address.destroy({
      where: { id, user_id: req.user.userId },
    })
    if (!deleted) throw new AppError('地址不存在', 404, 404)
    success(res, null, '已删除')
  } catch (err) {
    next(err)
  }
})

module.exports = router
