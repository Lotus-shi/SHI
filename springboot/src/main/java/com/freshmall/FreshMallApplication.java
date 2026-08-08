package com.freshmall;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * 生鲜果蔬商城后端启动类（SpringBoot 版）
 * 接口与 Node 版完全兼容，小程序前端无需任何改动
 */
@SpringBootApplication
@EnableScheduling
public class FreshMallApplication {

    public static void main(String[] args) {
        SpringApplication.run(FreshMallApplication.class, args);
        System.out.println("[服务已启动] http://localhost:3000");
    }
}
