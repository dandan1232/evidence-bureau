import {
  Accessibility,
  ArrowDown,
  ArrowRight,
  Clock3,
  MapPin,
  Monitor,
  Settings2,
} from 'lucide-react'
import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'

import { translate } from '../../cases/localization'
import type { CaseBundle } from '../../cases/loader'
import { hasRestorableProgress } from '../../state/save-store'
import styles from './CaseBriefingPage.module.css'

type CaseBriefingPageProps = {
  bundle: CaseBundle
}

export function CaseBriefingPage({ bundle }: CaseBriefingPageProps) {
  const [reduceMotion, setReduceMotion] = useState(false)
  const [highContrast, setHighContrast] = useState(false)
  const { caseDefinition, messages } = bundle
  const [hasProgress] = useState(() =>
    hasRestorableProgress(
      localStorage,
      caseDefinition.id,
      caseDefinition.contentVersion,
    ),
  )
  const { metadata, evidence } = caseDefinition
  const text = (key: string) => translate(messages, key)
  const briefingRef = useRef<HTMLElement>(null)
  const manifestRef = useRef<HTMLElement>(null)
  const enterLabel = text(
    hasProgress ? 'ui.continueInvestigation' : 'ui.startInvestigation',
  )

  const readSection = (section: HTMLElement | null) => {
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
    section?.scrollIntoView({
      behavior: reduceMotion || prefersReducedMotion ? 'auto' : 'smooth',
      block: 'start',
    })
    section?.focus({ preventScroll: true })
  }

  return (
    <main
      className={`${styles.page} ${reduceMotion ? styles.reduceMotion : ''} ${highContrast ? styles.highContrast : ''}`}
    >
      <header className={styles.masthead}>
        <a className={styles.wordmark} href="#/" aria-label="物证档案局首页">
          <span className={styles.mark} aria-hidden="true">
            证
          </span>
          <span>
            <strong>{text('ui.bureauName')}</strong>
            <small>Evidence Bureau</small>
          </span>
        </a>

        <nav
          className={styles.pageNav}
          aria-label={text('ui.briefingNavigation')}
        >
          <button
            type="button"
            onClick={() => readSection(briefingRef.current)}
          >
            {text('ui.caseBrief')}
          </button>
          <button
            type="button"
            onClick={() => readSection(manifestRef.current)}
          >
            {text('ui.navEvidence')}
          </button>
        </nav>

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

      <section className={styles.hero} aria-labelledby="case-title">
        <div className={styles.heroInner}>
          <div className={styles.heroCopy}>
            <div className={styles.recordHeader}>
              <p className={styles.recordType}>{text('ui.caseFile')}</p>
              <p className={styles.caseNumber}>{metadata.caseNumber}</p>
              <span className={styles.caseStatus}>
                {text(`ui.status.${metadata.status}`)}
              </span>
            </div>

            <div className={styles.titleBlock}>
              <h1 id="case-title">{text(metadata.titleKey)}</h1>
              <p className={styles.subtitle}>{text(metadata.subtitleKey)}</p>
            </div>

            <div className={styles.actionRow}>
              <Link
                className={styles.primaryAction}
                to={`/cases/${caseDefinition.id}/investigation`}
              >
                {enterLabel}
                <ArrowRight aria-hidden="true" size={18} />
              </Link>
              <p className={styles.deviceAdvice}>
                <Monitor aria-hidden="true" size={17} />
                {text('ui.deviceAdvice')}
              </p>
            </div>
          </div>
          {evidence[0]?.posterUrl ? (
            <figure className={styles.heroVisual}>
              <img
                src={evidence[0].posterUrl}
                alt={text(evidence[0].titleKey)}
                width="1000"
                height="800"
                fetchPriority="high"
              />
              <figcaption>
                {text('ui.sceneEvidence')} · {text(metadata.locationKey)}
              </figcaption>
            </figure>
          ) : null}
        </div>
        <div className={styles.heroFooter}>
          <span>{text('ui.classification')}</span>
          <button
            type="button"
            onClick={() => readSection(briefingRef.current)}
          >
            {text('ui.readCaseBrief')}
            <ArrowDown aria-hidden="true" size={18} />
          </button>
        </div>
      </section>

      <div className="document-surface">
        <section
          className={styles.dossier}
          ref={briefingRef}
          tabIndex={-1}
          aria-labelledby="briefing-title"
        >
          <h2 id="briefing-title">{text('ui.caseBrief')}</h2>
          <div className={styles.caseDetails}>
            <p className={styles.summary}>{text(metadata.summaryKey)}</p>
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
          </div>
        </section>

        <section
          className={styles.manifest}
          ref={manifestRef}
          tabIndex={-1}
          aria-labelledby="manifest-title"
        >
          <div className={styles.manifestHeading}>
            <h2 id="manifest-title">{text('ui.evidenceManifest')}</h2>
            <span>
              {evidence.length} {text('ui.evidenceItemUnit')}
            </span>
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
                <p className={styles.evidenceDescription}>
                  {text(item.descriptionKey)}
                </p>
                <span className={styles.evidenceState}>
                  <span aria-hidden="true" />
                  {text('ui.unexamined')}
                </span>
              </li>
            ))}
          </ol>

          <div className={styles.intakeFooter}>
            <p className={styles.chainOfCustody}>
              {text('ui.chainOfCustody')}
              <span>{text('ui.intakeVerified')}</span>
            </p>
            <Link
              className={styles.textAction}
              to={`/cases/${caseDefinition.id}/investigation`}
            >
              {text('ui.enterWorkbench')}
              <ArrowRight aria-hidden="true" size={19} />
            </Link>
          </div>
        </section>
      </div>

      <footer className={styles.footer}>
        <span>{text('ui.bureauName')}</span>
        <span>{text('ui.progressPrivacy')}</span>
      </footer>
    </main>
  )
}
