import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'

import caseJson from '../../../public/cases/vanished-tenant/case.json'
import messages from '../../../public/cases/vanished-tenant/locales/zh-CN.json'
import { CaseDefinitionSchema } from '../../cases/schema'
import { useGameStore } from '../../state/game-store'
import { CaseDebrief } from './CaseDebrief'

const bundle = {
  caseDefinition: CaseDefinitionSchema.parse(caseJson),
  locale: 'zh-CN',
  messages,
}

describe('CaseDebrief', () => {
  beforeEach(() => {
    localStorage.clear()
    useGameStore.getState().resetInvestigation()
  })

  it('展示评级、事实重建和高评级附录', () => {
    useGameStore.getState().completeCase(
      {
        score: 955,
        grade: 'S',
        discoveredClues: 12,
        totalClues: 12,
        viewedHintLevels: 1,
        failedSubmissions: 0,
        elapsedMinutes: 32,
      },
      '2026-09-24T05:00:00.000Z',
    )

    render(
      <MemoryRouter>
        <CaseDebrief bundle={bundle} />
      </MemoryRouter>,
    )

    expect(screen.getByLabelText('调查评级 S')).toBeVisible()
    expect(screen.getByRole('heading', { name: '通道仍然存在' })).toBeVisible()
    expect(screen.getByText(messages['ending.appendix'])).toBeVisible()
  })

  it('未结案时引导返回调查台', () => {
    render(
      <MemoryRouter>
        <CaseDebrief bundle={bundle} />
      </MemoryRouter>,
    )

    expect(screen.getByText('尚未形成可归档的结案报告')).toBeVisible()
  })
})
