# CETPass 本地数据安全守则（更新前必读）

> 任何对本项目的代码更新，**必须先完整阅读本文件**，并逐条对照执行。
> 本守则的目标：**用户的 localStorage 学习进度在任何版本更新后都不丢失**。

---

## 一、绝对禁止的操作（红线）

1. ❌ 禁止修改 `KEY_PREFIX`（当前为 `cetpass_`）。
2. ❌ 禁止重命名 localStorage 的 key（`cetpass_profiles_vN`、`cetpass_active_vN`、`cetpass_state_vN_<id>`）。
3. ❌ 禁止在 `readData` / `readProfiles` 中执行 `localStorage.removeItem` 或覆盖原数据。
4. ❌ 禁止在迁移时删除旧版本 key（只复制不删除，升级失败可回退）。
5. ❌ 禁止在未写迁移逻辑的情况下改变 `words`、`daily`、`course` 等数据结构的字段含义。

---

## 二、必须遵守的操作（强制）

### 1. 数据结构变更
- 每次新增 / 修改 `emptyData()` 的字段，必须 **同步升级 `SCHEMA_VERSION`**。
- 在 `migrateData()` 中补充 `fromVersion < N` 的迁移段，**只补字段、不删字段、不改已有值**。
- 迁移后必须设置 `schemaVersion: SCHEMA_VERSION`。

### 2. 存储版本变更
- 如确需升级 `STORAGE_VERSION`（极不推荐，除非 key 本身冲突）：
  - 把旧版本号加入 `LEGACY_VERSIONS` 数组。
  - `getItemFallback()` 会自动回退读取旧 key。
  - 验证：用旧 key 写入测试数据 → 删新 key → 刷新 → 确认数据恢复。

### 3. 写入安全
- 所有 `localStorage.setItem` 必须放在 `try/catch` 中。
- 捕获到 `QuotaExceededError` 时必须 **提示用户**（toast / 通知），禁止静默失败。
- JSON 解析失败时返回空数据，但 **不得删除原 key**。

### 4. 落盘时机
- `beforeunload` 和 `visibilitychange` 事件中必须有强制落盘逻辑（已实现，勿删除）。
- 不要移除 `sessionRef` + `flush` 机制。

---

## 三、部署层规则

1. `index.html` 的缓存策略必须保持 `no-cache, no-store, must-revalidate`（见 `public/_headers` 与 `index.html` meta 标签）。
2. `/assets/*` 必须保持 `max-age=31536000, immutable`。
3. `npm run build` 必须保留 `node scripts/copy-404.cjs`（生成 SPA 回退用的 `404.html`），禁止删除。
4. 部署到静态托管（搜易云 / Vercel / Netlify 等）后，**必须在后台手动刷新 CDN 缓存**，确保用户拿到最新 `index.html`。

---

## 四、更新后的自检清单（每次更新后必做）

- [ ] `npm run build` 通过，`dist/404.html` 已生成。
- [ ] 浏览器中创建账号 → 学 1 个词 → 刷新 → 进度仍在。
- [ ] 把所有 `*_v2` key 复制到 `*_v1`、删除 `*_v2` → 刷新 → 账号与进度完整恢复（验证回退读取）。
- [ ] 模拟 `QuotaExceededError`（或检查代码路径）→ 确认有用户提示而非静默失败。
- [ ] 深链 `/plan`、`/study` 刷新不 404（验证 `404.html` 回退）。

---

## 五、数据保留边界（需向用户说明）

localStorage 的保证范围是：**同一浏览器 + 同一域名 + 用户未清理站点数据**。
以下情况数据可能丢失，不属于本守则保护范围，需提前告知用户：
- 用户手动清理浏览器数据 / 站点存储。
- 更换浏览器、设备或操作系统。
- 部署域名变更（localStorage 按域名隔离）。
- 浏览器隐私模式退出。

如需跨设备 / 跨浏览器同步，需另建账号体系 + 服务端存储，不在本地守则范围内。

---

## 六、关键文件速查

- 存储核心：[src/store/AppContext.jsx](./src/store/AppContext.jsx)
  - `KEY_PREFIX` / `STORAGE_VERSION` / `SCHEMA_VERSION` / `LEGACY_VERSIONS`
  - `getItemFallback()` / `migrateData()` / `readData()` / `writeData()` / `writeProfiles()`
- 缓存策略：[public/_headers](./public/_headers)
- SPA 回退：[scripts/copy-404.cjs](./scripts/copy-404.cjs)
