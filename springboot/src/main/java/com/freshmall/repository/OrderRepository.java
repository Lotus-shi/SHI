package com.freshmall.repository;

import com.freshmall.entity.Order;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * 实体字段为下划线命名（与 Node 版 JSON 一致），派生查询一律使用 @Query
 */
public interface OrderRepository extends JpaRepository<Order, Integer> {

    @Query(value = "SELECT o FROM Order o WHERE o.user_id = :userId ORDER BY o.createdAt DESC",
            countQuery = "SELECT COUNT(o) FROM Order o WHERE o.user_id = :userId")
    Page<Order> listByUserId(@Param("userId") Integer userId, Pageable pageable);

    @Query(value = "SELECT o FROM Order o WHERE o.user_id = :userId AND o.status = :status ORDER BY o.createdAt DESC",
            countQuery = "SELECT COUNT(o) FROM Order o WHERE o.user_id = :userId AND o.status = :status")
    Page<Order> listByUserIdAndStatus(@Param("userId") Integer userId, @Param("status") Integer status, Pageable pageable);

    @Query("SELECT o FROM Order o WHERE o.order_no = :orderNo")
    Optional<Order> findByOrderNo(@Param("orderNo") String orderNo);

    /** 锁行查订单（事务内防并发） */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT o FROM Order o WHERE o.id = :id")
    Optional<Order> findByIdWithLock(@Param("id") Integer id);

    /** 超时未支付订单（定时任务扫描） */
    List<Order> findByStatusAndCreatedAtBefore(Integer status, LocalDateTime time);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT o FROM Order o WHERE o.order_no = :orderNo")
    Optional<Order> findByOrderNoWithLock(@Param("orderNo") String orderNo);
}
