import {
  ArrowRight,
  CheckCircle2,
  GitFork,
  Link2,
  Plus,
  ShieldCheck,
  Trash2,
} from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { translate } from '../../cases/localization'
import type { CaseBundle } from '../../cases/loader'
import {
  evaluateDeduction,
  type DeductionRelation,
} from '../../engine/deduction/evaluate-deduction'
import { countViewedHintLevels } from '../../engine/hints/hint-progress'
import { calculateRating } from '../../engine/rating/calculate-rating'
import { useGameStore } from '../../state/game-store'
import styles from './DeductionBoard.module.css'

type DeductionBoardProps = {
  bundle: CaseBundle
}

export function DeductionBoard({ bundle }: DeductionBoardProps) {
  const { caseDefinition, messages } = bundle
  const navigate = useNavigate()
  const discoveredClueIds = useGameStore((state) => state.discoveredClueIds)
  const deductionNodeIds = useGameStore((state) => state.deductionNodeIds)
  const deductionRelations = useGameStore((state) => state.deductionRelations)
  const unlockedConclusionIds = useGameStore(
    (state) => state.unlockedConclusionIds,
  )
  const addDeductionNode = useGameStore((state) => state.addDeductionNode)
  const addDeductionRelation = useGameStore(
    (state) => state.addDeductionRelation,
  )
  const removeDeductionRelation = useGameStore(
    (state) => state.removeDeductionRelation,
  )
  const unlockConclusion = useGameStore((state) => state.unlockConclusion)
  const viewedHintLevels = useGameStore((state) => state.viewedHintLevels)
  const failedSubmissions = useGameStore((state) => state.failedSubmissions)
  const startedAt = useGameStore((state) => state.startedAt)
  const recordFailedSubmission = useGameStore(
    (state) => state.recordFailedSubmission,
  )
  const completeCase = useGameStore((state) => state.completeCase)
  const rating = useGameStore((state) => state.rating)
  const [feedback, setFeedback] = useState<'idle' | 'incomplete' | 'matched'>(
    'idle',
  )
  const [matchedCount, setMatchedCount] = useState(0)
  const [finalFeedback, setFinalFeedback] = useState<'idle' | 'incomplete'>(
    'idle',
  )
  const [confirmingSubmission, setConfirmingSubmission] = useState(false)
  const [relationFrom, setRelationFrom] = useState('')
  const [relationTo, setRelationTo] = useState('')
  const [relationKind, setRelationKind] =
    useState<DeductionRelation['kind']>('supports')
  const text = (key: string) => translate(messages, key)

  const availableClues = caseDefinition.clues.filter(
    ({ id, kind }) => kind !== 'conclusion' && discoveredClueIds.includes(id),
  )
  const placedClues = availableClues.filter(({ id }) =>
    deductionNodeIds.includes(id),
  )
  const conclusions = caseDefinition.deductions
    .map((rule) =>
      caseDefinition.clues.find(({ id }) => id === rule.unlocksConclusionId),
    )
    .filter((conclusion) => conclusion !== undefined)
  const unlockedConclusions = conclusions.filter(({ id }) =>
    unlockedConclusionIds.includes(id),
  )
  const relationNodes = [...placedClues, ...unlockedConclusions]
  const finalConclusion = caseDefinition.clues.find(
    ({ id }) => id === caseDefinition.finalDeduction.unlocksConclusionId,
  )
  const allIntermediateConclusionsUnlocked =
    caseDefinition.finalDeduction.requiredNodes.every((nodeId) =>
      unlockedConclusionIds.includes(nodeId),
    )
  const finalEvaluation = evaluateDeduction(caseDefinition.finalDeduction, {
    nodeIds: unlockedConclusionIds,
    relations: deductionRelations,
  })

  const verifyChain = () => {
    const matchedConclusionIds = caseDefinition.deductions.flatMap((rule) => {
      const result = evaluateDeduction(rule, {
        nodeIds: deductionNodeIds,
        relations: deductionRelations,
      })
      return result.status === 'matched' ? [result.conclusionId] : []
    })

    matchedConclusionIds.forEach(unlockConclusion)
    setMatchedCount(matchedConclusionIds.length)
    setFeedback(matchedConclusionIds.length > 0 ? 'matched' : 'incomplete')
  }

  const addAllAvailableClues = () => {
    availableClues.forEach(({ id }) => {
      addDeductionNode(id)
    })
  }

  const allAvailableCluesPlaced = availableClues.every(({ id }) =>
    deductionNodeIds.includes(id),
  )

  const matchedFeedback = `${matchedCount} ${text('ui.rulesMatched')}`

  const isConclusionUnlocked = (conclusionId: string) =>
    unlockedConclusionIds.includes(conclusionId)

  const feedbackText =
    feedback === 'matched'
      ? matchedFeedback
      : feedback === 'incomplete'
        ? text('ui.chainIncomplete')
        : text('ui.provisionalReasoning')

  const placedClueCount = placedClues.length
  const conclusionCount = conclusions.length

  if (conclusionCount === 0) {
    return null
  }

  const availableClueCount = availableClues.length
  const canAddAll = availableClueCount > 0 && !allAvailableCluesPlaced

  const boardSummary = `${String(placedClueCount).padStart(2, '0')} NODES / ${String(conclusionCount).padStart(2, '0')} RULES`

  const handleAddAll = () => {
    if (canAddAll) {
      addAllAvailableClues()
    }
  }

  const addRelation = () => {
    if (!relationFrom || !relationTo || relationFrom === relationTo) return
    addDeductionRelation({
      from: relationFrom,
      to: relationTo,
      kind: relationKind,
    })
    setRelationFrom('')
    setRelationTo('')
  }

  const clueTitle = (clueId: string) => {
    const clue = caseDefinition.clues.find(({ id }) => id === clueId)
    return clue ? text(clue.titleKey) : clueId
  }

  const submitFinalChain = () => {
    setConfirmingSubmission(false)
    if (finalEvaluation.status !== 'matched') {
      recordFailedSubmission()
      setFinalFeedback('incomplete')
      return
    }

    const observationCount = caseDefinition.clues.filter(
      ({ kind }) => kind === 'observation',
    ).length
    const elapsedMinutes =
      (Date.now() - new Date(startedAt).getTime()) / (60 * 1000)
    const rating = calculateRating(caseDefinition.rating, {
      discoveredClueCount: discoveredClueIds.length,
      totalClueCount: observationCount,
      viewedHintLevelCount: countViewedHintLevels(viewedHintLevels),
      failedSubmissions,
      elapsedMinutes,
      targetMinutes: caseDefinition.metadata.estimatedMinutes[1],
    })
    unlockConclusion(caseDefinition.finalDeduction.unlocksConclusionId)
    completeCase(rating)
    void navigate(`/cases/${caseDefinition.id}/debrief`)
  }

  const relationLabel = (kind: DeductionRelation['kind']) => {
    const option = relationOptions.find(({ id }) => id === kind)
    return option ? text(option.labelKey) : kind
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
        <strong>{boardSummary}</strong>
      </header>

      <div className={styles.boardLayout}>
        <aside
          className={styles.sourceTray}
          aria-labelledby="source-tray-title"
        >
          <div className={styles.sectionTitle}>
            <span>01</span>
            <h2 id="source-tray-title">{text('ui.availableEvidence')}</h2>
            <button
              className={styles.addAllButton}
              disabled={!canAddAll}
              type="button"
              onClick={handleAddAll}
            >
              {text(
                allAvailableCluesPlaced
                  ? 'ui.addedToBoard'
                  : 'ui.addAllToBoard',
              )}
            </button>
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

          <section
            className={styles.relationBuilder}
            aria-labelledby="relation-builder-title"
          >
            <div className={styles.relationBuilderHeading}>
              <Link2 aria-hidden="true" size={16} />
              <h3 id="relation-builder-title">{text('ui.relationBuilder')}</h3>
              <span>
                {deductionRelations.length} {text('ui.relationCount')}
              </span>
            </div>
            <div className={styles.relationControls}>
              <label>
                <span>{text('ui.relationFrom')}</span>
                <select
                  value={relationFrom}
                  onChange={(event) => setRelationFrom(event.target.value)}
                >
                  <option value="">{text('ui.selectNode')}</option>
                  {relationNodes.map((clue) => (
                    <option key={clue.id} value={clue.id}>
                      {text(clue.titleKey)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>{text('ui.relationKind')}</span>
                <select
                  value={relationKind}
                  onChange={(event) =>
                    setRelationKind(
                      event.target.value as DeductionRelation['kind'],
                    )
                  }
                >
                  {relationOptions.map(({ id, labelKey }) => (
                    <option key={id} value={id}>
                      {text(labelKey)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>{text('ui.relationTo')}</span>
                <select
                  value={relationTo}
                  onChange={(event) => setRelationTo(event.target.value)}
                >
                  <option value="">{text('ui.selectNode')}</option>
                  {relationNodes.map((clue) => (
                    <option key={clue.id} value={clue.id}>
                      {text(clue.titleKey)}
                    </option>
                  ))}
                </select>
              </label>
              <button
                disabled={
                  !relationFrom || !relationTo || relationFrom === relationTo
                }
                type="button"
                onClick={addRelation}
              >
                <Plus aria-hidden="true" size={15} />
                {text('ui.addRelation')}
              </button>
            </div>
            {deductionRelations.length > 0 ? (
              <ol className={styles.relationList}>
                {deductionRelations.map((relation) => (
                  <li key={`${relation.from}:${relation.kind}:${relation.to}`}>
                    <span>{clueTitle(relation.from)}</span>
                    <strong>{relationLabel(relation.kind)}</strong>
                    <span>{clueTitle(relation.to)}</span>
                    <button
                      type="button"
                      aria-label={`${text('ui.removeRelation')}：${clueTitle(relation.from)} → ${clueTitle(relation.to)}`}
                      onClick={() => removeDeductionRelation(relation)}
                    >
                      <Trash2 aria-hidden="true" size={14} />
                    </button>
                  </li>
                ))}
              </ol>
            ) : null}
          </section>

          <div className={styles.graphArea}>
            {placedClues.length === 0 ? (
              <div className={styles.graphEmpty}>
                <GitFork aria-hidden="true" size={28} />
                <p>{text('ui.dropEvidencePrompt')}</p>
              </div>
            ) : (
              <>
                <div className={styles.nodeColumn}>
                  {placedClues.map((clue) => (
                    <article className={styles.evidenceNode} key={clue.id}>
                      <span>VERIFIED OBSERVATION</span>
                      <strong>{text(clue.titleKey)}</strong>
                      <p>{text(clue.descriptionKey)}</p>
                    </article>
                  ))}
                </div>
                <div className={styles.chainArrow} aria-hidden="true">
                  <ArrowRight size={20} />
                </div>
                <div className={styles.conclusionColumn}>
                  {conclusions.map((conclusion) => {
                    const unlocked = isConclusionUnlocked(conclusion.id)
                    return (
                      <article
                        className={`${styles.conclusionNode} ${unlocked ? styles.unlockedConclusion : ''}`}
                        key={conclusion.id}
                      >
                        <span>{text('ui.intermediateConclusion')}</span>
                        {unlocked ? (
                          <>
                            <ShieldCheck aria-hidden="true" size={22} />
                            <h3>{text(conclusion.titleKey)}</h3>
                            <p>{text(conclusion.descriptionKey)}</p>
                          </>
                        ) : (
                          <strong>?</strong>
                        )}
                      </article>
                    )
                  })}
                </div>
              </>
            )}
          </div>

          <footer className={styles.verifyBar}>
            <p>{feedbackText}</p>
            <button
              disabled={placedClues.length === 0}
              type="button"
              onClick={verifyChain}
            >
              <ShieldCheck aria-hidden="true" size={17} />
              {text('ui.verifyChain')}
            </button>
          </footer>

          <section
            className={styles.finalChain}
            aria-labelledby="final-chain-title"
          >
            <div>
              <span>03 / CASE CLOSURE</span>
              <h2 id="final-chain-title">{text('ui.finalChainTitle')}</h2>
              <p>{text('ui.finalChainDescription')}</p>
            </div>
            <div className={styles.finalNodes}>
              {conclusions.map((conclusion) => (
                <span
                  className={
                    isConclusionUnlocked(conclusion.id)
                      ? styles.finalNodeReady
                      : undefined
                  }
                  key={conclusion.id}
                >
                  {isConclusionUnlocked(conclusion.id)
                    ? text(conclusion.titleKey)
                    : '待验证'}
                </span>
              ))}
              <ArrowRight aria-hidden="true" size={18} />
              <strong>
                {finalEvaluation.status === 'matched' && finalConclusion
                  ? text(finalConclusion.titleKey)
                  : '最终结论待封存'}
              </strong>
            </div>
            <p className={styles.finalStatus} role="status">
              {!allIntermediateConclusionsUnlocked
                ? text('ui.finalChainLocked')
                : finalEvaluation.status === 'matched'
                  ? text('ui.finalChainReady')
                  : finalFeedback === 'incomplete'
                    ? text('ui.finalChainIncomplete')
                    : text('ui.finalChainDescription')}
            </p>
            {rating ? (
              <button
                className={styles.submitButton}
                type="button"
                onClick={() =>
                  void navigate(`/cases/${caseDefinition.id}/debrief`)
                }
              >
                <ShieldCheck aria-hidden="true" size={17} />
                {text('ui.viewDebrief')}
              </button>
            ) : confirmingSubmission ? (
              <div
                className={styles.confirmation}
                role="alertdialog"
                aria-labelledby="case-submit-title"
              >
                <div>
                  <strong id="case-submit-title">
                    {text('ui.confirmCaseTitle')}
                  </strong>
                  <p>{text('ui.confirmCaseDescription')}</p>
                </div>
                <button type="button" onClick={submitFinalChain}>
                  {text('ui.confirmSubmit')}
                </button>
                <button
                  className={styles.cancelButton}
                  type="button"
                  onClick={() => setConfirmingSubmission(false)}
                >
                  {text('ui.cancelSubmit')}
                </button>
              </div>
            ) : (
              <button
                className={styles.submitButton}
                disabled={!allIntermediateConclusionsUnlocked}
                type="button"
                onClick={() => setConfirmingSubmission(true)}
              >
                <ShieldCheck aria-hidden="true" size={17} />
                {text('ui.submitCase')}
              </button>
            )}
          </section>
        </section>
      </div>
    </section>
  )
}

const relationOptions: Array<{
  id: DeductionRelation['kind']
  labelKey: string
}> = [
  { id: 'supports', labelKey: 'ui.relationSupports' },
  { id: 'contradicts', labelKey: 'ui.relationContradicts' },
  { id: 'explains', labelKey: 'ui.relationExplains' },
  { id: 'locates', labelKey: 'ui.relationLocates' },
  { id: 'precedes', labelKey: 'ui.relationPrecedes' },
]
