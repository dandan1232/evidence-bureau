import { describe, expect, it } from 'vitest'

import type { DeductionRule } from './evaluate-deduction'
import { evaluateDeduction } from './evaluate-deduction'

const rule: DeductionRule = {
  id: 'desk-moved-rule',
  requiredNodes: ['desk-leg-fresh-scrape', 'scene-photo-desk-position'],
  requiredRelations: [
    {
      from: 'desk-leg-fresh-scrape',
      to: 'scene-photo-desk-position',
      kind: 'contradicts',
    },
  ],
  unlocksConclusionId: 'desk-was-moved',
  feedbackKey: 'deduction.desk-moved.feedback',
}

describe('evaluateDeduction', () => {
  it('在节点与关系齐备时匹配结论且不受节点顺序影响', () => {
    expect(
      evaluateDeduction(rule, {
        nodeIds: ['scene-photo-desk-position', 'desk-leg-fresh-scrape'],
        relations: [
          {
            from: 'desk-leg-fresh-scrape',
            to: 'scene-photo-desk-position',
            kind: 'contradicts',
          },
        ],
      }),
    ).toEqual({ status: 'matched', conclusionId: 'desk-was-moved' })
  })

  it('报告缺失节点和关系', () => {
    expect(
      evaluateDeduction(rule, {
        nodeIds: ['desk-leg-fresh-scrape'],
        relations: [],
      }),
    ).toEqual({
      status: 'incomplete',
      missingNodeIds: ['scene-photo-desk-position'],
      missingRelations: rule.requiredRelations,
    })
  })

  it('关系方向或类型错误时不会匹配', () => {
    expect(
      evaluateDeduction(rule, {
        nodeIds: rule.requiredNodes,
        relations: [
          {
            from: 'scene-photo-desk-position',
            to: 'desk-leg-fresh-scrape',
            kind: 'supports',
          },
        ],
      }),
    ).toMatchObject({ status: 'incomplete' })
  })
})
