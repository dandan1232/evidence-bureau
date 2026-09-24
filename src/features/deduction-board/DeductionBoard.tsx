import {
  ArrowRight,
  CheckCircle2,
  GitFork,
  Plus,
  ShieldCheck,
} from 'lucide-react'
import { useState } from 'react'

import { translate } from '../../cases/localization'
import type { CaseBundle } from '../../cases/loader'
import { evaluateDeduction } from '../../engine/deduction/evaluate-deduction'
import { useGameStore } from '../../state/game-store'
import styles from './DeductionBoard.module.css'

type DeductionBoardProps = {
  bundle: CaseBundle
}

export function DeductionBoard({ bundle }: DeductionBoardProps) {
  const { caseDefinition, messages } = bundle
  const discoveredClueIds = useGameStore((state) => state.discoveredClueIds)
  const deductionNodeIds = useGameStore((state) => state.deductionNodeIds)
  const unlockedConclusionIds = useGameStore(
    (state) => state.unlockedConclusionIds,
  )
  const addDeductionNode = useGameStore((state) => state.addDeductionNode)
  const unlockConclusion = useGameStore((state) => state.unlockConclusion)
  const [feedback, setFeedback] = useState<'idle' | 'incomplete' | 'matched'>(
    'idle',
  )
  const text = (key: string) => translate(messages, key)

  const availableClues = caseDefinition.clues.filter(
    ({ id, kind }) => kind !== 'conclusion' && discoveredClueIds.includes(id),
  )
  const placedClues = availableClues.filter(({ id }) =>
    deductionNodeIds.includes(id),
  )
  const rule = caseDefinition.deductions[0]
  const conclusion = caseDefinition.clues.find(
    ({ id }) => id === rule?.unlocksConclusionId,
  )
  const conclusionUnlocked = conclusion
    ? unlockedConclusionIds.includes(conclusion.id)
    : false

  const verifyChain = () => {
    if (!rule) return
    const result = evaluateDeduction(rule, {
      nodeIds: deductionNodeIds,
      relations: [],
    })
    if (result.status === 'matched') {
      unlockConclusion(result.conclusionId)
      setFeedback('matched')
    } else {
      setFeedback('incomplete')
    }
  }

  return (
    <section className={styles.board} aria-labelledby="deduction-title">
      <header className={styles.heading}>
        <div className={styles.headingIcon} aria-hidden="true">
          <GitFork size={22} />
        </div>
        <div>
          <p>DEDUCTION / RULE-BASED ANALYSIS</p>
          <h1 id="deduction-title">{text('ui.deductionTitle')}</h1>
          <span>{text('ui.deductionDescription')}</span>
        </div>
        <strong>{String(placedClues.length).padStart(2, '0')} NODES</strong>
      </header>

      <div className={styles.boardLayout}>
        <aside
          className={styles.sourceTray}
          aria-labelledby="source-tray-title"
        >
          <div className={styles.sectionTitle}>
            <span>01</span>
            <h2 id="source-tray-title">{text('ui.availableEvidence')}</h2>
          </div>
          <ul>
            {availableClues.map((clue) => {
              const added = deductionNodeIds.includes(clue.id)
              return (
                <li key={clue.id}>
                  <span>OBS</span>
                  <strong>{text(clue.titleKey)}</strong>
                  <button
                    disabled={added}
                    type="button"
                    onClick={() => addDeductionNode(clue.id)}
                  >
                    {added ? (
                      <CheckCircle2 aria-hidden="true" size={15} />
                    ) : (
                      <Plus aria-hidden="true" size={15} />
                    )}
                    {text(added ? 'ui.addedToBoard' : 'ui.addToBoard')}
                  </button>
                </li>
              )
            })}
          </ul>
        </aside>

        <section
          className={styles.reasoningArea}
          aria-labelledby="reasoning-title"
        >
          <div className={styles.sectionTitle}>
            <span>02</span>
            <h2 id="reasoning-title">{text('ui.reasoningWorkspace')}</h2>
          </div>

          <div className={styles.graphArea}>
            {placedClues.length === 0 ? (
              <div className={styles.graphEmpty}>
                <GitFork aria-hidden="true" size={28} />
                <p>{text('ui.dropEvidencePrompt')}</p>
              </div>
            ) : (
              <>
                {placedClues.map((clue) => (
                  <article className={styles.evidenceNode} key={clue.id}>
                    <span>VERIFIED OBSERVATION</span>
                    <strong>{text(clue.titleKey)}</strong>
                    <p>{text(clue.descriptionKey)}</p>
                  </article>
                ))}
                <div className={styles.chainArrow} aria-hidden="true">
                  <ArrowRight size={20} />
                </div>
                <article
                  className={`${styles.conclusionNode} ${conclusionUnlocked ? styles.unlockedConclusion : ''}`}
                >
                  <span>{text('ui.intermediateConclusion')}</span>
                  {conclusionUnlocked && conclusion ? (
                    <>
                      <ShieldCheck aria-hidden="true" size={22} />
                      <h3>{text(conclusion.titleKey)}</h3>
                      <p>{text(conclusion.descriptionKey)}</p>
                    </>
                  ) : (
                    <strong>?</strong>
                  )}
                </article>
              </>
            )}
          </div>

          <footer className={styles.verifyBar}>
            <p>
              {feedback === 'matched'
                ? text('ui.ruleMatched')
                : feedback === 'incomplete'
                  ? text('ui.chainIncomplete')
                  : text('ui.provisionalReasoning')}
            </p>
            <button
              disabled={placedClues.length === 0}
              type="button"
              onClick={verifyChain}
            >
              <ShieldCheck aria-hidden="true" size={17} />
              {text('ui.verifyChain')}
            </button>
          </footer>
        </section>
      </div>
    </section>
  )
}
