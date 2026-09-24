import { create } from 'zustand'

import type { ToolId } from '../cases/schema'

type InvestigationState = {
  currentEvidenceId: string
  selectedTool: ToolId
  discoveredClueIds: string[]
  deductionNodeIds: string[]
  unlockedConclusionIds: string[]
  setCurrentEvidence: (evidenceId: string) => void
  selectTool: (toolId: ToolId) => void
  discoverClue: (clueId: string) => void
  addDeductionNode: (nodeId: string) => void
  unlockConclusion: (conclusionId: string) => void
  resetInvestigation: () => void
}

const initialState = {
  currentEvidenceId: 'moved-desk',
  selectedTool: 'white-light' as ToolId,
  discoveredClueIds: [] as string[],
  deductionNodeIds: [] as string[],
  unlockedConclusionIds: [] as string[],
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
  addDeductionNode: (nodeId) =>
    set((state) =>
      state.deductionNodeIds.includes(nodeId)
        ? state
        : { deductionNodeIds: [...state.deductionNodeIds, nodeId] },
    ),
  unlockConclusion: (conclusionId) =>
    set((state) =>
      state.unlockedConclusionIds.includes(conclusionId)
        ? state
        : {
            unlockedConclusionIds: [
              ...state.unlockedConclusionIds,
              conclusionId,
            ],
          },
    ),
  resetInvestigation: () => set(initialState),
}))
