package com.freshmall.task;

import com.freshmall.service.OrderService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * 超时未支付订单自动取消（对应 Node 版 node-schedule 定时任务）
 * 每分钟扫描一次：超过 30 分钟未支付自动取消并释放库存
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class OrderTimeoutTask {

    private final OrderService orderService;

    @Value("${app.order.pay-timeout-minutes:30}")
    private int payTimeoutMinutes;

    @Scheduled(fixedDelay = 60_000) // 上次执行完成后 1 分钟
    public void closeExpiredOrders() {
        try {
            orderService.closeExpiredOrders(payTimeoutMinutes);
        } catch (Exception e) {
            log.error("[超时关闭] 扫描失败：", e);
        }
    }
}
