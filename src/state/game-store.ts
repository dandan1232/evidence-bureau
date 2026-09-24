import { create } from 'zustand'

import type { ToolId } from '../cases/schema'

type InvestigationState = {
  currentEvidenceId: string
  selectedTool: ToolId
  setCurrentEvidence: (evidenceId: string) => void
  selectTool: (toolId: ToolId) => void
  resetInvestigation: () => void
}

const initialState = {
  currentEvidenceId: 'moved-desk',
  selectedTool: 'white-light' as ToolId,
}

export const useGameStore = create<InvestigationState>((set) => ({
  ...initialState,
  setCurrentEvidence: (currentEvidenceId) => set({ currentEvidenceId }),
  selectTool: (selectedTool) => set({ selectedTool }),
  resetInvestigation: () => set(initialState),
}))
