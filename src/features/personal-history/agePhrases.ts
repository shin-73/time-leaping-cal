export const AGE_PHRASES = {
  PRE_BIRTH: (years: number) => `あなたがこの世に生を受ける、${years}年前の出来事だった。`,
  BIRTH_YEAR: `あなたはこの年、この世に生を受けた。`,
  POST_BIRTH: (age: number) => `あなたはこの時、${age}歳だった。`,
} as const;
