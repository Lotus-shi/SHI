/**
 * 全局配置：通过 dotenv 读取 .env 环境变量
 * 所有模块统一从这里获取配置，避免散落的 process.env 调用
 */
require('dotenv').config()

module.exports = {
  // 服务配置
  port: process.env.PORT || 3000,
  env: process.env.NODE_ENV || 'development',

  // MySQL 数据库配置
  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 3306,
    database: process.env.DB_NAME || 'fresh_fruit_veggie_mall',
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    timezone: process.env.DB_TIMEZONE || '+08:00',
  },

  // Redis 配置
  redis: {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || '',
  },

  // JWT 配置
  jwt: {
    secret: process.env.JWT_SECRET || 'dev_secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  // 微信小程序配置
  wechat: {
    appid: process.env.WX_APPID || '',
    appsecret: process.env.WX_APPSECRET || '',
  },
}
