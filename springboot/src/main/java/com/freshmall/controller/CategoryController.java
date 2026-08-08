package com.freshmall.controller;

import com.freshmall.common.Result;
import com.freshmall.entity.Category;
import com.freshmall.repository.CategoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 分类接口（对应 Node 版 routes/category.js）
 * GET /api/categories 全部分类（sort_order 排序）
 */
@RestController
@RequestMapping("/api/categories")
@RequiredArgsConstructor
public class CategoryController {

    private final CategoryRepository categoryRepository;

    @GetMapping
    public Result<List<Category>> list() {
        return Result.success(categoryRepository.findAllOrdered());
    }
}
