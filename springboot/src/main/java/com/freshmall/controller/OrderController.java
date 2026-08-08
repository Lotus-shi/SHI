package com.freshmall.controller;

import com.freshmall.common.AppException;
import com.freshmall.common.Result;
import com.freshmall.common.UserContext;
import com.freshmall.entity.Order;
import com.freshmall.service.OrderService;
import com.freshmall.util.WechatUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 订单接口（对应 Node 版 routes/order.js，需登录）
 * POST   /api/orders            创建订单
 * GET    /api/orders            列表（status/page/page_size）
 * GET    /api/orders/:id        详情
 * PUT    /api/orders/:id/cancel 取消
 * POST   /api/orders/:id/pay    发起支付
 */
@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;
    private final WechatUtil wechatUtil;

    @PostMapping
    public Result<Order> create(@RequestBody Map<String, Object> body) {
        Object addressIdObj = body.get("address_id");
        Integer addressId = addressIdObj == null ? null : Integer.parseInt(String.valueOf(addressIdObj));
        if (addressId == null) throw new AppException("请选择收货地址", 400, 400);

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> items = (List<Map<String, Object>>) body.get("items");
        String remark = (String) body.get("remark");

        Order order = orderService.createOrder(UserContext.getUserId(), items, addressId, remark);
        return Result.success(order, "下单成功");
    }

    @GetMapping
    public Result<Map<String, Object>> list(
            @RequestParam(required = false) Integer status,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int page_size) {
        return Result.success(orderService.listOrders(UserContext.getUserId(), status, page, page_size));
    }

    @GetMapping("/{id}")
    public Result<Map<String, Object>> detail(@PathVariable Integer id) {
        return Result.success(orderService.getOrderDetail(UserContext.getUserId(), id));
    }

    @PutMapping("/{id}/cancel")
    public Result<Order> cancel(@PathVariable Integer id) {
        Order order = orderService.cancelOrder(UserContext.getUserId(), id);
        return Result.success(order, "订单已取消");
    }

    @PostMapping("/{id}/pay")
    public Result<Map<String, Object>> pay(@PathVariable Integer id) {
        Map<String, Object> order = orderService.getOrderDetail(UserContext.getUserId(), id);
        int status = (Integer) order.get("status");
        if (status != 0) {
            throw new AppException(status == 1 ? "订单已支付" : "当前状态不可支付", 400, 400);
        }

        Map<String, Object> payment = wechatUtil.createPayment(
                String.valueOf(order.get("order_no")),
                "生鲜订单-" + order.get("order_no"));

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("order_id", order.get("id"));
        data.put("order_no", order.get("order_no"));
        data.put("pay_amount", order.get("pay_amount"));
        data.put("payment", payment);
        return Result.success(data);
    }
}
