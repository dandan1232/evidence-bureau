import { useEffect, useState } from 'react'

import { useGameStore } from './game-store'
import {
  loadCaseProgress,
  saveCaseProgress,
  type LoadProgressResult,
  type SavedProgress,
} from './save-store'

export type PersistenceStatus =
  'fresh' | 'restored' | 'recovered' | 'saving' | 'saved' | 'error'

export function useGamePersistence(caseId: string, caseContentVersion: string) {
  const [initialLoad] = useState<LoadProgressResult>(() =>
    loadCaseProgress(localStorage, caseId, caseContentVersion),
  )
  const [status, setStatus] = useState<PersistenceStatus>(initialLoad.status)

  useEffect(() => {
    if (initialLoad.status === 'restored') {
      useGameStore.getState().hydrateProgress(initialLoad.progress)
    }

    let timeoutId: number | undefined
    const persist = () => {
      const state = useGameStore.getState()
      const progress: SavedProgress = {
        startedAt: state.startedAt,
        currentEvidenceId: state.currentEvidenceId,
        selectedTool: state.selectedTool,
        discoveredClueIds: state.discoveredClueIds,
        deductionNodeIds: state.deductionNodeIds,
        deductionRelations: state.deductionRelations,
        unlockedConclusionIds: state.unlockedConclusionIds,
        viewedHintLevels: state.viewedHintLevels,
        failedSubmissions: state.failedSubmissions,
        completedAt: state.completedAt,
        rating: state.rating,
      }
      const result = saveCaseProgress(
        localStorage,
        caseId,
        caseContentVersion,
        progress,
      )
      setStatus(result.ok ? 'saved' : 'error')
    }
    const unsubscribe = useGameStore.subscribe(() => {
      window.clearTimeout(timeoutId)
      setStatus('saving')
      timeoutId = window.setTimeout(persist, 180)
    })

    return () => {
      window.clearTimeout(timeoutId)
      persist()
      unsubscribe()
    }
  }, [caseContentVersion, caseId, initialLoad])

  return status
}
