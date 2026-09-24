import {
  Accessibility,
  ArrowRight,
  Clock3,
  FileSearch,
  MapPin,
  Monitor,
  Settings2,
} from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'

import { translate } from '../../cases/localization'
import type { CaseBundle } from '../../cases/loader'
import styles from './CaseBriefingPage.module.css'

type CaseBriefingPageProps = {
  bundle: CaseBundle
}

export function CaseBriefingPage({ bundle }: CaseBriefingPageProps) {
  const [reduceMotion, setReduceMotion] = useState(false)
  const [highContrast, setHighContrast] = useState(false)
  const { caseDefinition, messages } = bundle
  const { metadata, evidence } = caseDefinition
  const text = (key: string) => translate(messages, key)

  return (
    <main
      className={`${styles.page} ${reduceMotion ? styles.reduceMotion : ''} ${highContrast ? styles.highContrast : ''}`}
    >
      <header className={styles.masthead}>
        <a className={styles.wordmark} href="#/" aria-label="物证档案局首页">
          <span className={styles.mark} aria-hidden="true">
            EB
          </span>
          <span>
            <strong>{text('ui.bureauName')}</strong>
            <small>EVIDENCE BUREAU</small>
          </span>
        </a>

        <div className={styles.headerMeta}>
          <span className={styles.connectionState}>
            <span aria-hidden="true" />
            {text('ui.localArchive')}
          </span>
          <details className={styles.preferences}>
            <summary>
              <Settings2 aria-hidden="true" size={17} />
              {text('ui.preferences')}
            </summary>
            <div className={styles.preferencesPanel}>
              <p>
                <Accessibility aria-hidden="true" size={16} />
                {text('ui.accessibility')}
              </p>
              <label>
                <input
                  checked={reduceMotion}
                  type="checkbox"
                  onChange={(event) => setReduceMotion(event.target.checked)}
                />
                <span>{text('ui.reduceMotion')}</span>
              </label>
              <label>
                <input
                  checked={highContrast}
                  type="checkbox"
                  onChange={(event) => setHighContrast(event.target.checked)}
                />
                <span>{text('ui.highContrast')}</span>
              </label>
            </div>
          </details>
        </div>
      </header>

      <section className={styles.caseLayout} aria-labelledby="case-title">
        <div className={styles.caseRecord}>
          <div className={styles.recordHeader}>
            <p className={styles.recordType}>{text('ui.caseFile')}</p>
            <p className={styles.caseNumber}>{metadata.caseNumber}</p>
            <span className={styles.caseStatus}>
              {text(`ui.status.${metadata.status}`)}
            </span>
          </div>

          <div className={styles.titleBlock}>
            <p className={styles.subtitle}>{text(metadata.subtitleKey)}</p>
            <h1 id="case-title">{text(metadata.titleKey)}</h1>
            <p className={styles.summary}>{text(metadata.summaryKey)}</p>
          </div>

          <dl className={styles.facts}>
            <div>
              <dt>
                <MapPin aria-hidden="true" size={16} />
                {text('ui.location')}
              </dt>
              <dd>{text(metadata.locationKey)}</dd>
            </div>
            <div>
              <dt>
                <Clock3 aria-hidden="true" size={16} />
                {text('ui.estimatedTime')}
              </dt>
              <dd>
                {metadata.estimatedMinutes[0]}–{metadata.estimatedMinutes[1]}{' '}
                {text('ui.minutes')}
              </dd>
            </div>
          </dl>

          <div className={styles.actionRow}>
            <Link
              className={styles.primaryAction}
              to={`/cases/${caseDefinition.id}/investigation`}
            >
              {text('ui.startInvestigation')}
              <ArrowRight aria-hidden="true" size={18} />
            </Link>
            <p className={styles.deviceAdvice}>
              <Monitor aria-hidden="true" size={17} />
              {text('ui.deviceAdvice')}
            </p>
          </div>
        </div>

        <aside className={styles.manifest} aria-labelledby="manifest-title">
          <div className={styles.manifestHeading}>
            <FileSearch aria-hidden="true" size={19} />
            <div>
              <p>{text('ui.intakeRegister')}</p>
              <h2 id="manifest-title">{text('ui.evidenceManifest')}</h2>
            </div>
          </div>

          <ol className={styles.evidenceList}>
            {evidence.map((item, index) => (
              <li key={item.id}>
                <span className={styles.evidenceIndex}>
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className={styles.evidenceName}>
                  {text(item.titleKey)}
                </span>
                <span className={styles.evidenceState}>
                  <span aria-hidden="true" />
                  {text('ui.unexamined')}
                </span>
              </li>
            ))}
          </ol>

          <div className={styles.plan} aria-hidden="true">
            <span className={styles.roomLabel}>407</span>
            <span className={styles.planDesk} />
            <span className={styles.planBed} />
            <span className={styles.planDoor} />
            <span className={styles.planMeasure}>4.80 M</span>
          </div>

          <p className={styles.chainOfCustody}>
            {text('ui.chainOfCustody')}
            <span>{text('ui.intakeVerified')}</span>
          </p>
        </aside>
      </section>

      <footer className={styles.footer}>
        <span>{text('ui.classification')}</span>
        <span>CONTENT / {caseDefinition.contentVersion}</span>
      </footer>
    </main>
  )
}
