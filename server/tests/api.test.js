/**
 * 核心接口自动化测试脚本
 * 用法：先启动服务（npm run dev / node app.js），然后 node tests/api.test.js
 * 覆盖：登录鉴权、商品、购物车、地址、订单、支付回调、配送流转、越权防护、接口限流
 *
 * 注意：末尾的限流测试会打满登录接口配额（20 次/10 分钟/IP），
 * 若 10 分钟内需要重跑测试，请先重启后端服务（限流为内存态，重启即重置）
 */
const http = require('http')

const BASE = 'http://127.0.0.1:3000'
const TEST_CODE = 'auto_test_' + Date.now() // 每次运行使用独立测试用户
const RESULTS = []
let passed = 0
let failed = 0

// ===== 工具 =====
function request(method, path, { body, token } = {}) {
  return new Promise((resolve) => {
    const data = body ? JSON.stringify(body) : null
    const headers = { 'Content-Type': 'application/json' }
    if (token) headers.Authorization = 'Bearer ' + token
    const req = http.request(`${BASE}${path}`, { method, headers }, (res) => {
      let d = ''
      res.on('data', (c) => (d += c))
      res.on('end', () => {
        let json = null
        try { json = JSON.parse(d) } catch (e) { /* 非 JSON（如支付回调 XML） */ }
        resolve({ status: res.statusCode, data: json, raw: d })
      })
    })
    req.on('error', (e) => resolve({ status: 0, data: null, raw: e.message }))
    if (data) req.write(data)
    req.end()
  })
}

// 断言工具
function check(name, condition, detail = '') {
  if (condition) {
    passed++
    console.log(`  ✅ ${name}`)
  } else {
    failed++
    console.log(`  ❌ ${name} ${detail}`)
    RESULTS.push(name)
  }
}

async function run() {
  console.log('======== 生鲜商城接口自动化测试 ========\n')

  // 1. 鉴权与登录
  console.log('[1] 鉴权与登录')
  let token = ''
  {
    const r = await request('POST', '/api/auth/login', { body: { code: TEST_CODE } })
    check('登录返回 token', r.data && r.data.code === 0 && !!r.data.data.token, r.raw.slice(0, 80))
    token = r.data && r.data.data ? r.data.data.token : ''

    const r2 = await request('GET', '/api/auth/profile')
    check('无 token 访问受保护接口返回 401', r2.status === 401)

    const r3 = await request('GET', '/api/auth/profile', { token })
    check('带 token 获取用户信息', r3.data && r3.data.code === 0 && r3.data.data.id > 0)
  }

  // 2. 商品与分类
  console.log('\n[2] 商品与分类')
  let goodsId = 0
  {
    const r = await request('GET', '/api/categories')
    check('分类列表', r.data && r.data.code === 0 && r.data.data.length >= 5)

    const r2 = await request('GET', '/api/goods?page=1&page_size=5')
    check('商品列表分页', r2.data && r2.data.code === 0 && r2.data.data.list.length > 0)
    goodsId = r2.data.data.list[0].id

    const r3 = await request('GET', `/api/goods/${goodsId}`)
    check('商品详情（含图片数组）', r3.data && r3.data.code === 0 && Array.isArray(r3.data.data.images))

    const r4 = await request('GET', '/api/goods/hot')
    check('热销商品', r4.data && r4.data.code === 0 && r4.data.data.length > 0)

    const r5 = await request('GET', '/api/goods/999999')
    check('不存在商品返回 404', r5.data && r5.data.code === 404)
  }

  // 3. 购物车（Redis）
  console.log('\n[3] 购物车')
  {
    const r = await request('POST', '/api/cart', { token, body: { goods_id: goodsId, quantity: 2 } })
    check('添加商品', r.data && r.data.code === 0)

    const r2 = await request('POST', '/api/cart', { token, body: { goods_id: goodsId, quantity: 3 } })
    check('同商品累加', r2.data && r2.data.data.quantity === 5)

    const r3 = await request('GET', '/api/cart', { token })
    check('购物车含商品信息与小计', r3.data && r3.data.code === 0 && r3.data.data.length >= 1 && r3.data.data[0].subtotal > 0)

    const r4 = await request('POST', '/api/cart', { token, body: { goods_id: goodsId, quantity: 99999 } })
    check('超库存被拦截', r4.data && r4.data.code === 400)

    const r5 = await request('PUT', `/api/cart/${goodsId}`, { token, body: { quantity: 8 } })
    check('修改数量', r5.data && r5.data.code === 0)
  }

  // 4. 地址
  console.log('\n[4] 收货地址')
  let addressId = 0
  let addressId2 = 0
  {
    const r = await request('POST', '/api/addresses', {
      token,
      body: { receiver: '测试收货人', phone: '13800138000', province: '广东省', city: '深圳市', district: '南山区', detail: '科技园路1号' },
    })
    check('新增地址（第一条自动默认）', r.data && r.data.code === 0 && r.data.data.is_default === true)
    addressId = r.data ? r.data.data.id : 0

    const r2 = await request('POST', '/api/addresses', {
      token,
      body: { receiver: '测试收货人2', phone: '13900139000', detail: '宝安区西乡2号' },
    })
    addressId2 = r2.data ? r2.data.data.id : 0

    const r3 = await request('PUT', `/api/addresses/${addressId2}`, { token, body: { is_default: true } })
    check('设置默认地址', r3.data && r3.data.code === 0)

    const r4 = await request('GET', '/api/addresses', { token })
    const defaultCount = r4.data.data.filter((a) => a.is_default).length
    check('默认地址唯一', r4.data && r4.data.code === 0 && defaultCount === 1)
    check('默认地址排最前', r4.data.data[0].is_default === true)

    const r5 = await request('DELETE', `/api/addresses/${addressId2}`, { token })
    check('删除地址', r5.data && r5.data.code === 0)
  }

  // 5. 订单 + 支付回调
  console.log('\n[5] 订单与支付')
  let orderId = 0
  let orderNo = ''
  {
    // 清空购物车再添加 1 件，用购物车数量下单
    await request('DELETE', `/api/cart/${goodsId}`, { token })
    await request('POST', '/api/cart', { token, body: { goods_id: goodsId, quantity: 1 } })

    const r = await request('POST', '/api/orders', {
      token,
      body: { items: [{ goods_id: goodsId, quantity: 1 }], address_id: addressId, remark: '自动化测试' },
    })
    check('创建订单', r.data && r.data.code === 0 && r.data.data.order_no)
    orderId = r.data ? r.data.data.id : 0
    orderNo = r.data && r.data.data.order_no ? r.data.data.order_no : ''

    const r2 = await request('POST', `/api/orders/${orderId}/pay`, { token })
    check('发起支付返回参数', r2.data && r2.data.code === 0 && r2.data.data.payment)

    const r3 = await request('POST', '/api/pay/notify', { body: { order_no: orderNo } })
    check('支付回调返回微信格式', r3.raw.includes('SUCCESS'))

    const r4 = await request('POST', '/api/pay/notify', { body: { order_no: orderNo } })
    check('回调幂等（重复调用不报错）', r4.raw.includes('SUCCESS'))

    const r5 = await request('GET', `/api/orders/${orderId}`, { token })
    const order = r5.data ? r5.data.data : {}
    check('订单状态已支付', order.status === 1)
    check('配送记录已创建', order.delivery && order.delivery.status === 0)

    const r6 = await request('PUT', `/api/orders/${orderId}/cancel`, { token })
    check('已支付订单不可取消', r6.data && r6.data.code === 400)
  }

  // 6. 配送流转
  console.log('\n[6] 配送流转')
  let deliveryId = 0
  {
    const r = await request('GET', `/api/orders/${orderId}/logistics`, { token })
    check('查询物流信息', r.data && r.data.code === 0)
    deliveryId = r.data ? r.data.data.delivery.id : 0

    const r1 = await request('PUT', `/api/deliveries/${deliveryId}/status`, {
      token,
      body: { status: 1, courier_name: '测试配送员', courier_phone: '13800138000' },
    })
    check('分配配送员', r1.data && r1.data.code === 0 && r1.data.data.courier_name === '测试配送员')

    const r2 = await request('PUT', `/api/deliveries/${deliveryId}/status`, { token, body: { status: 2 } })
    check('取货中', r2.data && r2.data.code === 0)

    const r3 = await request('PUT', `/api/deliveries/${deliveryId}/status`, { token, body: { status: 3 } })
    const r3o = await request('GET', `/api/orders/${orderId}`, { token })
    check('配送中订单联动', r3.data && r3.data.code === 0 && r3o.data.data.status === 2)

    const r4 = await request('PUT', `/api/deliveries/${deliveryId}/status`, { token, body: { status: 4 } })
    const r4o = await request('GET', `/api/orders/${orderId}`, { token })
    check('已送达订单联动完成', r4.data && r4.data.code === 0 && r4o.data.data.status === 3)

    const r5 = await request('PUT', `/api/deliveries/${deliveryId}/status`, { token, body: { status: 2 } })
    check('状态回退被拦截', r5.data && r5.data.code === 400)
  }

  // 7. 越权防护
  console.log('\n[7] 越权防护')
  {
    const other = await request('POST', '/api/auth/login', { body: { code: TEST_CODE + '_other' } })
    const otherToken = other.data && other.data.data ? other.data.data.token : ''

    const r1 = await request('GET', `/api/orders/${orderId}`, { token: otherToken })
    check('他人订单不可访问', r1.data && r1.data.code === 404)

    const r2 = await request('PUT', `/api/orders/${orderId}/cancel`, { token: otherToken })
    check('他人订单不可取消', r2.data && r2.data.code === 404)

    const r3 = await request('GET', `/api/orders/${orderId}/logistics`, { token: otherToken })
    check('他人物流不可查看', r3.data && r3.data.code === 404)

    const r4 = await request('DELETE', `/api/addresses/${addressId}`, { token: otherToken })
    check('他人地址不可删除', r4.data && r4.data.code === 404)
  }

  // 8. 限流
  console.log('\n[8] 接口限流')
  {
    let limited = false
    for (let i = 0; i < 25; i++) {
      const r = await request('POST', '/api/auth/login', { body: { code: 'brute_' + i } })
      if (r.data && r.data.code === 429) { limited = true; break }
    }
    check('登录接口限流生效（429）', limited)
  }

  // ===== 汇总 =====
  console.log(`\n======== 测试结果：${passed} 通过 / ${failed} 失败 ========`)
  if (failed) {
    console.log('失败项：', RESULTS.join('；'))
    process.exit(1)
  }
  process.exit(0)
}

run()
