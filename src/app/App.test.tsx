import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import caseJson from '../../public/cases/vanished-tenant/case.json'
import messagesJson from '../../public/cases/vanished-tenant/locales/zh-CN.json'

import { App } from './App'

describe('App', () => {
  beforeEach(() => {
    window.location.hash = ''
    vi.stubGlobal(
      'fetch',
      vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(Response.json(caseJson))
        .mockResolvedValueOnce(Response.json(messagesJson)),
    )
  })

  it('加载首发案件并进入调查工作台', async () => {
    const user = userEvent.setup()
    render(<App />)

    expect(
      await screen.findByRole('heading', { name: '消失的住客' }),
    ).toBeVisible()
    expect(screen.getByText('EB-01-017')).toBeVisible()
    expect(screen.getAllByText('未检查')).toHaveLength(3)

    await user.click(screen.getByRole('link', { name: /开始调查/ }))

    expect(screen.getByRole('heading', { name: '调查工作台' })).toBeVisible()
  })

  it('案件请求失败后允许重新读取', async () => {
    const user = userEvent.setup()
    vi.stubGlobal(
      'fetch',
      vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(new Response(null, { status: 404 }))
        .mockResolvedValueOnce(Response.json(caseJson))
        .mockResolvedValueOnce(Response.json(messagesJson)),
    )

    render(<App />)

    expect(
      await screen.findByRole('heading', { name: '案件档案暂时无法打开' }),
    ).toBeVisible()

    await user.click(screen.getByRole('button', { name: '重新读取' }))

    expect(
      await screen.findByRole('heading', { name: '消失的住客' }),
    ).toBeVisible()
  })
})
