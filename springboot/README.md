# SpringBoot 后端（生鲜果蔬商城）

Java 版后端，接口与 Node 版（server/）**完全兼容**，小程序前端无需任何改动。

## 技术栈

- Java 21 + Spring Boot 3.3
- Spring Data JPA（对应 Sequelize）
- Spring Data Redis（购物车存储，key: `cart:{userId}`）
- JWT 鉴权（jjwt）
- 定时任务（@Scheduled，超时订单自动取消）

## 环境要求

- JDK 21（已安装：`C:\Users\SHI\devtools\jdk-21.0.12+8`）
- Maven 3.9（已安装：`C:\Users\SHI\devtools\apache-maven-3.9.9`）
- MySQL（`fresh_fruit_veggie_mall`，与 Node 版共用同一库）
- Redis（`C:\Users\SHI\Redis\redis-server.exe`）

## 启动

```bash
# 方式一：命令行（记得先停掉 Node 版 server，端口同为 3000）
set JAVA_HOME=C:\Users\SHI\devtools\jdk-21.0.12+8
cd springboot
mvn package -DskipTests
java -jar target/fresh-mall-1.0.0.jar

# 方式二：使用 run.bat（已配置环境变量）
run.bat
```

## 配置（application.yml）

| 配置项 | 说明 |
|---|---|
| `spring.datasource` | MySQL 连接（与 Node 版共用数据库） |
| `app.jwt.secret` | JWT 密钥（与 Node 版 .env 一致，token 可无缝切换） |
| `app.wechat.appid/appsecret` | 留空为 mock 模式；填入真实值自动切换真实微信登录 |
| `app.order.pay-timeout-minutes` | 超时未支付自动取消时间（默认 30 分钟） |

## 与 Node 版的差异说明

| 项目 | Node 版 | SpringBoot 版 |
|---|---|---|
| 框架 | Express + Sequelize | Spring Boot + JPA |
| 接口/响应格式 | `{code, message, data}` | 完全一致 |
| 表结构 | Sequelize 管理 | JPA `ddl-auto: none`（表已存在不自动建） |
| 限流 | express-rate-limit（内存） | 拦截器内存滑动窗口 |
| 定时任务 | node-schedule | @Scheduled 每分钟扫描 |

## 开发注意

1. **字段命名**：实体字段为下划线命名（与 Node 版 JSON 输出一致，前端依赖），
   因此 Repository 的派生查询不可用（下划线被当作嵌套属性分隔符），一律使用 `@Query` 手写 JPQL。
2. **中文路径启动**：`mvn spring-boot:run` 在含中文的 Windows 路径下会 ClassNotFound，
   请使用 `mvn package` + `java -jar` 方式运行。
3. 前端对接请修改 `miniprogram/config/env.js` 的 `baseUrl`（真机预览改局域网 IP）。
