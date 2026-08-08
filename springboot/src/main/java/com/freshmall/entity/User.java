package com.freshmall.entity;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * 用户表（对应 Node 版 models/user.js，返回字段名保持一致）
 */
@Data
@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    /** 微信 openid，唯一标识 */
    @Column(nullable = false, unique = true, length = 64)
    private String openid;

    @Column(length = 50)
    private String nickname = "";

    /** 注意：字段名下划线命名，保证 JSON 输出与 Node 版一致（avatar_url） */
    @Column(length = 255)
    private String avatar_url = "";

    @Column(length = 20)
    private String phone = "";

    @Column(name = "created_at", updatable = false)
    @CreationTimestamp
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
