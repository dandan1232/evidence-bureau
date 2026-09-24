import type { z } from 'zod'

import type {
  DeductionRuleSchema,
  RelationKindSchema,
} from '../../cases/schema'

export type DeductionRule = z.infer<typeof DeductionRuleSchema>
export type DeductionRelation = {
  from: string
  to: string
  kind: z.infer<typeof RelationKindSchema>
}

export type DeductionGraph = {
  nodeIds: string[]
  relations: DeductionRelation[]
}

export type DeductionEvaluation =
  | { status: 'matched'; conclusionId: string }
  | {
      status: 'incomplete'
      missingNodeIds: string[]
      missingRelations: DeductionRelation[]
    }

export function evaluateDeduction(
  rule: DeductionRule,
  graph: DeductionGraph,
): DeductionEvaluation {
  const availableNodes = new Set(graph.nodeIds)
  const relationKeys = new Set(graph.relations.map(relationKey))
  const missingNodeIds = rule.requiredNodes.filter(
    (nodeId) => !availableNodes.has(nodeId),
  )
  const missingRelations = rule.requiredRelations.filter(
    (relation) => !relationKeys.has(relationKey(relation)),
  )

  if (missingNodeIds.length > 0 || missingRelations.length > 0) {
    return { status: 'incomplete', missingNodeIds, missingRelations }
  }

  return { status: 'matched', conclusionId: rule.unlocksConclusionId }
}

function relationKey(relation: DeductionRelation) {
  return `${relation.from}\u0000${relation.kind}\u0000${relation.to}`
}
