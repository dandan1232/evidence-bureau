import { describe, expect, it, vi } from 'vitest'

import caseJson from '../../public/cases/vanished-tenant/case.json'
import messagesJson from '../../public/cases/vanished-tenant/locales/zh-CN.json'
import { CaseLoadError, loadCase } from './loader'

describe('loadCase', () => {
  it('加载并验证案件和对应语言包', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json(caseJson))
      .mockResolvedValueOnce(Response.json(messagesJson))

    const bundle = await loadCase('vanished-tenant', 'zh-CN', fetcher)

    expect(bundle.caseDefinition.id).toBe('vanished-tenant')
    expect(bundle.messages['case.title']).toBe('消失的住客')
    expect(fetcher).toHaveBeenNthCalledWith(
      2,
      '/cases/vanished-tenant/locales/zh-CN.json',
    )
  })

  it('在发出请求前拦截危险案件 ID', async () => {
    const fetcher = vi.fn<typeof fetch>()

    await expect(loadCase('../private', 'zh-CN', fetcher)).rejects.toMatchObject({
      code: 'invalid-request',
    } satisfies Partial<CaseLoadError>)
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('把 404 转换成可识别的加载错误', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(null, { status: 404 }))

    await expect(
      loadCase('vanished-tenant', 'zh-CN', fetcher),
    ).rejects.toMatchObject({ code: 'not-found' } satisfies Partial<CaseLoadError>)
  })
})
