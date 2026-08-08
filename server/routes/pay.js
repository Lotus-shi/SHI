/**
 * 支付回调路由（微信服务器调用，不需要业务鉴权）
 * POST /api/pay/notify 微信支付回调：验签 → 幂等处理 → 更新已支付 → 创建配送
 *
 * 注意：
 * - 必须返回微信要求的格式（XML <xml><return_code><![CDATA[SUCCESS]]></return_code></xml>）
 * - 处理必须幂等：微信会重复推送，已处理订单直接返回成功
 * - 开发模式（mock）：不验签，前端模拟回调直接调用本接口
 */
const express = require('express')
const router = express.Router()
const orderService = require('../services/orderService')
const { verifyNotifySign } = require('../utils/wechat')
const { isMock } = require('../utils/wechat')

router.post('/notify', async (req, res) => {
  const successXml = '<xml><return_code><![CDATA[SUCCESS]]></return_code><return_msg><![CDATA[OK]]></return_msg></xml>'
  const failXml = '<xml><return_code><![CDATA[FAIL]]></return_code><return_msg><![CDATA[处理失败]]></return_msg></xml>'

  try {
    // 真实模式：验签（mock 模式跳过）
    if (!verifyNotifySign(req.rawBody || '', req.headers)) {
      console.log('[支付回调] 签名验证失败')
      return res.status(400).send(failXml)
    }

    // 真实微信回调体为 XML，mock 模拟回调为 JSON
    let orderNo = null
    if (isMock()) {
      orderNo = req.body && req.body.order_no
    } else {
      // 真实模式：解析 XML 提取 out_trade_no（示例保留，接入真实支付时实现）
      const raw = req.rawBody ? req.rawBody.toString() : ''
      const match = raw.match(/<out_trade_no><!\[CDATA\[(.*?)\]\]><\/out_trade_no>/)
      orderNo = match ? match[1] : null
    }

    if (!orderNo) {
      console.log('[支付回调] 缺少订单号')
      return res.status(400).send(failXml)
    }

    const result = await orderService.handlePayNotify(orderNo)
    if (result.handled) {
      return res.send(successXml)
    }
    // 幂等跳过 / 订单不存在：同样返回成功，避免微信重复推送
    return res.send(successXml)
  } catch (err) {
    console.error('[支付回调] 处理异常：', err.message)
    res.status(500).send(failXml)
  }
})

module.exports = router
