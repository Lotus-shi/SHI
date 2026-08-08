package com.freshmall.entity;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * 收货地址表
 */
@Data
@Entity
@Table(name = "addresses")
public class Address {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "user_id", nullable = false)
    private Integer user_id;

    @Column(nullable = false, length = 50)
    private String receiver;

    @Column(nullable = false, length = 20)
    private String phone;

    @Column(length = 30)
    private String province = "";

    @Column(length = 30)
    private String city = "";

    @Column(length = 30)
    private String district = "";

    @Column(nullable = false, length = 200)
    private String detail;

    @Column(name = "is_default")
    private Boolean is_default = false;

    @Column(name = "created_at", updatable = false)
    @CreationTimestamp
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
