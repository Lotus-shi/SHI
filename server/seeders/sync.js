/**
 * 建表脚本：npm run db:sync
 * 1. 自动创建数据库（如果不存在）
 * 2. 按模型定义同步创建所有表
 *
 * 用法：node seeders/sync.js            # 仅创建缺失的表
 *      node seeders/sync.js --force     # 先删除再重建所有表（清空数据，仅开发用）
 */
const mysql = require('mysql2/promise')
const config = require('../config/config')
const { sequelize } = require('../models')

async function main() {
  const force = process.argv.includes('--force')

  // 第一步：连接 MySQL 服务（不指定库），确保数据库存在
  const connection = await mysql.createConnection({
    host: config.db.host,
    port: config.db.port,
    user: config.db.username,
    password: config.db.password,
  })
  await connection.query(
    `CREATE DATABASE IF NOT EXISTS \`${config.db.database}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  )
  await connection.end()
  console.log(`[数据库] 已确认存在：${config.db.database}`)

  // 第二步：同步表结构
  const options = force ? { force: true } : {}
  await sequelize.sync(options)
  console.log(`[建表] 完成（${force ? 'force 模式，已重建' : '仅创建缺失表'}）`)

  // 列出已建表
  const [tables] = await sequelize.query('SHOW TABLES')
  const tableNames = tables.map((t) => Object.values(t)[0])
  console.log('[建表] 当前表列表：', tableNames.join(', '))

  await sequelize.close()
  process.exit(0)
}

main().catch((err) => {
  console.error('[建表] 失败：', err.message)
  process.exit(1)
})
