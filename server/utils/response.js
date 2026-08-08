/**
 * 统一响应工具
 * 所有接口成功返回 { code: 0, message, data }
 * 失败返回 { code, message }（由 errorHandler 统一处理）
 */

// 成功响应
function success(res, data = null, message = 'success') {
  res.json({ code: 0, message, data })
}

// 手动失败响应（业务层主动返回，如参数校验失败）
function fail(res, code = 400, message = '请求失败', httpStatus = 400) {
  res.status(httpStatus).json({ code, message })
}

module.exports = { success, fail }
