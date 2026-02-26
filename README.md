# ものがたり つくろう！

ことばを ならべて おはなしを つくる こどもよう ワードゲームです。

文章を組み立てると、Gemini API を使って AI がその物語のイラストを生成してくれます。

## 機能

- 選択肢の単語から2つの文章を組み立てるゲーム（ダミー単語あり）
- 全10問からランダムに5問出題
- 正解するとスコア獲得
- Gemini API による文章のイラスト自動生成
- 生成されたイラストのダウンロード
- PC / タブレット / スマホ対応のレスポンシブデザイン
- 子供向けのカラフルでシンプルなUI（ひらがな表記）

## 必要なもの

- [Node.js](https://nodejs.org/) v18 以上
- npm（Node.js に同梱）
- [Gemini API Key](https://aistudio.google.com/apikey)（画像生成に必要）

## 開発方法

### 1. リポジトリのクローン

```bash
git clone https://github.com/okmtdev/monogatari-tukurou.git
cd monogatari-tukurou
```

### 2. 依存パッケージのインストール

```bash
npm install
```

### 3. 開発サーバーの起動

```bash
npm run dev
```

ブラウザが自動で開きます（デフォルト: http://localhost:5173）。

ファイルを編集するとホットリロードで即座に反映されます。

### 4. Gemini API Key の設定

ゲーム開始画面で Gemini API Key を入力してください。
API Key は [Google AI Studio](https://aistudio.google.com/apikey) から無料で取得できます。

> **注意:** API Key はブラウザの localStorage に保存されます。本番環境では適切なセキュリティ対策を検討してください。

## ビルド

本番用の静的ファイルを生成します。

```bash
npm run build
```

`dist/` ディレクトリにビルド成果物が出力されます。

### ビルド結果のプレビュー

```bash
npm run preview
```

## Google Cloud Storage へのデプロイ

### 前提条件

- [Google Cloud SDK (gcloud CLI)](https://cloud.google.com/sdk/docs/install) がインストール済み
- Google Cloud プロジェクトが作成済み
- 課金が有効化済み

### 手順

#### 1. gcloud CLI の認証とプロジェクト設定

```bash
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
```

#### 2. Cloud Storage バケットの作成

```bash
gsutil mb -l asia-northeast1 gs://YOUR_BUCKET_NAME
```

> バケット名はグローバルで一意にしてください（例: `monogatari-tukurou-web`）。

#### 3. バケットを公開設定にする

```bash
gsutil iam ch allUsers:objectViewer gs://YOUR_BUCKET_NAME
```

#### 4. 静的ウェブサイトの設定

```bash
gsutil web set -m index.html -e index.html gs://YOUR_BUCKET_NAME
```

#### 5. ビルドとアップロード

```bash
npm run build
gsutil -m rsync -r -d dist/ gs://YOUR_BUCKET_NAME
```

#### 6. キャッシュヘッダーの設定（任意）

```bash
gsutil -m setmeta -h "Cache-Control:public, max-age=3600" gs://YOUR_BUCKET_NAME/**
```

#### 7. アクセス確認

以下の URL でアクセスできます。

```
https://storage.googleapis.com/YOUR_BUCKET_NAME/index.html
```

### カスタムドメインを使う場合（任意）

Cloud Storage の静的ウェブサイトにカスタムドメインを設定する場合は、Cloud Load Balancing を使用します。

```bash
# バケット用のバックエンドバケットを作成
gcloud compute backend-buckets create YOUR_BACKEND_NAME \
  --gcs-bucket-name=YOUR_BUCKET_NAME \
  --enable-cdn

# URL マップを作成
gcloud compute url-maps create YOUR_URL_MAP_NAME \
  --default-backend-bucket=YOUR_BACKEND_NAME

# HTTPS プロキシを作成（SSL 証明書が必要）
gcloud compute target-https-proxies create YOUR_PROXY_NAME \
  --url-map=YOUR_URL_MAP_NAME \
  --ssl-certificates=YOUR_SSL_CERT

# フォワーディングルールを作成
gcloud compute forwarding-rules create YOUR_RULE_NAME \
  --target-https-proxy=YOUR_PROXY_NAME \
  --ports=443 \
  --global
```

詳細は [Cloud Storage の静的ウェブサイトホスティング](https://cloud.google.com/storage/docs/hosting-static-website) を参照してください。

### 更新時のデプロイ

コードを変更した後の再デプロイは以下のコマンドだけで完了します。

```bash
npm run build && gsutil -m rsync -r -d dist/ gs://YOUR_BUCKET_NAME
```

## プロジェクト構成

```
monogatari-tukurou/
├── index.html          # エントリーポイント（HTML）
├── src/
│   ├── main.js         # ゲームロジック
│   ├── style.css       # スタイル
│   ├── questions.js    # 問題データ
│   └── gemini.js       # Gemini API 連携
├── public/             # 静的アセット
├── package.json        # npm 設定
├── vite.config.js      # Vite 設定
├── .env.example        # 環境変数テンプレート
└── README.md           # このファイル
```

## ライセンス

ISC
