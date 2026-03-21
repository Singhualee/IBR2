# 部署指南

## 项目概述

本项目是一个图片背景移除工具，使用 React + Vite + Tailwind CSS 构建前端，Cloudflare Workers 作为后端，调用 Remove.bg API 进行背景移除。

## 已完成的工作

1. **前端项目初始化**：
   - 使用 Vite 创建 React + TypeScript 项目
   - 安装并配置 Tailwind CSS
   - 实现图片上传、处理、预览和下载功能

2. **后端代码编写**：
   - 编写 Cloudflare Workers 代码
   - 实现接收图片、调用 Remove.bg API、返回处理结果的逻辑
   - 配置 CORS 响应头

3. **前端构建**：
   - 成功构建前端项目，生成生产环境文件

## 部署步骤

### 1. 部署后端 Workers

#### 步骤 1：安装 wrangler CLI

```bash
npm install -g wrangler
```

#### 步骤 2：登录 Cloudflare

```bash
wrangler login
```

- 会打开浏览器进行授权，授权后命令行会自动完成登录

#### 步骤 3：配置 API Key

- 编辑 `wrangler.toml` 文件，将 `REMOVE_BG_API_KEY` 替换为你的 Remove.bg API Key

#### 步骤 4：部署 Workers

```bash
wrangler deploy
```

- 部署成功后，会输出 Workers 的 API 端点 URL（如 `https://image-background-remover-api.your-account.workers.dev`）

### 2. 部署前端 Pages

#### 步骤 1：推送代码到 GitHub

```bash
git push -u origin master
```

#### 步骤 2：配置 Cloudflare Pages

1. 登录 Cloudflare dashboard
2. 进入 **Pages** 页面
3. 点击 **Create a project**，选择连接 GitHub 仓库 `Singhualee/IBR2`
4. 配置构建参数：
   - Framework preset：React
   - Build command：`npm run build`
   - Build output directory：`dist`
   - Environment variables：`VITE_API_ENDPOINT` = 你的 Workers API 端点 URL
5. 点击 **Save and Deploy**

#### 步骤 3：验证部署

- 部署完成后，会分配一个默认域名（如 `ibr2.pages.dev`）
- 访问该域名，测试完整功能

## 配置说明

### 1. 前端 API 端点配置

- 在前端代码中，API 端点 URL 硬编码在 `src/App.tsx` 文件中
- 部署后，需要确保该 URL 指向正确的 Workers 端点

### 2. Remove.bg API Key

- 在 `wrangler.toml` 文件中配置 `REMOVE_BG_API_KEY`
- 部署后，建议在 Cloudflare dashboard 中检查环境变量是否正确配置，并勾选 **Encrypt** 选项

## 测试计划

### 1. 前端功能测试

- **上传测试**：测试拖拽和点击上传功能
- **处理测试**：测试图片处理状态显示
- **预览测试**：测试处理前后的对比预览
- **下载测试**：测试下载功能是否正常

### 2. 后端 API 测试

- **API 端点测试**：使用 Postman 测试 API 响应
- **错误处理测试**：测试上传非图片文件、过大图片的错误处理
- **性能测试**：测试不同大小图片的处理时间

### 3. 端到端测试

- **完整流程测试**：测试上传 → 处理 → 下载的完整流程
- **边界情况测试**：测试高分辨率图片、复杂背景图片的处理
- **测试图片**：使用根目录下的 `1.png` 测试图片

## 常见问题及解决方案

### 1. 上传失败

- **原因**：图片大小超过 5MB
- **解决方案**：前端已添加图片大小验证，超过限制时会显示错误提示

### 2. 处理失败

- **原因**：Remove.bg API Key 错误或 API 调用失败
- **解决方案**：检查 API Key 是否正确配置，确保网络连接正常

### 3. 跨域错误

- **原因**：CORS 配置不正确
- **解决方案**：Workers 代码已配置 CORS 响应头，确保前端 API 端点 URL 正确

### 4. 部署失败

- **原因**：构建参数配置错误
- **解决方案**：确保 Cloudflare Pages 的构建参数正确配置，特别是 Build output directory 为 `dist`

## 总结

本项目已完成前端和后端代码的开发，通过以下步骤即可完成部署：

1. 部署后端 Workers，获取 API 端点 URL
2. 部署前端 Pages，配置 API 端点 URL
3. 测试完整功能，确保服务正常运行

部署完成后，用户可以通过 Cloudflare 分配的默认域名访问图片背景移除工具，上传图片并自动移除背景，下载处理后的图片。