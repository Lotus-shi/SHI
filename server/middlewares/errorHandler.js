/**
 * 全局错误处理中间件
 * 捕获路由中抛出的所有异常，返回统一错误格式 { code, message }
 * 挂在所有路由之后，必须是最后一个中间件
 */
const AppError = require('../utils/appError')

module.exports = (err, req, res, next) => {
  // 业务异常：按 AppError 定义返回
  if (err instanceof AppError) {
    return res.status(err.httpStatus).json({ code: err.code, message: err.message })
  }

  // Sequelize 数据校验错误（NOT NULL、唯一约束等）
  if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
    const message = err.errors && err.errors[0] ? err.errors[0].message : '数据校验失败'
    return res.status(400).json({ code: 400, message })
  }

  // JSON 解析失败（请求体格式错误）
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ code: 400, message: '请求体格式错误' })
  }

  // 兜底：未预期的服务器错误，不向客户端暴露堆栈
  console.error('[全局错误]', err)
  res.status(500).json({ code: 500, message: '服务器内部错误' })
}
