import { beforeEach, describe, expect, it } from 'vitest'

import { useGameStore } from './game-store'

describe('game store', () => {
  beforeEach(() => useGameStore.getState().resetInvestigation())

  it('以桌子和白光作为调查初始状态', () => {
    expect(useGameStore.getState()).toMatchObject({
      currentEvidenceId: 'moved-desk',
      selectedTool: 'white-light',
      discoveredClueIds: [],
      deductionNodeIds: [],
      deductionRelations: [],
      unlockedConclusionIds: [],
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

  it('保存推理节点和已解锁结论且去重', () => {
    useGameStore.getState().addDeductionNode('desk-leg-fresh-scrape')
    useGameStore.getState().addDeductionNode('desk-leg-fresh-scrape')
    useGameStore.getState().unlockConclusion('desk-was-moved')
    useGameStore.getState().unlockConclusion('desk-was-moved')

    expect(useGameStore.getState()).toMatchObject({
      deductionNodeIds: ['desk-leg-fresh-scrape'],
      unlockedConclusionIds: ['desk-was-moved'],
    })
  })

  it('保存推理关系且不产生重复项', () => {
    const relation = {
      from: 'desk-leg-fresh-scrape',
      to: 'desk-access-clearance',
      kind: 'supports' as const,
    }
    useGameStore.getState().addDeductionRelation(relation)
    useGameStore.getState().addDeductionRelation(relation)

    expect(useGameStore.getState().deductionRelations).toEqual([relation])

    useGameStore.getState().removeDeductionRelation(relation)
    expect(useGameStore.getState().deductionRelations).toEqual([])
  })
})
