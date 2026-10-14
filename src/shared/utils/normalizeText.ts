/** Lowercase, accent-free text for forgiving free-text matching. */
export const normalizeText = (text: string) =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
