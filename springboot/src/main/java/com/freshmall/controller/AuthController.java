package com.freshmall.controller;

import com.freshmall.common.Result;
import com.freshmall.common.UserContext;
import com.freshmall.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * 鉴权接口（对应 Node 版 routes/auth.js）
 * POST /api/auth/login     微信登录
 * GET  /api/auth/profile   获取当前用户信息
 * PUT  /api/auth/profile   更新昵称/头像/手机号
 */
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    public Result<Map<String, Object>> login(@RequestBody Map<String, String> body) {
        return Result.success(authService.login(body.get("code")), "登录成功");
    }

    @GetMapping("/profile")
    public Result<Map<String, Object>> getProfile() {
        return Result.success(authService.getProfile(UserContext.getUserId()));
    }

    @PutMapping("/profile")
    public Result<Map<String, Object>> updateProfile(@RequestBody Map<String, Object> body) {
        Map<String, Object> data = authService.updateProfile(
                UserContext.getUserId(),
                (String) body.get("nickname"),
                (String) body.get("avatar_url"),
                (String) body.get("phone"));
        return Result.success(data, "更新成功");
    }
}
