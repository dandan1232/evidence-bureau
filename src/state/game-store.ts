import { create } from 'zustand'

import type { ToolId } from '../cases/schema'

type InvestigationState = {
  currentEvidenceId: string
  selectedTool: ToolId
  discoveredClueIds: string[]
  setCurrentEvidence: (evidenceId: string) => void
  selectTool: (toolId: ToolId) => void
  discoverClue: (clueId: string) => void
  resetInvestigation: () => void
}

const initialState = {
  currentEvidenceId: 'moved-desk',
  selectedTool: 'white-light' as ToolId,
  discoveredClueIds: [] as string[],
}

export const useGameStore = create<InvestigationState>((set) => ({
  ...initialState,
  setCurrentEvidence: (currentEvidenceId) => set({ currentEvidenceId }),
  selectTool: (selectedTool) => set({ selectedTool }),
  discoverClue: (clueId) =>
    set((state) =>
      state.discoveredClueIds.includes(clueId)
        ? state
        : { discoveredClueIds: [...state.discoveredClueIds, clueId] },
    ),
  resetInvestigation: () => set(initialState),
}))
