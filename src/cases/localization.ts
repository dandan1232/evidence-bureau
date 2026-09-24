import { z } from 'zod'

import type { CaseDefinition } from './schema'

export const LocaleMessagesSchema = z.record(z.string().min(1), z.string())

export type LocaleMessages = z.infer<typeof LocaleMessagesSchema>

export class LocalizationValidationError extends Error {
  readonly missingKeys: string[]

  constructor(missingKeys: string[]) {
    super(`语言文件缺少 ${missingKeys.length} 个文案键：${missingKeys.join(', ')}`)
    this.name = 'LocalizationValidationError'
    this.missingKeys = missingKeys
  }
}

export function findMissingLocalizationKeys(
  caseDefinition: CaseDefinition,
  messages: LocaleMessages,
) {
  const requiredKeys = collectLocalizationKeys(caseDefinition)
  return [...requiredKeys].filter((key) => !(key in messages)).sort()
}

export function validateLocalization(
  caseDefinition: CaseDefinition,
  messages: LocaleMessages,
) {
  const missingKeys = findMissingLocalizationKeys(caseDefinition, messages)
  if (missingKeys.length > 0) {
    throw new LocalizationValidationError(missingKeys)
  }
  return messages
}

export function translate(messages: LocaleMessages, key: string) {
  const value = messages[key]
  if (value === undefined) {
    throw new LocalizationValidationError([key])
  }
  return value
}

function collectLocalizationKeys(value: unknown, result = new Set<string>()) {
  if (Array.isArray(value)) {
    value.forEach((item) => collectLocalizationKeys(item, result))
    return result
  }

  if (value === null || typeof value !== 'object') {
    return result
  }

  Object.entries(value).forEach(([key, child]) => {
    if (key.endsWith('Key') && typeof child === 'string') {
      result.add(child)
      return
    }
    if (key.endsWith('Keys') && Array.isArray(child)) {
      child.forEach((item) => {
        if (typeof item === 'string') result.add(item)
      })
      return
    }
    collectLocalizationKeys(child, result)
  })

  return result
}
