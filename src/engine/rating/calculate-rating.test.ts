import { describe, expect, it } from 'vitest'

import { calculateRating } from './calculate-rating'

const definition = {
  baseScore: 1000,
  grades: [
    { grade: 'S' as const, minScore: 900 },
    { grade: 'A' as const, minScore: 750 },
    { grade: 'B' as const, minScore: 550 },
    { grade: 'C' as const, minScore: 0 },
  ],
  penalties: {
    perHintLevel: 45,
    perFailedSubmission: 80,
    perMinuteOverTarget: 5,
  },
}

describe('calculate rating', () => {
  it('完整且无提示的调查得到 S', () => {
    expect(
      calculateRating(definition, {
        discoveredClueCount: 12,
        totalClueCount: 12,
        viewedHintLevelCount: 0,
        failedSubmissions: 0,
        elapsedMinutes: 38,
        targetMinutes: 40,
      }),
    ).toMatchObject({ score: 1000, grade: 'S' })
  })

  it('按缺失线索、提示、错误提交与超时确定性扣分', () => {
    expect(
      calculateRating(definition, {
        discoveredClueCount: 8,
        totalClueCount: 12,
        viewedHintLevelCount: 2,
        failedSubmissions: 1,
        elapsedMinutes: 46,
        targetMinutes: 40,
      }),
    ).toMatchObject({ score: 700, grade: 'B' })
  })
})
