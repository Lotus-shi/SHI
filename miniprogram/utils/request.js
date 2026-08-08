/**
 * 网络请求封装
 * - Promise 化 wx.request
 * - 自动注入 JWT token（Authorization: Bearer xxx）
 * - 401 自动静默登录（wx.login → /api/auth/login）后重试一次
 * - 统一错误提示
 * - 后端约定：成功 code === 0 且 data 为业务数据
 */
const { baseUrl } = require('../config/env')

// 深度处理：后端返回的相对图片路径（/images/xxx.jpg）自动拼接 API 基础地址
// 商品图、轮播图、订单快照等所有图片字段统一生效，真机预览改 baseUrl 即可
function resolveImagePaths(value) {
  if (typeof value === 'string' && value.startsWith('/images/')) {
    return baseUrl + value
  }
  if (Array.isArray(value)) {
    return value.map(resolveImagePaths)
  }
  if (value && typeof value === 'object') {
    const result = {}
    for (const key of Object.keys(value)) {
      result[key] = resolveImagePaths(value[key])
    }
    return result
  }
  return value
}

// 静默登录中共享的 Promise，避免多个请求同时 401 时并发重复登录
let loginPromise = null

// 静默登录：wx.login 拿 code → 调后端登录接口 → 缓存 token
function silentLogin() {
  if (loginPromise) return loginPromise
  loginPromise = new Promise((resolve, reject) => {
    wx.login({
      success: (res) => {
        wx.request({
          url: baseUrl + '/api/auth/login',
          method: 'POST',
          data: { code: res.code },
          timeout: 10000,
          success: (loginRes) => {
            const data = loginRes.data
            if (data && data.code === 0 && data.data && data.data.token) {
              wx.setStorageSync('token', data.data.token)
              resolve(data.data.token)
            } else {
              reject({ code: (data && data.code) || -1, message: (data && data.message) || '登录失败' })
            }
          },
          fail: () => reject({ code: -1, message: '登录请求失败' }),
        })
      },
      fail: () => reject({ code: -1, message: 'wx.login 失败' }),
    })
  })
  // 登录完成后清空共享 Promise，下次 401 可重新登录
  loginPromise.then(() => { loginPromise = null }, () => { loginPromise = null })
  return loginPromise
}

function request({ url, method = 'GET', data = {}, auth = true, retried = false }) {
  return new Promise((resolve, reject) => {
    const token = wx.getStorageSync('token')
    const header = { 'Content-Type': 'application/json' }
    if (auth && token) {
      header.Authorization = 'Bearer ' + token
    }

    wx.request({
      url: baseUrl + url,
      method,
      data,
      header,
      timeout: 10000,
      success: (res) => {
        // 登录失效：静默登录后重试一次；重试仍失败则放弃
        if (res.statusCode === 401) {
          if (auth && !retried) {
            silentLogin()
              .then(() => {
                request({ url, method, data, auth, retried: true }).then(resolve).catch(reject)
              })
              .catch((err) => {
                wx.showToast({ title: err.message || '请重新登录', icon: 'none' })
                reject(err)
              })
            return
          }
          wx.removeStorageSync('token')
          wx.showToast({ title: '登录已过期，请重试', icon: 'none' })
          reject({ code: 401, message: '未登录或登录已过期' })
          return
        }
        // 业务成功：code === 0
        if (res.statusCode >= 200 && res.statusCode < 300 && res.data && res.data.code === 0) {
          resolve(resolveImagePaths(res.data.data))
          return
        }
        // 业务失败：统一弹提示
        const message = (res.data && res.data.message) || '请求失败'
        wx.showToast({ title: message, icon: 'none' })
        reject(res.data || { code: -1, message })
      },
      fail: (err) => {
        wx.showToast({ title: '网络异常，请稍后重试', icon: 'none' })
        reject({ code: -1, message: '网络异常', detail: err })
      },
    })
  })
}

// 便捷方法
module.exports = {
  get: (url, data, options) => request({ url, data, method: 'GET', ...options }),
  post: (url, data, options) => request({ url, data, method: 'POST', ...options }),
  put: (url, data, options) => request({ url, data, method: 'PUT', ...options }),
  del: (url, data, options) => request({ url, data, method: 'DELETE', ...options }),
  silentLogin,
}
