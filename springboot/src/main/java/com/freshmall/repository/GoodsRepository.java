package com.freshmall.repository;

import com.freshmall.entity.Goods;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface GoodsRepository extends JpaRepository<Goods, Integer> {

    /** 分页列表：可选分类 + 名称模糊搜索，按销量排序 */
    @Query("""
            SELECT g FROM Goods g
            WHERE g.status = true
              AND (:categoryId IS NULL OR g.category_id = :categoryId)
              AND (:keyword IS NULL OR g.name LIKE CONCAT('%', :keyword, '%'))
            ORDER BY g.sales DESC
            """)
    Page<Goods> search(@Param("categoryId") Integer categoryId,
                       @Param("keyword") String keyword,
                       Pageable pageable);

    @Query("SELECT g FROM Goods g WHERE g.status = true AND g.is_hot = true ORDER BY g.sales DESC")
    List<Goods> findHotGoods(Pageable pageable);

    @Query("SELECT g FROM Goods g WHERE g.status = true AND g.is_new = true ORDER BY g.createdAt DESC")
    List<Goods> findNewGoods(Pageable pageable);

    /** 下单锁行查商品（悲观锁防超卖） */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT g FROM Goods g WHERE g.id IN :ids AND g.status = true")
    List<Goods> findAllByIdInAndStatusTrueWithLock(@Param("ids") List<Integer> ids);

    /** 释放库存（取消订单时加回） */
    @Modifying
    @Query("UPDATE Goods g SET g.stock = g.stock + :quantity WHERE g.id = :id")
    void increaseStock(@Param("id") Integer id, @Param("quantity") Integer quantity);
}
