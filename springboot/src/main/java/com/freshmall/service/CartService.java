package com.freshmall.service;

import com.freshmall.common.AppException;
import com.freshmall.entity.Goods;
import com.freshmall.repository.GoodsRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.util.*;

/**
 * 购物车服务（对应 Node 版 services/cartService.js）
 * 存储：Redis Hash，key = cart:{userId}，field = goods_id，value = quantity
 */
@Service
@RequiredArgsConstructor
public class CartService {

    private final StringRedisTemplate redisTemplate;
    private final GoodsRepository goodsRepository;

    private String cartKey(Integer userId) {
        return "cart:" + userId;
    }

    private Goods checkGoods(Integer goodsId) {
        Goods goods = goodsRepository.findById(goodsId)
                .filter(Goods::getStatus)
                .orElseThrow(() -> new AppException("商品不存在或已下架", 404, 404));
        return goods;
    }

    /** 添加商品（数量累加） */
    public int addToCart(Integer userId, Integer goodsId, int quantity) {
        Goods goods = checkGoods(goodsId);
        String key = cartKey(userId);
        String field = String.valueOf(goodsId);

        String currentStr = (String) redisTemplate.opsForHash().get(key, field);
        int current = currentStr == null ? 0 : Integer.parseInt(currentStr);
        int total = current + quantity;
        if (total > goods.getStock()) {
            throw new AppException("商品库存不足，当前库存 " + goods.getStock() + goods.getUnit(), 400, 400);
        }
        redisTemplate.opsForHash().increment(key, field, quantity);
        return total;
    }

    /** 修改数量（覆盖） */
    public void updateQuantity(Integer userId, Integer goodsId, int quantity) {
        if (quantity <= 0) {
            throw new AppException("数量必须大于 0", 400, 400);
        }
        Goods goods = checkGoods(goodsId);
        if (quantity > goods.getStock()) {
            throw new AppException("商品库存不足，当前库存 " + goods.getStock() + goods.getUnit(), 400, 400);
        }
        redisTemplate.opsForHash().put(cartKey(userId), String.valueOf(goodsId), String.valueOf(quantity));
    }

    /** 删除商品 */
    public void removeFromCart(Integer userId, Integer goodsId) {
        redisTemplate.opsForHash().delete(cartKey(userId), String.valueOf(goodsId));
    }

    /**
     * 获取购物车（关联商品信息 + 小计）
     * 返回 [{ goods_id, quantity, goods, subtotal }]
     */
    public List<Map<String, Object>> getCart(Integer userId) {
        Map<Object, Object> raw = redisTemplate.opsForHash().entries(cartKey(userId));
        if (raw.isEmpty()) return List.of();

        List<Integer> ids = new ArrayList<>();
        Map<Integer, Integer> quantityMap = new HashMap<>();
        raw.forEach((field, value) -> {
            Integer goodsId = Integer.parseInt((String) field);
            ids.add(goodsId);
            quantityMap.put(goodsId, Integer.parseInt((String) value));
        });

        // 批量查商品
        List<Goods> goodsList = goodsRepository.findAllById(ids);
        Map<Integer, Goods> goodsMap = new HashMap<>();
        goodsList.forEach(g -> goodsMap.put(g.getId(), g));

        List<Map<String, Object>> result = new ArrayList<>();
        ids.stream().distinct().forEach(goodsId -> {
            Goods goods = goodsMap.get(goodsId);
            if (goods == null) return; // 过滤已删除/下架商品
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("goods_id", goodsId);
            item.put("quantity", quantityMap.get(goodsId));
            item.put("goods", toGoodsMap(goods));
            item.put("subtotal", goods.getPrice().multiply(java.math.BigDecimal.valueOf(quantityMap.get(goodsId))));
            result.add(item);
        });
        return result;
    }

    /** 下单后清除指定商品 */
    public void clearCartItems(Integer userId, List<Integer> goodsIds) {
        if (goodsIds == null || goodsIds.isEmpty()) return;
        redisTemplate.opsForHash().delete(cartKey(userId), goodsIds.stream().map(String::valueOf).toArray());
    }

    /** 商品列表视图（与 Node 版一致，不含大字段） */
    private Map<String, Object> toGoodsMap(Goods g) {
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
        return m;
    }
}
