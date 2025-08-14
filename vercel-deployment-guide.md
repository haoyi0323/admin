# Vercel 部署配置指南

## 🚀 Vercel 项目配置

### 1. 基本设置
- **项目名称:** barbershop
- **框架预设:** Other
- **根目录:** ./

### 2. 构建设置
```bash
# 构建命令
cd 男士理发店管理后台 && npm install && npm run build

# 输出目录  
男士理发店管理后台/dist

# 安装命令
cd 男士理发店管理后台 && npm install
```

### 3. 环境变量
- NODE_ENV: production

### 4. 域名配置（部署后）
- 主域名: youyi.work
- 子域名: www.youyi.work

### 5. DNS 配置（需要在域名服务商设置）
```
A 记录: youyi.work → 76.76.19.61
CNAME: www.youyi.work → cname.vercel-dns.com
```

## 📋 部署检查清单
- [ ] GitHub 仓库代码已上传
- [ ] Vercel 项目已创建
- [ ] 构建配置已设置
- [ ] 首次部署成功
- [ ] 自定义域名已添加
- [ ] DNS 解析已配置
- [ ] HTTPS 证书已生成

## 🔧 故障排除
1. 构建失败：检查 package.json 中的依赖
2. 路由 404：确认 vercel.json 中的重写规则
3. API 调用失败：检查代理配置
4. 域名无法访问：确认 DNS 解析设置