#!/usr/bin/env bash
# ==============================================================================
# CETPass 一键部署脚本（macOS / Linux）
#
# 用法：
#   ./deploy.sh cloud       # 构建 dist + 交互式部署到 Vercel / Netlify / Cloudflare
#   ./deploy.sh local       # 构建 + 本机起一个可分享的预览服务（同局域网）
#   ./deploy.sh offline     # 构建离线 zip（对方解压后双击 index.html 即可）
#   ./deploy.sh build       # 仅构建 dist
#   ./deploy.sh help        # 打印帮助
#
# 首次使用请先 chmod +x deploy.sh
# ==============================================================================

set -euo pipefail

# --------------------------- 彩色输出 ---------------------------
C_RESET='\033[0m'
C_BOLD='\033[1m'
C_CYAN='\033[36m'
C_GREEN='\033[32m'
C_YELLOW='\033[33m'
C_RED='\033[31m'
C_DIM='\033[2m'

log()  { printf "${C_CYAN}▸${C_RESET} %s\n" "$*"; }
ok()   { printf "${C_GREEN}✔${C_RESET} %s\n" "$*"; }
warn() { printf "${C_YELLOW}⚠${C_RESET} %s\n" "$*"; }
fail() { printf "${C_RED}✖${C_RESET} %s\n" "$*"; exit 1; }
step() { printf "\n${C_BOLD}%s${C_RESET}\n" "$*"; }

# --------------------------- 工具检查 ---------------------------
require_node() {
  local ver
  ver=$(node -v 2>/dev/null | sed 's/v//') || fail "未检测到 Node.js，请先安装 Node 18+"
  local major=${ver%%.*}
  [ "$major" -ge 18 ] || fail "Node.js 版本过低（当前 v$ver），需要 18 及以上"
  ok "Node.js v${ver}"
}

require_npm() {
  npm -v >/dev/null 2>&1 || fail "未检测到 npm"
  ok "npm $(npm -v)"
}

cd "$(dirname "$0")"
ROOT="$(pwd)"

# --------------------------- 主流程 ---------------------------
run_preflight() {
  step "环境预检"
  [ -f package.json ] || fail "当前目录不是项目根目录（找不到 package.json）"
  require_node
  require_npm
  [ -d node_modules ] || {
    log "首次部署，正在安装依赖（npm ci）…"
    npm ci --no-audit --no-fund
  }
  ok "依赖就绪"
}

run_build() {
  step "构建前端产物"
  npm run build
  ok "dist/ 已生成"
}

run_zip() {
  local out="$1"
  step "打包成 $out"
  rm -f "$out"
  if command -v zip >/dev/null 2>&1; then
    (cd dist && zip -qr "../$out" .)
  else
    tar -czf "$out" -C dist .
    mv "$out" "$out"  # 占位，避免下一行报错
    fail "系统没有 zip 也没有 tar，无法压缩。请安装 zip 或用 tar 手动处理"
  fi
  ok "$out 已生成（约 $(du -h "$out" | cut -f1)）"
}

# --------------------------- 云端部署 ---------------------------
cloud_deploy() {
  run_preflight
  run_build

  step "选择云端平台"
  echo "  1) Vercel       （推荐，中文友好，首次需要网页登录）"
  echo "  2) Netlify      （可选，支持拖拽 dist 文件夹）"
  echo "  3) Cloudflare Pages"
  echo "  4) 把 dist/ 上传到 GitHub Pages（需要先推到仓库）"
  echo "  5) 跳过，只保留 dist/ 自己部署"
  read -rp "请输入选项 [1-5，默认 1]：" CHOICE
  CHOICE=${CHOICE:-1}

  case "$CHOICE" in
    1)
      if command -v npx >/dev/null 2>&1; then
        log "正在用 npx vercel 部署（首次会要求登录授权）…"
        npx vercel --yes --prod
      else
        warn "npx 不可用，请手动执行：cd dist && npx vercel --prod"
      fi
      ;;
    2)
      log "打开 https://app.netlify.com/drop ，把 dist/ 整个拖进去即出链接"
      open https://app.netlify.com/drop 2>/dev/null || true
      ;;
    3)
      log "打开 https://pages.cloudflare.com ，Create project → Direct Upload → 选 dist/"
      open https://pages.cloudflare.com 2>/dev/null || true
      ;;
    4)
      if command -v git >/dev/null 2>&1 && git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
        log "正在推送到当前仓库 GitHub Pages 分支…"
        git subtree push --prefix dist origin gh-pages || {
          warn "请先在 GitHub 仓库 Settings → Pages 把 Source 设为 gh-pages"
        }
      else
        warn "当前目录不是 Git 仓库。请先 git init && git add . && git commit，再推到 GitHub"
      fi
      ;;
    5)
      ok "已退出部署阶段，dist/ 已准备好"
      ;;
    *)
      fail "无效选项：$CHOICE"
      ;;
  esac
}

# --------------------------- 本地局域网 ---------------------------
local_deploy() {
  run_preflight
  run_build
  step "启动局域网预览服务"
  echo "${C_DIM}本机预览：   ${C_BOLD}http://localhost:4173${C_RESET}"
  # 找局域网 IP
  if command -v ipconfig >/dev/null 2>&1; then
    # macOS
    LAN_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "")
  elif command -v ip >/dev/null 2>&1; then
    # Linux
    LAN_IP=$(ip route get 1 2>/dev/null | awk '{print $7; exit}' || echo "")
  else
    LAN_IP=""
  fi
  if [ -n "$LAN_IP" ]; then
    echo "${C_DIM}局域网访问： ${C_BOLD}http://${LAN_IP}:4173${C_RESET}"
  fi
  echo "${C_DIM}按 Ctrl+C 退出${C_RESET}"
  npm run preview
}

# --------------------------- 离线构建 ---------------------------
offline_deploy() {
  run_preflight

  step "构建离线版（资源相对路径 + Hash 路由）"
  local CFG_TMP
  CFG_TMP=$(mktemp)
  cp vite.config.js "$CFG_TMP"
  local MAIN_BAK="src/main.jsx.bak"
  cp src/main.jsx "$MAIN_BAK"

  # 在 vite.config.js 顶层 merge base:'./' —— 跨平台用 node 精准注入
  node -e "
    const fs = require('fs');
    let s = fs.readFileSync('vite.config.js','utf8');
    // defineConfig({ ... }) → defineConfig({ base: './', ... })
    s = s.replace(
      /export\s+default\s+defineConfig\s*\(\s*\{/,
      \"export default defineConfig({ base: './',\"
    );
    fs.writeFileSync('vite.config.js', s);
  "

  # BrowserRouter → HashRouter —— sed 兼容 macOS / Linux
  local SED_INPLACE="sed -i"
  if [[ "$(uname)" == "Darwin" ]]; then
    SED_INPLACE="sed -i ''"
  fi
  $SED_INPLACE 's/BrowserRouter/HashRouter/g' src/main.jsx

  npm run build

  # 还原 main.jsx —— 用 cp 不丢文件，再清理备份
  cp "$MAIN_BAK" src/main.jsx || fail "还原 src/main.jsx 失败（备份文件 $MAIN_BAK 丢失）"
  rm -f "$MAIN_BAK"

  # 还原 vite.config.js
  cp "$CFG_TMP" vite.config.js || fail "还原 vite.config.js 失败"
  rm -f "$CFG_TMP"

  local ZIP="cetpass-offline-$(date +%Y%m%d-%H%M).zip"
  rm -f cetpass-offline-*.zip
  run_zip "$ZIP"
  step "使用方法"
  echo "  1. 把 $ZIP 发给对方"
  echo "  2. 对方解压，进入 cetpass-offline/ 目录"
  echo "  3. 双击 index.html 即可（推荐 Chrome / Edge）"
  echo "  4. ⚠️ 离线打开时，语音朗读 / 口语跟读 / 部分浏览器 API 会被禁用，属正常安全限制"
}

# --------------------------- 纯构建 ---------------------------
build_only() {
  run_preflight
  run_build
  ok "产物位于 dist/，可直接上传任意静态托管"
}

show_help() {
  cat <<'EOF'
CETPass 一键部署脚本

用法：
  ./deploy.sh cloud     构建 + 交互式部署到 Vercel / Netlify / Cloudflare / GitHub Pages
  ./deploy.sh local     构建 + 本机起可分享的局域网预览服务
  ./deploy.sh offline   构建离线 zip（对方解压后双击 index.html 即可，语音功能受限）
  ./deploy.sh build     仅构建 dist/（自己用静态服务托管）
  ./deploy.sh help      打印此帮助

快速指南：
  大多数分享场景 → cloud（部署到 Vercel，几十秒拿链接）
  内网同事临时试 → local（npm run preview 同局域网访问）
  发给没网的朋友 → offline（zip + 双击 index.html）
EOF
}

# --------------------------- 入口 ---------------------------
ACTION="${1:-help}"
case "$ACTION" in
  cloud)   cloud_deploy ;;
  local)   local_deploy ;;
  offline) offline_deploy ;;
  build)   build_only ;;
  help|-h|--help|"") show_help ;;
  *)       fail "未知参数：$ACTION  （可用 cloud / local / offline / build / help）" ;;
esac
