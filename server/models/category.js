/**
 * 商品分类模型 → categories 表
 */
const { DataTypes } = require('sequelize')
const sequelize = require('../config/database')

const Category = sequelize.define('Category', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(50), allowNull: false, comment: '分类名称' },
  icon: { type: DataTypes.STRING(255), defaultValue: '', comment: '分类图标' },
  sort_order: { type: DataTypes.INTEGER, defaultValue: 0, comment: '排序权重，越小越靠前' },
}, {
  tableName: 'categories',
})

module.exports = Category
