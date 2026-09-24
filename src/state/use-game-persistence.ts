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
    const unsubscribe = useGameStore.subscribe((state) => {
      window.clearTimeout(timeoutId)
      setStatus('saving')
      timeoutId = window.setTimeout(() => {
        const progress: SavedProgress = {
          currentEvidenceId: state.currentEvidenceId,
          selectedTool: state.selectedTool,
          discoveredClueIds: state.discoveredClueIds,
          deductionNodeIds: state.deductionNodeIds,
          unlockedConclusionIds: state.unlockedConclusionIds,
        }
        const result = saveCaseProgress(
          localStorage,
          caseId,
          caseContentVersion,
          progress,
        )
        setStatus(result.ok ? 'saved' : 'error')
      }, 180)
    })

    return () => {
      window.clearTimeout(timeoutId)
      unsubscribe()
    }
  }, [caseContentVersion, caseId, initialLoad])

  return status
}
