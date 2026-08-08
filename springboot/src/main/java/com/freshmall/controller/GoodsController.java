package com.freshmall.controller;

import com.freshmall.common.AppException;
import com.freshmall.common.Result;
import com.freshmall.service.GoodsService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 商品接口（对应 Node 版 routes/goods.js）
 * GET /api/goods        分页列表（category_id/keyword/page/page_size）
 * GET /api/goods/hot    热销
 * GET /api/goods/new    新品
 * GET /api/goods/:id    详情
 */
@RestController
@RequestMapping("/api/goods")
@RequiredArgsConstructor
public class GoodsController {

    private final GoodsService goodsService;

    @GetMapping
    public Result<Map<String, Object>> list(
            @RequestParam(defaultValue = "0") int category_id,
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int page_size) {
        if (page < 1) throw new AppException("page 必须大于等于 1", 400, 400);
        if (page_size < 1 || page_size > 50) throw new AppException("page_size 范围为 1-50", 400, 400);
        return Result.success(goodsService.listGoods(category_id, keyword, page, page_size));
    }

    @GetMapping("/hot")
    public Result<List<Map<String, Object>>> hot() {
        return Result.success(goodsService.listHot(10));
    }

    @GetMapping("/new")
    public Result<List<Map<String, Object>>> newGoods() {
        return Result.success(goodsService.listNew(10));
    }

    @GetMapping("/{id}")
    public Result<Map<String, Object>> detail(@PathVariable Integer id) {
        return Result.success(goodsService.getGoodsDetail(id));
    }
}
