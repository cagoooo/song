# 變更紀錄 Changelog

本檔記錄「互動式吉他彈唱點播平台」對外的版本變更，格式參考 [Keep a Changelog](https://keepachangelog.com/zh-TW/1.1.0/)。
完整里程碑與設計脈絡見 [ROADMAP.md](ROADMAP.md)。

> 🤖 想從 git 提交自動產生分組清單：`npm run changelog`（見 `scripts/gen-changelog.mjs`，無需安裝套件）。

---

## v4.7.3 — 2026-06-02
### 新增
- **現場回顧時間軸（B1）**：左下浮動 pill + 可點開時間軸，補看近 30 分鐘黑馬/全站熱度亮點，打字時錯過的標「🙈」；有未讀脈動、開啟即已讀、無亮點自動隱藏。

## v4.7.2 — 2026-06-02
### 新增
- **主歌單超寬螢幕雙欄（C1）**：演出投影 ≥1536px 時主歌單排雙欄（非虛擬純 CSS grid、虛擬清單用 react-virtual lanes）。

## v4.7.1 — 2026-06-02
### 新增
- **「我的推薦」本機追蹤（A1）**：訪客送出後本機記錄，回站比對歌單即時狀態（待審核 / 已採納 🎉 / 已加入 / 未採納 / 已下架），狀態變好時慶祝一次。

## v4.7.0 — 2026-06-02
### 新增
- **推薦/防干擾漏斗埋點（E1）**：localStorage 聚合，`window.songFunnel()` 看本機漏斗與轉換率。
- **待審核建議批次審核（D1）**：管理員批次勾選 → 全選待審核 / 批准 / 拒絕 / 刪除。
### 建置
- **CI 升 Node 24（F1）**：`FORCE_JAVASCRIPT_ACTIONS_TO_NODE24`，提前對齊 GitHub 2026-06-16 強制；deploy build Node 20→22。

## v4.6.9 — 2026-06-02
### 新增
- 社群推薦清單寬螢幕加第三欄（`xl:grid-cols-3`）。
### 變更
- v4.6.2 ~ v4.6.9「輸入 / 防干擾 / 捲動」體系整批正式部署上線；移除舊版殘留的 App Check（消除 console 403 噪音）。

## v4.6.2 ~ v4.6.8 — 2026-06-02（專注輸入 / 防干擾體系）
### 新增
- **社群推薦清單 RWD 捲動修正** + composing guard 防干擾基礎設施（手機自然展開 / 桌機限高捲動）。
- **表單草稿自動暫存**、**即時重複偵測**、**IME 組字保護**、**送出成功儀式**。
- **防干擾分級 soft/hard**（搜尋淡化、表單暫停）+ 搜尋框 `data-dnd="off"` 例外。
- **行動裝置鍵盤遮擋處理** + sticky 送出鈕。
- 共用 **ResponsiveScrollList**；全站 Radix ScrollArea 稽核（修 VoteHistoryModal 裁切）。
- **被抑制事件補播**：填表單時錯過的黑馬/熱度，打完字後提示。
### 測試
- 單元/整合測試自 387 增至 462，全綠。

## v4.6.0 ~ v4.6.1 — 2026-05（演出儀式三件套 + hotfix）
### 新增
- **UpNextBar** 底部隊列條、**VoterPassport** 催歌履歷、**OpeningCurtain** 開場儀式。
### 修正
- CSS `@import` 順序救援（整站跑版 hotfix）。

## v4.3.0 ~ v4.5.0 — 2026-05（Editorial 雜誌風大改版）
### 新增
- 全站 Editorial 雜誌風視覺重塑（白底 + 暖米色 + 雜誌藍 + Playfair / JetBrains Mono）。
- **SongDetailModal**（和弦圖 / 歌詞 / 相似歌）、**節目單分享卡**（IG + FB OG）、**END OF SIDE A 收尾儀式**。
- **演出模式 StagePage**（`?mode=stage`）：大字 NOW PLAYING + UP NEXT + QR 投票。

## v4.0.x ~ v4.2.0 — 2026-04 ~ 05（功能完整化）
### 新增
- 集體投票特效、領袖板、鍵盤快捷鍵、深色模式。
- 黑馬時刻、COMBO 連擊、全站熱度等即時慶祝特效。
- 統計儀表板（圖表 + KPI + CSV 匯出）、模糊搜尋、歌曲難度標記、排序選項。
- 新歌建議 + 重複檢測、QR 分享、PWA（SW 自動 bump + 更新提示）。
