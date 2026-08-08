package com.freshmall.util;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.freshmall.common.AppException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * 微信工具（对应 Node 版 utils/wechat.js）
 * - 开发模式（appid 未配置）：mock 登录/支付，无需真实 AppID
 * - 生产模式：真实 code2Session / 统一下单（预留）
 */
@Component
public class WechatUtil {

    private final String appid;
    private final String appsecret;
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .build();
    private final ObjectMapper objectMapper = new ObjectMapper();

    public WechatUtil(@Value("${app.wechat.appid:}") String appid,
                      @Value("${app.wechat.appsecret:}") String appsecret) {
        this.appid = appid;
        this.appsecret = appsecret;
    }

    /** 是否 mock 模式（AppID 未配置） */
    public boolean isMock() {
        return appid == null || appid.isBlank();
    }

    /**
     * code 换 openid
     * mock 模式：固定 openid（wx.login 的 code 每次变化，若用 code 生成 openid 会导致
     * 每次登录都是新用户，地址/购物车/订单数据不连续——因此统一映射为同一个测试用户）
     */
    public Map<String, String> code2Session(String code) {
        if (code == null || code.isBlank()) {
            throw new AppException("缺少登录凭证 code", 400, 400);
        }
        if (isMock()) {
            String openid = "mock_openid_dev";
            System.out.println("[微信] mock 模式登录，openid = " + openid);
            Map<String, String> result = new HashMap<>();
            result.put("openid", openid);
            result.put("session_key", "mock_session_key");
            return result;
        }
        // 真实模式：调用微信 jscode2session
        try {
            String url = "https://api.weixin.qq.com/sns/jscode2session"
                    + "?appid=" + appid
                    + "&secret=" + appsecret
                    + "&js_code=" + code
                    + "&grant_type=authorization_code";
            HttpResponse<String> res = httpClient.send(
                    HttpRequest.newBuilder(URI.create(url)).GET().build(),
                    HttpResponse.BodyHandlers.ofString());
            JsonNode json = objectMapper.readTree(res.body());
            if (json.has("errcode") && json.get("errcode").asInt() != 0) {
                throw new AppException("微信登录失败：" + json.get("errmsg").asText(), 401, 401);
            }
            Map<String, String> result = new HashMap<>();
            result.put("openid", json.get("openid").asText());
            result.put("session_key", json.has("session_key") ? json.get("session_key").asText() : "");
            return result;
        } catch (AppException e) {
            throw e;
        } catch (Exception e) {
            throw new AppException("微信服务暂不可用，请稍后再试", 500, 502);
        }
    }

    /**
     * 统一下单：返回 wx.requestPayment 参数
     * mock 模式返回模拟参数；真实模式需商户号（预留）
     */
    public Map<String, Object> createPayment(String orderNo, String description) {
        if (isMock()) {
            Map<String, Object> result = new HashMap<>();
            result.put("mock", true);
            result.put("timeStamp", String.valueOf(System.currentTimeMillis() / 1000));
            result.put("nonceStr", UUID.randomUUID().toString().replace("-", "").substring(0, 16));
            result.put("package", "prepay_id=mock_" + orderNo);
            result.put("signType", "MD5");
            result.put("paySign", "mock_sign_" + UUID.randomUUID().toString().replace("-", "").substring(0, 10));
            return result;
        }
        // ===== 真实微信支付（需商户号，接入时实现）=====
        throw new AppException("微信支付尚未配置商户号", 500, 500);
    }

    /** 支付回调验签（mock 跳过；真实模式需商户 API 密钥验签，预留） */
    public boolean verifyNotifySign() {
        return isMock();
    }

    private String md5(String input) {
        try {
            MessageDigest md = MessageDigest.getInstance("MD5");
            byte[] digest = md.digest(input.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : digest) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
