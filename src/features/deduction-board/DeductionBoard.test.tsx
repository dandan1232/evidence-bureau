import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import caseJson from '../../../public/cases/vanished-tenant/case.json'
import messages from '../../../public/cases/vanished-tenant/locales/zh-CN.json'
import { CaseDefinitionSchema } from '../../cases/schema'
import { evaluateDeduction } from '../../engine/deduction/evaluate-deduction'
import { useGameStore } from '../../state/game-store'
import { DeductionBoard } from './DeductionBoard'

const bundle = {
  caseDefinition: CaseDefinitionSchema.parse(caseJson),
  locale: 'zh-CN',
  messages,
}

describe('引导推理', () => {
  beforeEach(() => useGameStore.getState().resetInvestigation())

  it('证据不足时引导返回缺少的观察，不能直接确认判断或结案', async () => {
    const user = userEvent.setup()
    const findClue = vi.fn()
    useGameStore.getState().discoverClue('desk-leg-fresh-scrape')
    render(
      <MemoryRouter>
        <DeductionBoard bundle={bundle} guided onFindClue={findClue} />
      </MemoryRouter>,
    )

    expect(
      screen.queryByRole('button', { name: '确认这个判断' }),
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: '整理证据并结案' }),
    ).toBeDisabled()
    await user.click(
      screen.getAllByRole('button', { name: '去找缺少的线索' })[0]!,
    )
    expect(findClue).toHaveBeenCalledWith('desk-access-clearance')
    expect(useGameStore.getState().unlockedConclusionIds).toEqual([])
  })

  it('仅用真实发现的六条关键线索即可确认三项判断并通过原有结案规则', async () => {
    const user = userEvent.setup()
    bundle.caseDefinition.deductions
      .flatMap((rule) => rule.requiredNodes)
      .forEach(useGameStore.getState().discoverClue)
    render(
      <MemoryRouter>
        <Routes>
          <Route path="/" element={<DeductionBoard bundle={bundle} guided />} />
          <Route
            path="/cases/vanished-tenant/debrief"
            element={<h1>调查完成</h1>}
          />
        </Routes>
      </MemoryRouter>,
    )

    for (const button of screen.getAllByRole('button', {
      name: '确认这个判断',
    })) {
      await user.click(button)
    }
    expect(useGameStore.getState().unlockedConclusionIds).toHaveLength(3)
    await user.click(screen.getByRole('button', { name: '整理证据并结案' }))
    const state = useGameStore.getState()
    expect(
      evaluateDeduction(bundle.caseDefinition.finalDeduction, {
        nodeIds: state.unlockedConclusionIds,
        relations: state.deductionRelations,
      }).status,
    ).toBe('matched')
    await user.click(screen.getByRole('button', { name: '确认结案' }))
    expect(screen.getByRole('heading', { name: '调查完成' })).toBeVisible()
    expect(useGameStore.getState().rating?.discoveredClues).toBe(6)
    expect(useGameStore.getState().failedSubmissions).toBe(0)
  })

  it('自由调查保留手动连线，不会自动生成证据关系', () => {
    useGameStore.getState().discoverClue('desk-leg-fresh-scrape')
    render(
      <MemoryRouter>
        <DeductionBoard bundle={bundle} />
      </MemoryRouter>,
    )
    expect(screen.getAllByRole('combobox')).toHaveLength(3)
    expect(screen.getByRole('button', { name: '验证证据链' })).toBeVisible()
    expect(useGameStore.getState().deductionRelations).toEqual([])
  })
})
