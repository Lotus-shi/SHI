# CLAUDE.md

## 语言设置

- 始终使用简体中文进行回复
- 所有对话、解释、代码注释均使用中文
- 如果用户使用中文提问，必须用中文回答
- 代码中的变量名、函数名可以使用英文，但注释用中文

## 项目概述

生鲜果蔬线上订购配送微信小程序，全栈项目。

- **后端（Node 版）**：Node.js + Express + Sequelize + MySQL + Redis + JWT + 微信登录/支付（server/）
- **后端（SpringBoot 版）**：Java 21 + Spring Boot 3.3 + JPA + Redis + JWT（springboot/，接口与 Node 版完全兼容，前端零改动）
- **前端**：微信小程序原生开发（miniprogram/）
- **目标**：完成「登录 → 浏览商品 → 加购物车 → 下单 → 支付 → 查看订单 → 追踪配送 → 收货」完整业务闭环

## 项目结构

```
fresh-fruit-veggie-mall/
├── server/                    # Node.js 后端（Express）
│   ├── app.js                 # Express 入口，注册中间件与路由
│   ├── .env                   # 环境变量（数据库、JWT、微信配置）
│   ├── config/                # config.js（环境变量）、database.js（Sequelize 连接）
│   ├── models/                # 7 个 Sequelize 模型 + index.js（关联关系）
│   ├── routes/                # 路由（auth/goods/category/cart/address/order/pay/delivery）
│   ├── controllers/           # 控制器（参数校验、响应）
│   ├── services/              # 业务逻辑（goodsService、cartService、orderService）
│   ├── middlewares/           # 鉴权 auth.js、错误处理、限流 rateLimiter.js
│   ├── utils/                 # 统一响应 response.js、微信工具 wechat.js、redis.js
│   ├── seeders/               # sync.js（建表）、seed.js（种子数据）
│   ├── tests/api.test.js      # 核心接口自动化测试（npm test）
│   └── DEPLOY.md              # 生产部署指南（PM2/Nginx/HTTPS）
├── springboot/                # Java 后端（Spring Boot，与 Node 版接口兼容）
│   ├── pom.xml                # 依赖（JPA/Redis/JWT/阿里云镜像）
│   ├── run.bat                # 一键启动脚本
│   ├── README.md              # 运行说明与两版差异
│   └── src/main/
│       ├── resources/application.yml
│       └── java/com/freshmall/
│           ├── FreshMallApplication.java
│           ├── common/        # Result 统一响应 / AppException / 全局异常 / UserContext
│           ├── config/WebConfig.java   # CORS + 拦截器注册
│           ├── controller/    # auth/goods/category/cart/address/order/pay/delivery/health
│           ├── service/       # Auth/Goods/Cart/Address/Order/Delivery
│           ├── repository/    # 6 个 JPA 仓库（一律 @Query 手写 JPQL）
│           ├── entity/        # 7 个实体（下划线字段名，与 Node 版 JSON 一致）
│           ├── interceptor/   # AuthInterceptor（JWT 鉴权）、RateLimitInterceptor（限流）
│           ├── task/OrderTimeoutTask.java  # 超时订单自动取消（@Scheduled）
│           └── util/          # JwtUtil / WechatUtil（mock 登录与支付）
└── miniprogram/               # 微信小程序前端
    ├── app.js                 # 入口，onLaunch 静默登录
    ├── app.json               # tabBar（首页、分类、购物车、个人中心）+ 12 页面注册
    ├── config/env.js          # 后端 API 基础地址、isDev 开关
    ├── utils/request.js       # 网络请求封装（token 注入、401 自动静默登录重试）
    ├── components/            # goods-card、empty、loading 组件
    └── pages/                 # index/category/goods-detail/cart/address/address-edit/order/pay-result/order-list/order-detail/logistics/user
```

## 关键文件链接

### 后端（Node 版 server/）
- [app.js](server/app.js) — Express 入口
- [.env](server/.env) — 环境变量（数据库密码 123456、JWT 密钥、微信 AppID 占位）
- [config/config.js](server/config/config.js) — 环境变量读取
- [config/database.js](server/config/database.js) — Sequelize 连接
- [models/index.js](server/models/index.js) — 7 个模型统一导出与关联关系
- [routes/auth.js](server/routes/auth.js) — 鉴权路由
- [routes/goods.js](server/routes/goods.js) — 商品路由
- [routes/category.js](server/routes/category.js) — 分类路由
- [routes/cart.js](server/routes/cart.js) — 购物车路由（Redis）
- [routes/address.js](server/routes/address.js) — 地址路由（事务默认地址）
- [routes/order.js](server/routes/order.js) — 订单路由
- [routes/pay.js](server/routes/pay.js) — 支付回调（幂等）
- [routes/delivery.js](server/routes/delivery.js) — 配送路由
- [services/orderService.js](server/services/orderService.js) — 订单服务（超时扫描）
- [middlewares/auth.js](server/middlewares/auth.js) — JWT 鉴权
- [middlewares/rateLimiter.js](server/middlewares/rateLimiter.js) — 接口限流
- [utils/wechat.js](server/utils/wechat.js) — 微信登录/支付（mock 模式）
- [utils/redis.js](server/utils/redis.js) — Redis 连接（RESP2 强制）
- [tests/api.test.js](server/tests/api.test.js) — 接口自动化测试
- [DEPLOY.md](server/DEPLOY.md) — 部署文档

### 后端（SpringBoot 版 springboot/）
- [pom.xml](springboot/pom.xml) — 依赖配置
- [application.yml](springboot/src/main/resources/application.yml) — 数据库/Redis/JWT/业务配置
- [run.bat](springboot/run.bat) — 一键启动
- [FreshMallApplication.java](springboot/src/main/java/com/freshmall/FreshMallApplication.java) — 启动类
- [config/WebConfig.java](springboot/src/main/java/com/freshmall/config/WebConfig.java) — CORS + 拦截器
- [common/Result.java](springboot/src/main/java/com/freshmall/common/Result.java) — 统一响应
- [common/GlobalExceptionHandler.java](springboot/src/main/java/com/freshmall/common/GlobalExceptionHandler.java) — 全局异常
- [entity/](springboot/src/main/java/com/freshmall/entity/) — 7 个实体
- [repository/](springboot/src/main/java/com/freshmall/repository/) — 6 个 JPA 仓库
- [service/](springboot/src/main/java/com/freshmall/service/) — 业务服务
- [controller/](springboot/src/main/java/com/freshmall/controller/) — 控制器
- [interceptor/AuthInterceptor.java](springboot/src/main/java/com/freshmall/interceptor/AuthInterceptor.java) — JWT 鉴权
- [interceptor/RateLimitInterceptor.java](springboot/src/main/java/com/freshmall/interceptor/RateLimitInterceptor.java) — 限流
- [task/OrderTimeoutTask.java](springboot/src/main/java/com/freshmall/task/OrderTimeoutTask.java) — 超时订单任务
- [util/WechatUtil.java](springboot/src/main/java/com/freshmall/util/WechatUtil.java) — 微信 mock 登录/支付
- [README.md](springboot/README.md) — 两版差异与启动说明

### 前端（miniprogram/）
- [app.js](miniprogram/app.js) — 入口（onLaunch 静默登录）
- [app.json](miniprogram/app.json) — 页面注册与 tabBar
- [config/env.js](miniprogram/config/env.js) — API 地址配置（真机预览改局域网 IP）
- [utils/request.js](miniprogram/utils/request.js) — 请求封装
- [components/goods-card/](miniprogram/components/goods-card/) — 商品卡片组件
- [components/empty/](miniprogram/components/empty/) — 空状态组件
- [components/loading/](miniprogram/components/loading/) — 加载组件
- [pages/index/](miniprogram/pages/index/) — 首页
- [pages/category/](miniprogram/pages/category/) — 分类页
- [pages/goods-detail/](miniprogram/pages/goods-detail/) — 商品详情
- [pages/cart/](miniprogram/pages/cart/) — 购物车
- [pages/address/](miniprogram/pages/address/) — 地址列表
- [pages/address-edit/](miniprogram/pages/address-edit/) — 地址编辑
- [pages/order/](miniprogram/pages/order/) — 订单确认
- [pages/pay-result/](miniprogram/pages/pay-result/) — 支付结果
- [pages/order-list/](miniprogram/pages/order-list/) — 订单列表
- [pages/order-detail/](miniprogram/pages/order-detail/) — 订单详情
- [pages/logistics/](miniprogram/pages/logistics/) — 配送追踪
- [pages/user/](miniprogram/pages/user/) — 个人中心

## 开发阶段（按顺序执行，每阶段完成后验收）

### 阶段一：项目初始化与环境搭建
- 根目录 `git init`；初始化 `server/`（npm），安装 express sequelize mysql2 redis jsonwebtoken dotenv cors axios nodemon
- 搭建 Express 基础框架，注册 CORS、JSON 解析、错误处理中间件
- 编写 `.env`（数据库连接、JWT 密钥、微信 AppID/AppSecret）
- 小程序目录 `miniprogram/`，注册 tabBar（首页、分类、购物车、个人中心），编写 `config/env.js`
- **验收**：`npm run dev` 启动，`/api/health` 正常；小程序预览无报错

### 阶段二：数据库设计与模型定义
- 在 MySQL 创建 7 张表：users、categories、goods、addresses、orders、order_items、deliveries
- 创建 7 个 Sequelize 模型并定义关联：
  - User hasMany Address / Order
  - Category hasMany Goods
  - Order hasMany OrderItem / hasOne Delivery
  - Goods hasMany OrderItem
- 编写种子数据脚本，package.json 添加 `db:sync`、`db:seed` 脚本
- **验收**：`npm run db:sync` 自动建表；`npm run db:seed` 插入测试数据

### 阶段三：后端基础架构与鉴权模块
- 统一响应工具 `response.js`（success/fail）、全局错误处理中间件
- JWT 鉴权中间件：解析请求头 token，将 userId 挂载到 req
- 微信工具 `wechat.js`：code2Session（code 换 openid），支付方法后续补充
- 鉴权路由：POST `/api/auth/login`（code → openid → 查询/创建用户 → 签发 JWT）、GET/PUT `/api/auth/profile`
- **验收**：Postman 传入测试 code 返回 JWT；携带 token 可访问 profile

### 阶段四：商品与分类模块（后端 + 前端）
- 后端：`GET /api/goods`（category_id/keyword/page/page_size 分页）、`GET /api/goods/:id`（详情含图文）、`GET /api/goods/hot`、`GET /api/goods/new`、`GET /api/categories`
- 查询逻辑抽到 `services/goodsService.js`，控制器只做参数校验与调用
- 前端：封装 `utils/request.js`（Promise 化、自动注入 token、401 跳登录、统一错误提示）
- 首页：搜索栏、轮播图、分类九宫格、热销横向滚动、商品瀑布流（下拉刷新 + 上拉加载）
- 分类页：左侧分类列表 + 右侧商品网格；商品详情页：轮播、价格、规格、图文详情、加购/立即购买
- 封装 `components/goods-card/` 供首页和分类页复用
- **验收**：首页展示正常，刷新加载正常，卡片跳详情正常，分类切换实时更新

### 阶段五：购物车与收货地址模块
- 购物车数据存 Redis（key: `cart:{userId}`，结构 `{ goodsId: quantity }`）
- 购物车接口：GET（关联商品信息）、POST（添加）、PUT（改数量）、DELETE（删除）
- 前端购物车页：商品列表、全选/单选、合计金额实时计算、结算按钮、空状态
- 地址接口 CRUD；设置默认地址时事务处理，先将其他地址 is_default 置 0
- 前端地址列表/编辑页，接入 `wx.chooseAddress` 快捷填充
- **验收**：加购后购物车展示正常，金额实时计算；地址增删改与默认地址唯一

### 阶段六：下单与支付模块
- 创建订单：校验库存 → 生成订单号（时间戳 + 随机数）→ 计算总额/运费/实付 → 事务创建订单+明细 → 清空已下单购物车商品
- 订单列表（status 筛选、分页）、订单详情（含明细 + 配送信息）、取消订单（仅待支付，释放库存）
- 微信支付：统一下单返回支付参数；回调验证签名 → 已支付 → 扣减库存 → 创建配送记录；回调必须幂等
- 定时任务：超时 30 分钟未支付自动取消并释放库存
- 前端：订单确认页（商品列表、选地址、金额明细、备注、提交）、`wx.requestPayment`、支付结果页、订单列表页（Tab 切换 + 去支付/取消）
- **验收**：结算正确创建订单，金额无误；模拟支付回调后状态变更、库存扣减；取消订单后库存恢复

### 阶段七：配送追踪与订单详情
- 配送状态流转：待分配 → 已分配 → 取货中 → 配送中 → 已送达
- 订单状态与配送状态联动：配送中 → 订单"配送中"，送达 → 订单"已完成"
- 接口：GET `/api/orders/:id/logistics`、PUT `/api/deliveries/:id/status`（需鉴权）
- 前端：订单详情页（状态步骤条、地址、商品、金额、订单号/时间）、配送追踪页（时间轴、配送员电话可拨打、预计送达）
- **验收**：订单详情完整；配送状态更新后前端刷新可见最新状态

### 阶段八：个人中心与项目收尾
- 个人中心：头像昵称（可编辑）、订单快捷入口、地址管理入口、客服联系、关于我们
- 全局优化：统一 loading/空状态组件、图片懒加载、网络异常处理与重试、页面过渡动画
- `app.js` onLaunch 静默登录（自动 code 登录）
- 后端安全：所有用户接口过鉴权、订单/地址校验数据归属、express-rate-limit 限流
- 测试与部署：Postman 覆盖核心接口、真机测试完整购买流程、PM2 + Nginx + HTTPS、提交审核上线
- **验收**：完整流程跑通；真机无明显卡顿；无越权访问

## 关键约定与规范

### 后端
- 统一响应格式：`success(res, data, message)` / `fail(res, code, message)`
- 所有业务路由挂在 `/api/*` 下；鉴权中间件保护用户相关接口
- 订单、地址等接口必须校验数据归属，防止越权
- 涉及多表写入（创建订单、设置默认地址、支付回调）必须使用事务
- 支付回调必须幂等：已处理的订单不重复处理
- 库存操作与订单状态变更需保持一致

### 前端
- 所有网络请求走 `utils/request.js`（自动带 token，401 统一跳登录）
- 商品卡片统一使用 `components/goods-card` 组件
- 列表页统一接入 loading 与空状态组件
- app.js onLaunch 中实现静默登录

### 环境变量（server/.env）
- 数据库连接（host/port/database/user/password）
- JWT 密钥（secret、过期时间）
- 微信 AppID / AppSecret（登录 + 支付）

## 常用命令

```bash
# Node 版后端
cd server && npm run dev        # 启动开发服务（端口 3000）
npm run db:sync                 # 自动创建所有表
npm run db:seed                 # 插入测试数据
npm test                        # 核心接口自动化测试（36 项）

# SpringBoot 版后端（端口同为 3000，与 Node 版二选一运行）
springboot\run.bat              # 一键启动（自动打包 + 运行）
cd springboot && mvn package -DskipTests && java -jar target/fresh-mall-1.0.0.jar
```

## 两套后端切换说明

- Node 版（server/）与 SpringBoot 版（springboot/）接口完全兼容，前端无需改动
- 两者共用同一 MySQL 数据库与 Redis，JWT 密钥一致（token 可无缝切换）
- **同一时间只启动一个后端**（端口均为 3000）
- SpringBoot 版启动注意：中文路径下必须用 `mvn package` + `java -jar`（`mvn spring-boot:run` 会 ClassNotFound）

## 验收总标准（阶段八完成时）

1. 完整流程：登录 → 浏览商品 → 加购物车 → 下单 → 支付 → 查看订单 → 追踪配送 → 收货
2. 真机预览无明显卡顿与异常
3. 所有接口有鉴权保护，无越权访问
