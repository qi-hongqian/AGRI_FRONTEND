# 农业平台微服务部署与测试指南

## 📋 项目概述

本农业平台采用微服务架构，包含以下核心模块：
- 🏠 **首页资讯服务** (端口 8082) - 轮播图、新闻内容管理
- 💬 **论坛服务** (端口 8083) - 帖子、评论、用户互动
- 🛒 **商城服务** (端口 8084) - 商品、订单、支付管理
- 🎯 **答题服务** (端口 8081) - 题库、答题记录、积分系统
- 👤 **用户服务** (端口 8080) - 用户认证、个人信息管理

## 🚀 部署架构

### 微服务架构图
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   前端 Vue.js   │    │   API 网关      │    │   负载均衡器     │
│   (移动端)       │◄──►│   (统一入口)     │◄──►│   (Nginx)       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   用户服务      │    │   内容服务      │    │   论坛服务      │
│   端口: 8080    │    │   端口: 8082    │    │   端口: 8083    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   商城服务      │    │   答题服务      │    │   数据库集群     │
│   端口: 8084    │    │   端口: 8081    │◄──►│   (PostgreSQL)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🔧 环境配置

### 1. 开发环境要求
- **Node.js**: 18.x 或更高版本
- **Java**: 11 或更高版本 (Spring Boot)
- **PostgreSQL**: 13.x 或更高版本
- **Redis**: 6.x 或更高版本 (缓存)
- **Nginx**: 1.20+ (负载均衡)

### 2. 数据库配置
```sql
-- 创建数据库
CREATE DATABASE agriculture_platform;

-- 创建用户
CREATE USER agri_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE agriculture_platform TO agri_user;

-- 连接数据库
\c agriculture_platform;

-- 执行数据库架构脚本 (参考数据库设计文档)
```

### 3. Redis 配置
```bash
# 安装 Redis (Ubuntu/Debian)
sudo apt update
sudo apt install redis-server

# 配置 Redis
sudo nano /etc/redis/redis.conf

# 启用持久化
appendonly yes
save 900 1
save 300 10
save 60 10000

# 重启 Redis
sudo systemctl restart redis-server
```

## 🏗️ 后端服务部署

### 1. 用户服务 (端口 8080)
```bash
# 克隆代码
git clone https://github.com/your-org/user-service.git
cd user-service

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件，配置数据库连接

# 构建项目
./mvnw clean package

# 启动服务
java -jar target/user-service-0.0.1-SNAPSHOT.jar --server.port=8080
```

### 2. 答题服务 (端口 8081)
```bash
git clone https://github.com/your-org/quiz-service.git
cd quiz-service

# 配置环境变量
cp .env.example .env

# 构建和启动
./mvnw clean package
java -jar target/quiz-service-0.0.1-SNAPSHOT.jar --server.port=8081
```

### 3. 内容服务 (端口 8082)
```bash
git clone https://github.com/your-org/content-service.git
cd content-service

# 配置环境变量
cp .env.example .env

# 构建和启动
./mvnw clean package
java -jar target/content-service-0.0.1-SNAPSHOT.jar --server.port=8082
```

### 4. 论坛服务 (端口 8083)
```bash
git clone https://github.com/your-org/forum-service.git
cd forum-service

# 配置环境变量
cp .env.example .env

# 构建和启动
./mvnw clean package
java -jar target/forum-service-0.0.1-SNAPSHOT.jar --server.port=8083
```

### 5. 商城服务 (端口 8084)
```bash
git clone https://github.com/your-org/mall-service.git
cd mall-service

# 配置环境变量
cp .env.example .env

# 构建和启动
./mvnw clean package
java -jar target/mall-service-0.0.1-SNAPSHOT.jar --server.port=8084
```

## 🌐 前端部署

### 1. 构建前端项目
```bash
# 进入前端目录
cd android_design

# 安装依赖
npm install

# 构建生产版本
npm run build

# 构建结果将在 dist/ 目录
```

### 2. 配置 API 网关
创建 `nginx.conf` 文件：
```nginx
upstream user_service {
    server localhost:8080;
}

upstream quiz_service {
    server localhost:8081;
}

upstream content_service {
    server localhost:8082;
}

upstream forum_service {
    server localhost:8083;
}

upstream mall_service {
    server localhost:8084;
}

server {
    listen 80;
    server_name your-domain.com;

    # 前端静态文件
    location / {
        root /var/www/agriculture-platform/dist;
        try_files $uri $uri/ /index.html;
    }

    # API 网关 - 用户服务
    location /api/user/ {
        proxy_pass http://user_service/api/user/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # API 网关 - 答题服务
    location /api/quiz/ {
        proxy_pass http://quiz_service/api/quiz/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # API 网关 - 内容服务
    location /api/content/ {
        proxy_pass http://content_service/api/content/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # API 网关 - 论坛服务
    location /api/forum/ {
        proxy_pass http://forum_service/api/forum/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # API 网关 - 商城服务
    location /api/mall/ {
        proxy_pass http://mall_service/api/mall/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 3. 启动 Nginx
```bash
# 测试配置
sudo nginx -t

# 重新加载配置
sudo nginx -s reload

# 启动 Nginx
sudo systemctl start nginx
```

## 🧪 测试策略

### 1. 单元测试
```bash
# 前端单元测试
npm run test:unit

# 后端单元测试 (每个服务)
./mvnw test
```

### 2. 集成测试
创建 `tests/integration/api.test.js`：
```javascript
import axios from 'axios'
import { expect } from 'chai'

describe('API Integration Tests', () => {
  const baseURL = 'http://localhost:8080'
  
  describe('User Service', () => {
    it('should register a new user', async () => {
      const response = await axios.post(`${baseURL}/api/user/register`, {
        username: 'testuser',
        email: 'test@example.com',
        password: 'test123456'
      })
      
      expect(response.status).to.equal(200)
      expect(response.data.success).to.be.true
    })
  })
  
  describe('Content Service', () => {
    it('should fetch carousel data', async () => {
      const response = await axios.get('http://localhost:8082/api/content/carousel')
      
      expect(response.status).to.equal(200)
      expect(response.data.success).to.be.true
      expect(response.data.data).to.be.an('array')
    })
  })
})
```

### 3. 性能测试
使用 Apache JMeter 或 Postman 进行负载测试：

```bash
# 安装 JMeter
wget https://downloads.apache.org//jmeter/binaries/apache-jmeter-5.5.zip
unzip apache-jmeter-5.5.zip

# 运行性能测试
./apache-jmeter-5.5/bin/jmeter -n -t performance-test.jmx -l results.jtl
```

### 4. 端到端测试
使用 Cypress 进行 E2E 测试：
```bash
# 安装 Cypress
npm install --save-dev cypress

# 创建测试用例
# cypress/e2e/agriculture-platform.cy.js

describe('Agriculture Platform E2E', () => {
  it('should complete user registration flow', () => {
    cy.visit('/')
    cy.get('[data-testid="register-button"]').click()
    cy.get('[data-testid="username-input"]').type('testuser')
    cy.get('[data-testid="email-input"]').type('test@example.com')
    cy.get('[data-testid="password-input"]').type('test123456')
    cy.get('[data-testid="submit-button"]').click()
    
    cy.get('[data-testid="success-message"]').should('be.visible')
  })
  
  it('should navigate through all modules', () => {
    cy.visit('/')
    
    // 测试底部导航
    cy.get('[data-testid="bottom-nav-forum"]').click()
    cy.url().should('include', '/forum')
    
    cy.get('[data-testid="bottom-nav-quiz"]').click()
    cy.url().should('include', '/quiz')
    
    cy.get('[data-testid="bottom-nav-mall"]').click()
    cy.url().should('include', '/mall')
    
    cy.get('[data-testid="bottom-nav-profile"]').click()
    cy.url().should('include', '/profile')
  })
})
```

## 📊 监控与日志

### 1. 应用监控
使用 Spring Boot Actuator：
```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-actuator</artifactId>
</dependency>
```

配置 `application.yml`：
```yaml
management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics,prometheus
  endpoint:
    health:
      show-details: always
  metrics:
    export:
      prometheus:
        enabled: true
```

### 2. 日志配置
```xml
<configuration>
    <appender name="FILE" class="ch.qos.logback.core.rolling.RollingFileAppender">
        <file>logs/application.log</file>
        <rollingPolicy class="ch.qos.logback.core.rolling.TimeBasedRollingPolicy">
            <fileNamePattern>logs/application-%d{yyyy-MM-dd}.log</fileNamePattern>
            <maxHistory>30</maxHistory>
        </rollingPolicy>
        <encoder>
            <pattern>%d{yyyy-MM-dd HH:mm:ss} [%thread] %-5level %logger{36} - %msg%n</pattern>
        </encoder>
    </appender>
    
    <root level="INFO">
        <appender-ref ref="FILE"/>
    </root>
</configuration>
```

### 3. 健康检查端点
```bash
# 检查服务健康状态
curl http://localhost:8080/actuator/health
curl http://localhost:8081/actuator/health
curl http://localhost:8082/actuator/health
curl http://localhost:8083/actuator/health
curl http://localhost:8084/actuator/health
```

## 🔐 安全建议

### 1. HTTPS 配置
```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    ssl_certificate /etc/ssl/certs/your-domain.crt;
    ssl_certificate_key /etc/ssl/private/your-domain.key;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
    # 其他配置...
}
```

### 2. 数据库安全
- 使用强密码
- 限制数据库访问IP
- 定期备份数据
- 启用SSL连接

### 3. API 安全
- 实现JWT认证
- 添加请求频率限制
- 输入数据验证
- SQL注入防护

## 📱 移动端部署

### 1. Capacitor 配置
```bash
# 添加 Capacitor
npm install @capacitor/core @capacitor/cli
npx cap init "Agriculture Platform" com.agriculture.platform

# 添加平台
npm install @capacitor/android @capacitor/ios
npx cap add android
npx cap add ios

# 构建移动端应用
npm run build
npx cap sync
npx cap open android
```

### 2. 移动端优化
- 启用代码分割
- 图片懒加载
- 离线缓存策略
- 推送通知集成

## 🚀 持续集成/部署 (CI/CD)

### GitHub Actions 配置
```yaml
name: Deploy Agriculture Platform

on:
  push:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
    - name: Install dependencies
      run: npm ci
    - name: Run tests
      run: npm test
    - name: Build
      run: npm run build

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
    - name: Deploy to production
      run: |
        # 部署脚本
        ssh user@server 'bash /path/to/deploy.sh'
```

## 📞 故障排除

### 常见问题

1. **服务启动失败**
   - 检查端口占用
   - 验证数据库连接
   - 查看日志文件

2. **前端API调用失败**
   - 检查API网关配置
   - 验证跨域设置
   - 确认服务健康状态

3. **性能问题**
   - 监控数据库查询
   - 检查缓存命中率
   - 分析API响应时间

### 日志查看
```bash
# 查看系统日志
sudo journalctl -u nginx -f

# 查看应用日志
tail -f logs/application.log

# 查看数据库日志
sudo tail -f /var/log/postgresql/postgresql-*.log
```

## 📈 性能优化建议

1. **数据库优化**
   - 添加适当索引
   - 优化查询语句
   - 实施读写分离

2. **缓存策略**
   - Redis缓存热点数据
   - CDN加速静态资源
   - 浏览器缓存控制

3. **代码优化**
   - 异步处理耗时操作
   - 数据库连接池优化
   - JVM参数调优

## 📚 后续规划

1. **监控仪表板** - 集成Grafana + Prometheus
2. **日志聚合** - 使用ELK Stack (Elasticsearch + Logstash + Kibana)
3. **容器化部署** - Docker + Kubernetes
4. **自动扩缩容** - 基于负载自动调整服务实例
5. **蓝绿部署** - 零停机时间部署策略

---

**注意**: 本指南基于当前架构设计，实际部署时请根据具体环境和需求进行调整。建议先在测试环境验证所有步骤后再部署到生产环境。