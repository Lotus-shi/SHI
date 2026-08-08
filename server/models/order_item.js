/**
 * 订单明细模型 → order_items 表
 * 商品名称/图片/价格均为下单时的快照，商品变更不影响历史订单展示
 */
const { DataTypes } = require('sequelize')
const sequelize = require('../config/database')

const OrderItem = sequelize.define('OrderItem', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  order_id: { type: DataTypes.INTEGER, allowNull: false, comment: '所属订单 id' },
  goods_id: { type: DataTypes.INTEGER, allowNull: false, comment: '商品 id' },
  goods_name: { type: DataTypes.STRING(100), allowNull: false, comment: '商品名称（快照）' },
  goods_image: { type: DataTypes.STRING(255), defaultValue: '', comment: '商品主图（快照）' },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    comment: '下单单价（快照）',
  },
  quantity: { type: DataTypes.INTEGER, allowNull: false, comment: '购买数量' },
  subtotal: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    comment: '小计 = 单价 × 数量',
  },
}, {
  tableName: 'order_items',
})

module.exports = OrderItem
