/**
 * 配送信息模型 → deliveries 表（订单创建成功后自动生成一条记录）
 *
 * 配送状态常量（status 字段）：
 * 0 待分配 | 1 已分配 | 2 取货中 | 3 配送中 | 4 已送达
 */
const { DataTypes } = require('sequelize')
const sequelize = require('../config/database')

const Delivery = sequelize.define('Delivery', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  order_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true,
    comment: '所属订单 id（一个订单仅一条配送记录）',
  },
  status: {
    type: DataTypes.TINYINT,
    defaultValue: 0,
    comment: '0 待分配 1 已分配 2 取货中 3 配送中 4 已送达',
  },
  courier_name: { type: DataTypes.STRING(50), defaultValue: '', comment: '配送员姓名' },
  courier_phone: { type: DataTypes.STRING(20), defaultValue: '', comment: '配送员电话' },
  estimated_time: { type: DataTypes.DATE, comment: '预计送达时间' },
  delivered_at: { type: DataTypes.DATE, comment: '实际送达时间' },
  timeline: {
    type: DataTypes.TEXT,
    comment: '状态流转时间线 JSON：[{status, text, time}]',
  },
}, {
  tableName: 'deliveries',
})

module.exports = Delivery
