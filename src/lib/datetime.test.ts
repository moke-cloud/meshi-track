import { describe, it, expect } from 'vitest'
import { inferMealType, toLocalDateString } from './datetime'

describe('toLocalDateString', () => {
  it('formats date as YYYY-MM-DD', () => {
    const d = new Date(2026, 3, 19, 8, 30) // 2026-04-19 (month is 0-indexed)
    expect(toLocalDateString(d)).toBe('2026-04-19')
  })

  it('zero-pads month and day', () => {
    const d = new Date(2026, 0, 5, 0, 0)
    expect(toLocalDateString(d)).toBe('2026-01-05')
  })
})

describe('inferMealType', () => {
  it.each([
    [5, 'breakfast'],
    [8, 'breakfast'],
    [10, 'breakfast'],
    [11, 'lunch'],
    [13, 'lunch'],
    [14, 'lunch'],
    [17, 'dinner'],
    [20, 'dinner'],
    [21, 'dinner'],
    [22, 'snack'],
    [3, 'snack'],
    [15, 'snack'],
    [16, 'snack'],
  ] as const)('hour %i → %s', (hour, expected) => {
    const d = new Date(2026, 3, 19, hour, 0)
    expect(inferMealType(d)).toBe(expected)
  })
})
