/**
 * 模型统一出口：加载全部模型并定义关联关系
 * 业务代码统一从本文件引入模型，保证关联关系已注册
 */
const sequelize = require('../config/database')
const User = require('./user')
const Category = require('./category')
const Goods = require('./goods')
const Address = require('./address')
const Order = require('./order')
const OrderItem = require('./order_item')
const Delivery = require('./delivery')

// ===== 关联关系 =====

// User hasMany Address / Order
User.hasMany(Address, { foreignKey: 'user_id', as: 'addresses' })
Address.belongsTo(User, { foreignKey: 'user_id', as: 'user' })

User.hasMany(Order, { foreignKey: 'user_id', as: 'orders' })
Order.belongsTo(User, { foreignKey: 'user_id', as: 'user' })

// Category hasMany Goods
Category.hasMany(Goods, { foreignKey: 'category_id', as: 'goods' })
Goods.belongsTo(Category, { foreignKey: 'category_id', as: 'category' })

// Order hasMany OrderItem / hasOne Delivery
Order.hasMany(OrderItem, { foreignKey: 'order_id', as: 'items' })
OrderItem.belongsTo(Order, { foreignKey: 'order_id', as: 'order' })

Order.hasOne(Delivery, { foreignKey: 'order_id', as: 'delivery' })
Delivery.belongsTo(Order, { foreignKey: 'order_id', as: 'order' })

// Goods hasMany OrderItem
Goods.hasMany(OrderItem, { foreignKey: 'goods_id', as: 'orderItems' })
OrderItem.belongsTo(Goods, { foreignKey: 'goods_id', as: 'goods' })

module.exports = {
  sequelize,
  User,
  Category,
  Goods,
  Address,
  Order,
  OrderItem,
  Delivery,
}
