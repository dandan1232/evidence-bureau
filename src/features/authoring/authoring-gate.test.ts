import { describe, expect, it } from 'vitest'

import { canEnableAuthoringMode } from './authoring-gate'

describe('canEnableAuthoringMode', () => {
  it('仅在开发环境和显式参数同时满足时启用', () => {
    expect(canEnableAuthoringMode(true, '?authoring=1')).toBe(true)
    expect(canEnableAuthoringMode(true, '')).toBe(false)
    expect(canEnableAuthoringMode(false, '?authoring=1')).toBe(false)
  })

  it('不接受相似但不准确的参数', () => {
    expect(canEnableAuthoringMode(true, '?authoring=true')).toBe(false)
    expect(canEnableAuthoringMode(true, '?mode=authoring')).toBe(false)
  })
})
