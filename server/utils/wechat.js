/**
 * 微信工具：登录与支付相关接口
 *
 * 开发模式（mock）说明：
 * 当 WX_APPID 未配置或仍为占位符时，自动启用 mock 模式——
 * 任意 code 直接映射为测试 openid，方便无 AppID 时联调整个链路。
 * 在 .env 填入真实 AppID/AppSecret 后自动切换为真实微信接口，无需改代码。
 */
const axios = require('axios')
const config = require('../config/config')
const AppError = require('../utils/appError')

// 是否启用 mock（AppID/Secret 缺失或为占位符）
function isMock() {
  const { appid, appsecret } = config.wechat
  return !appid || !appsecret || appid === 'your_wx_appid'
}

/**
 * 登录凭证校验：code 换取 openid/session_key
 * @param {string} code 小程序端 wx.login 获取的临时凭证
 * @returns {Promise<{openid: string, session_key: string}>}
 */
async function code2Session(code) {
  if (!code) {
    throw new AppError('缺少登录凭证 code', 400, 400)
  }

  // 开发模式：固定 openid（wx.login 的 code 每次变化，若用 code 生成 openid 会导致
  // 每次登录都是新用户，地址/购物车/订单数据不连续——因此统一映射为同一个测试用户）
  if (isMock()) {
    const openid = 'mock_openid_dev'
    console.log('[微信] mock 模式登录，openid =', openid)
    return { openid, session_key: 'mock_session_key' }
  }

  const { appid, appsecret } = config.wechat
  try {
    const res = await axios.get('https://api.weixin.qq.com/sns/jscode2session', {
      params: {
        appid,
        secret: appsecret,
        js_code: code,
        grant_type: 'authorization_code',
      },
      timeout: 5000,
    })
    // 微信接口错误（如 code 过期、AppID 无效）
    if (res.data.errcode) {
      throw new AppError(`微信登录失败：${res.data.errmsg}`, 401, 401)
    }
    return { openid: res.data.openid, session_key: res.data.session_key }
  } catch (err) {
    if (err instanceof AppError) throw err
    console.error('[微信] code2Session 调用失败：', err.message)
    throw new AppError('微信服务暂不可用，请稍后再试', 500, 502)
  }
}

// ===== 支付相关 =====

/**
 * 统一下单：获取小程序端 wx.requestPayment 所需参数
 * @param {object} params { openid, orderNo, payAmount, description }
 * @returns {Promise<object>} { mock, timeStamp, nonceStr, package, signType, paySign }
 */
async function createPayment(params) {
  // 开发模式（mock）：返回模拟支付参数，前端提示后直接模拟回调
  if (isMock()) {
    return {
      mock: true,
      timeStamp: String(Math.floor(Date.now() / 1000)),
      nonceStr: Math.random().toString(36).slice(2, 18),
      package: 'prepay_id=mock_' + params.orderNo,
      signType: 'MD5',
      paySign: 'mock_sign_' + Math.random().toString(36).slice(2, 12),
    }
  }

  // ===== 真实微信支付（需商户号 mchid + API 密钥，配置后启用）=====
  // 1. 组装统一下单请求（appid/mch_id/out_trade_no/total_fee/notify_url/openid/sign）
  // 2. POST https://api.mch.weixin.qq.com/pay/unifiedorder
  // 3. 用 prepay_id 二次签名生成 wx.requestPayment 参数
  // 参考 https://pay.weixin.qq.com/wiki/doc/api/wxa/wxa_api.php?chapter=7_4
  throw new AppError('微信支付尚未配置商户号', 500, 500)
}

/**
 * 支付回调验签（真实微信支付）
 * @returns {boolean} 签名是否合法
 */
function verifyNotifySign(rawBody, headers) {
  // 真实模式：按微信支付 API 规范从 rawBody 提取参数，用商户 API 密钥做 HMAC-SHA256/MD5 签名比对
  // mock 模式：跳过验签（开发调试用）
  return isMock()
}

module.exports = { code2Session, isMock, createPayment, verifyNotifySign }
