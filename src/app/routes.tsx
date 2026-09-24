import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes, useParams } from 'react-router-dom'

import { CaseBriefingPage } from '../features/briefing/CaseBriefingPage'
import { CaseDebrief } from '../features/debrief/CaseDebrief'
import styles from './App.module.css'
import { useCaseBundle } from './use-case-bundle'

const FIRST_CASE_ID = 'vanished-tenant'
const InvestigationWorkbench = lazy(() =>
  import('../features/workbench/InvestigationWorkbench').then((module) => ({
    default: module.InvestigationWorkbench,
  })),
)

export function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/"
        element={<Navigate replace to={`/cases/${FIRST_CASE_ID}`} />}
      />
      <Route path="/cases/:caseId" element={<CaseBriefingRoute />} />
      <Route
        path="/cases/:caseId/investigation"
        element={<InvestigationRoute />}
      />
      <Route path="/cases/:caseId/debrief" element={<DebriefRoute />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

function DebriefRoute() {
  const { caseId = '' } = useParams()
  const { state, retry } = useCaseBundle(caseId)

  if (state.status === 'loading') {
    return (
      <StatusPage title="正在生成结案报告" detail="封存证据链与评级记录…" />
    )
  }

  if (state.status === 'error') {
    return (
      <StatusPage
        title="结案报告暂时无法打开"
        detail={state.message}
        onRetry={retry}
      />
    )
  }

  return <CaseDebrief bundle={state.bundle} />
}

function CaseBriefingRoute() {
  const { caseId = '' } = useParams()
  const { state, retry } = useCaseBundle(caseId)

  if (state.status === 'loading') {
    return (
      <StatusPage title="正在校验案件档案" detail="读取物证目录与本地语言包…" />
    )
  }

  if (state.status === 'error') {
    return (
      <StatusPage
        title="案件档案暂时无法打开"
        detail={state.message}
        onRetry={retry}
      />
    )
  }

  return <CaseBriefingPage bundle={state.bundle} />
}

function InvestigationRoute() {
  const { caseId = '' } = useParams()
  const { state, retry } = useCaseBundle(caseId)

  if (state.status === 'loading') {
    return (
      <StatusPage title="正在启动物证台" detail="初始化扫描场景与案件状态…" />
    )
  }

  if (state.status === 'error') {
    return (
      <StatusPage
        title="物证台暂时无法启动"
        detail={state.message}
        onRetry={retry}
      />
    )
  }

  return (
    <Suspense
      fallback={
        <StatusPage title="正在准备扫描场景" detail="加载 3D 调查引擎…" />
      }
    >
      <InvestigationWorkbench bundle={state.bundle} />
    </Suspense>
  )
}

type StatusPageProps = {
  title: string
  detail: string
  onRetry?: () => void
}

function StatusPage({ title, detail, onRetry }: StatusPageProps) {
  return (
    <main className={styles.statusPage} aria-busy={!onRetry}>
      <section className={styles.statusPanel} aria-live="polite">
        <p className={styles.eyebrow}>EVIDENCE BUREAU / ARCHIVE</p>
        <h1>{title}</h1>
        <p>{detail}</p>
        {onRetry ? (
          <button
            className={styles.retryButton}
            type="button"
            onClick={onRetry}
          >
            重新读取
          </button>
        ) : null}
      </section>
    </main>
  )
}

function NotFoundPage() {
  return (
    <main className={styles.statusPage}>
      <section className={styles.statusPanel}>
        <p className={styles.eyebrow}>ERROR / 404</p>
        <h1>未找到这份档案</h1>
        <a className={styles.backLink} href="#/">
          返回案件入口
        </a>
      </section>
    </main>
  )
}
