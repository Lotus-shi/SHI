package com.freshmall.repository;

import com.freshmall.entity.Delivery;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface DeliveryRepository extends JpaRepository<Delivery, Integer> {

    @Query("SELECT d FROM Delivery d WHERE d.order_id = :orderId")
    Optional<Delivery> findByOrderId(@Param("orderId") Integer orderId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT d FROM Delivery d WHERE d.id = :id")
    Optional<Delivery> findByIdWithLock(@Param("id") Integer id);
}
