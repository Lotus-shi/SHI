package com.freshmall.controller;

import com.freshmall.service.OrderService;
import com.freshmall.util.WechatUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * 支付回调（对应 Node 版 routes/pay.js，微信服务器调用，无需业务鉴权）
 * POST /api/pay/notify
 * - 必须返回微信要求的 XML 格式
 * - 处理必须幂等（微信会重复推送）
 * - mock 模式：前端模拟回调传 JSON { order_no }
 */
@Slf4j
@RestController
@RequestMapping("/api/pay")
@RequiredArgsConstructor
public class PayController {

    private static final String SUCCESS_XML = "<xml><return_code><![CDATA[SUCCESS]]></return_code><return_msg><![CDATA[OK]]></return_msg></xml>";
    private static final String FAIL_XML = "<xml><return_code><![CDATA[FAIL]]></return_code><return_msg><![CDATA[处理失败]]></return_msg></xml>";

    private final OrderService orderService;
    private final WechatUtil wechatUtil;

    @PostMapping(value = "/notify", produces = MediaType.APPLICATION_XML_VALUE)
    public String notify(@RequestBody(required = false) Map<String, Object> body) {
        try {
            // 真实模式验签（mock 跳过）
            if (!wechatUtil.verifyNotifySign()) {
                log.warn("[支付回调] 签名验证失败");
                return FAIL_XML;
            }

            // mock 模式：前端模拟回调传 { order_no }；真实模式为 XML（需解析，接入时实现）
            String orderNo = body == null ? null : String.valueOf(body.get("order_no"));
            if (orderNo == null || orderNo.isBlank() || "null".equals(orderNo)) {
                log.warn("[支付回调] 缺少订单号");
                return FAIL_XML;
            }

            orderService.handlePayNotify(orderNo);
            // 幂等跳过 / 订单不存在同样返回成功，避免微信重复推送
            return SUCCESS_XML;
        } catch (Exception e) {
            log.error("[支付回调] 处理异常：", e);
            return FAIL_XML;
        }
    }
}
