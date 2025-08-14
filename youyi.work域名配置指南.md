# youyi.work 域名配置指南

## 方案概述

通过单一域名 `youyi.work` 提供完整服务：
- 前端管理后台：直接访问域名根路径
- 后端 API：通过 `/api/*` 路径反向代理到 uniCloud 网关

## 完成的配置

### 1. Vercel 部署配置 (`vercel.json`)
```json
{
  "buildCommand": "cd 男士理发店管理后台 && npm install && npm run build",
  "outputDirectory": "男士理发店管理后台/dist",
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "https://fc-mp-07deb218-bf71-47a5-9cf0-10e81e399ed3.next.bspapp.com/http/api-gateway"
    },
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

### 2. 前端 API 配置调整
- 修改了 `unicloud.ts`，使用 `/api` 路径调用后端
- 更新了 `vite.config.ts`，添加本地开发代理
- 注释了 `.env.local` 中的直接网关配置

## 部署步骤

### 第一步：推送代码到 GitHub
```bash
cd "d:\桌面\男士理发店"
git add .
git commit -m "配置单域名反向代理架构"
git push origin main
```

### 第二步：Vercel 绑定域名
1. 访问 [Vercel Dashboard](https://vercel.com/dashboard)
2. 找到你的项目，点击进入
3. 进入 "Settings" > "Domains"
4. 添加域名 `youyi.work`
5. 根据提示设置 DNS 记录：
   - **A 记录**：`@` 指向 `76.76.21.21`
   - **CNAME 记录**：`www` 指向 `cname.vercel-dns.com`

### 第三步：DNS 配置（在域名服务商控制台）
在你的域名注册商管理后台设置以下记录：

| 类型 | 名称 | 值 | TTL |
|------|------|-----|-----|
| A | @ | 76.76.21.21 | 300 |
| CNAME | www | cname.vercel-dns.com | 300 |

### 第四步：验证部署
等待 DNS 生效（通常 5-30 分钟），然后访问：
- `https://youyi.work` - 前端管理后台
- `https://youyi.work/api` - 后端 API（应显示网关响应）

## 访问地址

- **前端管理后台**: https://youyi.work
- **后端 API**: https://youyi.work/api/*

## 优势

1. **单域名方案**：只需要配置一个域名
2. **SSL 自动化**：Vercel 自动提供 HTTPS 证书  
3. **无跨域问题**：前后端同域，避免 CORS 配置
4. **简化部署**：不需要额外的后端域名配置

## 注意事项

1. **uniCloud 网关状态**：确保你的 uniCloud api-gateway 已正确部署且可访问
2. **管理员认证**：当前使用了开发环境默认 token，生产环境需要实现完整的登录流程
3. **DNS 生效时间**：新域名配置可能需要等待 DNS 传播（通常几分钟到几小时）

## 问题排查

如果访问出现问题，请检查：
1. DNS 记录是否正确设置
2. Vercel 部署是否成功
3. uniCloud 网关是否正常响应
4. 浏览器开发者工具的网络面板，查看具体请求错误

## 下一步

域名配置完成后，建议：
1. 实现完整的管理员登录系统
2. 配置生产环境的管理员 token 验证
3. 添加更多的业务功能模块