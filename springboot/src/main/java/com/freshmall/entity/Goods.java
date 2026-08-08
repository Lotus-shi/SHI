package com.freshmall.entity;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 商品表
 */
@Data
@Entity
@Table(name = "goods")
public class Goods {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "category_id", nullable = false)
    private Integer category_id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(length = 255)
    private String image = "";

    /** 轮播图 JSON 数组 */
    @Column(columnDefinition = "TEXT")
    private String images;

    /** 图文详情富文本 */
    @Column(columnDefinition = "TEXT")
    private String detail;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal price;

    @Column(name = "original_price", precision = 10, scale = 2)
    private BigDecimal original_price;

    @Column(length = 20)
    private String unit = "份";

    private Integer stock = 0;

    private Integer sales = 0;

    @Column(name = "is_hot")
    private Boolean is_hot = false;

    @Column(name = "is_new")
    private Boolean is_new = false;

    /** 上架状态 */
    private Boolean status = true;

    @Column(name = "created_at", updatable = false)
    @CreationTimestamp
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
