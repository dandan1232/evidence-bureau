import type { HotspotDefinition, ToolId } from '../../cases/schema'

export type HotspotObservation = {
  selectedTool: ToolId
  cameraDistance: number
  viewAngleDeg: number
  dwellMs: number
  discoveredClueIds: ReadonlySet<string>
}

export type HotspotEvaluation =
  | { status: 'discovered' }
  | {
      status: 'pending'
      reason:
        | 'already-discovered'
        | 'missing-prerequisite'
        | 'wrong-tool'
        | 'too-close'
        | 'too-far'
        | 'wrong-angle'
        | 'insufficient-dwell'
      remainingDwellMs?: number
    }

export function evaluateHotspot(
  hotspot: HotspotDefinition,
  observation: HotspotObservation,
): HotspotEvaluation {
  if (observation.discoveredClueIds.has(hotspot.clueId)) {
    return { status: 'pending', reason: 'already-discovered' }
  }

  if (
    hotspot.prerequisites.some(
      (clueId) => !observation.discoveredClueIds.has(clueId),
    )
  ) {
    return { status: 'pending', reason: 'missing-prerequisite' }
  }

  if (observation.selectedTool !== hotspot.requiredTool) {
    return { status: 'pending', reason: 'wrong-tool' }
  }

  if (
    hotspot.minCameraDistance !== undefined &&
    observation.cameraDistance < hotspot.minCameraDistance
  ) {
    return { status: 'pending', reason: 'too-close' }
  }

  if (
    hotspot.maxCameraDistance !== undefined &&
    observation.cameraDistance > hotspot.maxCameraDistance
  ) {
    return { status: 'pending', reason: 'too-far' }
  }

  if (
    hotspot.maxViewAngleDeg !== undefined &&
    observation.viewAngleDeg > hotspot.maxViewAngleDeg
  ) {
    return { status: 'pending', reason: 'wrong-angle' }
  }

  if (observation.dwellMs < hotspot.dwellMs) {
    return {
      status: 'pending',
      reason: 'insufficient-dwell',
      remainingDwellMs: hotspot.dwellMs - observation.dwellMs,
    }
  }

  return { status: 'discovered' }
}
