/**
 * シンプルな時系列ソート可能ID生成器。
 * 真のULIDではなく `<timestamp36>-<random>` 形式。IndexedDBのprimary keyとして用途十分。
 */
export function newId(prefix = ''): string {
  const ts = Date.now().toString(36)
  const rand = Math.random().toString(36).slice(2, 10)
  return prefix ? `${prefix}-${ts}-${rand}` : `${ts}-${rand}`
}
