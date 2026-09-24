import {
  Archive,
  ChevronLeft,
  CircleHelp,
  FileText,
  Minus,
  Plus,
  RotateCcw,
  RotateCw,
  ScanLine,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { translate } from '../../cases/localization'
import type { CaseBundle } from '../../cases/loader'
import { useGameStore } from '../../state/game-store'
import { EvidenceViewport, type ViewCommand } from './EvidenceViewport'
import styles from './InvestigationWorkbench.module.css'
import { investigationTools } from './tool-definitions'

type InvestigationWorkbenchProps = {
  bundle: CaseBundle
}

const initialCommand: ViewCommand = { sequence: 0, type: 'reset' }

export function InvestigationWorkbench({
  bundle,
}: InvestigationWorkbenchProps) {
  const { caseDefinition, messages } = bundle
  const selectedTool = useGameStore((state) => state.selectedTool)
  const selectTool = useGameStore((state) => state.selectTool)
  const currentEvidenceId = useGameStore((state) => state.currentEvidenceId)
  const setCurrentEvidence = useGameStore((state) => state.setCurrentEvidence)
  const [command, setCommand] = useState<ViewCommand>(initialCommand)
  const [helpOpen, setHelpOpen] = useState(false)
  const text = useCallback(
    (key: string) => translate(messages, key),
    [messages],
  )

  const currentEvidence = useMemo(
    () =>
      caseDefinition.evidence.find(({ id }) => id === currentEvidenceId) ??
      caseDefinition.evidence[0],
    [caseDefinition.evidence, currentEvidenceId],
  )

  const activeTool =
    investigationTools.find(({ id }) => id === selectedTool) ??
    investigationTools[0]

  const issueCommand = (type: ViewCommand['type']) => {
    setCommand((previous) => ({ sequence: previous.sequence + 1, type }))
  }

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return
      const tool = investigationTools.find(
        ({ shortcut }) => shortcut === event.key,
      )
      if (tool) selectTool(tool.id)
    }

    window.addEventListener('keydown', handleShortcut)
    return () => window.removeEventListener('keydown', handleShortcut)
  }, [selectTool])

  if (!currentEvidence || !activeTool) {
    return <p>案件物证数据不完整。</p>
  }

  return (
    <main className={styles.workbench}>
      <header className={styles.topbar}>
        <Link
          className={styles.backLink}
          to={`/cases/${caseDefinition.id}`}
          aria-label="返回案件简报"
        >
          <ChevronLeft aria-hidden="true" size={18} />
          <span>{caseDefinition.metadata.caseNumber}</span>
        </Link>

        <div className={styles.caseIdentity}>
          <span>{text('ui.workbench')}</span>
          <strong>{text(caseDefinition.metadata.titleKey)}</strong>
        </div>

        <nav className={styles.sectionNav} aria-label="调查分区">
          <button className={styles.activeSection} type="button">
            <ScanLine aria-hidden="true" size={17} />
            {text('ui.navEvidence')}
          </button>
          <button disabled type="button" title="下一验收点接入">
            <Archive aria-hidden="true" size={17} />
            {text('ui.navArchive')}
          </button>
          <button disabled type="button" title="证据归档后开放">
            <FileText aria-hidden="true" size={17} />
            {text('ui.navDeduction')}
          </button>
        </nav>

        <button
          className={styles.helpButton}
          type="button"
          aria-expanded={helpOpen}
          onClick={() => setHelpOpen((value) => !value)}
        >
          <CircleHelp aria-hidden="true" size={17} />
          {text('ui.controls')}
        </button>
      </header>

      {helpOpen ? (
        <aside className={styles.helpPanel} aria-live="polite">
          <strong>{text('ui.controlsTitle')}</strong>
          <p>{text('ui.controlsDescription')}</p>
          <span>{text('ui.controlsKeyboard')}</span>
        </aside>
      ) : null}

      <div className={styles.workspace}>
        <section className={styles.viewer} aria-labelledby="evidence-title">
          <div className={styles.viewerHeader}>
            <div>
              <p>
                {text('ui.evidenceItem')} /{' '}
                {String(
                  caseDefinition.evidence.findIndex(
                    ({ id }) => id === currentEvidence.id,
                  ) + 1,
                ).padStart(2, '0')}
              </p>
              <h1 id="evidence-title">{text(currentEvidence.titleKey)}</h1>
            </div>
            <span className={styles.proxyBadge}>
              {text('ui.proxyGeometry')}
            </span>
          </div>

          <div className={styles.canvasFrame}>
            <EvidenceViewport selectedTool={selectedTool} command={command} />
            <div className={styles.scanReadout} aria-hidden="true">
              <span>SCAN / LIVE</span>
              <span>ROTATION: FREE</span>
              <span>LOD: PROXY</span>
            </div>
          </div>

          <div className={styles.viewControls} aria-label="物证视角控制">
            <button type="button" onClick={() => issueCommand('rotate-left')}>
              <RotateCcw aria-hidden="true" size={17} />
              {text('ui.rotateLeft')}
            </button>
            <button type="button" onClick={() => issueCommand('rotate-right')}>
              <RotateCw aria-hidden="true" size={17} />
              {text('ui.rotateRight')}
            </button>
            <button type="button" onClick={() => issueCommand('zoom-in')}>
              <Plus aria-hidden="true" size={17} />
              {text('ui.zoomIn')}
            </button>
            <button type="button" onClick={() => issueCommand('zoom-out')}>
              <Minus aria-hidden="true" size={17} />
              {text('ui.zoomOut')}
            </button>
            <button type="button" onClick={() => issueCommand('reset')}>
              <RotateCcw aria-hidden="true" size={17} />
              {text('ui.resetView')}
            </button>
          </div>
        </section>

        <aside
          className={styles.evidenceRail}
          aria-labelledby="evidence-list-title"
        >
          <div className={styles.railHeading}>
            <span>{text('ui.evidenceManifest')}</span>
            <strong id="evidence-list-title">
              01 / {String(caseDefinition.evidence.length).padStart(2, '0')}
            </strong>
          </div>

          <ol className={styles.evidenceItems}>
            {caseDefinition.evidence.map((evidence, index) => {
              const active = evidence.id === currentEvidence.id
              const available = evidence.id === 'moved-desk'
              return (
                <li key={evidence.id}>
                  <button
                    className={active ? styles.activeEvidence : undefined}
                    disabled={!available}
                    type="button"
                    onClick={() => setCurrentEvidence(evidence.id)}
                  >
                    <span className={styles.itemNumber}>
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span>
                      <strong>{text(evidence.titleKey)}</strong>
                      <small>
                        {available
                          ? text('ui.readyForScan')
                          : text('ui.assetPending')}
                      </small>
                    </span>
                  </button>
                </li>
              )
            })}
          </ol>

          <section className={styles.toolInfo} aria-live="polite">
            <p>{text('ui.activeTool')}</p>
            <h2>{activeTool.name}</h2>
            <span>{activeTool.description}</span>
          </section>

          <section className={styles.findings}>
            <div>
              <span>{text('ui.findings')}</span>
              <strong>0 / 4</strong>
            </div>
            <p>{text('ui.noFindings')}</p>
          </section>
        </aside>
      </div>

      <footer className={styles.toolDock}>
        <div className={styles.dockLabel}>
          <span>{text('ui.investigationTools')}</span>
          <small>{text('ui.shortcuts')}</small>
        </div>
        <div className={styles.tools} role="toolbar" aria-label="调查工具">
          {investigationTools.map(({ id, shortcut, name, Icon }) => (
            <button
              key={id}
              type="button"
              aria-pressed={selectedTool === id}
              className={selectedTool === id ? styles.activeTool : undefined}
              onClick={() => selectTool(id)}
            >
              <Icon aria-hidden="true" size={18} />
              <span>{name}</span>
              <kbd>{shortcut}</kbd>
            </button>
          ))}
        </div>
        <span className={styles.sessionState}>{text('ui.unsavedSession')}</span>
      </footer>
    </main>
  )
}
