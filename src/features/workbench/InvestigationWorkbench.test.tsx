import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import caseJson from '../../../public/cases/vanished-tenant/case.json'
import messages from '../../../public/cases/vanished-tenant/locales/zh-CN.json'
import { CaseDefinitionSchema } from '../../cases/schema'
import { useGameStore } from '../../state/game-store'
import { InvestigationWorkbench } from './InvestigationWorkbench'

vi.mock('../../state/use-game-persistence', () => ({
  useGamePersistence: () => 'saved',
}))
vi.mock('./EvidenceViewport', () => ({
  EvidenceViewport: ({
    guidedHotspot,
    onGuidedRecord,
  }: {
    guidedHotspot?: { id: string }
    onGuidedRecord: () => void
  }) =>
    guidedHotspot ? <button onClick={onGuidedRecord}>记录线索</button> : null,
}))

const bundle = {
  caseDefinition: CaseDefinitionSchema.parse(caseJson),
  locale: 'zh-CN',
  messages,
}
const renderWorkbench = () =>
  render(
    <MemoryRouter>
      <InvestigationWorkbench bundle={bundle} />
    </MemoryRouter>,
  )

describe('轻松调查', () => {
  beforeEach(() => useGameStore.getState().resetInvestigation())

  it('主动定位时自动选择工具，点击后明确记录并引导下一条线索', async () => {
    const user = userEvent.setup()
    renderWorkbench()
    expect(screen.getByRole('checkbox', { name: '轻松调查' })).toBeChecked()
    expect(
      screen.queryByRole('button', { name: '记录线索' }),
    ).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '定位并检查' }))
    expect(useGameStore.getState().selectedTool).toBe('side-light')
    await user.click(screen.getByRole('button', { name: '记录线索' }))
    expect(useGameStore.getState().discoveredClueIds).toEqual([
      'desk-leg-fresh-scrape',
    ])
    expect(screen.getByText('线索已记录')).toBeVisible()

    await user.click(screen.getByRole('button', { name: '继续下一步' }))
    expect(useGameStore.getState().selectedTool).toBe('measurement')
    expect(screen.getByRole('button', { name: '记录线索' })).toBeVisible()
  })

  it('保留已有进度，关键线索齐全后跳到下一件物证，不强迫凑满四条', async () => {
    const user = userEvent.setup()
    const existing = [
      'desk-leg-fresh-scrape',
      'desk-access-clearance',
      'desk-wall-impact-notch',
    ]
    existing.forEach(useGameStore.getState().discoverClue)
    renderWorkbench()

    await user.click(
      screen.getByRole('button', { name: '继续检查损坏的旧相机' }),
    )
    expect(useGameStore.getState().currentEvidenceId).toBe('damaged-camera')
    expect(useGameStore.getState().selectedTool).toBe('ultraviolet')
    expect(useGameStore.getState().discoveredClueIds).toEqual(existing)
    await user.click(screen.getByRole('checkbox', { name: '轻松调查' }))
    expect(
      screen.queryByRole('button', { name: '记录线索' }),
    ).not.toBeInTheDocument()
    expect(useGameStore.getState().discoveredClueIds).toEqual(existing)
  })
})
