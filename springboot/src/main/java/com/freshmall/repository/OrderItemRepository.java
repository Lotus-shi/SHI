package com.freshmall.repository;

import com.freshmall.entity.OrderItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface OrderItemRepository extends JpaRepository<OrderItem, Integer> {

    @Query("SELECT oi FROM OrderItem oi WHERE oi.order_id = :orderId")
    List<OrderItem> findByOrderId(@Param("orderId") Integer orderId);

    @Query("SELECT oi FROM OrderItem oi WHERE oi.order_id IN :orderIds")
    List<OrderItem> findByOrderIdIn(@Param("orderIds") List<Integer> orderIds);
}
