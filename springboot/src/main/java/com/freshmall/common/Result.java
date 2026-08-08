package com.freshmall.common;

import lombok.Data;

/**
 * 统一响应格式（与 Node 版完全一致）
 * 成功：{ code: 0, message, data }
 * 失败：{ code, message }
 */
@Data
public class Result<T> {

    private int code;
    private String message;
    private T data;

    public static <T> Result<T> success(T data) {
        return build(0, "success", data);
    }

    public static <T> Result<T> success(T data, String message) {
        return build(0, message, data);
    }

    public static <T> Result<T> fail(int code, String message) {
        return build(code, message, null);
    }

    private static <T> Result<T> build(int code, String message, T data) {
        Result<T> r = new Result<>();
        r.code = code;
        r.message = message;
        r.data = data;
        return r;
    }
}
