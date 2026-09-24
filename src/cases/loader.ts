import { z } from 'zod'

import {
  LocaleMessagesSchema,
  validateLocalization,
  type LocaleMessages,
} from './localization'
import { CaseDefinitionSchema, type CaseDefinition } from './schema'

const CaseIdSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, '案件 ID 格式无效')
const LocaleIdSchema = z
  .string()
  .regex(/^[a-z]{2}(?:-[A-Z]{2})?$/, '语言代码格式无效')

type Fetcher = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>

export type CaseBundle = {
  caseDefinition: CaseDefinition
  locale: string
  messages: LocaleMessages
}

export type CaseLoadErrorCode =
  | 'invalid-request'
  | 'network'
  | 'not-found'
  | 'invalid-json'
  | 'invalid-case'
  | 'unsupported-locale'
  | 'invalid-locale'

export class CaseLoadError extends Error {
  constructor(
    readonly code: CaseLoadErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options)
    this.name = 'CaseLoadError'
  }
}

export async function loadCase(
  caseId: string,
  requestedLocale?: string,
  fetcher: Fetcher = fetch,
): Promise<CaseBundle> {
  const parsedCaseId = CaseIdSchema.safeParse(caseId)
  if (!parsedCaseId.success) {
    throw new CaseLoadError(
      'invalid-request',
      parsedCaseId.error.issues.at(0)?.message ?? '案件 ID 格式无效',
    )
  }

  const caseJson = await fetchJson(
    `/cases/${parsedCaseId.data}/case.json`,
    fetcher,
  )
  const parsedCase = CaseDefinitionSchema.safeParse(caseJson)
  if (!parsedCase.success) {
    throw new CaseLoadError(
      'invalid-case',
      `案件数据未通过校验：${z.prettifyError(parsedCase.error)}`,
      { cause: parsedCase.error },
    )
  }

  const locale = requestedLocale ?? parsedCase.data.defaultLocale
  const parsedLocale = LocaleIdSchema.safeParse(locale)
  if (!parsedLocale.success) {
    throw new CaseLoadError(
      'invalid-request',
      parsedLocale.error.issues.at(0)?.message ?? '语言代码格式无效',
    )
  }
  if (!parsedCase.data.supportedLocales.includes(parsedLocale.data)) {
    throw new CaseLoadError(
      'unsupported-locale',
      `案件 ${caseId} 不支持语言 ${parsedLocale.data}`,
    )
  }

  const localeJson = await fetchJson(
    `/cases/${parsedCaseId.data}/locales/${parsedLocale.data}.json`,
    fetcher,
  )
  const parsedMessages = LocaleMessagesSchema.safeParse(localeJson)
  if (!parsedMessages.success) {
    throw new CaseLoadError(
      'invalid-locale',
      `语言文件未通过校验：${z.prettifyError(parsedMessages.error)}`,
      { cause: parsedMessages.error },
    )
  }

  try {
    validateLocalization(parsedCase.data, parsedMessages.data)
  } catch (error) {
    throw new CaseLoadError('invalid-locale', '语言文件缺少案件所需文案', {
      cause: error,
    })
  }

  return {
    caseDefinition: parsedCase.data,
    locale: parsedLocale.data,
    messages: parsedMessages.data,
  }
}

async function fetchJson(url: string, fetcher: Fetcher): Promise<unknown> {
  let response: Response
  try {
    response = await fetcher(url)
  } catch (error) {
    throw new CaseLoadError('network', `无法连接案件资源：${url}`, {
      cause: error,
    })
  }

  if (!response.ok) {
    throw new CaseLoadError(
      response.status === 404 ? 'not-found' : 'network',
      `案件资源请求失败（${response.status}）：${url}`,
    )
  }

  try {
    return await response.json()
  } catch (error) {
    throw new CaseLoadError('invalid-json', `案件资源不是有效 JSON：${url}`, {
      cause: error,
    })
  }
}
