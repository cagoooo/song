# U1 — 多使用者註冊審核與獨立歌單空間（Multi-Tenant）

> **撰寫日期**：2026-07-02
> **狀態**：✅ Phase 1-3 完成（2026-07-02）— 註冊審核、租戶空間、公開投票、
> 好記短網址、自訂品牌、AI 額度分租戶治理均已上線
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

## ✅ Phase 3 — 審核介面升級 + 好記短網址 + 自訂品牌 + AI 額度治理（2026-07-02 完成）

### 審核介面升級
- 使用者反饋：審核卡片只顯示「（未提供名稱）」看不到 Google email。
  追查發現 `users` 集合混雜兩種資料：
  1. **Google 註冊**（有 `email`/`displayName`/`photoURL`/`status`）— 正常審核對象
  2. **舊系統殘留**（2025 年 Express 時代的 `username` + `password` hash 文件，
     20 字亂數 id，非真實 Firebase Auth 帳號）— 核准了也沒人能登入
- [UserManagementModal.tsx](../../client/src/components/UserManagementModal.tsx)
  現在完整顯示大頭貼 / 名稱 / email / 註冊日期；舊資料標記「舊系統資料」徽章，
  不給核准鈕，改給「刪除舊資料」（兩段式確認）。
- RWD：手機版資訊列與操作列上下堆疊、觸控目標 ≥38px、對話框寬度
  `calc(100vw-1.5rem)`。4 個元件測試涵蓋 Google 帳號顯示 / 舊資料分類 / 髒資料清理。

### 好記短網址（Phase 3a）
- `?space={uid}` 太長不好記 → 新增 `spaceSlugs/{slug}` 全域對照表
  （[spaceSlugs.ts](../../client/src/lib/firestore/spaceSlugs.ts)），
  租戶擁有者可在分享面板自訂 3-32 碼英數字 + dash 的代碼（如 `?space=my-band`）。
- `firebase.ts` 開機時判斷 URL 值是否符合 Firebase uid 格式（28 碼英數字）；
  不符合就當 slug，非同步查一次對照表解析成真正 uid，`setActiveTenant()`
  觸發全站唯一的 `subscribeActiveTenant` 訂閱者重新 remount。
  **已知取捨**：slug 解析前的一瞬間（一次 Firestore 往返，通常 <500ms）
  會短暫落在錯誤/空的集合路徑，之後自動修正 — 對「分享用連結」這種
  非即時互動場景可接受。
- `App.tsx` 的 `SpaceScope` 順勢重構：不再自己組合 `getUrlSpace() ?? user...`
  邏輯，改成單一訂閱 `firebase.ts` 的 `activeTenant`（唯一真相來源），
  同時修掉一個潛在 race：guest 分支若在 slug 解析完成後才觸發，
  舊寫法會用原始 slug 字串覆蓋掉已解析的 uid。

### 租戶自訂品牌（Phase 3b）
- Home.tsx 原本 5 處寫死「吉他彈唱之夜」（topbar / eyebrow / 卡帶標籤 / 頁尾 /
  瀏覽器分頁標題）全部改讀 `settings/branding` 文件
  （[branding.ts](../../client/src/lib/firestore/branding.ts) +
  `useSpaceBranding` hook），沒設定則維持預設名稱，零遷移風險。
- 刻意跟既有 D1 期刊系統（`settings/magazine`）分開存放，避免不同概念
  （品牌名稱 vs. 期數）耦合成同一份文件互相牽動。
- 分享面板新增「空間品牌名稱」編輯區，`user.isAdmin`（root 在根空間、
  租戶擁有者在自己空間）皆可編輯。

### AI 辨識額度分租戶治理（Phase 3c）
- 原本限流只有「全站 200/日」+「單裝置 30/日」兩層，租戶多了以後，
  單一租戶理論上可以用光全站配額餓死其他人。
- Supabase `guitar_ai_check_and_bump()` 加第三層「單一租戶空間 50/日」，
  沿用既有 `guitar_ai_usage(day, scope, count)` 表，用 `space:{uid}` 前綴
  隔開空間維度與既有的 client/global scope，零 schema 遷移。
  回傳值從 boolean 改成 `'ok'|'global'|'client'|'space'`，
  讓錯誤訊息能精準告知「是哪個維度用完了」。
- 前端 `aiSheetOcr.ts` 呼叫時帶上 `getActiveTenant()` 當 `space` 參數；
  edge function（guitar-ai-sheet v5）驗證格式後傳給 RPC。
  根空間（阿凱自己）`space` 為 null，不套用租戶維度限制，維持原行為。

## 🔮 Phase 4（未排程）

- 租戶公開分享頁的訪客投票護照（localStorage）目前跨空間共用同一份紀錄，
  之後可考慮依空間分開存
- spaceSlugs 解析加一層記憶體快取，同一 session 內重複開連結免重查 Firestore
