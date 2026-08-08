/**
 * Sequelize 数据库连接实例
 * 所有模型通过该实例注册，供 sync 建表与后续业务查询使用
 */
const { Sequelize } = require('sequelize')
const config = require('./config')

const sequelize = new Sequelize(config.db.database, config.db.username, config.db.password, {
  host: config.db.host,
  port: config.db.port,
  dialect: 'mysql',
  timezone: config.db.timezone, // 与 MySQL 保持同一时区，避免时间偏移
  logging: config.env === 'development' ? console.log : false, // 开发环境打印 SQL
  define: {
    underscored: true, // 字段名使用下划线风格（created_at 而非 createdAt）
    freezeTableName: true, // 表名与模型名一致，不加复数后缀
    charset: 'utf8mb4', // 支持 emoji 与中文
  },
})

module.exports = sequelize
