import { create } from 'zustand'

import type { ToolId } from '../cases/schema'
import type { DeductionRelation } from '../engine/deduction/evaluate-deduction'
import type { SavedProgress } from './save-store'

type InvestigationState = {
  currentEvidenceId: string
  selectedTool: ToolId
  discoveredClueIds: string[]
  deductionNodeIds: string[]
  deductionRelations: DeductionRelation[]
  unlockedConclusionIds: string[]
  setCurrentEvidence: (evidenceId: string) => void
  selectTool: (toolId: ToolId) => void
  discoverClue: (clueId: string) => void
  addDeductionNode: (nodeId: string) => void
  addDeductionRelation: (relation: DeductionRelation) => void
  removeDeductionRelation: (relation: DeductionRelation) => void
  unlockConclusion: (conclusionId: string) => void
  hydrateProgress: (progress: SavedProgress) => void
  resetInvestigation: () => void
}

const initialState = {
  currentEvidenceId: 'moved-desk',
  selectedTool: 'white-light' as ToolId,
  discoveredClueIds: [] as string[],
  deductionNodeIds: [] as string[],
  deductionRelations: [] as DeductionRelation[],
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
  addDeductionRelation: (relation) =>
    set((state) =>
      state.deductionRelations.some(
        (existing) =>
          existing.from === relation.from &&
          existing.to === relation.to &&
          existing.kind === relation.kind,
      )
        ? state
        : { deductionRelations: [...state.deductionRelations, relation] },
    ),
  removeDeductionRelation: (relation) =>
    set((state) => ({
      deductionRelations: state.deductionRelations.filter(
        (existing) =>
          existing.from !== relation.from ||
          existing.to !== relation.to ||
          existing.kind !== relation.kind,
      ),
    })),
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
  hydrateProgress: (progress) => set(progress),
  resetInvestigation: () => set(initialState),
}))
