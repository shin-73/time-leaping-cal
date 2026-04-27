# Time-Leap Cal

西暦から過去の空気感へタイムスリップできるWebアプリケーションです。

## 機能
- **西暦 / 和暦 のシームレスな相互変換**
- **パーソナライズと日本特有の「学年」計算**
- **没入型のビジュアル体験**
- **SNSシェア機能**

## 開発環境
- React (Vite)
- TypeScript
- Tailwind CSS
- Lucide React

## ご利用方法
1. 左上のフォームに生年月日を入力します
2. 検索したい年（例: 2000, 平成12）を入力します
3. その年の出来事やヒット曲、当時のあなたの年齢などの軌跡が表示されます

## 仕様とQAの正本
- 仕様の正本: `spec.md`
- 品質保証基準の正本: `tests/QUALITY_ASSURANCE_CRITERIA.md`

実装変更時は、上記2ファイルを同時に更新して整合性を維持してください。

## API配管の注意点
- 本番のGemini通信は必ず `api/generate-narrative`（Vercel Serverless Function）経由とし、クライアントからGeminiへ直接接続しないでください。
- APIキーはサーバー環境変数で管理し、ブラウザへ露出する実装へ戻さないこと。

## デプロイ運用（Vercel）
- 本番公開は GitHub `main` への push をトリガーに、Vercel の自動デプロイで更新する。
- 原則として手動 `vercel --prod` は非常時のみ利用し、通常運用では実行しない。
- 反映確認は「Vercel デプロイ成功」かつ「本番URLで主要導線の動作確認」の両方を満たして完了とする。

## フォント運用ルール
- `index.html` で配信している Google Fonts の weight 範囲を超えるクラス（例: `font-black`）は使わない。
- タイポグラフィの見直し時は `spec.md` と `tests/QUALITY_ASSURANCE_CRITERIA.md` を同時更新し、仕様と検証観点を同期する。

## 実機確認運用（dev:lan）
- 実機確認が想定される作業完了時は、`dev:lan` が未起動であれば「実機確認用に起動しますか？」と確認してから起動する。
- 起動を行う場合は、既存プロセス確認 → 必要時のみ `dev:lan` 起動 → アクセスURL共有までを1セットで実施する。
