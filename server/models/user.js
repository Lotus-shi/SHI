/**
 * 用户模型 → users 表
 */
const { DataTypes } = require('sequelize')
const sequelize = require('../config/database')

const User = sequelize.define('User', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  openid: {
    type: DataTypes.STRING(64),
    allowNull: false,
    unique: true,
    comment: '微信 openid，唯一标识',
  },
  nickname: { type: DataTypes.STRING(50), defaultValue: '', comment: '昵称' },
  avatar_url: { type: DataTypes.STRING(255), defaultValue: '', comment: '头像地址' },
  phone: { type: DataTypes.STRING(20), defaultValue: '', comment: '手机号' },
}, {
  tableName: 'users',
})

module.exports = User
