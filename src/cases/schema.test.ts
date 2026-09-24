import { describe, expect, it } from 'vitest'

import caseJson from '../../public/cases/vanished-tenant/case.json'
import messagesJson from '../../public/cases/vanished-tenant/locales/zh-CN.json'
import {
  findMissingLocalizationKeys,
  LocalizationValidationError,
  validateLocalization,
} from './localization'
import { CaseDefinitionSchema } from './schema'

describe('CaseDefinitionSchema', () => {
  it('接受《消失的住客》案件数据', () => {
    expect(CaseDefinitionSchema.parse(caseJson).id).toBe('vanished-tenant')
  })

  it('拒绝不规范的案件 ID', () => {
    const invalidCase = { ...caseJson, id: '../secret' }
    expect(CaseDefinitionSchema.safeParse(invalidCase).success).toBe(false)
  })

  it('拒绝缺少必要字段的物证', () => {
    const firstEvidence = caseJson.evidence.at(0)
    if (!firstEvidence) throw new Error('测试案件缺少物证')
    const invalidEvidence: Record<string, unknown> = { ...firstEvidence }
    delete invalidEvidence.initialCamera
    const invalidCase = {
      ...caseJson,
      evidence: [invalidEvidence, ...caseJson.evidence.slice(1)],
    }
    expect(CaseDefinitionSchema.safeParse(invalidCase).success).toBe(false)
  })

  it('拒绝指向不存在物证的线索', () => {
    const invalidCase = {
      ...caseJson,
      clues: [
        {
          id: 'orphan-clue',
          kind: 'observation',
          evidenceId: 'missing-evidence',
          titleKey: 'clue.orphan.title',
          descriptionKey: 'clue.orphan.description',
        },
      ],
    }
    expect(CaseDefinitionSchema.safeParse(invalidCase).success).toBe(false)
  })
})

describe('localization validation', () => {
  const caseDefinition = CaseDefinitionSchema.parse(caseJson)

  it('确认中文语言包覆盖所有案件文案键', () => {
    expect(findMissingLocalizationKeys(caseDefinition, messagesJson)).toEqual(
      [],
    )
    expect(validateLocalization(caseDefinition, messagesJson)).toBe(
      messagesJson,
    )
  })

  it('报告缺失的文案键', () => {
    const incompleteMessages: Record<string, string> = { ...messagesJson }
    delete incompleteMessages['case.title']
    expect(() =>
      validateLocalization(caseDefinition, incompleteMessages),
    ).toThrow(LocalizationValidationError)
    expect(
      findMissingLocalizationKeys(caseDefinition, incompleteMessages),
    ).toEqual(['case.title'])
  })
})
