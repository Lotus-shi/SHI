/**
 * 订单模型 → orders 表
 *
 * 订单状态常量（status 字段）：
 * 0 待支付 | 1 已支付（待发货） | 2 配送中 | 3 已完成 | 4 已取消
 */
const { DataTypes } = require('sequelize')
const sequelize = require('../config/database')

const Order = sequelize.define('Order', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  order_no: {
    type: DataTypes.STRING(32),
    allowNull: false,
    unique: true,
    comment: '订单号（时间戳 + 随机数生成）',
  },
  user_id: { type: DataTypes.INTEGER, allowNull: false, comment: '下单用户 id' },
  address_id: { type: DataTypes.INTEGER, allowNull: false, comment: '收货地址 id' },
  // 以下为地址快照：地址被删除/修改后订单仍保留下单时的信息
  receiver: { type: DataTypes.STRING(50), allowNull: false, comment: '收货人（快照）' },
  receiver_phone: { type: DataTypes.STRING(20), allowNull: false, comment: '收货电话（快照）' },
  receiver_address: { type: DataTypes.STRING(255), allowNull: false, comment: '完整收货地址（快照）' },
  total_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    comment: '商品总额（元）',
  },
  freight: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    comment: '运费（元）',
  },
  pay_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    comment: '实付金额 = 总额 + 运费（元）',
  },
  status: {
    type: DataTypes.TINYINT,
    defaultValue: 0,
    comment: '0 待支付 1 已支付 2 配送中 3 已完成 4 已取消',
  },
  remark: { type: DataTypes.STRING(255), defaultValue: '', comment: '买家备注' },
  paid_at: { type: DataTypes.DATE, comment: '支付时间' },
}, {
  tableName: 'orders',
})

module.exports = Order
