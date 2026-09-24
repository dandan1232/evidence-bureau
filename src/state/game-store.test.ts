import { beforeEach, describe, expect, it } from 'vitest'

import { useGameStore } from './game-store'

describe('game store', () => {
  beforeEach(() => useGameStore.getState().resetInvestigation())

  it('以桌子和白光作为调查初始状态', () => {
    expect(useGameStore.getState()).toMatchObject({
      currentEvidenceId: 'moved-desk',
      selectedTool: 'white-light',
      discoveredClueIds: [],
    })
  })

  it('切换调查工具并可重置', () => {
    useGameStore.getState().selectTool('wireframe')
    expect(useGameStore.getState().selectedTool).toBe('wireframe')

    useGameStore.getState().resetInvestigation()
    expect(useGameStore.getState().selectedTool).toBe('white-light')
  })

  it('记录线索且不产生重复项', () => {
    useGameStore.getState().discoverClue('desk-leg-fresh-scrape')
    useGameStore.getState().discoverClue('desk-leg-fresh-scrape')

    expect(useGameStore.getState().discoveredClueIds).toEqual([
      'desk-leg-fresh-scrape',
    ])
  })
})
