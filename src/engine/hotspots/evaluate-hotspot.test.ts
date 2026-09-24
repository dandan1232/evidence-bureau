import { describe, expect, it } from 'vitest'

import type { HotspotDefinition } from '../../cases/schema'
import { evaluateHotspot, type HotspotObservation } from './evaluate-hotspot'

const hotspot: HotspotDefinition = {
  id: 'desk-leg-scrape-hotspot',
  clueId: 'desk-leg-fresh-scrape',
  shape: { type: 'sphere', center: [-1.27, 0.06, 0.57], radius: 0.18 },
  requiredTool: 'side-light',
  surfaceNormal: [0, 0, 1],
  maxViewAngleDeg: 75,
  minCameraDistance: 2.4,
  maxCameraDistance: 9,
  dwellMs: 1200,
  prerequisites: [],
}

const validObservation: HotspotObservation = {
  selectedTool: 'side-light',
  cameraDistance: 6,
  viewAngleDeg: 42,
  dwellMs: 1200,
  discoveredClueIds: new Set(),
}

describe('evaluateHotspot', () => {
  it('在所有观察条件满足时发现线索', () => {
    expect(evaluateHotspot(hotspot, validObservation)).toEqual({
      status: 'discovered',
    })
  })

  it.each([
    ['wrong-tool', { selectedTool: 'white-light' as const }],
    ['too-close', { cameraDistance: 1 }],
    ['too-far', { cameraDistance: 10 }],
    ['wrong-angle', { viewAngleDeg: 90 }],
  ])('条件不满足时返回 %s', (reason, override) => {
    expect(
      evaluateHotspot(hotspot, { ...validObservation, ...override }),
    ).toMatchObject({ status: 'pending', reason })
  })

  it('报告剩余停留时间', () => {
    expect(
      evaluateHotspot(hotspot, { ...validObservation, dwellMs: 450 }),
    ).toEqual({
      status: 'pending',
      reason: 'insufficient-dwell',
      remainingDwellMs: 750,
    })
  })

  it('在前置线索缺失时阻止发现', () => {
    expect(
      evaluateHotspot(
        { ...hotspot, prerequisites: ['desk-floor-dust'] },
        validObservation,
      ),
    ).toMatchObject({ reason: 'missing-prerequisite' })
  })

  it('不会重复发现已经记录的线索', () => {
    expect(
      evaluateHotspot(hotspot, {
        ...validObservation,
        discoveredClueIds: new Set([hotspot.clueId]),
      }),
    ).toMatchObject({ reason: 'already-discovered' })
  })
})
