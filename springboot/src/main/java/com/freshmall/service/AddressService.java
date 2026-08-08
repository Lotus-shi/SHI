package com.freshmall.service;

import com.freshmall.common.AppException;
import com.freshmall.entity.Address;
import com.freshmall.repository.AddressRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.regex.Pattern;

/**
 * 地址服务（对应 Node 版 routes/address.js）
 * 归属校验：只能操作自己的地址；默认地址唯一（事务）
 */
@Service
@RequiredArgsConstructor
public class AddressService {

    private final AddressRepository addressRepository;

    private static final Pattern PHONE_PATTERN = Pattern.compile("^\\+?\\d{6,15}$");

    public List<Address> list(Integer userId) {
        return addressRepository.listByUserId(userId);
    }

    @Transactional
    public Address create(Integer userId, String receiver, String phone, String province, String city,
                          String district, String detail, Boolean isDefault) {
        validate(receiver, phone, detail);

        long count = addressRepository.countByUserId(userId);
        // 第一条自动默认；传 is_default=true 也设为默认（同时清除其他默认）
        boolean wantDefault = Boolean.TRUE.equals(isDefault) || count == 0;
        if (wantDefault && count > 0) {
            addressRepository.clearDefault(userId);
        }

        Address address = new Address();
        address.setUser_id(userId);
        address.setReceiver(receiver);
        address.setPhone(phone);
        address.setProvince(province == null ? "" : province);
        address.setCity(city == null ? "" : city);
        address.setDistrict(district == null ? "" : district);
        address.setDetail(detail);
        address.setIs_default(wantDefault);
        return addressRepository.save(address);
    }

    @Transactional
    public Address update(Integer userId, Integer id, String receiver, String phone, String province,
                          String city, String district, String detail, Boolean isDefault) {
        Address address = findOwned(userId, id);

        if (receiver != null) {
            if (receiver.isBlank()) throw new AppException("请填写收货人姓名", 400, 400);
            address.setReceiver(receiver);
        }
        if (phone != null) {
            if (!PHONE_PATTERN.matcher(phone).matches()) throw new AppException("手机号格式不正确", 400, 400);
            address.setPhone(phone);
        }
        if (province != null) address.setProvince(province);
        if (city != null) address.setCity(city);
        if (district != null) address.setDistrict(district);
        if (detail != null) {
            if (detail.isBlank()) throw new AppException("请填写详细地址", 400, 400);
            address.setDetail(detail);
        }

        // 设置为默认时清除其他默认（同一事务）
        if (Boolean.TRUE.equals(isDefault)) {
            addressRepository.clearDefaultExcept(userId, id);
            address.setIs_default(true);
        }
        return addressRepository.save(address);
    }

    @Transactional
    public void delete(Integer userId, Integer id) {
        Address address = findOwned(userId, id);
        addressRepository.delete(address);
    }

    private Address findOwned(Integer userId, Integer id) {
        return addressRepository.findById(id)
                .filter(a -> a.getUser_id().equals(userId)) // 归属校验
                .orElseThrow(() -> new AppException("地址不存在", 404, 404));
    }

    private void validate(String receiver, String phone, String detail) {
        if (receiver == null || receiver.isBlank()) throw new AppException("请填写收货人姓名", 400, 400);
        if (phone == null || phone.isBlank()) throw new AppException("请填写收货人电话", 400, 400);
        if (detail == null || detail.isBlank()) throw new AppException("请填写详细地址", 400, 400);
        if (!PHONE_PATTERN.matcher(phone).matches()) throw new AppException("手机号格式不正确", 400, 400);
    }
}
