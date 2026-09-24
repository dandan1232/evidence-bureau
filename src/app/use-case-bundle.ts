import { useCallback, useEffect, useState } from 'react'

import { CaseLoadError, loadCase, type CaseBundle } from '../cases/loader'

export type CaseLoadState =
  | { status: 'loading' }
  | { status: 'ready'; bundle: CaseBundle }
  | { status: 'error'; message: string }

export function useCaseBundle(caseId: string) {
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState<CaseLoadState>({ status: 'loading' })

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

  return { state, retry }
}
