import { HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

// ============================================================
// ナラティブの聖典（Narrative Bible）
// すべての文体・トーン・形式はここで定義される唯一の正解
// ============================================================

/**
 * AIに渡すプロンプトテンプレート。
 * 指定された年の情緒的な物語を「だ・である」調で生成させる。
 */
export const PROMPT_TEMPLATE = (year: number, eraName: string): string =>
  `あなたは日本歴史の記録官だ。${year}年（${eraName}）について、事実の集積による硬質なアーカイブ記録を生成せよ。

【執筆の聖典】
- 「だ・である」調および「体言止め」を効果的に使い、スナップショットのような硬質なリズムを作ること。
- 「懐かしい」「美しい」「激動の」といった抽象的な形容詞・情緒表現は徹底して排除する。事実の描写のみで情緒を構築せよ。
- 以下の3要素を必ず順に構成すること：
  1. 【マクロ】その年を象徴する歴史的事件や社会現象（固有名詞を含む）
  2. 【ミクロ】当時の生活者の手触り、流行、日常のディテール
  3. 【断絶】現代のテクノロジーや常識との対比、失われた風景
- 箇条書きは不可。150〜200文字程度の単一の段落に高密度に圧縮すること。
- 「〜があった年だ」「歴史の転換点であった」といった総括的な表現は厳禁。`;

/**
 * 年齢表示フレーズ。
 * calculatePersonalNarrative はここから取得する。
 */
export const AGE_PHRASES = {
  PRE_BIRTH:  (years: number) => `あなたがこの世に生を受ける、${years}年前の出来事だった。`,
  BIRTH_YEAR: `それは、あなたがこの世に生を受けた、記念すべき年だった。`,
  POST_BIRTH: (age: number)  => `あなたはこの時、${age}歳だった。`,
} as const;

// ============================================================
// ローディングメッセージ
// ============================================================
export const LOADING_MESSAGES = [
  "アーカイブの深層へ遡っています...",
  "断片的な記憶を繋ぎ合わせています...",
  "当時の空気感を復元しています...",
  "過去の囁きを慎重に拾い集めています...",
  "時の重なりを紐解いています...",
  "記憶の風景を再構成しています...",
];

// ============================================================
// Gemini セーフティ設定
// ============================================================
export const SAFETY_SETTINGS = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
];
