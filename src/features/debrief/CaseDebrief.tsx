import { CheckCircle2, FileBadge2, LockKeyhole } from 'lucide-react'
import { Link } from 'react-router-dom'

import { translate } from '../../cases/localization'
import type { CaseBundle } from '../../cases/loader'
import { useGameStore } from '../../state/game-store'
import { useGamePersistence } from '../../state/use-game-persistence'
import styles from './CaseDebrief.module.css'

type CaseDebriefProps = {
  bundle: CaseBundle
}

export function CaseDebrief({ bundle }: CaseDebriefProps) {
  const { caseDefinition, messages } = bundle
  useGamePersistence(caseDefinition.id, caseDefinition.contentVersion)
  const rating = useGameStore((state) => state.rating)
  const completedAt = useGameStore((state) => state.completedAt)
  const text = (key: string) => translate(messages, key)

  if (!rating || !completedAt) {
    return (
      <main className={styles.unavailable}>
        <p>CASE STATUS / OPEN</p>
        <h1>尚未形成可归档的结案报告</h1>
        <span>请先在推理板完成最终证据链并提交结案。</span>
        <Link to={`/cases/${caseDefinition.id}/investigation`}>
          {text('ui.returnToInvestigation')}
        </Link>
      </main>
    )
  }

  const appendixUnlocked = rating.grade === 'S' || rating.grade === 'A'

  return (
    <main className={styles.debrief} data-grade={rating.grade}>
      <header className={styles.reportHeader}>
        <div>
          <p>EVIDENCE BUREAU / CLOSED CASE</p>
          <span>{caseDefinition.metadata.caseNumber}</span>
        </div>
        <strong>
          <CheckCircle2 aria-hidden="true" size={16} />
          {text('ui.caseClosed')}
        </strong>
      </header>

      <article className={styles.report}>
        <section className={styles.verdict}>
          <div>
            <p>{text('ui.debriefTitle')}</p>
            <h1>{text(caseDefinition.ending.titleKey)}</h1>
            <blockquote>{text(caseDefinition.ending.summaryKey)}</blockquote>
          </div>
          <div className={styles.grade} aria-label={`调查评级 ${rating.grade}`}>
            <span>{rating.grade}</span>
            <small>
              {rating.score} / {caseDefinition.rating.baseScore}
            </small>
          </div>
        </section>

        <section className={styles.metrics} aria-label={text('ui.ratingScore')}>
          <div>
            <span>{text('ui.clueCompleteness')}</span>
            <strong>
              {rating.discoveredClues} / {rating.totalClues}
            </strong>
          </div>
          <div>
            <span>{text('ui.hintsUsed')}</span>
            <strong>{rating.viewedHintLevels}</strong>
          </div>
          <div>
            <span>{text('ui.failedSubmissions')}</span>
            <strong>{rating.failedSubmissions}</strong>
          </div>
          <div>
            <span>{text('ui.elapsedTime')}</span>
            <strong>{rating.elapsedMinutes} min</strong>
          </div>
        </section>

        <section className={styles.reconstruction}>
          <div className={styles.sectionHeading}>
            <span>01</span>
            <h2>{text('ui.reconstruction')}</h2>
          </div>
          <ol>
            <li>{text('ui.reconstructionDesk')}</li>
            <li>{text('ui.reconstructionKey')}</li>
            <li>{text('ui.reconstructionCamera')}</li>
          </ol>
          <p>{text(caseDefinition.ending.epilogueKey)}</p>
        </section>

        <section className={styles.appendix}>
          <div className={styles.sectionHeading}>
            <span>02</span>
            <h2>{text('ui.appendixTitle')}</h2>
          </div>
          {appendixUnlocked ? (
            <div className={styles.appendixContent}>
              <FileBadge2 aria-hidden="true" size={22} />
              <div>
                <strong>{text('ui.appendixUnlocked')}</strong>
                <p>{text(caseDefinition.ending.appendixKey)}</p>
              </div>
            </div>
          ) : (
            <div className={styles.appendixLocked}>
              <LockKeyhole aria-hidden="true" size={20} />
              <span>{text('ui.appendixLocked')}</span>
            </div>
          )}
        </section>

        <footer className={styles.reportFooter}>
          <span>CLOSED / {new Date(completedAt).toLocaleString('zh-CN')}</span>
          <Link to={`/cases/${caseDefinition.id}/investigation`}>
            {text('ui.returnToInvestigation')}
          </Link>
        </footer>
      </article>
    </main>
  )
}
