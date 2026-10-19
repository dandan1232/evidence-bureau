import { CheckCircle2 } from 'lucide-react'

import { translate } from '../../cases/localization'
import type { CaseBundle } from '../../cases/loader'
import {
  evaluateDeduction,
  type DeductionRule,
} from '../../engine/deduction/evaluate-deduction'
import { useGameStore } from '../../state/game-store'
import styles from './DeductionBoard.module.css'

type GuidedReasoningProps = {
  bundle: CaseBundle
  onFindClue?: (clueId: string) => void
}

export function GuidedReasoning({ bundle, onFindClue }: GuidedReasoningProps) {
  const { caseDefinition, messages } = bundle
  const discoveredClueIds = useGameStore((state) => state.discoveredClueIds)
  const unlockedConclusionIds = useGameStore(
    (state) => state.unlockedConclusionIds,
  )
  const clue = (id: string) =>
    caseDefinition.clues.find((item) => item.id === id)
  const title = (id: string) => {
    const item = clue(id)
    return item ? translate(messages, item.titleKey) : id
  }
  const confirmJudgment = (rule: DeductionRule) => {
    const state = useGameStore.getState()
    if (!rule.requiredNodes.every((id) => state.discoveredClueIds.includes(id)))
      return
    rule.requiredNodes.forEach(state.addDeductionNode)
    rule.requiredRelations.forEach(state.addDeductionRelation)
    const graph = useGameStore.getState()
    const result = evaluateDeduction(rule, {
      nodeIds: graph.deductionNodeIds,
      relations: graph.deductionRelations,
    })
    if (result.status === 'matched') state.unlockConclusion(result.conclusionId)
  }

  return (
    <section className={styles.guidedReasoning} aria-label="引导推理">
      <p>读一读已找到的线索，再确认它们支持的判断。证据会自动连好。</p>
      <ol>
        {caseDefinition.deductions.map((rule, index) => {
          const missingIds = rule.requiredNodes.filter(
            (id) => !discoveredClueIds.includes(id),
          )
          const unlocked = unlockedConclusionIds.includes(
            rule.unlocksConclusionId,
          )
          const conclusion = clue(rule.unlocksConclusionId)
          return (
            <li key={rule.id}>
              <span className={styles.guidedNumber}>
                {String(index + 1).padStart(2, '0')}
              </span>
              <div>
                <h2>{title(rule.unlocksConclusionId)}</h2>
                <ul>
                  {rule.requiredNodes.map((id) => {
                    const found = discoveredClueIds.includes(id)
                    const item = clue(id)
                    return (
                      <li key={id}>
                        <span className={found ? styles.foundClue : undefined}>
                          {found ? '已找到' : '待检查'} · {title(id)}
                        </span>
                        {found && item ? (
                          <p>{translate(messages, item.descriptionKey)}</p>
                        ) : null}
                      </li>
                    )
                  })}
                </ul>
                {unlocked && conclusion ? (
                  <p className={styles.judgmentFeedback} role="status">
                    <CheckCircle2 size={18} aria-hidden="true" />
                    判断成立。{translate(messages, conclusion.descriptionKey)}
                  </p>
                ) : null}
              </div>
              {missingIds[0] ? (
                <button
                  type="button"
                  onClick={() => onFindClue?.(missingIds[0]!)}
                >
                  去找缺少的线索
                </button>
              ) : (
                <button
                  type="button"
                  disabled={unlocked}
                  onClick={() => confirmJudgment(rule)}
                >
                  {unlocked ? '判断已确认' : '确认这个判断'}
                </button>
              )}
            </li>
          )
        })}
      </ol>
    </section>
  )
}
