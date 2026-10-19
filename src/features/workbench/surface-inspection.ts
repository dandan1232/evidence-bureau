import { Euler, Quaternion, Vector3 } from 'three'

import type { HotspotDefinition } from '../../cases/schema'

export function isPointInHotspot(point: Vector3, hotspot: HotspotDefinition) {
  const local = point.clone().sub(new Vector3(...hotspot.shape.center))
  if (hotspot.shape.type === 'sphere') {
    return local.length() <= hotspot.shape.radius
  }
  local.applyQuaternion(
    new Quaternion()
      .setFromEuler(new Euler(...hotspot.shape.rotation))
      .invert(),
  )
  return hotspot.shape.size.every(
    (size, index) => Math.abs(local.getComponent(index)) <= size / 2,
  )
}

export function getMeasuredAxis(first: Vector3, second: Vector3) {
  const delta = second.clone().sub(first)
  // Only horizontal, axis-aligned tabletop measurements establish coverage.
  if (Math.abs(delta.y) > 0.025 || Math.min(first.y, second.y) < 0.72) {
    return undefined
  }
  if (Math.abs(delta.z) < 0.025 && Math.abs(delta.x) > 0.1) return 'width'
  if (Math.abs(delta.x) < 0.025 && Math.abs(delta.z) > 0.1) return 'depth'
  return undefined
}
