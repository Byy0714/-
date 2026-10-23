// 构建后处理：
// 1. 把 index.html 复制为 404.html —— 静态托管（如搜易云）遇到 /plan、/study 等未知路径时
//    会返回 404.html，复制后相当于 SPA 路由回退，React Router 能正确接管路径，避免刷新即 404。
// 2. 删除 dist/_headers —— 搜易云等平台不支持无扩展名文件，会报错拒绝部署；
//    且这些平台本就不读取 _headers，缓存策略需在其控制台手动配置。
//    源码 public/_headers 保留，供 Netlify / Cloudflare Pages 等支持 _headers 的平台使用。
const fs = require('fs')
const path = require('path')

const src = path.join('dist', 'index.html')
const dst = path.join('dist', '404.html')

if (fs.existsSync(src)) {
  fs.copyFileSync(src, dst)
  console.log('✓ copied dist/index.html → dist/404.html (SPA fallback)')
} else {
  console.warn('⚠ dist/index.html not found, skip 404.html copy')
}

// 清理不被搜易云支持的无扩展名文件
const headers = path.join('dist', '_headers')
if (fs.existsSync(headers)) {
  fs.unlinkSync(headers)
  console.log('✓ removed dist/_headers (not supported by 搜易云; set cache headers in console)')
}

