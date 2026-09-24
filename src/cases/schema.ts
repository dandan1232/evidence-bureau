import { z } from 'zod'

const idSchema = z
  .string()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'ID 只能使用小写字母、数字和连字符')

const localeSchema = z
  .string()
  .regex(/^[a-z]{2}(?:-[A-Z]{2})?$/, '语言代码必须类似 zh-CN')

const localizationKeySchema = z
  .string()
  .min(1)
  .regex(/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/, '文案键格式无效')

export const Vec3Schema = z.tuple([
  z.number().finite(),
  z.number().finite(),
  z.number().finite(),
])

export const ToolIdSchema = z.enum([
  'white-light',
  'side-light',
  'ultraviolet',
  'wireframe',
  'measurement',
])

export const CameraBookmarkSchema = z.object({
  position: Vec3Schema,
  target: Vec3Schema,
  fov: z.number().min(20).max(90),
})

export const CameraLimitsSchema = z
  .object({
    minDistance: z.number().positive(),
    maxDistance: z.number().positive(),
    minPolarAngleDeg: z.number().min(0).max(180).default(0),
    maxPolarAngleDeg: z.number().min(0).max(180).default(180),
  })
  .refine((limits) => limits.maxDistance > limits.minDistance, {
    message: '最大相机距离必须大于最小距离',
    path: ['maxDistance'],
  })
  .refine((limits) => limits.maxPolarAngleDeg > limits.minPolarAngleDeg, {
    message: '最大极角必须大于最小极角',
    path: ['maxPolarAngleDeg'],
  })

const HotspotShapeSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('sphere'),
    center: Vec3Schema,
    radius: z.number().positive(),
  }),
  z.object({
    type: z.literal('box'),
    center: Vec3Schema,
    size: Vec3Schema.refine((size) => size.every((value) => value > 0), {
      message: '包围盒尺寸必须全部大于 0',
    }),
    rotation: Vec3Schema,
  }),
])

export const HotspotDefinitionSchema = z
  .object({
    id: idSchema,
    clueId: idSchema,
    shape: HotspotShapeSchema,
    requiredTool: ToolIdSchema,
    surfaceNormal: Vec3Schema.optional(),
    maxViewAngleDeg: z.number().min(0).max(180).optional(),
    minCameraDistance: z.number().nonnegative().optional(),
    maxCameraDistance: z.number().positive().optional(),
    dwellMs: z.number().int().min(100).max(30_000),
    prerequisites: z.array(idSchema),
    bookmarkOnDiscover: CameraBookmarkSchema.optional(),
  })
  .refine(
    (hotspot) =>
      hotspot.minCameraDistance === undefined ||
      hotspot.maxCameraDistance === undefined ||
      hotspot.maxCameraDistance > hotspot.minCameraDistance,
    {
      message: '热点最大观察距离必须大于最小观察距离',
      path: ['maxCameraDistance'],
    },
  )

export const EvidenceDefinitionSchema = z.object({
  id: idSchema,
  modelUrl: z.string().startsWith('/cases/'),
  posterUrl: z.string().startsWith('/cases/'),
  titleKey: localizationKeySchema,
  descriptionKey: localizationKeySchema,
  initialCamera: CameraBookmarkSchema,
  cameraLimits: CameraLimitsSchema,
  hotspots: z.array(HotspotDefinitionSchema),
  assetBudget: z
    .object({
      maxBytes: z.number().int().positive(),
      maxTriangles: z.number().int().positive(),
    })
    .optional(),
})

export const ClueDefinitionSchema = z.object({
  id: idSchema,
  kind: z.enum(['observation', 'statement', 'document', 'conclusion']),
  evidenceId: idSchema.optional(),
  titleKey: localizationKeySchema,
  descriptionKey: localizationKeySchema,
})

export const StatementDefinitionSchema = z.object({
  id: idSchema,
  speakerKey: localizationKeySchema,
  titleKey: localizationKeySchema,
  contentKey: localizationKeySchema,
})

export const DocumentDefinitionSchema = z.object({
  id: idSchema,
  titleKey: localizationKeySchema,
  contentKey: localizationKeySchema,
  imageUrl: z.string().startsWith('/cases/').optional(),
})

export const RelationKindSchema = z.enum([
  'supports',
  'contradicts',
  'explains',
  'locates',
  'precedes',
])

export const DeductionRuleSchema = z.object({
  id: idSchema,
  requiredNodes: z.array(idSchema).min(1),
  requiredRelations: z.array(
    z.object({
      from: idSchema,
      to: idSchema,
      kind: RelationKindSchema,
    }),
  ),
  unlocksConclusionId: idSchema,
  feedbackKey: localizationKeySchema,
})

export const HintDefinitionSchema = z.object({
  id: idSchema,
  targetId: idSchema,
  levelKeys: z.tuple([
    localizationKeySchema,
    localizationKeySchema,
    localizationKeySchema,
  ]),
})

export const RatingDefinitionSchema = z.object({
  baseScore: z.number().int().positive(),
  grades: z
    .array(
      z.object({
        grade: z.enum(['S', 'A', 'B', 'C']),
        minScore: z.number().int().nonnegative(),
      }),
    )
    .length(4),
  penalties: z.object({
    perHintLevel: z.number().int().nonnegative(),
    perFailedSubmission: z.number().int().nonnegative(),
    perMinuteOverTarget: z.number().int().nonnegative(),
  }),
})

export const CaseDefinitionSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: idSchema,
    contentVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
    defaultLocale: localeSchema,
    supportedLocales: z.array(localeSchema).min(1),
    metadata: z.object({
      caseNumber: z.string().min(1),
      status: z.enum(['open', 'closed']),
      estimatedMinutes: z.tuple([
        z.number().int().positive(),
        z.number().int().positive(),
      ]),
      titleKey: localizationKeySchema,
      subtitleKey: localizationKeySchema,
      locationKey: localizationKeySchema,
      summaryKey: localizationKeySchema,
    }),
    evidence: z.array(EvidenceDefinitionSchema).min(1),
    clues: z.array(ClueDefinitionSchema),
    statements: z.array(StatementDefinitionSchema),
    documents: z.array(DocumentDefinitionSchema),
    deductions: z.array(DeductionRuleSchema),
    hints: z.array(HintDefinitionSchema),
    rating: RatingDefinitionSchema,
    ending: z.object({
      titleKey: localizationKeySchema,
      summaryKey: localizationKeySchema,
      epilogueKey: localizationKeySchema,
    }),
  })
  .superRefine((caseDefinition, context) => {
    if (
      !caseDefinition.supportedLocales.includes(caseDefinition.defaultLocale)
    ) {
      context.addIssue({
        code: 'custom',
        message: '默认语言必须包含在 supportedLocales 中',
        path: ['defaultLocale'],
      })
    }

    validateUniqueIds(caseDefinition.evidence, ['evidence'], context)
    validateUniqueIds(caseDefinition.clues, ['clues'], context)
    validateUniqueIds(caseDefinition.statements, ['statements'], context)
    validateUniqueIds(caseDefinition.documents, ['documents'], context)
    validateUniqueIds(caseDefinition.deductions, ['deductions'], context)
    validateUniqueIds(caseDefinition.hints, ['hints'], context)

    const evidenceIds = new Set(caseDefinition.evidence.map(({ id }) => id))
    const clueIds = new Set(caseDefinition.clues.map(({ id }) => id))

    caseDefinition.clues.forEach((clue, clueIndex) => {
      if (clue.evidenceId && !evidenceIds.has(clue.evidenceId)) {
        addUnknownReference(context, ['clues', clueIndex, 'evidenceId'])
      }
    })

    const hotspotIds = new Set<string>()
    caseDefinition.evidence.forEach((evidence, evidenceIndex) => {
      evidence.hotspots.forEach((hotspot, hotspotIndex) => {
        const hotspotPath = [
          'evidence',
          evidenceIndex,
          'hotspots',
          hotspotIndex,
        ]
        if (hotspotIds.has(hotspot.id)) {
          context.addIssue({
            code: 'custom',
            message: `热点 ID 重复：${hotspot.id}`,
            path: [...hotspotPath, 'id'],
          })
        }
        hotspotIds.add(hotspot.id)

        if (!clueIds.has(hotspot.clueId)) {
          addUnknownReference(context, [...hotspotPath, 'clueId'])
        }
        hotspot.prerequisites.forEach((prerequisite, prerequisiteIndex) => {
          if (!clueIds.has(prerequisite)) {
            addUnknownReference(context, [
              ...hotspotPath,
              'prerequisites',
              prerequisiteIndex,
            ])
          }
        })
      })
    })

    caseDefinition.deductions.forEach((rule, ruleIndex) => {
      const referencedNodes = [
        ...rule.requiredNodes,
        rule.unlocksConclusionId,
        ...rule.requiredRelations.flatMap(({ from, to }) => [from, to]),
      ]
      if (referencedNodes.some((nodeId) => !clueIds.has(nodeId))) {
        addUnknownReference(context, ['deductions', ruleIndex])
      }
    })

    caseDefinition.hints.forEach((hint, hintIndex) => {
      if (!clueIds.has(hint.targetId)) {
        addUnknownReference(context, ['hints', hintIndex, 'targetId'])
      }
    })
  })

function validateUniqueIds(
  values: ReadonlyArray<{ id: string }>,
  path: PropertyKey[],
  context: z.RefinementCtx,
) {
  const seen = new Set<string>()
  values.forEach(({ id }, index) => {
    if (seen.has(id)) {
      context.addIssue({
        code: 'custom',
        message: `ID 重复：${id}`,
        path: [...path, index, 'id'],
      })
    }
    seen.add(id)
  })
}

function addUnknownReference(context: z.RefinementCtx, path: PropertyKey[]) {
  context.addIssue({
    code: 'custom',
    message: '引用了不存在的 ID',
    path,
  })
}

export type CaseDefinition = z.infer<typeof CaseDefinitionSchema>
export type EvidenceDefinition = z.infer<typeof EvidenceDefinitionSchema>
export type HotspotDefinition = z.infer<typeof HotspotDefinitionSchema>
export type ToolId = z.infer<typeof ToolIdSchema>
