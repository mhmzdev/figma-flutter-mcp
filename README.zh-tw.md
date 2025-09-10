<div align="center">
  <img src="docs/images/figma-flutter-mcp.png" alt="主題設定範例" style="max-width: 100%; height: auto;">
  
  <br>

  <h1>Figma to Flutter MCP 伺服器</h1>
  <h3>在你的程式代理中善用 Figma 的豐富資料。<br/>以 Flutter 的方式實作設計！</h3>
  <a href="https://npmcharts.com/compare/figma-flutter-mcp?interval=30">
    <img alt="每週下載量" src="https://img.shields.io/npm/dm/figma-flutter-mcp.svg">
  </a>
  <a href="https://github.com/mhmzdev/figma-flutter-mcp/blob/main/LICENSE">
    <img alt="MIT 授權" src="https://img.shields.io/github/license/mhmzdev/figma-flutter-mcp" />
  </a>
  <a href="https://twitter.com/mhmzdev">
    <img alt="Twitter" src="https://img.shields.io/twitter/url?url=https%3A%2F%2Fx.com%2Fmhmzdev&label=%40mhmzdev" />
  </a>
</div>
<br>

使用 [Cursor](https://cursor.sh) 或其他 AI 工具，透過 [MCP 伺服器](https://modelcontextprotocol.io/) 存取 Figma 的檔案、資料、元件與更多內容。

## 📋 目錄

- [🎥 影片示範](#-影片示範)
- [📝 開始使用](#-開始使用)
- [📚 運作原理](#-運作原理--詳情請見)
- [🛠️ 使用方式](#-使用方式)
  - [🔑 Figma API 金鑰](#-figma-api-金鑰)
  - [🏹 Cursor 中的 MCP](#-cursor-中的-mcp)
  - [🚀 本機測試快速開始](#-本機測試快速開始)
- [🧱 基本工作流程](#-基本工作流程)
  - [🤖 AI 程式代理協助](#-ai-程式代理協助)
  - [⚠️ 為什麼 SVG 資源無法在螢幕產生時運作](#-為什麼-svg-資源無法在螢幕產生時運作)
- [🧰 MCP 工具](#-mcp-工具)
- [⚠️ 免責聲明](#-免責聲明)
- [🙌🏼 致謝](#-致謝)
- [🧱 其他框架](#-其他框架)
- [🔑 授權條款](#-授權條款)
- [🙋‍♂️ 作者](#-作者)
  - [Muhammad Hamza](#muhammad-hamza)


## 🎥 影片示範
以真實的 Figma 設計展示 Figma Flutter MCP 的幾乎所有功能。
- 英文：https://youtu.be/lJlfOfpl2sI
- 烏爾都語/印地語：https://youtu.be/mepPWpIZ61M

## 📝 [開始使用](docs/getting-started.md)
你可以參考更詳細的 [getting started](docs/getting-started.md) 文件，或觀看[示範影片](https://youtu.be/lJlfOfpl2sI) 來快速上手。由於這是首次發佈，仍有許多可改進之處；歡迎查看 [issues](https://github.com/mhmzdev/figma-flutter-mcp/issues) 了解待辦與改進方向。

## 📚 運作原理 | [詳情請見](docs/figma-flutter-mcp.md)
1. [元件/小工具](src/extractors/components/)
- ✅ 提取 Figma 節點資料：版面、樣式、尺寸、色彩、文字內容等
- ✅ 分析結構：子元素、巢狀元件、視覺重要性
- ✅ 提供指引：建議 Flutter 小工具與實作模式
- ❌ 不會產生實際的 Flutter 程式碼檔案

2. [畫面](src/extractors/screens/)
- ✅ 提取畫面中繼資料：裝置類型、方向、尺寸
- ✅ 辨識區塊：頁首、頁尾、導覽、內容區域
- ✅ 分析導覽：標籤列、AppBar、抽屜、導覽元素
- ✅ 提供 Scaffold 指南：建議 Flutter 畫面結構
- ❌ 不會產生實際的 Flutter 畫面

此專案旨在協助 AI 撰寫 Flutter 程式碼，因此，**更好的提示會帶來更好的結果**。

## 🛠️ 使用方式
以下步驟示範最小化的使用與設定方式：

### 🔑 Figma API 金鑰
你需要建立 Figma 存取權杖才能使用此伺服器。如何建立 Figma API 存取權杖，請參考[此處](https://help.figma.com/hc/en-us/articles/8085703771159-Manage-personal-access-tokens)。

### 🏹 Cursor 中的 MCP
取得 FIGMA API KEY 後，可在 Cursor 依下列步驟設定 MCP：
1. 按 CMD + Shift + P（Windows 為 Ctrl）
2. 輸入 "Open MCP Settings"
3. 點擊 "Add new MCP"
4. 貼上以下 JSON 物件

#### MacOS/Linux
```
{
  "mcpServers": {
    "Figma Flutter MCP": {
      "command": "npx",
      "args": ["-y", "figma-flutter-mcp", "--figma-api-key=YOUR-API-KEY", "--stdio"]
    }
  }
}
```
#### Windows
```
{
  "mcpServers": {
    "Figma Flutter MCP": {
      "command": "cmd",
      "args": ["/c", "npx", "-y", "figma-flutter-mcp", "--figma-api-key=YOUR-API-KEY", "--stdio"]
    }
  }
}
```

> 注意：若你已將此 MCP 以 `npm` 套件安裝，請確保維持最新版本。有時舊版本會被快取，導致持續出現「無法使用工具呼叫」或「Figma API 金鑰設定無效」等錯誤。

### 🚀 本機測試快速開始
在本機開發時，請確保版本與本機伺服器一致。有時 `npm i` 會把伺服器安裝為全域，導致覆寫本機變更，使你看不到更新。

#### 0. 先決條件
- Node.js 18+
- Figma API 金鑰（存取權杖）
- 支援 MCP 的 Cursor AI IDE
- Flutter SDK

#### 1. 複製儲存庫
```
# 複製或下載專案
git clone <your-repo-url> figma-flutter-mcp
cd figma-flutter-mcp

# 安裝相依套件
npm install
```
#### 2. 設定
可使用 `.env` 設定各種值。請參考 [.env.example](.env.example)
#### MacOS/Linux
```
{
  "mcpServers": {
    "figma-flutter-mcp": {
      "command": "node",
      "args": [
        "/Path/to/figma-flutter-mcp/dist/server.mjs",
        "--figma-api-key=YOUR_API_KEY",
        "--stdio"
      ]
    }
  }
}
```
#### Windows
```
{
  "mcpServers": {
    "figma-flutter-mcp": {
      "command": "node",
      "args": [
        "/Path/to/figma-flutter-mcp/dist/server.mjs",
        "--figma-api-key=YOUR_API_KEY",
        "--stdio"
      ]
    }
  }
}
```
> 注意：若只想在目前專案使用上述 JSON，請將設定放在 `.cursor-mcp/config.json`。惟其中包含 API_KEY，務必將此檔案加入 `.gitignore`。

#### 3. 建置與執行
```
# 開發模式（自動重啟）
npm run dev

# 正式模式
npm run build
```
你現在可以在 MCP 設定中確認伺服器是否正在運作，以及工具是否可用。

## 🧱 基本工作流程
### 🤖 AI 程式代理協助
為獲得更佳結果，你可依所使用的 AI 程式代理，在以下檔案中設定指引：
- Cursor: `.cursor/rules/fluttering.mdc`
- Claude: `CLAUDE.md`
- Gemini CLI: `GEMINI.md`

如此一來，AI 代理能運用 MCP 的輸出，確保 Flutter 程式碼符合你的專案需求與結構。你也可以參考測試時使用的 [Cursor 規則範例](docs/cursor_rules_example.md)。

1. **設定主題與字體樣式**：最有效的方式是在 Figma 中放置兩個畫框，內含主題色彩與字體樣式範例。例如：

![主題設定範例](docs/images/theme-frame.png)
![字體樣式設定範例](docs/images/text-style-frame.png)

- Figma 桌面版：選取畫框後按 CMD + L
- Figma 網頁版：選取畫框後複製 URL

> 💡 提示：有效的 URL 會包含 FILE ID 與 NODE ID 參數。

```
"從 <figma_link> 設定 Flutter 主題，包含 Colors 與 Typography。"
```

2. **產生小工具**：最有效的方式是使用 Figma 的 COMPONENTS。範例：

![按鈕](docs/images/button.png)

此範例包含 8 個變體，你可以在提示中指定是否使用變體。
```
"請以 <figma_link> 在 Flutter 建立此小工具；目前僅建立 2 個變體，並將檔案拆分為較小單元以提升可讀性。"
```
若你的 Figma 未使用 COMPONENTS，也可使用畫框（FRAME），並在提示中說明希望將其作為小工具，其餘由工具處理。

3. **產生完整畫面**：若有圖片資源（IMAGE ASSETS），會匯出至 `assets/` 並寫入 `pubspec.yaml`。
```
"根據此 Figma 連結 <figma_link> 建立完整畫面，並確保透過拆分檔案提升程式碼可讀性。"
```
4. **匯出資源**：
- 圖片資源：在產生畫面時會自動運作。
```
"從 Figma 匯出此圖片資源 <figma_link>"
```
- SVG 資源：不會自動運作，詳見下文。
```
"從 Figma 將其匯出為 SVG 資源：<figma_link>"
```
#### ⚠️ 為什麼 SVG 資源無法在螢幕產生時運作
在 Figma 中向量圖包含圖示與鋼筆工具繪製的形狀，大量匯出時可能會抓取到非預期的節點；建議個別匯出 SVG。此流程仍能節省大量時間，因為會將它們儲存至 `assets/svg/` 目錄並更新 `pubspec.yaml`。

## 🧰 MCP 工具
與資源相關：
- `export_flutter_assets`：配合畫面產生所使用的單一圖片資源匯出工具
- `export_svg_flutter_assets`：專用於匯出 SVG 資源的工具

與小工具相關：
- `analyze_figma_component`：用於 Figma 的 type=COMPONENT 或使用者指定的 FRAME
- `list_component_variants`：用於 Figma 的 type=COMPONENT_SET（小工具變體）
- `inspect_component_structure`：用於檢視巢狀的 COMPONENTS 或 FRAMES 結構

與畫面相關：
- `analyze_full_screen`：type=FRAME 的完整畫面分析與資源匯出（僅圖片）
- `inspect_screen_structure`：用於了解版面配置與畫面實作所需資訊

## ⚠️ 免責聲明

- **Figma 設計**：我們使用 Figma API 擷取節點與其詳細資訊；因此若你使用自動版面、優先使用畫框而非群組、並在整體上保持一致性，結果會更佳。
- **使用情境**：目前強烈建議不要用於開發可擴充的大型應用程式，而是用於 MVP、小型與說明性任務。
- **速率限制**：高強度使用可能觸發 Figma 速率限制（如 HTTP 429）。伺服器包含帶退避的重試機制，但無法繞過 Figma 限制。若遇到限制，請等待數分鐘並降低請求頻率。

## 🙌🏼 致謝
我受到 [Graham Lipsman](https://x.com/glipsman) 的 [Figma Context MCP](https://github.com/GLips/Figma-Context-MCP) 啟發，因而開發了專為 Flutter 的 Figma MCP，具備以下特色：
- 資源匯出
- 色彩與主題設定
- 小工具樹與完整畫面建構

更多功能，敬請期待……

## 🧱 其他框架
若你希望為 React、Angular、React Native、Vue 或其他框架開發此能力，我已撰寫詳細文件 [Figma Framework MCP](docs/figma-framework-mcp.md) 供你參考與入門。同時我也會在此維護清單，記錄各框架的 Figma MCP 伺服器進展。
- ...
- ...

## 🔑 授權條款
本專案採用 MIT 授權——詳見 [LICENSE](LICENSE.md) 檔案。

## 🙋‍♂️ 作者
#### Muhammad Hamza
[![LinkedIn Link](https://img.shields.io/badge/Connect-Hamza-blue.svg?logo=linkedin&longCache=true&style=social&label=Connect
)](https://www.linkedin.com/in/mhmzdev)

你也可以追蹤我的 GitHub 以取得最新專案更新：

[![GitHub Follow](https://img.shields.io/badge/Connect-Hamza-blue.svg?logo=Github&longCache=true&style=social&label=Follow)](https://github.com/mhmzdev)

如果你喜歡這個儲存庫，歡迎送上一顆星 ⭐！

Copyright (c) 2025 MUHAMMAD HAMZA

---

以熱愛之心打造，獻給想要銜接設計與程式之間鴻溝的設計師與工程師 ❤️。


