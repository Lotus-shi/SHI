package com.freshmall.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.freshmall.common.AppException;
import com.freshmall.entity.Delivery;
import com.freshmall.entity.Order;
import com.freshmall.repository.DeliveryRepository;
import com.freshmall.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

/**
 * 配送服务（对应 Node 版 controllers/deliveryController.js）
 * 配送状态：0 待分配 | 1 已分配 | 2 取货中 | 3 配送中 | 4 已送达
 * 订单联动：配送中(3) → 订单=2；已送达(4) → 订单=3
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DeliveryService {

    private final DeliveryRepository deliveryRepository;
    private final OrderRepository orderRepository;
    private final ObjectMapper objectMapper; // Spring 注入（已注册 JSR310 时间模块）

    private static final Map<Integer, String> STATUS_TEXT = Map.of(
            0, "订单已支付，等待配送",
            1, "配送员已接单",
            2, "配送员正在取货",
            3, "商品配送中",
            4, "商品已送达");

    /**
     * 查询订单配送信息（归属校验）
     * 返回 { order_id, order_no, order_status, delivery }
     */
    public Map<String, Object> getLogistics(Integer userId, Integer orderId) {
        Order order = orderRepository.findById(orderId)
                .filter(o -> o.getUser_id().equals(userId)) // 归属校验
                .orElseThrow(() -> new AppException("订单不存在", 404, 404));
        Delivery delivery = deliveryRepository.findByOrderId(orderId)
                .orElseThrow(() -> new AppException("该订单暂无配送信息", 404, 404));

        Map<String, Object> deliveryMap = objectMapper.convertValue(delivery, Map.class);
        // 解析时间线 JSON
        try {
            List<Map<String, Object>> timeline = objectMapper.readValue(
                    delivery.getTimeline() == null ? "[]" : delivery.getTimeline(),
                    new TypeReference<List<Map<String, Object>>>() {});
            deliveryMap.put("timeline", timeline);
        } catch (Exception e) {
            deliveryMap.put("timeline", List.of());
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("order_id", order.getId());
        result.put("order_no", order.getOrder_no());
        result.put("order_status", order.getStatus());
        result.put("delivery", deliveryMap);
        return result;
    }

    /**
     * 更新配送状态（配送端调用；状态只能向后流转）
     */
    @Transactional
    public Map<String, Object> updateStatus(Integer deliveryId, Integer newStatus,
                                            String courierName, String courierPhone, LocalDateTime estimatedTime) {
        if (newStatus == null || newStatus < 1 || newStatus > 4) {
            throw new AppException("配送状态不合法（1-4）", 400, 400);
        }

        Delivery delivery = deliveryRepository.findByIdWithLock(deliveryId)
                .orElseThrow(() -> new AppException("配送记录不存在", 404, 404));

        // 状态只能向后流转
        if (newStatus <= delivery.getStatus()) {
            throw new AppException("配送状态不可回退", 400, 400);
        }

        // 关联订单：已支付（1 待发货）或配送中（2）才允许更新
        Order order = orderRepository.findByIdWithLock(delivery.getOrder_id())
                .orElseThrow(() -> new AppException("订单不存在", 404, 404));
        if (order.getStatus() != 1 && order.getStatus() != 2) {
            throw new AppException("订单状态不允许更新配送信息", 400, 400);
        }

        // 配送员信息（分配时传入）
        if (courierName != null) delivery.setCourier_name(courierName);
        if (courierPhone != null) delivery.setCourier_phone(courierPhone);
        if (estimatedTime != null) delivery.setEstimated_time(estimatedTime);

        // 追加时间轴
        List<Map<String, Object>> timeline = parseTimeline(delivery.getTimeline());
        Map<String, Object> node = new LinkedHashMap<>();
        node.put("status", newStatus);
        node.put("text", STATUS_TEXT.get(newStatus));
        node.put("time", LocalDateTime.now());
        timeline.add(node);
        delivery.setTimeline(toJson(timeline));
        delivery.setStatus(newStatus);

        // 订单状态联动
        if (newStatus == 3) {
            order.setStatus(2); // 配送中
        } else if (newStatus == 4) {
            order.setStatus(3); // 已完成
            delivery.setDelivered_at(LocalDateTime.now());
        }

        deliveryRepository.save(delivery);
        orderRepository.save(order);

        Map<String, Object> result = objectMapper.convertValue(delivery, Map.class);
        result.put("timeline", timeline);
        log.info("[配送] 订单 {} 状态更新为 {}", order.getId(), newStatus);
        return result;
    }

    private List<Map<String, Object>> parseTimeline(String json) {
        try {
            return objectMapper.readValue(json == null ? "[]" : json, new TypeReference<List<Map<String, Object>>>() {});
        } catch (Exception e) {
            return new ArrayList<>();
        }
    }

    private String toJson(Object o) {
        try {
            return objectMapper.writeValueAsString(o);
        } catch (Exception e) {
            return "[]";
        }
    }
}
