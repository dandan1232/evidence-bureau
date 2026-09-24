import { describe, expect, it } from 'vitest'

import { countViewedHintLevels, getHintProgress } from './hint-progress'

describe('hint progress', () => {
  it('逐级解锁提示并在第三级停止', () => {
    const hint = {
      id: 'desk-chain-hint',
      targetId: 'desk-was-moved',
      levelKeys: ['hint.desk.1', 'hint.desk.2', 'hint.desk.3'] as [
        string,
        string,
        string,
      ],
    }

    expect(getHintProgress(hint, {})).toMatchObject({
      viewedLevel: 0,
      nextLevel: 1,
      canRevealNext: true,
    })
    expect(getHintProgress(hint, { 'desk-chain-hint': 3 })).toMatchObject({
      viewedLevel: 3,
      nextLevel: 3,
      canRevealNext: false,
    })
  })

  it('累计实际查看的提示级数', () => {
    expect(countViewedHintLevels({ desk: 2, camera: 1, key: 3 })).toBe(6)
  })
})
