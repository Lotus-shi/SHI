package com.freshmall.common;

import lombok.Getter;

/**
 * 业务异常：业务代码 throw new AppException("库存不足", 400, 400)
 * 由 GlobalExceptionHandler 统一捕获转为统一响应
 */
@Getter
public class AppException extends RuntimeException {

    private final int code;        // 业务错误码
    private final int httpStatus;  // HTTP 状态码

    public AppException(String message, int code, int httpStatus) {
        super(message);
        this.code = code;
        this.httpStatus = httpStatus;
    }

    /** 默认 HTTP 400 */
    public AppException(String message) {
        this(message, 400, 400);
    }
}
