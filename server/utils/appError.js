/**
 * 业务异常类
 * 业务代码中 throw new AppError('库存不足', 400, 400)
 * 由全局错误处理中间件统一捕获并转为统一响应格式
 */
class AppError extends Error {
  /**
   * @param {string} message 错误提示（直接展示给用户）
   * @param {number} code    业务错误码（默认 500）
   * @param {number} httpStatus HTTP 状态码（默认 400）
   */
  constructor(message, code = 500, httpStatus = 400) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.httpStatus = httpStatus
  }
}

module.exports = AppError
