package com.freshmall.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.freshmall.common.AppException;
import com.freshmall.entity.Category;
import com.freshmall.entity.Goods;
import com.freshmall.repository.CategoryRepository;
import com.freshmall.repository.GoodsRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 商品服务（对应 Node 版 services/goodsService.js）
 */
@Service
@RequiredArgsConstructor
public class GoodsService {

    private final GoodsRepository goodsRepository;
    private final CategoryRepository categoryRepository;
    private final ObjectMapper objectMapper; // Spring 注入（已注册 JSR310 时间模块）

    /**
     * 分页商品列表（列表不返回大字段 images/detail）
     * 返回 { list, total, page, pageSize, hasMore }
     */
    public Map<String, Object> listGoods(Integer categoryId, String keyword, int page, int pageSize) {
        String like = (keyword == null || keyword.isBlank()) ? null : keyword.trim();
        Pageable pageable = PageRequest.of(page - 1, pageSize);
        var result = goodsRepository.search(categoryId == 0 ? null : categoryId, like, pageable);

        List<Map<String, Object>> list = result.getContent().stream().map(this::toListMap).toList();
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("list", list);
        data.put("total", result.getTotalElements());
        data.put("page", page);
        data.put("pageSize", pageSize);
        data.put("hasMore", page * pageSize < result.getTotalElements());
        return data;
    }

    /**
     * 商品详情（含轮播图数组与分类名）
     */
    public Map<String, Object> getGoodsDetail(Integer id) {
        Goods goods = goodsRepository.findById(id)
                .orElseThrow(() -> new AppException("商品不存在或已下架", 404, 404));
        if (!goods.getStatus()) {
            throw new AppException("商品已下架", 404, 404);
        }

        Map<String, Object> data = toDetailMap(goods);
        // 解析轮播图 JSON
        try {
            List<String> images = objectMapper.readValue(
                    goods.getImages() == null ? "[]" : goods.getImages(),
                    new TypeReference<List<String>>() {});
            data.put("images", images);
        } catch (Exception e) {
            data.put("images", new ArrayList<>());
        }
        // 关联分类
        Category category = categoryRepository.findById(goods.getCategory_id()).orElse(null);
        if (category != null) {
            Map<String, Object> catMap = new LinkedHashMap<>();
            catMap.put("id", category.getId());
            catMap.put("name", category.getName());
            data.put("category", catMap);
        }
        return data;
    }

    public List<Map<String, Object>> listHot(int limit) {
        return goodsRepository.findHotGoods(PageRequest.of(0, limit))
                .stream().map(this::toListMap).toList();
    }

    public List<Map<String, Object>> listNew(int limit) {
        return goodsRepository.findNewGoods(PageRequest.of(0, limit))
                .stream().map(this::toListMap).toList();
    }

    /** 列表视图（不含大字段） */
    private Map<String, Object> toListMap(Goods g) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", g.getId());
        m.put("category_id", g.getCategory_id());
        m.put("name", g.getName());
        m.put("image", g.getImage());
        m.put("price", g.getPrice());
        m.put("original_price", g.getOriginal_price());
        m.put("unit", g.getUnit());
        m.put("stock", g.getStock());
        m.put("sales", g.getSales());
        m.put("is_hot", g.getIs_hot());
        m.put("is_new", g.getIs_new());
        m.put("status", g.getStatus());
        m.put("createdAt", g.getCreatedAt());
        m.put("updatedAt", g.getUpdatedAt());
        return m;
    }

    /** 详情视图（全字段） */
    private Map<String, Object> toDetailMap(Goods g) {
        Map<String, Object> m = toListMap(g);
        m.put("images", g.getImages());
        m.put("detail", g.getDetail());
        return m;
    }
}
