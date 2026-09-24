import { Archive, ArrowLeft, FileCheck2 } from 'lucide-react'

import { translate } from '../../cases/localization'
import type { CaseBundle } from '../../cases/loader'
import { investigationTools } from '../workbench/tool-definitions'
import styles from './ClueArchive.module.css'

type ClueArchiveProps = {
  bundle: CaseBundle
  discoveredClueIds: string[]
  onBackToEvidence: () => void
}

export function ClueArchive({
  bundle,
  discoveredClueIds,
  onBackToEvidence,
}: ClueArchiveProps) {
  const { caseDefinition, messages } = bundle
  const text = (key: string) => translate(messages, key)
  const archivableClues = caseDefinition.clues.filter(
    ({ kind }) => kind !== 'conclusion',
  )
  const discoveredClues = archivableClues.filter(({ id }) =>
    discoveredClueIds.includes(id),
  )

  return (
    <section className={styles.archive} aria-labelledby="archive-title">
      <header className={styles.heading}>
        <div className={styles.headingIcon} aria-hidden="true">
          <Archive size={22} />
        </div>
        <div>
          <p>ARCHIVE / VERIFIED FINDINGS</p>
          <h1 id="archive-title">{text('ui.archiveTitle')}</h1>
          <span>{text('ui.archiveDescription')}</span>
        </div>
        <strong>
          {String(discoveredClues.length).padStart(2, '0')} /{' '}
          {String(archivableClues.length).padStart(2, '0')}
        </strong>
      </header>

      {discoveredClues.length === 0 ? (
        <div className={styles.emptyState}>
          <span aria-hidden="true">00</span>
          <h2>{text('ui.archiveEmptyTitle')}</h2>
          <p>{text('ui.archiveEmptyDescription')}</p>
          <button type="button" onClick={onBackToEvidence}>
            <ArrowLeft aria-hidden="true" size={17} />
            {text('ui.backToEvidence')}
          </button>
        </div>
      ) : (
        <ol className={styles.clueList}>
          {discoveredClues.map((clue, index) => {
            const evidence = caseDefinition.evidence.find(
              ({ id }) => id === clue.evidenceId,
            )
            const hotspot = evidence?.hotspots.find(
              ({ clueId }) => clueId === clue.id,
            )
            const discoveryTool = investigationTools.find(
              ({ id }) => id === hotspot?.requiredTool,
            )
            return (
              <li key={clue.id}>
                <div className={styles.clueNumber}>
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <FileCheck2 aria-hidden="true" size={17} />
                </div>
                <article>
                  <p>
                    {text('ui.observationRecord')} / {clue.id.toUpperCase()}
                  </p>
                  <h2>{text(clue.titleKey)}</h2>
                  <span className={styles.source}>
                    {text('ui.sourceEvidence')} ·{' '}
                    {evidence
                      ? text(evidence.titleKey)
                      : text('ui.unknownSource')}
                  </span>
                  <p className={styles.description}>
                    {text(clue.descriptionKey)}
                  </p>
                  <footer>
                    <span>
                      {text('ui.investigationMethod')} ·{' '}
                      {discoveryTool?.name ?? text('ui.unknownSource')}
                    </span>
                    <span>{text('ui.recordVerified')}</span>
                  </footer>
                </article>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
