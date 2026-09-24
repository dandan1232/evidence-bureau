import { beforeEach, describe, expect, it } from 'vitest'

import { useGameStore } from './game-store'

describe('game store', () => {
  beforeEach(() => useGameStore.getState().resetInvestigation())

  it('以桌子和白光作为调查初始状态', () => {
    expect(useGameStore.getState()).toMatchObject({
      currentEvidenceId: 'moved-desk',
      selectedTool: 'white-light',
    })
  })

  it('切换调查工具并可重置', () => {
    useGameStore.getState().selectTool('wireframe')
    expect(useGameStore.getState().selectedTool).toBe('wireframe')

    useGameStore.getState().resetInvestigation()
    expect(useGameStore.getState().selectedTool).toBe('white-light')
  })
})
