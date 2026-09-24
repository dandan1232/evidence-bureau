import type { CaseDefinition } from '../../cases/schema'

export type RatingGrade = 'S' | 'A' | 'B' | 'C'

export type RatingResult = {
  score: number
  grade: RatingGrade
  discoveredClues: number
  totalClues: number
  viewedHintLevels: number
  failedSubmissions: number
  elapsedMinutes: number
}

type RatingInput = {
  discoveredClueCount: number
  totalClueCount: number
  viewedHintLevelCount: number
  failedSubmissions: number
  elapsedMinutes: number
  targetMinutes: number
}

export function calculateRating(
  definition: CaseDefinition['rating'],
  input: RatingInput,
): RatingResult {
  const missingClues = Math.max(
    0,
    input.totalClueCount - input.discoveredClueCount,
  )
  const overtimeMinutes = Math.max(
    0,
    input.elapsedMinutes - input.targetMinutes,
  )
  const score = Math.max(
    0,
    Math.round(
      definition.baseScore -
        missingClues * 25 -
        input.viewedHintLevelCount * definition.penalties.perHintLevel -
        input.failedSubmissions * definition.penalties.perFailedSubmission -
        overtimeMinutes * definition.penalties.perMinuteOverTarget,
    ),
  )
  const grade =
    [...definition.grades]
      .sort((left, right) => right.minScore - left.minScore)
      .find(({ minScore }) => score >= minScore)?.grade ?? 'C'

  return {
    score,
    grade,
    discoveredClues: input.discoveredClueCount,
    totalClues: input.totalClueCount,
    viewedHintLevels: input.viewedHintLevelCount,
    failedSubmissions: input.failedSubmissions,
    elapsedMinutes: Math.max(0, Math.round(input.elapsedMinutes)),
  }
}
