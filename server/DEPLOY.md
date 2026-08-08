# 生产部署指南

微信小程序要求后端必须为 **HTTPS 域名**（需 ICP 备案 + SSL 证书 + 在小程序后台配置 request 合法域名）。
本文档提供 Linux 服务器部署参考（本机开发无需执行）。

## 一、PM2 进程守护

```bash
# 全局安装 PM2
npm install -g pm2

# 进入项目启动（生产模式）
cd server
NODE_ENV=production pm2 start app.js --name fresh-mall

# 常用命令
pm2 status          # 查看状态
pm2 logs fresh-mall # 查看日志
pm2 restart fresh-mall
pm2 save            # 保存进程列表（开机自启需再执行 pm2 startup）
```

## 二、Nginx 反向代理 + HTTPS

### 1. 申请 SSL 证书
- 阿里云 / 腾讯云可申请免费证书（DV 单域名）
- 或使用 Let's Encrypt：`certbot --nginx -d api.yourdomain.com`

### 2. Nginx 配置（/etc/nginx/conf.d/fresh-mall.conf）

```nginx
# HTTP → HTTPS 跳转
server {
    listen 80;
    server_name api.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name api.yourdomain.com;

    # SSL 证书（路径按实际证书位置修改）
    ssl_certificate     /etc/nginx/ssl/api.yourdomain.com.pem;
    ssl_certificate_key /etc/nginx/ssl/api.yourdomain.com.key;
    ssl_protocols       TLSv1.2 TLSv1.3;

    # 反向代理到 PM2 守护的 Node 服务
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
nginx -t && nginx -s reload
```

## 三、生产环境配置

1. **server/.env 填入生产配置**：
   - `NODE_ENV=production`（关闭 SQL 日志）
   - 真实 MySQL/Redis 连接
   - 强随机 `JWT_SECRET`（`openssl rand -base64 32` 生成）
   - 微信小程序 **AppID / AppSecret**（登录与支付切换为真实模式）
   - 微信支付商户号配置后自动启用真实支付（见 `utils/wechat.js` 注释）

2. **数据库迁移**：`npm run db:sync`（生产环境不建议 --force 重建）

## 四、小程序端上线前准备

1. **域名**：小程序后台 → 开发管理 → 服务器域名 添加 `https://api.yourdomain.com`
2. **miniprogram/config/env.js** 的 `baseUrl` 改为线上域名
3. **project.config.json** 的 `appid` 改为真实小程序 AppID，`urlCheck` 置为 true
4. 开发者工具「上传」→ 后台提交审核

## 五、Redis 生产建议

- 设置密码（`requirepass`），.env 中 `REDIS_PASSWORD` 对应填写
- 本机开发环境 Redis 重启后需手动启动：
  - `C:\Users\SHI\Redis\redis-server.exe`（或注册为 Windows 服务）

## 六、注意事项

- **微信支付**：本仓库 mock 模式（无商户号）下 `/pay` 返回模拟参数、notify 不验签。
  接入真实支付需：商户号（mchid）、API 密钥、配置 `utils/wechat.js` 的 createPayment 与 verifyNotifySign。
- **限流**：已配置全局限流（120 次/分/IP）、登录限流（20 次/10 分钟/IP），可按业务调整 `middlewares/rateLimiter.js`
- **定时任务**：超时 30 分钟未支付订单自动取消由 node-schedule 驱动，PM2 多实例部署时建议仅单实例启用该任务
