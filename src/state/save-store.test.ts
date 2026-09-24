import { describe, expect, it } from 'vitest'

import {
  caseSaveKey,
  hasRestorableProgress,
  loadCaseProgress,
  saveCaseProgress,
  type SavedProgress,
} from './save-store'

const progress: SavedProgress = {
  currentEvidenceId: 'moved-desk',
  selectedTool: 'side-light',
  discoveredClueIds: ['desk-leg-fresh-scrape'],
  deductionNodeIds: ['desk-leg-fresh-scrape'],
  deductionRelations: [],
  unlockedConclusionIds: ['desk-was-moved'],
}

describe('case save store', () => {
  it('往返保存并恢复版本化调查进度', () => {
    const storage = createMemoryStorage()
    const savedAt = new Date('2026-09-24T03:00:00.000Z')

    expect(
      saveCaseProgress(storage, 'vanished-tenant', '0.1.0', progress, savedAt),
    ).toEqual({ ok: true })
    expect(
      loadCaseProgress(storage, 'vanished-tenant', '0.1.0', savedAt),
    ).toEqual({
      status: 'restored',
      progress,
      savedAt: savedAt.toISOString(),
    })
    expect(hasRestorableProgress(storage, 'vanished-tenant', '0.1.0')).toBe(
      true,
    )
  })

  it('隔离损坏存档并启动新进度', () => {
    const storage = createMemoryStorage()
    const key = caseSaveKey('vanished-tenant')
    storage.setItem(key, '{broken json')

    const result = loadCaseProgress(
      storage,
      'vanished-tenant',
      '0.1.0',
      new Date(42),
    )

    expect(result).toEqual({
      status: 'recovered',
      backupKey: `${key}:corrupt:42`,
    })
    expect(storage.getItem(key)).toBeNull()
    expect(storage.getItem(`${key}:corrupt:42`)).toBe('{broken json')
  })

  it('为旧存档补充空的推理关系', () => {
    const storage = createMemoryStorage()
    const key = caseSaveKey('vanished-tenant')
    const legacyProgress: Record<string, unknown> = { ...progress }
    delete legacyProgress.deductionRelations
    storage.setItem(
      key,
      JSON.stringify({
        saveSchemaVersion: 1,
        savedAt: '2026-09-24T03:00:00.000Z',
        caseId: 'vanished-tenant',
        caseContentVersion: '0.1.0',
        payload: legacyProgress,
      }),
    )

    expect(loadCaseProgress(storage, 'vanished-tenant', '0.1.0')).toMatchObject(
      {
        status: 'restored',
        progress: { deductionRelations: [] },
      },
    )
  })

  it('内容版本不匹配时不恢复旧进度', () => {
    const storage = createMemoryStorage()
    saveCaseProgress(storage, 'vanished-tenant', '0.1.0', progress)

    expect(loadCaseProgress(storage, 'vanished-tenant', '0.2.0')).toMatchObject(
      { status: 'recovered' },
    )
  })

  it('写入失败时返回错误而不是抛出', () => {
    const storage = createMemoryStorage()
    storage.setItem = () => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError')
    }

    expect(
      saveCaseProgress(storage, 'vanished-tenant', '0.1.0', progress),
    ).toMatchObject({ ok: false })
  })
})

function createMemoryStorage(): Storage {
  const values = new Map<string, string>()
  return {
    get length() {
      return values.size
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => {
      values.delete(key)
    },
    setItem: (key, value) => {
      values.set(key, value)
    },
  }
}
