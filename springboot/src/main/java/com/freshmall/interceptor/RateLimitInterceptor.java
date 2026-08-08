package com.freshmall.interceptor;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 简单内存限流拦截器（对应 Node 版 express-rate-limit）
 * 滑动窗口计数：每 IP 每 windowMs 最多 limit 次，超限返回 429
 * 注意：内存态，多实例部署时建议换 Redis 计数
 */
public class RateLimitInterceptor implements HandlerInterceptor {

    private final int limit;
    private final long windowMs;
    private final Map<String, Deque<Long>> records = new ConcurrentHashMap<>();

    public RateLimitInterceptor(int limit, long windowMs) {
        this.limit = limit;
        this.windowMs = windowMs;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        String ip = getClientIp(request);
        long now = System.currentTimeMillis();

        Deque<Long> deque = records.computeIfAbsent(ip, k -> new ArrayDeque<>());
        synchronized (deque) {
            // 清理窗口外的记录
            while (!deque.isEmpty() && now - deque.peekFirst() > windowMs) {
                deque.pollFirst();
            }
            if (deque.size() >= limit) {
                response.setStatus(429);
                response.setContentType("application/json;charset=UTF-8");
                response.getWriter().write("{\"code\":429,\"message\":\"请求过于频繁，请稍后再试\"}");
                return false;
            }
            deque.addLast(now);
        }
        return true;
    }

    private String getClientIp(HttpServletRequest request) {
        String xff = request.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) {
            return xff.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
