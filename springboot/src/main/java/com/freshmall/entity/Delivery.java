package com.freshmall.entity;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * 配送信息表（一订单一条）
 * 状态：0 待分配 | 1 已分配 | 2 取货中 | 3 配送中 | 4 已送达
 */
@Data
@Entity
@Table(name = "deliveries")
public class Delivery {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "order_id", nullable = false, unique = true)
    private Integer order_id;

    private Integer status = 0;

    @Column(name = "courier_name", length = 50)
    private String courier_name = "";

    @Column(name = "courier_phone", length = 20)
    private String courier_phone = "";

    @Column(name = "estimated_time")
    private LocalDateTime estimated_time;

    @Column(name = "delivered_at")
    private LocalDateTime delivered_at;

    /** 状态流转时间线 JSON：[{status, text, time}] */
    @Column(columnDefinition = "TEXT")
    private String timeline;

    @Column(name = "created_at", updatable = false)
    @CreationTimestamp
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
