# MeshiTrack

[![Deploy to GitHub Pages](https://github.com/moke-cloud/meshi-track/actions/workflows/deploy.yml/badge.svg)](https://github.com/moke-cloud/meshi-track/actions/workflows/deploy.yml)

🌐 **公開URL**: https://moke-cloud.github.io/meshi-track/

文科省食品成分表2020年版（八訂）ベースの個人向け栄養素・カロリー管理PWA。

## 機能

- TDEE計算 (Mifflin-St Jeor)
- 食事記録 (朝/昼/夜/間食)
- PFCバランス + 主要ビタミン/ミネラル
- 文科省食品DB (2,478食品) をローカル検索
- バーコードスキャン (Open Food Facts)
- 音声入力 (Web Speech API)
- 画像認識 (Gemini API、BYOK方式)
- Google Drive バックアップ
- JSON エクスポート/インポート
- 完全オフライン動作 (PWA + IndexedDB)

## 開発

```bash
npm install
npm run dev      # 開発サーバー
npm run test     # Vitest
npm run build    # プロダクションビルド
npm run lint     # ESLint
```

## ライセンス / データ出典

- 食品栄養データ: 文部科学省「日本食品標準成分表2020年版（八訂）」
- 市販食品データ: Open Food Facts (ODbL)
