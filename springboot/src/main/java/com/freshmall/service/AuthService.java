package com.freshmall.service;

import com.freshmall.common.AppException;
import com.freshmall.entity.User;
import com.freshmall.repository.UserRepository;
import com.freshmall.util.JwtUtil;
import com.freshmall.util.WechatUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;
import java.util.regex.Pattern;

/**
 * 鉴权服务：微信登录、用户信息（对应 Node 版 authController）
 */
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final WechatUtil wechatUtil;
    private final JwtUtil jwtUtil;

    private static final Pattern PHONE_PATTERN = Pattern.compile("^\\+?\\d{6,15}$");

    /**
     * 微信登录：code → openid → 查询/创建用户 → 签发 JWT
     */
    public Map<String, Object> login(String code) {
        String openid = wechatUtil.code2Session(code).get("openid");

        User user = userRepository.findByOpenid(openid).orElseGet(() -> {
            User newUser = new User();
            newUser.setOpenid(openid);
            newUser.setNickname("用户" + openid.substring(openid.length() - 6));
            return userRepository.save(newUser);
        });

        String token = jwtUtil.sign(user.getId(), user.getOpenid());

        Map<String, Object> result = new HashMap<>();
        result.put("token", token);
        result.put("userInfo", buildUserInfo(user));
        return result;
    }

    public Map<String, Object> getProfile(Integer userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AppException("用户不存在", 404, 404));
        return buildUserInfo(user);
    }

    public Map<String, Object> updateProfile(Integer userId, String nickname, String avatarUrl, String phone) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AppException("用户不存在", 404, 404));

        if (phone != null && !phone.isBlank() && !PHONE_PATTERN.matcher(phone).matches()) {
            throw new AppException("手机号格式不正确", 400, 400);
        }
        if (nickname != null) user.setNickname(nickname);
        if (avatarUrl != null) user.setAvatar_url(avatarUrl);
        if (phone != null) user.setPhone(phone);
        userRepository.save(user);

        return buildUserInfo(user);
    }

    private Map<String, Object> buildUserInfo(User user) {
        Map<String, Object> info = new HashMap<>();
        info.put("id", user.getId());
        info.put("nickname", user.getNickname());
        info.put("avatar_url", user.getAvatar_url());
        info.put("phone", user.getPhone());
        return info;
    }
}
