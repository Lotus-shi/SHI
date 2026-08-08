/**
 * Redis 连接单例
 * 用途：购物车存储（cart:{userId}）、后续会话/订单超时等
 * 模块加载时自动连接；连接失败直接退出进程，避免服务在无 Redis 状态下带病运行
 */
const redis = require('redis')
const config = require('../config/config')

const client = redis.createClient({
  url: `redis://${config.redis.host}:${config.redis.port}`,
  password: config.redis.password || undefined,
  // 强制使用 RESP2 协议：本机 Windows Redis 5.0.14 不支持 RESP3（HELLO 命令），
  // 客户端默认尝试 RESP3 失败后降级解析会出现 Hash 命令数据错乱
  RESP: 2,
})

client.on('error', (err) => {
  console.error('[Redis] 错误：', err.message)
})

client.connect().then(() => {
  console.log(`[Redis] 已连接 ${config.redis.host}:${config.redis.port}`)
}).catch((err) => {
  console.error('[Redis] 连接失败：', err.message)
  console.error('[Redis] 请确认 Redis 服务已启动（redis-server）')
  process.exit(1)
})

module.exports = client
