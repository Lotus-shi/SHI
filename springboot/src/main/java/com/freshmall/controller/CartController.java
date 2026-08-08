package com.freshmall.controller;

import com.freshmall.common.AppException;
import com.freshmall.common.Result;
import com.freshmall.common.UserContext;
import com.freshmall.service.CartService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 购物车接口（对应 Node 版 routes/cart.js，需登录）
 * GET    /api/cart       购物车列表
 * POST   /api/cart       添加 { goods_id, quantity }
 * PUT    /api/cart/:id   修改数量 { quantity }
 * DELETE /api/cart/:id   删除
 */
@RestController
@RequestMapping("/api/cart")
@RequiredArgsConstructor
public class CartController {

    private final CartService cartService;

    @GetMapping
    public Result<List<Map<String, Object>>> list() {
        return Result.success(cartService.getCart(UserContext.getUserId()));
    }

    @PostMapping
    public Result<Map<String, Object>> add(@RequestBody Map<String, Object> body) {
        Integer goodsId = toInt(body.get("goods_id"));
        Integer quantity = toInt(body.get("quantity"));
        if (goodsId == null) throw new AppException("缺少商品 id", 400, 400);
        if (quantity == null || quantity < 1) throw new AppException("数量必须大于 0", 400, 400);

        int current = cartService.addToCart(UserContext.getUserId(), goodsId, quantity);
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("goods_id", goodsId);
        data.put("quantity", current);
        return Result.success(data, "已加入购物车");
    }

    @PutMapping("/{id}")
    public Result<Map<String, Object>> update(@PathVariable Integer id, @RequestBody Map<String, Object> body) {
        Integer quantity = toInt(body.get("quantity"));
        cartService.updateQuantity(UserContext.getUserId(), id, quantity);

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("goods_id", id);
        data.put("quantity", quantity);
        return Result.success(data, "修改成功");
    }

    @DeleteMapping("/{id}")
    public Result<Void> remove(@PathVariable Integer id) {
        cartService.removeFromCart(UserContext.getUserId(), id);
        return Result.success(null, "已删除");
    }

    private Integer toInt(Object o) {
        if (o == null) return null;
        try {
            return o instanceof Number n ? n.intValue() : Integer.parseInt(String.valueOf(o));
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
