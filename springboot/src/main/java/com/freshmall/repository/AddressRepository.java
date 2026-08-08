package com.freshmall.repository;

import com.freshmall.entity.Address;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

/**
 * 注意：实体字段为下划线命名（与 Node 版 JSON 一致），
 * 派生查询方法名下划线会被当作嵌套属性分隔符，故一律使用 @Query 手写 JPQL
 */
public interface AddressRepository extends JpaRepository<Address, Integer> {

    @Query("SELECT a FROM Address a WHERE a.user_id = :userId ORDER BY a.is_default DESC, a.createdAt DESC")
    List<Address> listByUserId(@Param("userId") Integer userId);

    @Query("SELECT COUNT(a) FROM Address a WHERE a.user_id = :userId")
    long countByUserId(@Param("userId") Integer userId);

    /** 清除用户所有默认标记（事务内调用，用于设置新默认前） */
    @Modifying
    @Query("UPDATE Address a SET a.is_default = false WHERE a.user_id = :userId")
    void clearDefault(@Param("userId") Integer userId);

    /** 清除用户除指定地址外的默认标记 */
    @Modifying
    @Query("UPDATE Address a SET a.is_default = false WHERE a.user_id = :userId AND a.id <> :exceptId")
    void clearDefaultExcept(@Param("userId") Integer userId, @Param("exceptId") Integer exceptId);
}
