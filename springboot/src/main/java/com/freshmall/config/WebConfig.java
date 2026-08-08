package com.freshmall.config;

import com.freshmall.interceptor.AuthInterceptor;
import com.freshmall.interceptor.RateLimitInterceptor;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Paths;

/**
 * Web 配置：CORS + 静态资源 + 拦截器注册
 * - 商品图片静态托管 /images/**（与 Node 版共用 server/public/images）
 * - 全局限流：120 次/分钟/IP（对应 Node 版 apiLimiter）
 * - 登录接口限流：20 次/10 分钟/IP（对应 loginLimiter）
 * - 鉴权拦截器：公开路径放行（登录、健康检查、支付回调、商品/分类浏览）
 */
@Configuration
@RequiredArgsConstructor
public class WebConfig implements WebMvcConfigurer {

    private final AuthInterceptor authInterceptor;

    @Value("${app.images-dir:../server/public/images}")
    private String imagesDir;

    /** 商品图片静态资源映射 */
    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        String location = Paths.get(imagesDir).toAbsolutePath().normalize().toUri().toString();
        registry.addResourceHandler("/images/**").addResourceLocations(location);
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOriginPatterns("*")
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                .allowedHeaders("*");
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        // 1. 登录接口限流（10 分钟 20 次）
        registry.addInterceptor(new RateLimitInterceptor(20, 10 * 60 * 1000L))
                .addPathPatterns("/api/auth/login");

        // 2. 全局限流（1 分钟 120 次）
        registry.addInterceptor(new RateLimitInterceptor(120, 60 * 1000L))
                .addPathPatterns("/api/**");

        // 3. 鉴权（公开路径放行）
        registry.addInterceptor(authInterceptor)
                .addPathPatterns("/api/**")
                .excludePathPatterns(
                        "/api/auth/login",
                        "/api/health",
                        "/api/goods/**",
                        "/api/categories",
                        "/api/pay/notify"
                );
    }
}
