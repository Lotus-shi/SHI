package com.freshmall.common;

/**
 * 当前登录用户上下文（由 AuthInterceptor 在请求进入时设置）
 * 业务代码通过 UserContext.getUserId() 获取当前用户
 */
public class UserContext {

    private static final ThreadLocal<Integer> USER_ID = new ThreadLocal<>();
    private static final ThreadLocal<String> OPENID = new ThreadLocal<>();

    public static void set(Integer userId, String openid) {
        USER_ID.set(userId);
        OPENID.set(openid);
    }

    public static Integer getUserId() {
        return USER_ID.get();
    }

    public static String getOpenid() {
        return OPENID.get();
    }

    public static void clear() {
        USER_ID.remove();
        OPENID.remove();
    }
}
