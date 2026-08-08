/**
 * 收货地址模型 → addresses 表
 */
const { DataTypes } = require('sequelize')
const sequelize = require('../config/database')

const Address = sequelize.define('Address', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '所属用户 id',
  },
  receiver: { type: DataTypes.STRING(50), allowNull: false, comment: '收货人姓名' },
  phone: { type: DataTypes.STRING(20), allowNull: false, comment: '收货人电话' },
  province: { type: DataTypes.STRING(30), defaultValue: '', comment: '省' },
  city: { type: DataTypes.STRING(30), defaultValue: '', comment: '市' },
  district: { type: DataTypes.STRING(30), defaultValue: '', comment: '区县' },
  detail: { type: DataTypes.STRING(200), allowNull: false, comment: '详细地址' },
  is_default: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: '是否默认地址（同一用户仅一条为 true）',
  },
}, {
  tableName: 'addresses',
})

module.exports = Address
