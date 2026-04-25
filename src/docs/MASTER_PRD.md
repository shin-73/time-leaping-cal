# Time-Leap Cal：MASTER PRD（最終仕様書）
**Version 1.3 — 2026-04-24 最終確定**
この文書は本プロジェクトの「唯一の正解」を定義する。明示的な変更指示なしに、この文書の内容を変更・削除することを固く禁じる。
実装に変更を加える際は、必ずこの文書と QA_CHECKLIST.md を同時に更新し、「コード＝仕様書」の状態を維持すること。

---

## 1. プロダクト概要

**名称**: Time Leap Cal  
**URL**: https://time-leap-cal.vercel.app  
**スタック**: React + Vite + TypeScript + Tailwind CSS  
**API**: Google Gemini (gemini-flash-latest) / Wikimedia Commons API（画像のみ）

### コンセプト
西暦と和暦を変換する道具であると同時に、指定された年の歴史的な断片をAIの内部知識によって物語として生成し、誕生年と重ねることで「あなたと歴史が重なる場所」を体験させるアプリ。

---

## 2. デザイン哲学（Ultimate Flat）

### 2.1 角丸の完全排除
- アプリ内の**すべてのUI要素**（モーダル、ボタン、入力欄）に `rounded` クラスを一切使用しない。
- グローバルCSS `* { border-radius: 0 !important; }` で強制排除。

### 2.2 配色
| 用途 | 値 |
|---|---|
| ページ背景 | `bg-white` (#ffffff) |
| Heroエリア背景（結果画面） | `bg-[#f0f0f0]` |
| メインテキスト | `text-black` |
| 非活性ボタン | `bg-gray-100 text-gray-300` |
| 活性ボタン | `bg-black text-white` |
| オーバーレイ（オンボーディング） | `bg-black/60 backdrop-blur-md` |
| オーバーレイ（設定） | `bg-black/40 backdrop-blur-md` |

### 2.3 タイポグラフィ
| 用途 | クラス |
|---|---|
| アプリロゴ | `text-4xl md:text-7xl font-black tracking-tighter uppercase italic` |
| 西暦入力 | `text-6xl sm:text-8xl md:text-[10rem] font-black tabular-nums` |
| 和暦サブヘッド | `text-2xl sm:text-4xl md:text-5xl font-bold opacity-40` |
| 歴史テキスト本文 | `text-2xl font-medium leading-relaxed tracking-wide` |
| 各文の行間 | `block mb-6`（`<span>` 単位） |
| オンボーディング本文 | `text-sm font-medium leading-relaxed space-y-6` |

---

## 3. トップページ仕様

### 3.1 YEAR入力欄
```tsx
type="text"
inputMode="numeric"
pattern="[0-9]*"
maxLength={4}
onChange: 全角数字→半角変換 → 数字以外を replace(/[^0-9]/g, '') で即時排除 → 5桁以上は slice(0, 4)
```

### 3.2 送信トリガー
| **SP（sm未満）** | スマホキーボードの「確定/Go/開く」| `inputmode="numeric"` および `enterKeyHint="go"` を付与。iOSの「完了（Done）」ボタン押下時は `onBlur` を起点として `handleSearch()` を強制発火。 |
| **SP（sm未満）** | 隠し送信ボタン | `opacity-0 absolute pointer-events-none` な `button[type="submit"]` を配置し、システム上のフォーム認識を維持。 |

### 3.3 活性化条件
const isSubmitEnabled = selectedEra === '西暦' ? inputValue.length === 4 : inputValue.length >= 1;
// 1868年（明治元年）未満は「明治以前の記憶は現在対応していません」としてバリデーション。
```

### 3.4 SPトップページの引き算と安定性
- スマホ版（sm未満）では「タイムリープ」ボタンを `hidden sm:block` で非表示。
- ルートコンテナに `min-h-[100dvh]` を使用し、ソフトウェアキーボードによる画面の押し出しやレイアウト崩れを防ぐ。

---

## 4. 結果画面仕様

### 4.1 Heroセクション
| 項目 | SP（sm未満） | PC（sm以上） |
|---|---|---|
| 最小高さ | `min-h-[55vh]` | `min-h-[500px]` |
| 底部パディング | `pb-20`（和暦テキスト収容） | `pb-20` |
| overflow | `overflow-hidden` | `overflow-hidden` |
| 幅 | `w-full` | `w-full` |
| 背景色 | `bg-[#f0f0f0]` | `bg-[#f0f0f0]` |
| ボーダー | `border-b border-black` | `border-b border-black` |

### 4.2 Hero画像の全幅制御と垂直座標の固定化（Vertical Alignment Continuity）
```tsx
<img
  className="absolute inset-0 w-full h-full object-cover ..."
  style={{ objectPosition: 'center 20%' }}
/>
```
- **全幅表示**: `w-full relative overflow-hidden`（index.css で body/root を `align-items: stretch` に設定済みのため、左右1ピクセルの隙間もなく全幅表示される。`w-screen` や負の margin は不要）。
- **年号座標の固定化**: PC版（1200px viewport）において、年号要素の `top` 座標を **316px** に絶対固定。
- **不動の構造**: 
  - `pt-[160px]`, `h-[140px]`, `mb-8`, `h-[200px]` の固定値により数学的に座標を決定。
  - **バリデーション表示**: エラーメッセージは `Bottom Extras Area` 内の最上部に `position: absolute` で完全にフローティング（浮遊）させ、既存のレイアウトを1ピクセルも動かさない。
  - **引き算のデザイン**: 
    - 和暦テキストには極めて薄い白黒の微小なシャドウを用い、「金属板に打たれた刻印（レタープレス）」効果を持たせる。
    - 背景オーバーレイは `bg-white/10` 程度の最小限の調整にとどめ、Hero画像の質感を優先。
  - `scrollbar-gutter: stable` によりスクロールバー出現時の横ズレも排除。

### 4.3 結果画面の構成
- **含めるもの**: AI生成文 + 誕生年設定時の年齢1文
- **含めないもの**: 誕生日設定ボタン、その他CTA
- **ヘッダー**: 戻るボタンや「？」アイコンは `fixed` 配置で `z-[60]` とし、キーボード開閉やスクロールによるレイアウト崩れの影響を受けないようにする。

---

## 5. ナラティブの聖典（src/constants/aiConfig.ts）

### 5.1 PROMPT_TEMPLATE（関数）
Geminiへのプロンプト。固定文頭プレフィックスなし。
```ts
export const PROMPT_TEMPLATE = (year: number, eraName: string): string =>
  `${year}年（${eraName}）について...【文体の聖典】...`;
```

### 5.2 文体ルール（完全固定）
| ルール | 内容 |
|---|---|
| 文体 | 「だ・である」調（記録調）。「体言止め」を効果的に使用。「です」「ます」は禁止。 |
| 文頭プレフィックス | **なし**（自由に書き始める） |
| 文字数 | 150～200文字程度（高密度な情報量を維持） |
| 具体的要件 | 1.【マクロ】歴史的事件 / 2.【ミクロ】生活感・流行 / 3.【断絶】現在との対比 を順に構成する。 |
| 固有名詞 | 最低3つ以上含める（事件名・法律名・人物名・地名・商品名等） |
| 形式 | 箇条書き・見出し禁止。プレーンテキスト一続き。 |
| トーン | 日本歴史の記録官（事実の集積によるアーカイブ） |
| **厳禁** | 抽象的な形容詞（「懐かしい」「美しい」等）や情緒表現をシステムレベルで禁止。 |

### 5.3 AGE_PHRASES（定数オブジェクト）
```ts
export const AGE_PHRASES = {
  PRE_BIRTH:  (years: number) => `あなたがこの世に生を受ける、${years}年前の出来事だった。`,
  BIRTH_YEAR: `それは、あなたがこの世に生を受けた、記念すべき年だった。`,
  POST_BIRTH: (age: number)  => `あなたはこの時、${age}歳だった。`,
};
```

### 5.4 フォールバック文（APIエラー時）
```ts
`${year}年（${eraName}）の歴史的記憶にアクセスできませんでした。`
```
- 年齢フレーズはレンダー層で常に自動付与されるため、ここに包含する必要はない。

### 5.5 タイムアウト
AIリクエストは **18秒** で `Promise.race` によりタイムアウト。

---

## 6. SP専用仕様

### 6.1 オンボーディング（全画面ポスター）
```tsx
// SP: fixed inset-0 / 角丸なし / 上部から配置
// PC: 中央カード形式（sm:max-w-xl sm:h-auto sm:max-h-[90vh]）
```

### 6.2 SP版で非表示の要素
| 要素 | 実装 |
|---|---|
| タイムリープボタン | `hidden sm:block` |

---

## 7. ドキュメント同期規律
- 実装変更時は必ず MASTER_PRD.md と QA_CHECKLIST.md を同時更新。
- コードと仕様書の乖離は即座にアラートし、判断を求める。
