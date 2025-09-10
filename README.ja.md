<div align="center">
  <img src="docs/images/figma-flutter-mcp.png" alt="テーマ設定の例" style="max-width: 100%; height: auto;">
  
  <br>

  <h1>Figma to Flutter MCP サーバー</h1>
  <h3>Figma の豊富なデータをコーディングエージェントで活用。<br/>Flutter のやり方でデザインを実装しよう！</h3>
  <a href="https://npmcharts.com/compare/figma-flutter-mcp?interval=30">
    <img alt="週間ダウンロード" src="https://img.shields.io/npm/dm/figma-flutter-mcp.svg">
  </a>
  <a href="https://github.com/mhmzdev/figma-flutter-mcp/blob/main/LICENSE">
    <img alt="MIT ライセンス" src="https://img.shields.io/github/license/mhmzdev/figma-flutter-mcp" />
  </a>
  <a href="https://twitter.com/mhmzdev">
    <img alt="Twitter" src="https://img.shields.io/twitter/url?url=https%3A%2F%2Fx.com%2Fmhmzdev&label=%40mhmzdev" />
  </a>
</div>
<br>

Cursor やその他の AI 対応ツールを使用して、[MCP サーバー](https://modelcontextprotocol.io/) 経由で Figma の豊富なファイル、データ、コンポーネントなどへアクセスしましょう。

## 📋 目次

- [🎥 ビデオデモ](#-ビデオデモ)
- [📝 はじめに](#-はじめに)
- [📚 仕組み](#-仕組み--詳細はこちら)
- [🤖 AI コーディングエージェント支援](#-ai-コーディングエージェント支援)
- [🛠️ 使い方](#-使い方)
  - [🔑 Figma API キー](#-figma-api-キー)
  - [🏹 Cursor での MCP](#-cursor-での-mcp)
  - [🧑🏼‍💻 ローカルセットアップ](#-ローカルセットアップ)
- [🧱 基本的なワークフロー](#-基本的なワークフロー)
  - [⚠️ なぜ SVG アセットは画面生成で機能しないのか](#-なぜ-svg-アセットは画面生成で機能しないのか)
- [🧰 MCP ツール](#-mcp-ツール)
- [⚠️ 免責事項](#-免責事項)
- [🙌🏼 謝辞](#-謝辞)
- [🧱 その他のフレームワーク](#-その他のフレームワーク)
- [🔑 ライセンス](#-ライセンス)
- [🙋‍♂️ 作者](#-作者)
  - [Muhammad Hamza](#muhammad-hamza)


## 🎥 ビデオデモ
Figma Flutter MCP のほぼすべての機能を、実際の Figma デザインで紹介しています。
- 英語: https://youtu.be/lJlfOfpl2sI
- ウルドゥー語/ヒンディー語: https://youtu.be/mepPWpIZ61M

## 📝 [はじめに](docs/getting-started.md)
詳しい手順は [getting started](docs/getting-started.md) を参照してください。クイックスタートには [デモ動画](https://youtu.be/lJlfOfpl2sI) もご利用いただけます。初回リリースのため、改善の余地が多くあります。改善点や追加で取り組める点は [issues](https://github.com/mhmzdev/figma-flutter-mcp/issues) をご確認ください。

## 📚 仕組み | [詳細はこちら](docs/figma-flutter-mcp.md)
1. [コンポーネント/ウィジェット](src/extractors/components/)
- ✅ Figma ノードデータの抽出: レイアウト、スタイル、寸法、色、テキスト内容など
- ✅ 構造の分析: 子要素、ネストされたコンポーネント、視覚的な重要度
- ✅ ガイダンス提供: Flutter ウィジェットと実装パターンの提案
- ❌ 実際の Flutter コードファイルは生成しません

2. [スクリーン](src/extractors/screens/)
- ✅ スクリーンのメタデータ抽出: デバイス種別、向き、寸法
- ✅ セクションの特定: ヘッダー、フッター、ナビゲーション、コンテンツ領域
- ✅ ナビゲーションの分析: タブバー、AppBar、ドロワー、ナビゲーション要素
- ✅ Scaffold 構成ガイド: Flutter の画面構造を提案
- ❌ 実際の Flutter 画面は生成しません

本ツールは、AI が Flutter コードを書くのを支援するものです。つまり、プロンプトを工夫するほど、より良い結果が得られます。

### 🤖 AI コーディングエージェント支援
より良い結果を得るため、使用中の AI コーディングエージェントに合わせて以下のファイルに指示を設定できます:
- Cursor: `.cursor/rules/fluttering.mdc`
- Claude: `CLAUDE.md`
- Gemini CLI: `GEMINI.md`

これにより、AI エージェントは MCP の出力を活用し、Flutter コードがプロジェクトの要件や構造に沿うようにします。テストで使用した [Cursor ルール例](docs/cursor_rules_example.md) もご参照ください。

## 🛠️ 使い方
以下は最小限の使用・設定手順です:

### 🔑 Figma API キー
このサーバーを使用するには Figma のアクセス トークンが必要です。Figma API アクセストークンの作成方法は[こちら](https://help.figma.com/hc/en-us/articles/8085703771159-Manage-personal-access-tokens)を参照してください。

### 🏹 Cursor での MCP
FIGMA API KEY を用意したら、Cursor で MCP を次の手順で設定します:
1. CMD + Shift + P（Windows は Ctrl）
2. "Open MCP Settings" と入力
3. "Add new MCP" をクリック
4. 次の JSON オブジェクトを貼り付け

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

> 注意: この MCP を `npm` パッケージとしてインストールした場合は、最新版に更新してください。古いバージョンがキャッシュされ、「ツール呼び出しを使用できない」や「Figma API キー設定が機能しない」等のエラーが出続けることがあります。

### 🧑🏼‍💻 ローカルセットアップ
ローカルセットアップでは、ローカルサーバーとバージョンが一致していることを確認してください。`npm i` によってグローバルにサーバーがインストールされ、ローカルの変更が上書きされて更新が反映されない場合があります。

#### 0. 必要条件
- Node.js 18+
- Figma API キー（アクセストークン）
- MCP をサポートする Cursor AI IDE
- Flutter SDK

#### 1. リポジトリのクローン
```
# プロジェクトをクローン/ダウンロード
git clone <your-repo-url> figma-flutter-mcp
cd figma-flutter-mcp

# 依存関係のインストール
npm install
```
#### 2. 設定
`.env` を使って各種値を設定できます。 [.env.example](.env.example) を参照してください。
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
> 注意: 上記 JSON を特定のプロジェクトのみで使いたい場合は `.cursor-mcp/config.json` に設定してください。ただし API_KEY を含むため、`.gitignore` に追加してバージョン管理に含めないよう注意してください。

#### 3. ビルド & 実行
```
# 開発モード（自動再起動あり）
npm run dev

# 本番モード
npm run build
```
MCP 設定でサーバーが動作し、ツールが利用可能になっていることを確認できます。

## 🧱 基本的なワークフロー
1. **テーマ & タイポグラフィの設定**: 最も効率的な方法は、Figma にテーマカラーとタイポグラフィのサンプルを配置した 2 つのフレームを用意することです。例:

![テーマ設定の例](docs/images/theme-frame.png)
![タイポグラフィ設定の例](docs/images/text-style-frame.png)

- Figma デスクトップ: フレーム選択後に CMD + L
- Figma Web: フレーム選択後に URL をコピー

> 💡 ヒント: 有効な URL には FILE ID と NODE ID のパラメータが含まれます。

```
"<figma_link> から Flutter のテーマを設定してください。Colors と Typography を含みます。"
```

2. **ウィジェット生成**: 最も効率的な方法は、Figma の COMPONENTS を使用することです。例:

![ボタン](docs/images/button.png)

この例には 8 つのバリアントがあります。バリアントを使用するかどうかはプロンプトで指示できます。
```
"このウィジェットを Flutter で作成してください <figma_link>。今は 2 つのバリアントのみ設定し、コードの可読性のためにファイルを小さく分割してください。"
```
Figma に COMPONENTS がない場合は、FRAME を使用できます。「このフレームをウィジェットにしたい」と AI に伝えれば対応します。

3. **フルスクリーン生成**: IMAGE ASSETS がある場合は `assets/` にエクスポートし、`pubspec.yaml` に追記します。
```
"この Figma リンクからフルスクリーンを作成してください <figma_link>。コードの可読性のためにファイルを小さく分割してください。"
```
4. **アセットのエクスポート**:
- 画像アセット: 画面生成時に自動で動作します。
```
"Figma からこの画像アセットをエクスポートしてください <figma_link>"
```
- SVG アセット: 自動では動作しません。以下を参照してください。
```
"Figma からこれを SVG アセットとしてエクスポートしてください: <figma_link>"
```
#### ⚠️ なぜ SVG アセットは画面生成で機能しないのか
Figma ではベクターにはアイコンやペンツールのシェイプが含まれるため、一括エクスポートでは意図しないノードまで取得してしまう可能性があります。SVG は個別にエクスポートすることを推奨します。このプロセスでも `assets/svg/` ディレクトリにアセットを保存し、`pubspec.yaml` を更新するため、時間の節約になります。

## 🧰 MCP ツール
アセット関連:
- `export_flutter_assets`: 画面生成とともに使う個別の画像アセット用ツール
- `export_svg_flutter_assets`: SVG アセットのエクスポート専用ツール

ウィジェット関連:
- `analyze_figma_component`: Figma の type=COMPONENT またはユーザー指定 FRAME の分析
- `list_component_variants`: Figma の type=COMPONENT_SET（ウィジェットのバリアント）一覧
- `inspect_component_structure`: ネストされた COMPONENTS や FRAMES の構造確認

スクリーン関連:
- `analyze_full_screen`: type=FRAME のフルスクリーン分析とアセット（画像）エクスポート
- `inspect_screen_structure`: レイアウトや画面実装に必要な情報の確認

## ⚠️ 免責事項

- **Figma デザイン**: Figma API でノードや詳細情報を取得するため、オートレイアウト、グループよりフレームの使用、全体の整合性など、デザイン品質が高いほど結果が良くなります。
- **ユースケース**: 現時点では拡張性の高いアプリ開発よりも、MVP、スモールプロジェクト、説明用タスクでの使用を推奨します。
- **レート制限**: 使いすぎると Figma のレート制限（例: HTTP 429）が発動する場合があります。サーバーにはバックオフ付きリトライがありますが、Figma の制限を回避するものではありません。制限に達した場合は数分待ち、リクエスト頻度を下げてください。

## 🙌🏼 謝辞
[Graham Lipsman](https://x.com/glipsman) 氏の [Figma Context MCP](https://github.com/GLips/Figma-Context-MCP) に触発され、以下の機能を明確に提供する Figma to Flutter MCP を開発しました:
- アセットのエクスポート
- カラーとテーマの設定
- ウィジェットツリーとフルスクリーン構築

今後、さらに機能を追加していきます...

## 🧱 その他のフレームワーク
React、Angular、React Native、Vue など他フレームワーク向けに開発したい場合は、詳細ドキュメント [Figma Framework MCP](docs/figma-framework-mcp.md) を参照してください。フレームワーク別の Figma MCP サーバーに取り組んでいる方の一覧も、今後ここにまとめる予定です。
- ...
- ...

## 🔑 ライセンス
このプロジェクトは MIT ライセンスのもとで公開されています。詳細は [LICENSE](LICENSE.md) を参照してください。

## 🙋‍♂️ 作者
#### Muhammad Hamza
[![LinkedIn Link](https://img.shields.io/badge/Connect-Hamza-blue.svg?logo=linkedin&longCache=true&style=social&label=Connect
)](https://www.linkedin.com/in/mhmzdev)

私の GitHub プロフィールをフォローすると、最新のプロジェクト情報を受け取れます:

[![GitHub Follow](https://img.shields.io/badge/Connect-Hamza-blue.svg?logo=Github&longCache=true&style=social&label=Follow)](https://github.com/mhmzdev)

このリポジトリが気に入ったら、ぜひ ⭐ をお願いします！

Copyright (c) 2025 MUHAMMAD HAMZA

---

デザインとコードの架け橋を目指すすべてのデザイナーと開発者のために、愛情を込めて作りました。


