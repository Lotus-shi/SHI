package com.freshmall.repository;

import com.freshmall.entity.Category;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface CategoryRepository extends JpaRepository<Category, Integer> {

    @Query("SELECT c FROM Category c ORDER BY c.sort_order ASC, c.id ASC")
    List<Category> findAllOrdered();
}
