import {
  Archive,
  BookOpenText,
  ChevronLeft,
  CircleHelp,
  FileText,
  Lightbulb,
  Minus,
  Plus,
  RotateCcw,
  RotateCw,
  ScanLine,
} from 'lucide-react'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import { Link, useLocation } from 'react-router-dom'

import { translate } from '../../cases/localization'
import type { CaseBundle } from '../../cases/loader'
import { evaluateHotspot } from '../../engine/hotspots/evaluate-hotspot'
import { useGameStore } from '../../state/game-store'
import { useGamePersistence } from '../../state/use-game-persistence'
import { ClueArchive } from '../archive/ClueArchive'
import {
  AuthoringPanel,
  type AuthoringHotspot,
} from '../authoring/AuthoringPanel'
import { canEnableAuthoringMode } from '../authoring/authoring-gate'
import { DeductionBoard } from '../deduction-board/DeductionBoard'
import { HintPanel } from '../hints/HintPanel'
import { CaseMaterials } from '../materials/CaseMaterials'
import {
  EvidenceViewport,
  type CameraObservation,
  type ViewCommand,
} from './EvidenceViewport'
import styles from './InvestigationWorkbench.module.css'
import { investigationTools } from './tool-definitions'

type InvestigationWorkbenchProps = {
  bundle: CaseBundle
}

const initialCommand: ViewCommand = { sequence: 0, type: 'reset' }
type WorkbenchSection =
  'evidence' | 'archive' | 'materials' | 'deduction' | 'hints'

export function InvestigationWorkbench({
  bundle,
}: InvestigationWorkbenchProps) {
  const { caseDefinition, messages } = bundle
  const location = useLocation()
  const authoringEnabled = canEnableAuthoringMode(
    import.meta.env.DEV,
    location.search,
  )
  const persistenceStatus = useGamePersistence(
    caseDefinition.id,
    caseDefinition.contentVersion,
  )
  const selectedTool = useGameStore((state) => state.selectedTool)
  const selectTool = useGameStore((state) => state.selectTool)
  const currentEvidenceId = useGameStore((state) => state.currentEvidenceId)
  const setCurrentEvidence = useGameStore((state) => state.setCurrentEvidence)
  const discoveredClueIds = useGameStore((state) => state.discoveredClueIds)
  const discoverClue = useGameStore((state) => state.discoverClue)
  const [command, setCommand] = useState<ViewCommand>(initialCommand)
  const [helpOpen, setHelpOpen] = useState(false)
  const [activeSection, setActiveSection] =
    useState<WorkbenchSection>('evidence')
  const [cameraObservation, setCameraObservation] = useState<CameraObservation>(
    {
      cameraDistance: 0,
      viewAngleDeg: 180,
    },
  )
  const [isObserving, setIsObserving] = useState(false)
  const [dwellMs, setDwellMs] = useState(0)
  const observationStartedAt = useRef<number | null>(null)
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
  const discoveredSet = useMemo(
    () => new Set(discoveredClueIds),
    [discoveredClueIds],
  )
  const activeHotspot = currentEvidence?.hotspots.find(
    ({ clueId, requiredTool }) =>
      requiredTool === selectedTool && !discoveredSet.has(clueId),
  )
  const authoringHotspotDefinition =
    activeHotspot ?? currentEvidence?.hotspots[0]
  const [authoringOverrides, setAuthoringOverrides] = useState<
    Record<string, AuthoringHotspot>
  >({})
  const authoringHotspot = authoringHotspotDefinition
    ? (authoringOverrides[authoringHotspotDefinition.id] ??
      (authoringHotspotDefinition.shape.type === 'sphere'
        ? {
            center: [...authoringHotspotDefinition.shape.center],
            radius: authoringHotspotDefinition.shape.radius,
          }
        : { center: [0, 0, 0], radius: 0.2 }))
    : { center: [0, 0, 0] as [number, number, number], radius: 0.2 }
  const currentEvidenceClueIds = useMemo(
    () => new Set(currentEvidence?.hotspots.map(({ clueId }) => clueId) ?? []),
    [currentEvidence],
  )
  const currentDiscoveredClues = discoveredClueIds
    .filter((clueId) => currentEvidenceClueIds.has(clueId))
    .map((clueId) => caseDefinition.clues.find(({ id }) => id === clueId))
    .filter((clue) => clue !== undefined)
  const latestDiscoveredClue = currentDiscoveredClues.at(-1)
  const totalEvidenceClues = currentEvidence?.hotspots.length ?? 0
  const hotspotEvaluation = activeHotspot
    ? evaluateHotspot(activeHotspot, {
        selectedTool,
        ...cameraObservation,
        dwellMs,
        discoveredClueIds: discoveredSet,
      })
    : null
  const hotspotAligned =
    hotspotEvaluation?.status === 'discovered' ||
    (hotspotEvaluation?.status === 'pending' &&
      hotspotEvaluation.reason === 'insufficient-dwell')
  const hotspotFeedbackKey = (() => {
    if (hotspotAligned) return 'ui.hotspotSignal'
    if (hotspotEvaluation?.status !== 'pending') return 'ui.hotspotBlocked'
    if (hotspotEvaluation.reason === 'too-close') return 'ui.hotspotTooClose'
    if (hotspotEvaluation.reason === 'too-far') return 'ui.hotspotTooFar'
    if (hotspotEvaluation.reason === 'wrong-angle')
      return 'ui.hotspotWrongAngle'
    if (hotspotEvaluation.reason === 'missing-prerequisite') {
      return 'ui.hotspotMissingPrerequisite'
    }
    return 'ui.hotspotBlocked'
  })()

  const issueCommand = (type: ViewCommand['type']) => {
    setCommand((previous) => ({ sequence: previous.sequence + 1, type }))
  }

  const changeTool = useCallback(
    (toolId: (typeof investigationTools)[number]['id']) => {
      observationStartedAt.current = null
      setIsObserving(false)
      setDwellMs(0)
      selectTool(toolId)
    },
    [selectTool],
  )

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return
      const tool = investigationTools.find(
        ({ shortcut }) => shortcut === event.key,
      )
      if (tool) changeTool(tool.id)
    }

    window.addEventListener('keydown', handleShortcut)
    return () => window.removeEventListener('keydown', handleShortcut)
  }, [changeTool])

  useEffect(() => {
    if (!isObserving || !activeHotspot) return

    const startedAt = observationStartedAt.current ?? performance.now()
    observationStartedAt.current = startedAt
    const interval = window.setInterval(() => {
      const nextDwellMs = Math.round(performance.now() - startedAt)
      setDwellMs(nextDwellMs)
      const result = evaluateHotspot(activeHotspot, {
        selectedTool,
        ...cameraObservation,
        dwellMs: nextDwellMs,
        discoveredClueIds: discoveredSet,
      })
      if (result.status === 'discovered') {
        discoverClue(activeHotspot.clueId)
        observationStartedAt.current = null
        setIsObserving(false)
        setDwellMs(0)
        window.clearInterval(interval)
      } else if (result.reason !== 'insufficient-dwell') {
        observationStartedAt.current = null
        setDwellMs(0)
        setIsObserving(false)
        window.clearInterval(interval)
      }
    }, 80)

    return () => window.clearInterval(interval)
  }, [
    activeHotspot,
    cameraObservation,
    discoveredSet,
    discoverClue,
    isObserving,
    selectedTool,
  ])

  const beginObservation = () => {
    if (!hotspotAligned) return
    observationStartedAt.current = performance.now()
    setDwellMs(0)
    setIsObserving(true)
  }

  const endObservation = () => {
    observationStartedAt.current = null
    setIsObserving(false)
    setDwellMs(0)
  }

  const updateCameraObservation = useCallback(
    (nextObservation: CameraObservation) => {
      setCameraObservation((previous) =>
        previous.cameraDistance === nextObservation.cameraDistance &&
        previous.viewAngleDeg === nextObservation.viewAngleDeg
          ? previous
          : nextObservation,
      )
    },
    [],
  )

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
          <button
            className={
              activeSection === 'evidence' ? styles.activeSection : undefined
            }
            type="button"
            aria-pressed={activeSection === 'evidence'}
            onClick={() => setActiveSection('evidence')}
          >
            <ScanLine aria-hidden="true" size={17} />
            <span>{text('ui.navEvidence')}</span>
          </button>
          <button
            className={
              activeSection === 'archive' ? styles.activeSection : undefined
            }
            type="button"
            aria-pressed={activeSection === 'archive'}
            onClick={() => setActiveSection('archive')}
          >
            <Archive aria-hidden="true" size={17} />
            <span>{text('ui.navArchive')}</span>
          </button>
          <button
            className={
              activeSection === 'materials' ? styles.activeSection : undefined
            }
            type="button"
            aria-pressed={activeSection === 'materials'}
            onClick={() => setActiveSection('materials')}
          >
            <BookOpenText aria-hidden="true" size={17} />
            <span>{text('ui.navMaterials')}</span>
          </button>
          <button
            className={
              activeSection === 'deduction' ? styles.activeSection : undefined
            }
            disabled={discoveredClueIds.length === 0}
            type="button"
            aria-pressed={activeSection === 'deduction'}
            title={
              discoveredClueIds.length === 0 ? '发现线索后开放' : undefined
            }
            onClick={() => setActiveSection('deduction')}
          >
            <FileText aria-hidden="true" size={17} />
            <span>{text('ui.navDeduction')}</span>
          </button>
          <button
            className={
              activeSection === 'hints' ? styles.activeSection : undefined
            }
            type="button"
            aria-pressed={activeSection === 'hints'}
            onClick={() => setActiveSection('hints')}
          >
            <Lightbulb aria-hidden="true" size={17} />
            <span>{text('ui.navHints')}</span>
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

      {authoringEnabled && authoringHotspotDefinition ? (
        <AuthoringPanel
          clueId={authoringHotspotDefinition.clueId}
          hotspot={authoringHotspot}
          hotspotId={authoringHotspotDefinition.id}
          observation={cameraObservation}
          onChange={(nextHotspot) =>
            setAuthoringOverrides((previous) => ({
              ...previous,
              [authoringHotspotDefinition.id]: nextHotspot,
            }))
          }
        />
      ) : null}

      <div className={styles.workspace} hidden={activeSection !== 'evidence'}>
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
            <EvidenceViewport
              evidenceId={currentEvidence.id}
              selectedTool={selectedTool}
              command={command}
              onObservationChange={updateCameraObservation}
              authoringHotspot={
                authoringEnabled && authoringHotspotDefinition
                  ? authoringHotspot
                  : undefined
              }
            />
            {activeHotspot ? (
              <button
                className={`${styles.hotspotSignal} ${hotspotAligned ? styles.hotspotAligned : ''}`}
                disabled={!hotspotAligned}
                type="button"
                aria-label={text(hotspotFeedbackKey)}
                style={
                  {
                    '--dwell-progress': `${Math.min(100, (dwellMs / (activeHotspot?.dwellMs ?? 1)) * 100)}%`,
                  } as CSSProperties
                }
                onBlur={endObservation}
                onFocus={beginObservation}
                onMouseEnter={beginObservation}
                onMouseLeave={endObservation}
              >
                <span aria-hidden="true" />
                <small>{text(hotspotFeedbackKey)}</small>
              </button>
            ) : null}
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
              return (
                <li key={evidence.id}>
                  <button
                    className={active ? styles.activeEvidence : undefined}
                    type="button"
                    onClick={() => {
                      setCurrentEvidence(evidence.id)
                      issueCommand('reset')
                    }}
                  >
                    <span className={styles.itemNumber}>
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span>
                      <strong>{text(evidence.titleKey)}</strong>
                      <small>{text('ui.readyForScan')}</small>
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
              <strong>
                {currentDiscoveredClues.length} / {totalEvidenceClues}
              </strong>
            </div>
            {latestDiscoveredClue ? (
              <div className={styles.recordedClue} role="status">
                <span>{text('ui.clueRecorded')}</span>
                <strong>{text(latestDiscoveredClue.titleKey)}</strong>
                <p>{text(latestDiscoveredClue.descriptionKey)}</p>
              </div>
            ) : (
              <p>{text('ui.noFindings')}</p>
            )}
          </section>
        </aside>
      </div>

      <div
        className={styles.archiveWorkspace}
        hidden={activeSection !== 'archive'}
      >
        <ClueArchive
          bundle={bundle}
          discoveredClueIds={discoveredClueIds}
          onBackToEvidence={() => setActiveSection('evidence')}
        />
      </div>

      <div
        className={styles.archiveWorkspace}
        hidden={activeSection !== 'deduction'}
      >
        <DeductionBoard bundle={bundle} />
      </div>

      <div
        className={styles.archiveWorkspace}
        hidden={activeSection !== 'materials'}
      >
        <CaseMaterials bundle={bundle} />
      </div>

      <div
        className={styles.archiveWorkspace}
        hidden={activeSection !== 'hints'}
      >
        <HintPanel bundle={bundle} />
      </div>

      <footer className={styles.toolDock} hidden={activeSection !== 'evidence'}>
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
              onClick={() => changeTool(id)}
            >
              <Icon aria-hidden="true" size={18} />
              <span>{name}</span>
              <kbd>{shortcut}</kbd>
            </button>
          ))}
        </div>
        <span className={styles.sessionState} aria-live="polite">
          {text(`ui.save-status.${persistenceStatus}`)}
        </span>
      </footer>
      <footer
        className={styles.archiveDock}
        hidden={activeSection === 'evidence'}
      >
        <span>
          {text(
            activeSection === 'deduction'
              ? 'ui.deductionLocalOnly'
              : activeSection === 'hints'
                ? 'ui.hintsLocalOnly'
                : activeSection === 'materials'
                  ? 'ui.materialsReadonly'
                  : 'ui.archiveLocalOnly',
          )}
        </span>
        <button type="button" onClick={() => setActiveSection('evidence')}>
          <ScanLine aria-hidden="true" size={16} />
          {text('ui.continueExamining')}
        </button>
      </footer>
    </main>
  )
}
