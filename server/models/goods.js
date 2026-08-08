/**
 * 商品模型 → goods 表
 */
const { DataTypes } = require('sequelize')
const sequelize = require('../config/database')

const Goods = sequelize.define('Goods', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  category_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '所属分类 id',
  },
  name: { type: DataTypes.STRING(100), allowNull: false, comment: '商品名称' },
  image: { type: DataTypes.STRING(255), defaultValue: '', comment: '主图' },
  images: { type: DataTypes.TEXT, comment: '轮播图 JSON 数组' },
  detail: { type: DataTypes.TEXT, comment: '图文详情（富文本）' },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    comment: '现价（元）',
  },
  original_price: { type: DataTypes.DECIMAL(10, 2), comment: '划线价（元）' },
  unit: { type: DataTypes.STRING(20), defaultValue: '份', comment: '销售单位，如 500g/份' },
  stock: { type: DataTypes.INTEGER, defaultValue: 0, comment: '库存' },
  sales: { type: DataTypes.INTEGER, defaultValue: 0, comment: '销量' },
  is_hot: { type: DataTypes.BOOLEAN, defaultValue: false, comment: '是否热销' },
  is_new: { type: DataTypes.BOOLEAN, defaultValue: false, comment: '是否新品' },
  status: { type: DataTypes.BOOLEAN, defaultValue: true, comment: '上架状态，1 上架 0 下架' },
}, {
  tableName: 'goods',
})

module.exports = Goods
