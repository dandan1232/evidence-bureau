import type { HotspotDefinition, ToolId } from '../../cases/schema'

export type HotspotObservation = {
  selectedTool: ToolId
  cameraDistance: number
  viewAngleDeg: number
  dwellMs: number
  discoveredClueIds: ReadonlySet<string>
  targetedHotspotId?: string
  measuredDimensions?: { width?: number; depth?: number }
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
        | 'wrong-region'
        | 'measurement-required'
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

  if (
    hotspot.requiresSurfaceHit &&
    observation.targetedHotspotId !== hotspot.id
  ) {
    return { status: 'pending', reason: 'wrong-region' }
  }

  if (hotspot.measurement) {
    const { width, depth, tolerance } = hotspot.measurement
    const measured = observation.measuredDimensions
    if (
      measured?.width === undefined ||
      measured.depth === undefined ||
      !Number.isFinite(measured.width) ||
      !Number.isFinite(measured.depth) ||
      Math.abs(measured.width - width) > tolerance ||
      Math.abs(measured.depth - depth) > tolerance
    ) {
      return { status: 'pending', reason: 'measurement-required' }
    }
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
