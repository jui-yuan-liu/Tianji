# 天機 (Tianji) - 紫微斗數投資決策平台

## 願景
結合傳統紫微斗數命理學與現代金融投資策略，為使用者提供基於個人運勢（本命、大運、流年、流月、流日）的專屬投資建議與市場回測分析。

## 核心功能

1.  **用戶管理與排盤系統**
    *   使用者註冊與生辰八字（年、月、日、時）持久化儲存。
    *   計算先天命盤（12宮位、十四主星、輔星、四化）。
    *   計算時間維度運勢：大運、流年、流月、流日。
    *   **宮位本位模式**：固定十二宮位，動態展示隨時間飛入的地支與星曜。

2.  **命理與財經關聯模型 (核心演算法)**
    *   **財帛宮 (Wealth Palace):** 判斷資金運用的能量強弱。
    *   **田宅宮 (Property Palace):** 判斷房地產或長期資產（如存股）的運勢。
    *   **福德宮 (Fortune Palace):** 判斷投資心態與風險承擔能力。
    *   **四化分析:** 
        *   化祿 (Wealth): 資金活水、進場訊號、獲利機會。
        *   化權 (Power): 擴大槓桿、強勢波段。
        *   化科 (Fame): 穩定標的、配息成長股。
        *   化忌 (Trouble): 破財風險、強烈避險/出場訊號。

3.  **投資推薦與回測引擎**
    *   **即時財經數據：** 串接 Yahoo Finance API 獲取真實大盤數據（如台股 TAIEX）。
    *   **歷史回測系統：** 根據使用者命盤，帶入使用者定義的歷史區間執行策略回測，並以 K 線圖視覺化買賣點。

## 技術架構
*   **Backend:** Node.js (Express)
*   **Database:** SQLite (`better-sqlite3`) 
*   **Auth:** JWT (`jsonwebtoken`), `bcrypt`
*   **Frontend:** 原生 HTML / JS / Tailwind CSS (CDN)
*   **Charts:** Lightweight Charts (v4.1.1)
*   **Astrology Lib:** 自研 `src/ziwei_*` 模組 (結合 `lunar-javascript`)
*   **ML Engine:** TensorFlow.js — 雙塔融合 DQN v3（可選特徵模組 + 動態維度）

## 目前已實作功能 (Current State)
*   [x] 完整十二宮位排盤引擎 (`ziwei_core.js`, `ziwei_stars.js`, `ziwei_periods.js`)
*   [x] 每日/每週運勢投資解析 API (`/api/daily-fortune`)
*   [x] Yahoo Finance 真實金融數據串接 API (`/api/market-data`)
*   [x] **Phase 1: 視覺化與互動重構**
    *   完成「宮位本位」的排盤視覺佈局（游標浮動 Tooltip 顯示星曜詳解）。
    *   整合今日運勢、綜合評分與投資策略儀表板。
    *   內建完整的命理與財經辭典 (`glossary.js`)。
*   [x] **Phase 2: 歷史回測系統 (Backtesting Engine)**
    *   完成 `src/backtest.js` 模組。
    *   可動態載入使用者生辰與歷史 TAIEX 數據，模擬流日財帛宮四化進出場，結算最終報酬率 (ROI) 與交易紀錄。
*   [x] **Phase 3: 會員系統整合 (User Auth)**
    *   導入 SQLite 與 JWT 認證機制 (`src/auth.js`, `src/db.js`)。
    *   建置登入/註冊頁面 (`login.html`)，會員資料自動帶入排盤室 (`chart.html`) 與首頁儀表板 (`index.html`)。
*   [x] **Phase 4: 命盤專屬 AI 強化學習 (RL) 訓練系統**
    *   針對每位使用者的生辰八字，訓練專屬的交易代理人 (Trading Agent)，讓 AI 學習命理與市場關聯。
    *   實作 RL 環境與特徵工程，定義 State Space（整合金融與命理數據）、Action Space 與 Reward Function。
    *   開發前端 AI 訓練儀表板 (`training.html`)，支援可選特徵、即時多指標曲線與訓練進度 KPI。
    *   實作模型持久化與權重儲存機制，將每位會員的專屬 AI 模型綁定儲存。
    *   將回測結果面板整合至 AI 訓練頁面，使用者能在訓練完成後立即查看專屬模型的績效指標 (ROI, MDD, Alpha 等) 與歷史交易訊號。
*   [x] **Phase 5: AI 驅動之進階回測與視覺化 (AI-Driven Backtesting)**
    *   替換靜態策略引擎：支援載入使用者專屬 AI 模型權重進行真實推論。
    *   首頁保留大盤技術線圖與今日 AI 實戰推論建議，並將歷史回測詳細圖表移至專屬訓練頁面。
    *   前端 K 線圖動態標記 AI 產生的每一筆交易訊號 (BUY / SELL)。
*   [x] **Phase 6: 推論可解釋性與交易真實化 (Explainability & Realism)**
    *   **AI 推論可解釋性**：在首頁與回測結果中加入決策原因說明，並以 SHAP 風格的拔河圖展現大盤動能、財帛能量等因子的貢獻度。
    *   **特徵工程升級**：將訓練特徵從 6 維擴展至 9 維，新增「流年、流月、流日盤」命宮座標，提升模型對時間空間規律的學習能力。
    *   **交易手續費模擬**：在 RL 環境與回測系統中實作真實台股交易成本（買入 0.1425%、賣出 0.4425% 稅費），抑制頻繁買賣。
    *   **動態數據管理**：實作自動檢查機制，當選取日期區間缺失時，後端自動向 Yahoo 下載並補足股市資料庫；同時在 UI 限制無法選擇未來日期。
*   [x] **Phase 7: RL 訓練環境深度優化 (Deep RL Environment Optimization)**
    *   **高維度特徵工程**：特徵空間從 9 維大幅擴展至 61 維。
    *   **資產感知系統**：在 State Space 中新增「當前持倉股數」與「剩餘現金量」的正規化數值。
    *   **精細化動作空間**：將動作擴展為 11 個，支援不同比例的進出場操作。
*   [x] **Phase 7.1: AI 訓練平台 v3 升級 (2026-07-09)**
    *   **可選特徵模組 (Schema v3)**：`src/rl_features.js` 重構為 15 個可獨立開關的特徵群組（技術指標、量價、流年流月流日、滿月週期等），動態組裝 16–58 維狀態向量。
    *   **雙塔融合 DQN v3**：`src/rl_agent.js` 依選取特徵自動計算 `marketDim` / `metaDim`，股市塔與命理塔分離編碼後融合決策。
    *   **訓練頁特徵選擇 UI**：`training.html` 提供分類勾選、全選/預設/精簡快捷鍵、即時維度預覽；API `GET /api/train/features` + 靜態備援 `public/feature-catalog.json`。
    *   **即時訓練監控**：SSE 推送世代內 tick（約每世代 50 點），支援 ROI、累積獎勵、ε、訓練損失、最大回撤、持倉比例等多指標切換曲線與 10 項 KPI。
    *   **財帛宮對齊**：流年/流月/流日/大運皆以財帛宮四化與主星為核心，與靜態回測策略一致。
    *   **獎勵機制強化**：閒置現金按 2% 年化通膨每日折損購買力；觀望未成交另有不交易懲罰，避免模型長期空手。
    *   **模型 Meta 持久化**：儲存 `enabledFeatures`、`rewardConfig`、`marketDim`、`featureSchemaVersion: 3`。
    *   **儀表板 UX**：滿版 RWD 佈局、參數懸浮說明 (tooltip)、修復 Chart.js 無限擴張導致頁面當機問題。
*   [ ] **Phase 8: 台股命盤共振推薦系統 (Stock-User Resonance)**
    *   **股票生辰採集**：抓取台股上市公司設立日期作為「出生時間」，擴充 `tw_stocks` 資料庫欄位。
    *   **股票命盤預處理**：批次計算所有股票的先天命盤特徵（主星、五行局）並持久化。
    *   **共振演算法**：開發人股契合度評分模型，計算使用者命盤與股票命盤的「星曜感應」、「四化觸發」與「五行相生」。
    *   **推薦 API 與 UI**：實作 `/api/recommend-stocks` 並於前端展示契合度前 10 名標的及其匹配原因。

---

## 開發日誌 (Changelog)

### 2026-07-09 — AI 訓練平台 v3 與儀表板強化

#### 後端 / RL 核心
| 項目 | 說明 |
|------|------|
| `src/rl_features.js` | Feature Schema **v3**：15 個模組化特徵（價格動能、MA、波動率、RSI、量價三項、持倉、生辰、大運/流年/流月/流日財帛、農曆、滿月週期） |
| `src/rl_agent.js` | 雙塔 DQN v3，動態 `marketDim`；`replay()` 回傳訓練損失供即時監控 |
| `src/rl_env.js` | 支援 `featureConfig`；**通膨折損**（現金 × 2%/252）與**不交易懲罰**；`step()` 回傳 `inflationLoss`、`traded` 等 info |
| `src/rl_train.js` | 世代內 tick 推送、模型 meta 寫入 `enabledFeatures` / `rewardConfig` |
| `src/backtest.js` | 依模型 meta 的 `enabledFeatures` 還原特徵配置，舊 51 維模型自動相容 |
| `server.js` | 新增 `GET /api/train/features`；訓練 API 接受 `features` 參數；SSE 防緩衝即時 flush |

#### 前端
| 項目 | 說明 |
|------|------|
| `public/training.html` | 可選特徵 UI、即時多指標曲線（6 條可切換）、10 項 KPI、訓練進度條、獎勵機制說明面板 |
| `public/feature-catalog.json` | 特徵目錄靜態備援（API 不可用時自動 fallback） |
| `public/dashboard.css` / `nav.js` | 滿版儀表板設計系統、手機側欄 RWD、參數 tooltip |

#### 問題修復
- 特徵勾選無反應：舊版 server 未載入 `/api/train/features`（404）→ 已加重啟與靜態備援
- 特徵 UI 僅在登入後初始化 → 改為頁面載入即渲染
- Chart.js 在 `min-height` 容器內無限 resize → 鎖定 `.train-chart-wrap` 固定高度

#### 預設配置參考
- 預設特徵：**51 維**（與舊 v2 相容）
- 全開特徵：**58 維**（含 RSI、量價擴充、滿月週期）
- 通膨：年化 **2%**，252 交易日折算
- 不交易懲罰：每日 **0.003%** × 現金佔比（佔初始資金）

---

## 未來開發計畫 (Next Steps for Next Agents)
未來的開發者請依序參考以下計畫推進專案，本專案將從靜態命理回測工具，正式升級為「基於個人命理特徵的 AI 量化交易訓練平台」：

### 1. Phase 8: 台股命盤共振推薦系統 (Stock-User Resonance) — 進行中
完成人股契合度評分，並將共振特徵接入 RL 訓練可選模組。
*   **Step 1: 股票命盤資料完善**
    *   補齊 `tw_stocks` 設立日期，完善 `stock_features` 預處理批次任務。
    *   驗證 `src/resonance_engine.js`、`src/stock_matcher.js` 評分邏輯與單元測試。
*   **Step 2: 推薦 API 與前端整合**
    *   完成 `/api/recommend-stocks` 並於首頁或排盤室展示 Top 10 契合標的與原因。
*   **Step 3: 接入 RL 特徵（可選）**
    *   在 `rl_features.js` 新增 `resonance` 特徵群組，讓 AI 訓練可選用個股共振分數。

### 2. Phase 8.1: AI 訓練進階調校
延續今日 v3 架構，提升訓練品質與可用性。
*   **Step 1: 超參數與獎勵可調**
    *   訓練頁開放通膨率、不交易懲罰係數、手續費率等 `rewardConfig` 設定。
    *   微調時強制校驗特徵維度與基底模型一致，避免靜默跳過權重載入。
*   **Step 2: 訓練 API 認證**
    *   `/api/train` 接入 JWT，取代 `userId` query 參數。
*   **Step 3: 個股/multi-asset 訓練**
    *   支援選擇標的（非僅 TAIEX），並與 Phase 9 市場擴充銜接。

### 3. Phase 9: 多市場、資產類別與極短線支援 (Multi-Asset & Short-term)
橫向擴展平台支援的金融商品與交易頻率。
*   **Step 1: 擴充市場數據源**
    *   修改 `/api/market-data`，增加對美股 (S&P 500, NASDAQ) 及加密貨幣 (BTC, ETH) 的即時與歷史數據抓取能力。
    *   在前端儀表板新增市場切換功能，讓 AI 能跨市場學習命盤與不同資產的連動性。
*   **Step 2: 實作超短線預測模型 (當沖)**
    *   針對 24 小時交易的市場 (如加密貨幣)，導入「流時盤」(每兩小時運勢變化) 作為更細微的時間維度特徵。
    *   優化強化學習環境，訓練出支援高頻交易或當沖操作的極短線專屬 AI 模型。

### 4. Phase 10: 自動化推播與通知系統 (Automated Notifications)
將 AI 模型應用於每日實戰，提供即時的投資決策輔助。
*   **Step 1: 建立背景排程 (Cron Jobs)**
    *   實作背景定時任務 (如 Node.js 的 `node-cron`)，每日台股開盤前 (例如 08:30) 自動執行。
    *   系統自動抓取所有會員生辰，計算當日流日命理特徵，並餵入各自的專屬 AI 模型預測今日最佳操作。
*   **Step 2: 第三方通訊軟體整合**
    *   串接 Line Messaging API 或 Telegram Bot API。
    *   當專屬 AI 預測強烈進出場訊號，或命盤出現極端四化 (大吉/大凶) 時，自動發送客製化提醒至會員手機（例如：「天機 AI 警示：今日財帛逢忌且模型建議清倉，請留意下行風險」）。
