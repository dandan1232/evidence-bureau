import { Vector3 } from 'three'
import { describe, expect, it } from 'vitest'

import type { HotspotDefinition } from '../../cases/schema'
import { getMeasuredAxis, isPointInHotspot } from './surface-inspection'

const hotspot: HotspotDefinition = {
  id: 'scrape',
  clueId: 'fresh-scrape',
  shape: { type: 'sphere', center: [-0.585, 0.085, 0.29], radius: 0.05 },
  requiredTool: 'side-light',
  dwellMs: 1200,
  prerequisites: [],
}

describe('surface inspection', () => {
  it('排除同一物体上远离线索的表面', () => {
    expect(isPointInHotspot(new Vector3(-0.585, 0.085, 0.29), hotspot)).toBe(
      true,
    )
    expect(isPointInHotspot(new Vector3(0, 0.76, 0), hotspot)).toBe(false)
  })

  it('使用盒形热点自身的旋转检查命中', () => {
    const rotated: HotspotDefinition = {
      ...hotspot,
      shape: {
        type: 'box',
        center: [0, 0, 0],
        size: [1, 0.1, 0.1],
        rotation: [0, 0, Math.PI / 2],
      },
    }
    expect(isPointInHotspot(new Vector3(0, 0.4, 0), rotated)).toBe(true)
    expect(isPointInHotspot(new Vector3(0.4, 0, 0), rotated)).toBe(false)
  })

  it('桌腿、对角线和局部短线不能冒充桌面宽深测量', () => {
    expect(
      getMeasuredAxis(
        new Vector3(-0.71, 0.76, 0.38),
        new Vector3(0.71, 0.76, 0.38),
      ),
    ).toBe('width')
    expect(
      getMeasuredAxis(
        new Vector3(0.71, 0.76, -0.38),
        new Vector3(0.71, 0.76, 0.38),
      ),
    ).toBe('depth')
    expect(
      getMeasuredAxis(new Vector3(0, 0.1, 0), new Vector3(1.42, 0.1, 0)),
    ).toBeUndefined()
    expect(
      getMeasuredAxis(new Vector3(0, 0.76, 0), new Vector3(1, 0.76, 1)),
    ).toBeUndefined()
  })
})
