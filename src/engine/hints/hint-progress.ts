import type { CaseDefinition } from '../../cases/schema'

export function isHintTargetResolved(
  targetId: string,
  discoveredClueIds: ReadonlySet<string>,
  unlockedConclusionIds: ReadonlySet<string>,
) {
  return discoveredClueIds.has(targetId) || unlockedConclusionIds.has(targetId)
}

export function countViewedHintLevels(
  viewedHintLevels: Record<string, number>,
) {
  return Object.values(viewedHintLevels).reduce(
    (total, level) => total + Math.min(3, Math.max(0, level)),
    0,
  )
}

export function getHintProgress(
  hint: CaseDefinition['hints'][number],
  viewedHintLevels: Record<string, number>,
) {
  const viewedLevel = Math.min(3, Math.max(0, viewedHintLevels[hint.id] ?? 0))
  return {
    viewedLevel,
    canRevealNext: viewedLevel < hint.levelKeys.length,
    nextLevel: Math.min(3, viewedLevel + 1),
  }
}
