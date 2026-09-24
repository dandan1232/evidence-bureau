import { CheckCircle2, Lightbulb, LockKeyhole } from 'lucide-react'

import { translate } from '../../cases/localization'
import type { CaseBundle } from '../../cases/loader'
import {
  countViewedHintLevels,
  getHintProgress,
  isHintTargetResolved,
} from '../../engine/hints/hint-progress'
import { useGameStore } from '../../state/game-store'
import styles from './HintPanel.module.css'

type HintPanelProps = {
  bundle: CaseBundle
}

export function HintPanel({ bundle }: HintPanelProps) {
  const { caseDefinition, messages } = bundle
  const discoveredClueIds = useGameStore((state) => state.discoveredClueIds)
  const unlockedConclusionIds = useGameStore(
    (state) => state.unlockedConclusionIds,
  )
  const viewedHintLevels = useGameStore((state) => state.viewedHintLevels)
  const revealNextHint = useGameStore((state) => state.revealNextHint)
  const text = (key: string) => translate(messages, key)
  const discoveredSet = new Set(discoveredClueIds)
  const unlockedSet = new Set(unlockedConclusionIds)
  const totalViewedLevels = countViewedHintLevels(viewedHintLevels)

  return (
    <section className={styles.panel} aria-labelledby="hints-title">
      <header className={styles.heading}>
        <div className={styles.headingIcon} aria-hidden="true">
          <Lightbulb size={22} />
        </div>
        <div>
          <p>ASSISTED REVIEW / ON REQUEST</p>
          <h1 id="hints-title">{text('ui.hintsTitle')}</h1>
          <span>{text('ui.hintsDescription')}</span>
        </div>
        <strong>
          {text('ui.hintPenalty')} /{' '}
          {String(totalViewedLevels).padStart(2, '0')}
        </strong>
      </header>

      <ol className={styles.hintList}>
        {caseDefinition.hints.map((hint, index) => {
          const target = caseDefinition.clues.find(
            ({ id }) => id === hint.targetId,
          )
          const resolved = isHintTargetResolved(
            hint.targetId,
            discoveredSet,
            unlockedSet,
          )
          const progress = getHintProgress(hint, viewedHintLevels)

          return (
            <li
              className={resolved ? styles.resolved : undefined}
              key={hint.id}
            >
              <div className={styles.hintIdentity}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <div>
                  <small>{text('ui.intermediateConclusion')}</small>
                  <h2>{target ? text(target.titleKey) : hint.targetId}</h2>
                </div>
                {resolved ? (
                  <CheckCircle2
                    aria-label={text('ui.hintResolved')}
                    size={20}
                  />
                ) : (
                  <LockKeyhole aria-hidden="true" size={19} />
                )}
              </div>

              {progress.viewedLevel > 0 ? (
                <ol className={styles.levels}>
                  {hint.levelKeys
                    .slice(0, progress.viewedLevel)
                    .map((levelKey, levelIndex) => (
                      <li key={levelKey}>
                        <span>
                          {text('ui.hintLevel')} {levelIndex + 1}
                        </span>
                        <p>{text(levelKey)}</p>
                      </li>
                    ))}
                </ol>
              ) : (
                <p className={styles.unrevealed}>{text('ui.hintUnrevealed')}</p>
              )}

              <button
                disabled={resolved || !progress.canRevealNext}
                type="button"
                onClick={() => revealNextHint(hint.id)}
              >
                {resolved
                  ? text('ui.hintResolved')
                  : progress.canRevealNext
                    ? `${text('ui.hintRevealNext')} · ${progress.nextLevel}/3`
                    : text('ui.hintAllRevealed')}
              </button>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
