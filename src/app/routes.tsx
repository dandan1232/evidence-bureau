import { useCallback, useEffect, useState } from 'react'
import { Navigate, Route, Routes, useParams } from 'react-router-dom'

import { CaseLoadError, loadCase, type CaseBundle } from '../cases/loader'
import { CaseBriefingPage } from '../features/briefing/CaseBriefingPage'
import { InvestigationHandoff } from '../features/workbench/InvestigationHandoff'
import styles from './App.module.css'

const FIRST_CASE_ID = 'vanished-tenant'

type LoadState =
  | { status: 'loading' }
  | { status: 'ready'; bundle: CaseBundle }
  | { status: 'error'; message: string }

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
        element={<InvestigationHandoff />}
      />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

function CaseBriefingRoute() {
  const { caseId = '' } = useParams()
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState<LoadState>({ status: 'loading' })

  useEffect(() => {
    let isCurrent = true

    void loadCase(caseId, 'zh-CN')
      .then((bundle) => {
        if (isCurrent) setState({ status: 'ready', bundle })
      })
      .catch((error: unknown) => {
        if (!isCurrent) return
        const message =
          error instanceof CaseLoadError
            ? error.message
            : '案件档案发生未知错误。'
        setState({ status: 'error', message })
      })

    return () => {
      isCurrent = false
    }
  }, [attempt, caseId])

  const retry = useCallback(() => {
    setState({ status: 'loading' })
    setAttempt((value) => value + 1)
  }, [])

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
