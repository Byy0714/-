// 构建后把 index.html 复制为 404.html
// 目的：静态托管（如搜易云）遇到 /plan、/study 等未知路径时会返回 404.html，
// 复制后相当于 SPA 路由回退，React Router 能正确接管路径，避免刷新即 404。
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
