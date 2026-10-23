#!/usr/bin/env bash
# CETPass 版本快照脚本（方案B）
# 用法:
#   bash scripts/snapshot.sh [描述]
# 示例:
#   bash scripts/snapshot.sh "修复三级评分bug"
# 描述为空时默认 "manual"
#
# 产物: snapshots/YYYY-MM-DD_HHMM_<描述>/  （含完整源码 + snapshot.json 清单）

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

DESC="${1:-manual}"
# 描述只保留安全字符
DESC_SAFE="$(echo "$DESC" | tr -cs 'A-Za-z0-9_\-一-龥' '_' | sed 's/_$//')"
[ -z "$DESC_SAFE" ] && DESC_SAFE="manual"

TS="$(date +%Y-%m-%d_%H%M)"
SNAP_DIR="snapshots/${TS}_${DESC_SAFE}"

mkdir -p "$SNAP_DIR"

# 需要快照的源码/配置（白名单，避免把 node_modules/dist/zip 带进去）
ITEMS=(
  "src"
  "public"
  "scripts"
  ".github"
  "index.html"
  "package.json"
  "package-lock.json"
  "vite.config.js"
  "STORAGE_RULES.md"
  "deploy.sh"
  "vercel.json"
  "netlify.toml"
  ".gitignore"
)

COPIED=0
for item in "${ITEMS[@]}"; do
  if [ -e "$item" ]; then
    # 保留目录结构
    mkdir -p "$SNAP_DIR/$(dirname "$item")"
    cp -r "$item" "$SNAP_DIR/$item"
    COPIED=$((COPIED + 1))
  fi
done

# 生成快照清单
cat > "$SNAP_DIR/snapshot.json" <<EOF
{
  "app": "cetpass",
  "snapshotAt": "$(date -Iseconds)",
  "description": "$DESC",
  "items": $(printf '%s\n' "${ITEMS[@]}" | jq -R . | jq -s .),
  "copiedCount": $COPIED
}
EOF

SIZE="$(du -sh "$SNAP_DIR" | cut -f1)"
echo "✅ 快照已创建: $SNAP_DIR  ($SIZE, $COPIED 项)"
echo "   清单: $SNAP_DIR/snapshot.json"
