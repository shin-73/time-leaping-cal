export const AGE_PHRASES = {
  PRE_BIRTH: (years: number) => `あなたがこの世に生を受ける、${years}年前の出来事だった。`,
  POST_BIRTH: (age: number) => `あなたはこの時、${age}歳だった。`,
} as const;
