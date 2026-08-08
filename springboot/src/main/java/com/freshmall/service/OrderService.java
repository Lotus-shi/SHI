package com.freshmall.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.freshmall.common.AppException;
import com.freshmall.entity.*;
import com.freshmall.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.*;

/**
 * 订单服务（对应 Node 版 services/orderService.js）
 * 库存策略：下单事务内预占（扣减）库存，支付回调确认，取消/超时释放
 * 订单状态：0 待支付 | 1 已支付 | 2 配送中 | 3 已完成 | 4 已取消
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class OrderService {

    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final GoodsRepository goodsRepository;
    private final AddressRepository addressRepository;
    private final DeliveryRepository deliveryRepository;
    private final CartService cartService;
    private final ObjectMapper objectMapper; // Spring 注入（已注册 JSR310 时间模块）

    @Value("${app.order.freight-free-threshold:50}")
    private int freightFreeThreshold;
    @Value("${app.order.freight-price:5}")
    private int freightPrice;

    private BigDecimal calcFreight(BigDecimal totalAmount) {
        return totalAmount.compareTo(BigDecimal.valueOf(freightFreeThreshold)) >= 0
                ? BigDecimal.ZERO
                : BigDecimal.valueOf(freightPrice);
    }

    private String generateOrderNo() {
        return System.currentTimeMillis() + String.format("%04d", new Random().nextInt(10000));
    }

    /**
     * 创建订单（事务：校验地址/锁行扣库存/计算金额/建单/清购物车）
     */
    @Transactional
    public Order createOrder(Integer userId, List<Map<String, Object>> items, Integer addressId, String remark) {
        if (items == null || items.isEmpty()) {
            throw new AppException("订单商品不能为空", 400, 400);
        }

        // 归一化合并同商品数量
        Map<Integer, Integer> merged = new LinkedHashMap<>();
        for (Map<String, Object> it : items) {
            Integer goodsId = toInt(it.get("goods_id"));
            Integer quantity = toInt(it.get("quantity"));
            if (goodsId == null || quantity == null || quantity < 1) {
                throw new AppException("商品参数不合法", 400, 400);
            }
            merged.merge(goodsId, quantity, Integer::sum);
        }

        // 1. 地址校验（归属）
        Address address = addressRepository.findById(addressId)
                .filter(a -> a.getUser_id().equals(userId))
                .orElseThrow(() -> new AppException("收货地址不存在", 404, 404));

        // 2. 商品锁行 + 扣库存（防并发超卖）
        List<Goods> goodsList = goodsRepository.findAllByIdInAndStatusTrueWithLock(new ArrayList<>(merged.keySet()));
        if (goodsList.size() != merged.size()) {
            throw new AppException("部分商品不存在或已下架", 400, 400);
        }
        Map<Integer, Goods> goodsMap = new HashMap<>();
        goodsList.forEach(g -> goodsMap.put(g.getId(), g));

        BigDecimal totalAmount = BigDecimal.ZERO;
        List<OrderItem> orderItems = new ArrayList<>();
        for (Map.Entry<Integer, Integer> entry : merged.entrySet()) {
            Goods goods = goodsMap.get(entry.getKey());
            int quantity = entry.getValue();
            if (goods.getStock() < quantity) {
                throw new AppException("「" + goods.getName() + "」库存不足，当前仅剩 " + goods.getStock() + goods.getUnit(), 400, 400);
            }
            goods.setStock(goods.getStock() - quantity);
            goods.setSales(goods.getSales() + quantity);
            goodsRepository.save(goods);

            BigDecimal subtotal = goods.getPrice().multiply(BigDecimal.valueOf(quantity));
            totalAmount = totalAmount.add(subtotal);

            OrderItem orderItem = new OrderItem();
            orderItem.setGoods_id(goods.getId());
            orderItem.setGoods_name(goods.getName());
            orderItem.setGoods_image(goods.getImage());
            orderItem.setPrice(goods.getPrice());
            orderItem.setQuantity(quantity);
            orderItem.setSubtotal(subtotal);
            orderItems.add(orderItem);
        }

        // 3. 金额计算
        BigDecimal freight = calcFreight(totalAmount);
        BigDecimal payAmount = totalAmount.add(freight);

        // 4. 创建订单 + 明细
        Order order = new Order();
        order.setOrder_no(generateOrderNo());
        order.setUser_id(userId);
        order.setAddress_id(address.getId());
        order.setReceiver(address.getReceiver());
        order.setReceiver_phone(address.getPhone());
        order.setReceiver_address(address.getProvince() + address.getCity() + address.getDistrict() + address.getDetail());
        order.setTotal_amount(totalAmount.setScale(2, RoundingMode.HALF_UP));
        order.setFreight(freight.setScale(2, RoundingMode.HALF_UP));
        order.setPay_amount(payAmount.setScale(2, RoundingMode.HALF_UP));
        order.setStatus(0);
        order.setRemark(remark == null ? "" : remark);
        Order saved = orderRepository.save(order);

        orderItems.forEach(oi -> oi.setOrder_id(saved.getId()));
        orderItemRepository.saveAll(orderItems);

        // 5. 清空购物车中本次下单的商品
        cartService.clearCartItems(userId, new ArrayList<>(merged.keySet()));

        log.info("[订单] 创建成功 id={} order_no={} 实付={}", saved.getId(), saved.getOrder_no(), saved.getPay_amount());
        return saved;
    }

    /**
     * 订单列表（状态筛选 + 分页，每条含商品明细摘要）
     * 返回 { list, total, page, pageSize, hasMore }
     */
    public Map<String, Object> listOrders(Integer userId, Integer status, int page, int pageSize) {
        Page<Order> result = (status == null)
                ? orderRepository.listByUserId(userId, PageRequest.of(page - 1, pageSize))
                : orderRepository.listByUserIdAndStatus(userId, status, PageRequest.of(page - 1, pageSize));

        List<Order> orders = result.getContent();
        // 批量查明细
        Map<Integer, List<Map<String, Object>>> itemMap = new HashMap<>();
        if (!orders.isEmpty()) {
            List<Integer> orderIds = orders.stream().map(Order::getId).toList();
            orderItemRepository.findByOrderIdIn(orderIds).forEach(oi ->
                    itemMap.computeIfAbsent(oi.getOrder_id(), k -> new ArrayList<>()).add(toListItemMap(oi)));
        }

        List<Map<String, Object>> list = orders.stream().map(o -> {
            Map<String, Object> m = toOrderMap(o);
            m.put("items", itemMap.getOrDefault(o.getId(), List.of()));
            return m;
        }).toList();

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("list", list);
        data.put("total", result.getTotalElements());
        data.put("page", page);
        data.put("pageSize", pageSize);
        data.put("hasMore", page * pageSize < result.getTotalElements());
        return data;
    }

    /**
     * 订单详情（含明细全字段 + 配送信息）
     */
    public Map<String, Object> getOrderDetail(Integer userId, Integer orderId) {
        Order order = orderRepository.findById(orderId)
                .filter(o -> o.getUser_id().equals(userId)) // 归属校验
                .orElseThrow(() -> new AppException("订单不存在", 404, 404));

        Map<String, Object> data = toOrderMap(order);
        data.put("items", orderItemRepository.findByOrderId(orderId).stream().map(oi -> {
            try {
                return objectMapper.convertValue(oi, Map.class);
            } catch (Exception e) {
                return toListItemMap(oi);
            }
        }).toList());
        deliveryRepository.findByOrderId(orderId).ifPresent(d -> data.put("delivery", objectMapper.convertValue(d, Map.class)));
        return data;
    }

    /**
     * 取消订单（仅待支付，释放库存）
     */
    @Transactional
    public Order cancelOrder(Integer userId, Integer orderId) {
        Order order = orderRepository.findByIdWithLock(orderId)
                .orElseThrow(() -> new AppException("订单不存在", 404, 404));
        if (!order.getUser_id().equals(userId)) {
            throw new AppException("订单不存在", 404, 404);
        }
        if (order.getStatus() != 0) {
            throw new AppException(order.getStatus() == 4 ? "订单已取消" : "仅待支付订单可取消", 400, 400);
        }

        // 释放库存
        orderItemRepository.findByOrderId(orderId).forEach(oi ->
                goodsRepository.increaseStock(oi.getGoods_id(), oi.getQuantity()));

        order.setStatus(4);
        orderRepository.save(order);
        log.info("[订单] 取消成功 id={}", order.getId());
        return order;
    }

    /**
     * 支付回调处理（幂等：已支付/已取消不重复处理）
     * 流程：状态 0 → 1（已支付），创建配送记录
     */
    @Transactional
    public boolean handlePayNotify(String orderNo) {
        Order order = orderRepository.findByOrderNoWithLock(orderNo).orElse(null);
        // 订单不存在：返回 success 避免微信无限重试
        if (order == null) {
            log.info("[支付回调] 订单不存在 order_no={}", orderNo);
            return false;
        }
        // 幂等：已支付/已取消不重复处理
        if (order.getStatus() != 0) {
            log.info("[支付回调] 订单已处理（status={}），跳过 order_no={}", order.getStatus(), orderNo);
            return false;
        }

        order.setStatus(1);
        order.setPaid_at(LocalDateTime.now());
        orderRepository.save(order);

        // 创建配送记录（初始：待分配）
        Delivery delivery = new Delivery();
        delivery.setOrder_id(order.getId());
        delivery.setStatus(0);
        delivery.setTimeline("[]");
        deliveryRepository.save(delivery);

        log.info("[支付回调] 订单已支付 id={} order_no={}", order.getId(), orderNo);
        return true;
    }

    /**
     * 超时未支付订单自动取消（定时任务调用）
     */
    public int closeExpiredOrders(int timeoutMinutes) {
        LocalDateTime deadline = LocalDateTime.now().minusMinutes(timeoutMinutes);
        List<Order> expired = orderRepository.findByStatusAndCreatedAtBefore(0, deadline);
        int count = 0;
        for (Order order : expired) {
            try {
                cancelOrder(order.getUser_id(), order.getId());
                log.info("[超时关闭] 订单 id={} 超时未支付已自动取消", order.getId());
                count++;
            } catch (Exception e) {
                log.error("[超时关闭] 订单 id={} 处理失败：{}", order.getId(), e.getMessage());
            }
        }
        if (count > 0) {
            log.info("[超时关闭] 本次处理 {} 笔超时订单", count);
        }
        return count;
    }

    // ===== 组装工具 =====

    /** 订单实体转 Map（字段名与 Node 版一致） */
    @SuppressWarnings("unchecked")
    private Map<String, Object> toOrderMap(Order o) {
        try {
            return objectMapper.convertValue(o, Map.class);
        } catch (Exception e) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", o.getId());
            m.put("order_no", o.getOrder_no());
            m.put("user_id", o.getUser_id());
            m.put("address_id", o.getAddress_id());
            m.put("receiver", o.getReceiver());
            m.put("receiver_phone", o.getReceiver_phone());
            m.put("receiver_address", o.getReceiver_address());
            m.put("total_amount", o.getTotal_amount());
            m.put("freight", o.getFreight());
            m.put("pay_amount", o.getPay_amount());
            m.put("status", o.getStatus());
            m.put("remark", o.getRemark());
            m.put("paid_at", o.getPaid_at());
            m.put("createdAt", o.getCreatedAt());
            m.put("updatedAt", o.getUpdatedAt());
            return m;
        }
    }

    /** 明细摘要（列表用，不含大字段） */
    private Map<String, Object> toListItemMap(OrderItem oi) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("goods_id", oi.getGoods_id());
        m.put("goods_name", oi.getGoods_name());
        m.put("goods_image", oi.getGoods_image());
        m.put("quantity", oi.getQuantity());
        m.put("subtotal", oi.getSubtotal());
        return m;
    }

    private Integer toInt(Object o) {
        if (o == null) return null;
        try {
            return o instanceof Number n ? n.intValue() : Integer.parseInt(String.valueOf(o));
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
