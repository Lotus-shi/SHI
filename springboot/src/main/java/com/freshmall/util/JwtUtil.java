package com.freshmall.util;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

/**
 * JWT 工具（签发与解析）
 * 载荷：userId、openid，与 Node 版 jwt.sign 结构一致
 */
@Component
public class JwtUtil {

    private final SecretKey key;
    private final long expiresInSeconds;

    public JwtUtil(@Value("${app.jwt.secret}") String secret,
                   @Value("${app.jwt.expires-in-seconds}") long expiresInSeconds) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.expiresInSeconds = expiresInSeconds;
    }

    /** 签发 token */
    public String sign(Integer userId, String openid) {
        Date now = new Date();
        return Jwts.builder()
                .subject(String.valueOf(userId))
                .claim("userId", userId)
                .claim("openid", openid)
                .issuedAt(now)
                .expiration(new Date(now.getTime() + expiresInSeconds * 1000))
                .signWith(key)
                .compact();
    }

    /**
     * 解析 token，失败（过期/篡改/无效）返回 null
     */
    public Claims parse(String token) {
        try {
            return Jwts.parser()
                    .verifyWith(key)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
        } catch (Exception e) {
            return null;
        }
    }
}
