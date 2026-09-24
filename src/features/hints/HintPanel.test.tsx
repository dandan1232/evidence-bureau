import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'

import caseJson from '../../../public/cases/vanished-tenant/case.json'
import messages from '../../../public/cases/vanished-tenant/locales/zh-CN.json'
import { CaseDefinitionSchema } from '../../cases/schema'
import { useGameStore } from '../../state/game-store'
import { HintPanel } from './HintPanel'

const bundle = {
  caseDefinition: CaseDefinitionSchema.parse(caseJson),
  locale: 'zh-CN',
  messages,
}

describe('HintPanel', () => {
  beforeEach(() => useGameStore.getState().resetInvestigation())

  it('由玩家主动逐级展开提示并记录使用级数', async () => {
    const user = userEvent.setup()
    render(<HintPanel bundle={bundle} />)

    expect(screen.queryByText(messages['hint.desk.1'])).not.toBeInTheDocument()
    await user.click(
      screen.getAllByRole('button', { name: /查看下一级提示/ })[0]!,
    )

    expect(screen.getByText(messages['hint.desk.1'])).toBeVisible()
    expect(screen.getByText(/已查看提示级数 \/ 01/)).toBeVisible()
    expect(useGameStore.getState().viewedHintLevels).toEqual({
      'desk-chain-hint': 1,
    })
  })

  it('目标结论完成后停止继续揭示', () => {
    useGameStore.getState().unlockConclusion('desk-was-moved')
    render(<HintPanel bundle={bundle} />)

    expect(
      screen.getByRole('button', { name: '该调查方向已完成' }),
    ).toBeDisabled()
  })
})
