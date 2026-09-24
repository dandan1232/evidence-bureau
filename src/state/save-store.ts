import { z } from 'zod'

import { RelationKindSchema, ToolIdSchema } from '../cases/schema'

const CURRENT_SAVE_SCHEMA_VERSION = 1
const idSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, '存档包含无效 ID')

export const SavedProgressSchema = z.object({
  currentEvidenceId: idSchema,
  selectedTool: ToolIdSchema,
  discoveredClueIds: z.array(idSchema),
  deductionNodeIds: z.array(idSchema),
  deductionRelations: z
    .array(
      z.object({
        from: idSchema,
        to: idSchema,
        kind: RelationKindSchema,
      }),
    )
    .default([]),
  unlockedConclusionIds: z.array(idSchema),
})

export const SaveEnvelopeSchema = z.object({
  saveSchemaVersion: z.literal(CURRENT_SAVE_SCHEMA_VERSION),
  savedAt: z.string().datetime(),
  caseId: idSchema,
  caseContentVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
  payload: SavedProgressSchema,
})

export type SavedProgress = z.infer<typeof SavedProgressSchema>
export type SaveEnvelope = z.infer<typeof SaveEnvelopeSchema>

export type LoadProgressResult =
  | { status: 'fresh' }
  | { status: 'restored'; progress: SavedProgress; savedAt: string }
  | { status: 'recovered'; backupKey: string }

export type SaveProgressResult = { ok: true } | { ok: false; error: unknown }

export function caseSaveKey(caseId: string) {
  return `evidence-bureau:save:${caseId}`
}

export function saveCaseProgress(
  storage: Storage,
  caseId: string,
  caseContentVersion: string,
  progress: SavedProgress,
  now = new Date(),
): SaveProgressResult {
  const envelope = SaveEnvelopeSchema.parse({
    saveSchemaVersion: CURRENT_SAVE_SCHEMA_VERSION,
    savedAt: now.toISOString(),
    caseId,
    caseContentVersion,
    payload: progress,
  })

  try {
    storage.setItem(caseSaveKey(caseId), JSON.stringify(envelope))
    return { ok: true }
  } catch (error) {
    return { ok: false, error }
  }
}

export function loadCaseProgress(
  storage: Storage,
  caseId: string,
  caseContentVersion: string,
  now = new Date(),
): LoadProgressResult {
  const key = caseSaveKey(caseId)
  const raw = storage.getItem(key)
  if (raw === null) return { status: 'fresh' }

  try {
    const envelope = SaveEnvelopeSchema.parse(JSON.parse(raw))
    if (
      envelope.caseId !== caseId ||
      envelope.caseContentVersion !== caseContentVersion
    ) {
      return quarantineInvalidSave(storage, key, raw, now)
    }
    return {
      status: 'restored',
      progress: envelope.payload,
      savedAt: envelope.savedAt,
    }
  } catch {
    return quarantineInvalidSave(storage, key, raw, now)
  }
}

export function hasRestorableProgress(
  storage: Storage,
  caseId: string,
  caseContentVersion: string,
) {
  const raw = storage.getItem(caseSaveKey(caseId))
  if (raw === null) return false

  try {
    const envelope = SaveEnvelopeSchema.parse(JSON.parse(raw))
    return (
      envelope.caseId === caseId &&
      envelope.caseContentVersion === caseContentVersion
    )
  } catch {
    return false
  }
}

function quarantineInvalidSave(
  storage: Storage,
  key: string,
  raw: string,
  now: Date,
): LoadProgressResult {
  const backupKey = `${key}:corrupt:${now.getTime()}`
  try {
    storage.setItem(backupKey, raw)
    storage.removeItem(key)
  } catch {
    // 即使浏览器拒绝备份，也必须允许应用以新档启动。
  }
  return { status: 'recovered', backupKey }
}
