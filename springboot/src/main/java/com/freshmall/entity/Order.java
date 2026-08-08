package com.freshmall.entity;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 订单表
 * 状态：0 待支付 | 1 已支付（待发货） | 2 配送中 | 3 已完成 | 4 已取消
 */
@Data
@Entity
@Table(name = "orders")
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "order_no", nullable = false, unique = true, length = 32)
    private String order_no;

    @Column(name = "user_id", nullable = false)
    private Integer user_id;

    @Column(name = "address_id", nullable = false)
    private Integer address_id;

    /** 以下为地址快照 */
    @Column(nullable = false, length = 50)
    private String receiver;

    @Column(name = "receiver_phone", nullable = false, length = 20)
    private String receiver_phone;

    @Column(name = "receiver_address", nullable = false, length = 255)
    private String receiver_address;

    @Column(name = "total_amount", nullable = false, precision = 10, scale = 2)
    private BigDecimal total_amount;

    @Column(precision = 10, scale = 2)
    private BigDecimal freight = BigDecimal.ZERO;

    @Column(name = "pay_amount", nullable = false, precision = 10, scale = 2)
    private BigDecimal pay_amount;

    /** 0 待支付 1 已支付 2 配送中 3 已完成 4 已取消 */
    private Integer status = 0;

    @Column(length = 255)
    private String remark = "";

    @Column(name = "paid_at")
    private LocalDateTime paid_at;

    @Column(name = "created_at", updatable = false)
    @CreationTimestamp
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
