package com.freshmall.controller;

import com.freshmall.common.Result;
import com.freshmall.common.UserContext;
import com.freshmall.entity.Address;
import com.freshmall.service.AddressService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 收货地址接口（对应 Node 版 routes/address.js，需登录）
 * GET    /api/addresses        列表
 * POST   /api/addresses        新增
 * PUT    /api/addresses/:id    修改（is_default=true 时设为默认）
 * DELETE /api/addresses/:id    删除
 */
@RestController
@RequestMapping("/api/addresses")
@RequiredArgsConstructor
public class AddressController {

    private final AddressService addressService;

    @GetMapping
    public Result<List<Address>> list() {
        return Result.success(addressService.list(UserContext.getUserId()));
    }

    @PostMapping
    public Result<Address> create(@RequestBody Map<String, Object> body) {
        Address address = addressService.create(
                UserContext.getUserId(),
                str(body.get("receiver")),
                str(body.get("phone")),
                str(body.get("province")),
                str(body.get("city")),
                str(body.get("district")),
                str(body.get("detail")),
                bool(body.get("is_default")));
        return Result.success(address, "新增成功");
    }

    @PutMapping("/{id}")
    public Result<Address> update(@PathVariable Integer id, @RequestBody Map<String, Object> body) {
        Address address = addressService.update(
                UserContext.getUserId(),
                id,
                str(body.get("receiver")),
                str(body.get("phone")),
                str(body.get("province")),
                str(body.get("city")),
                str(body.get("district")),
                str(body.get("detail")),
                bool(body.get("is_default")));
        return Result.success(address, "修改成功");
    }

    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable Integer id) {
        addressService.delete(UserContext.getUserId(), id);
        return Result.success(null, "已删除");
    }

    private String str(Object o) {
        return o == null ? null : String.valueOf(o);
    }

    private Boolean bool(Object o) {
        if (o == null) return null;
        if (o instanceof Boolean b) return b;
        return Integer.parseInt(String.valueOf(o)) == 1;
    }
}
