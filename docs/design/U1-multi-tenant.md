# U1 — 多使用者註冊審核與獨立歌單空間（Multi-Tenant）

> **撰寫日期**：2026-07-02
> **狀態**：✅ Phase 1 完成（2026-07-02）— Google 註冊、審核後台、租戶空間、rules 均已上線
> **發起背景**：阿凱老師要開放系統給其他吉他彈唱者 —
> Google 帳號註冊 → 管理員審核 → 每人一套獨立空白的彈唱系統（歌單互不混淆）。

---

## 🎯 需求

1. **註冊與審核**：Google 帳號註冊；管理員後台審核通過才能使用。
2. **獨立歌單空間**：每位使用者一個全空白模板，與阿凱既有歌單完全隔離。

## 🏗️ 核心架構決策：租戶空間（tenant space）

```
訪客 / 阿凱（root admin） → 根集合 songs / votes / playedSongs / …（現狀，零遷移）
審核通過的使用者          → tenants/{uid}/songs、tenants/{uid}/votes、…（子集合鏡像）
```

- **零遷移**：阿凱的 382 首歌與所有歷史資料原地不動，公開投票頁照舊。
- **整套系統即租戶**：approved 使用者登入後，整個 app（歌單、投票、轉調工具、
  AI 辨識、演出模式）都在自己的空白空間運作 — 他就是自己空間的管理員。
- **實作機制**：`firebase.ts` 新增 `setActiveTenant(uid|null)` + `col(name)` helper。
  13 個 firestore 模組的 `collection(db, COLLECTIONS.x)` 全部改走 `col('x')`：
  activeTenant 為 null 走根集合，否則走 `tenants/{uid}/{name}`。
- **切換 = 整棵樹 remount**：`App.tsx` 給 Home 加 `key={spaceKey}`，
  登入/登出改變空間時所有 onSnapshot 訂閱自動重建，不用逐一改 useEffect 依賴。

## 👤 使用者生命週期

```
Google 登入（signInWithPopup）
  → users/{uid} 不存在 → 建立 { status:'pending', isAdmin:false, email, displayName, photoURL }
  → pending：看訪客首頁 + 「審核中」橫幅（可登出）
  → 管理員後台核准 → status:'approved'
  → approved：activeTenant = uid → 空白獨立系統，自己空間內視同管理員
  → 管理員可停權 → status:'rejected' → 同 pending 待審畫面（顯示未通過）
```

- 阿凱本人：`users/{uid}.isAdmin == true` → 永遠走根集合（現狀不變）。
- `AppUser` 介面加 `status: 'pending'|'approved'|'rejected'`、`displayName`、`photoURL`。

## 🔐 Firestore rules 重點

1. **users 權限補洞**（原規則 `allow write: if uid == userId` 讓任何登入者可自封 isAdmin！）：
   - create：只能建自己的 doc，且強制 `status == 'pending' && isAdmin == false`
   - update：本人只能改 profile 欄位（displayName/photoURL），**不能碰 status / isAdmin**
   - status / isAdmin 只有 root admin 能改
2. **tenants/{tenantId}/{document=**}**：owner（`auth.uid == tenantId` 且 status approved）
   全權讀寫；root admin 可讀（照看用）；訪客無權限。
3. 公開分享租戶投票頁（訪客投票）是 **Phase 2**：屆時再開 per-tenant 公開讀 + 投票驗證。

## 📦 Phase 1 異動清單

- `client/src/lib/firebase.ts` — tenant context（setActiveTenant / col / docRef）
- `client/src/lib/auth.ts` — signInWithGoogle + users doc 建立 + status 讀取 + 空間切換
- `client/src/lib/firestore/*.ts` + hooks — 集合參照改走 col()
- `client/src/components/LoginForm.tsx` — Google 登入/註冊按鈕
- `client/src/components/UserManagementModal.tsx`（新）— 管理員審核後台
- `client/src/pages/Home.tsx` — 空間判定 + pending 橫幅 + 審核後台入口
- `client/src/App.tsx` — spaceKey remount
- `firestore.rules` — users 補洞 + tenants 子樹
- Firebase Console：啟用 Google 登入提供者

## ✅ Phase 2 — 租戶公開投票頁（2026-07-02 完成）

- **公開網址**：`{站台}?space={uid}` — 訪客打開直接落在該租戶空間，
  可投票 / 點歌建議 / 打賞評分；`firebase.ts` 開機同步解析（任何訂閱建立前）。
- **空間解析優先序**：URL `?space` > approved 使用者自己的空間 > 根空間。
  在別人的公開頁上，任何登入者（含 root admin）一律訪客視角 —
  管理權只屬於「該空間擁有者本人」。
- **分享整合**（[spaceUrl.ts](../../client/src/lib/spaceUrl.ts)）：
  分享按鈕的 QR / 社群連結 / 新增的「一鍵複製網址」列都自動帶 `?space`；
  演出模式開新分頁也帶 `?space`（投影裝置未登入也落在正確空間）。
- **rules**：tenants/{uid} 逐集合鏡像根集合權限 — 公開讀 +
  votes/suggestions/interactions/funnelEvents/qrScans 訪客可寫（沿用同一套
  驗證函式），owner 全權管理，root admin 唯讀照看。已部署。
- **已知小限制**：訪客的投票護照（localStorage）跨空間共用同一份紀錄。

## 🔮 Phase 3（未排程）

- 租戶自訂品牌（標題、期數、主題色 — settings 已隨空間隔離，只差 UI）
- AI 辨識額度 per-tenant 治理（目前全站共用 200/日）
- 短網址 / 自訂 slug（`?space=長uid` → `/u/kai` 之類的好記入口）
