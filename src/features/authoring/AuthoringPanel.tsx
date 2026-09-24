import { Clipboard, Crosshair, X } from 'lucide-react'
import { useState } from 'react'

import type { CameraObservation } from '../workbench/EvidenceViewport'
import styles from './AuthoringPanel.module.css'

export type AuthoringHotspot = {
  center: [number, number, number]
  radius: number
}

type AuthoringPanelProps = {
  hotspotId: string
  clueId: string
  hotspot: AuthoringHotspot
  observation: CameraObservation
  onChange: (hotspot: AuthoringHotspot) => void
}

export function AuthoringPanel({
  hotspotId,
  clueId,
  hotspot,
  observation,
  onChange,
}: AuthoringPanelProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>(
    'idle',
  )

  const updateCenter = (index: number, value: number) => {
    const center: AuthoringHotspot['center'] = [...hotspot.center]
    center[index] = value
    onChange({ ...hotspot, center })
  }

  const copyDefinition = async () => {
    try {
      await navigator.clipboard.writeText(
        JSON.stringify(
          {
            id: hotspotId,
            clueId,
            shape: { type: 'sphere', ...hotspot },
          },
          null,
          2,
        ),
      )
      setCopyStatus('copied')
      window.setTimeout(() => setCopyStatus('idle'), 1600)
    } catch {
      setCopyStatus('error')
    }
  }

  if (collapsed) {
    return (
      <button
        className={styles.reopen}
        type="button"
        onClick={() => setCollapsed(false)}
      >
        <Crosshair aria-hidden="true" size={16} />
        热点标注
      </button>
    )
  }

  return (
    <aside className={styles.panel} aria-labelledby="authoring-title">
      <header>
        <div>
          <span>DEVELOPMENT ONLY</span>
          <h2 id="authoring-title">热点标注模式</h2>
        </div>
        <button
          type="button"
          aria-label="收起热点标注"
          onClick={() => setCollapsed(true)}
        >
          <X aria-hidden="true" size={16} />
        </button>
      </header>

      <dl className={styles.readout}>
        <div>
          <dt>热点 ID</dt>
          <dd>{hotspotId}</dd>
        </div>
        <div>
          <dt>镜头距离</dt>
          <dd>{observation.cameraDistance.toFixed(1)} m</dd>
        </div>
        <div>
          <dt>观察角度</dt>
          <dd>{observation.viewAngleDeg.toFixed(0)}°</dd>
        </div>
      </dl>

      <fieldset>
        <legend>球形热点中心</legend>
        <div className={styles.coordinates}>
          {(['X', 'Y', 'Z'] as const).map((axis, index) => (
            <label key={axis}>
              <span>{axis}</span>
              <input
                aria-label={`${axis} 坐标`}
                step="0.01"
                type="number"
                value={hotspot.center[index]}
                onChange={(event) =>
                  updateCenter(index, event.currentTarget.valueAsNumber)
                }
              />
            </label>
          ))}
        </div>
        <label className={styles.radius}>
          <span>半径</span>
          <input
            min="0.01"
            step="0.01"
            type="number"
            value={hotspot.radius}
            onChange={(event) =>
              onChange({
                ...hotspot,
                radius: Math.max(0.01, event.currentTarget.valueAsNumber),
              })
            }
          />
        </label>
      </fieldset>

      <button
        className={styles.copyButton}
        type="button"
        onClick={() => void copyDefinition()}
      >
        <Clipboard aria-hidden="true" size={16} />
        {copyStatus === 'copied'
          ? '已复制 JSON'
          : copyStatus === 'error'
            ? '复制失败'
            : '复制热点 JSON'}
      </button>
    </aside>
  )
}
