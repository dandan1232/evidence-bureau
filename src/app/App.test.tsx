import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { App } from './App'

describe('App', () => {
  it('显示产品名称和终端状态', () => {
    render(<App />)

    expect(
      screen.getByRole('heading', { level: 1, name: '物证档案局' }),
    ).toBeInTheDocument()
    expect(screen.getByText('调查终端正在准备案件档案。')).toBeVisible()
  })
})
