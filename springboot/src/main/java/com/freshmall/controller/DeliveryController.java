package com.freshmall.controller;

import com.freshmall.common.Result;
import com.freshmall.common.UserContext;
import com.freshmall.service.DeliveryService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Map;

/**
 * 配送接口（对应 Node 版 routes/delivery.js，需登录）
 * GET /api/orders/:id/logistics      查询订单配送信息
 * PUT /api/deliveries/:id/status     更新配送状态（配送端调用）
 */
@RestController
@RequiredArgsConstructor
public class DeliveryController {

    private final DeliveryService deliveryService;

    @GetMapping("/api/orders/{id}/logistics")
    public Result<Map<String, Object>> logistics(@PathVariable Integer id) {
        return Result.success(deliveryService.getLogistics(UserContext.getUserId(), id));
    }

    @PutMapping("/api/deliveries/{id}/status")
    public Result<Map<String, Object>> updateStatus(@PathVariable Integer id, @RequestBody Map<String, Object> body) {
        Map<String, Object> result = deliveryService.updateStatus(
                id,
                body.get("status") == null ? null : Integer.parseInt(String.valueOf(body.get("status"))),
                (String) body.get("courier_name"),
                (String) body.get("courier_phone"),
                body.get("estimated_time") == null ? null : LocalDateTime.parse((String) body.get("estimated_time")));
        return Result.success(result, "配送状态已更新");
    }
}
