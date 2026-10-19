import {
  ContactShadows,
  Grid,
  Html,
  Line,
  OrbitControls,
  useGLTF,
} from '@react-three/drei'
import { Canvas, useThree } from '@react-three/fiber'
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { Box3, Raycaster, Vector2, Vector3 } from 'three'

import type {
  EvidenceDefinition,
  HotspotDefinition,
  ToolId,
} from '../../cases/schema'
import { ModelBoundary, StaticEvidenceModel } from './StaticEvidenceModel'
import { getMeasuredAxis, isPointInHotspot } from './surface-inspection'
import styles from './EvidenceViewport.module.css'

export type ViewCommand = {
  sequence: number
  type:
    | 'rotate-left'
    | 'rotate-right'
    | 'zoom-in'
    | 'zoom-out'
    | 'reset'
    | 'inspect'
}

type EvidenceViewportProps = {
  evidence: EvidenceDefinition
  hotspot?: HotspotDefinition
  selectedTool: ToolId
  command: ViewCommand
  onObservationChange: (observation: CameraObservation) => void
  authoringHotspot?: {
    center: [number, number, number]
    radius: number
  }
}

export type CameraObservation = {
  cameraDistance: number
  viewAngleDeg: number
  targetedHotspotId?: string
  measuredDimensions?: { width?: number; depth?: number }
}

export function EvidenceViewport({
  evidence,
  hotspot,
  selectedTool,
  command,
  onObservationChange,
  authoringHotspot,
}: EvidenceViewportProps) {
  const [webGLAvailable] = useState(supportsWebGL)
  const evidenceId = evidence.id
  const isStatic = evidence.representation === 'glb'
  const [assetStatus, setAssetStatus] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  )
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [tabletopBounds, setTabletopBounds] = useState<Box3 | null>(null)
  const [targetedHotspotId, setTargetedHotspotId] = useState<string>()
  const [measurementPoints, setMeasurementPoints] = useState<Vector3[]>([])
  const [measuredDimensions, setMeasuredDimensions] = useState<{
    width?: number
    depth?: number
  }>({})
  const handleModelLoaded = useCallback((bounds: Box3) => {
    setTabletopBounds(bounds)
    setAssetStatus('ready')
  }, [])
  const handleModelError = useCallback(() => setAssetStatus('error'), [])
  const measureBetween = (first: Vector3, second: Vector3) => {
    setMeasurementPoints([first, second])
    const axis = getMeasuredAxis(first, second)
    if (axis) {
      const distance = first.distanceTo(second)
      setMeasuredDimensions((previous) => ({ ...previous, [axis]: distance }))
    }
  }
  const selectMeasurementPoint = (point: Vector3) => {
    if (measurementPoints.length === 1 && measurementPoints[0]) {
      measureBetween(measurementPoints[0], point)
    } else {
      setMeasurementPoints([point])
    }
  }
  const measureTabletop = (axis: 'width' | 'depth') => {
    if (!tabletopBounds || tabletopBounds.isEmpty()) return
    const { min, max } = tabletopBounds
    const first = new Vector3(
      axis === 'width' ? min.x : max.x,
      max.y,
      axis === 'width' ? max.z : min.z,
    )
    measureBetween(first, new Vector3(max.x, max.y, max.z))
  }

  if (!webGLAvailable) {
    const evidenceName = evidenceNames[evidenceId] ?? '当前物证'
    return (
      <div
        className={styles.fallback}
        role="img"
        aria-label={`${evidenceName}文字预览`}
      >
        <span>WEBGL UNAVAILABLE</span>
        <strong>{evidenceName}</strong>
        <p>
          浏览器无法建立 3D 场景。你仍可阅读物证档案，换用支持 WebGL
          的桌面浏览器后可旋转检查。
        </p>
      </div>
    )
  }

  return (
    <div
      className={styles.viewport}
      data-testid="evidence-viewport"
      data-model-status={isStatic ? assetStatus : 'proxy'}
    >
      <Canvas
        camera={
          isStatic
            ? {
                position: evidence.initialCamera.position,
                fov: evidence.initialCamera.fov,
              }
            : { position: [4.8, 3.2, 5.2], fov: 38 }
        }
        dpr={[1, 1.5]}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
      >
        <color attach="background" args={['#0b0d0e']} />
        <fog attach="fog" args={['#0b0d0e', 8, 15]} />
        <SceneLighting tool={selectedTool} compact={isStatic} />
        {isStatic ? (
          <ModelBoundary
            key={loadAttempt}
            fallback={null}
            onError={handleModelError}
          >
            <Suspense fallback={null}>
              <StaticEvidenceModel
                url={evidence.modelUrl}
                tool={selectedTool}
                hotspot={hotspot}
                onLoaded={handleModelLoaded}
                onTargetChange={setTargetedHotspotId}
                onMeasure={selectMeasurementPoint}
              />
            </Suspense>
          </ModelBoundary>
        ) : (
          <EvidenceModel
            evidenceId={evidenceId}
            tool={selectedTool}
            authoringHotspot={authoringHotspot}
          />
        )}
        {isStatic && authoringHotspot ? (
          <mesh position={authoringHotspot.center} renderOrder={10}>
            <sphereGeometry args={[authoringHotspot.radius, 20, 12]} />
            <meshBasicMaterial
              color="#f0a83a"
              depthTest={false}
              opacity={0.6}
              transparent
              wireframe
            />
          </mesh>
        ) : null}
        {isStatic && selectedTool === 'measurement' ? (
          <>
            {measurementPoints.map((point, index) => (
              <mesh key={index} position={point} renderOrder={20}>
                <sphereGeometry args={[0.008, 12, 8]} />
                <meshBasicMaterial color="#d6b885" depthTest={false} />
              </mesh>
            ))}
            {measurementPoints.length === 2 &&
            measurementPoints[0] &&
            measurementPoints[1] ? (
              <>
                <Line
                  points={measurementPoints}
                  color="#d6b885"
                  lineWidth={1.5}
                  depthTest={false}
                />
                <Html
                  position={measurementPoints[0]
                    .clone()
                    .add(measurementPoints[1])
                    .multiplyScalar(0.5)}
                  center
                  style={{ pointerEvents: 'none' }}
                >
                  <output
                    aria-label="两点距离"
                    className={styles.distanceLabel}
                  >
                    {measurementPoints[0]
                      .distanceTo(measurementPoints[1])
                      .toFixed(3)}{' '}
                    m
                  </output>
                </Html>
              </>
            ) : null}
          </>
        ) : null}
        <ContactShadows
          position={[0, -0.03, 0]}
          opacity={0.38}
          scale={isStatic ? 3.5 : 8}
          blur={2.6}
          far={4.5}
        />
        <Grid
          position={[0, -0.04, 0]}
          args={[12, 12]}
          cellColor="#32383b"
          cellSize={isStatic ? 0.1 : 0.25}
          cellThickness={0.45}
          fadeDistance={9}
          fadeStrength={1.6}
          sectionColor="#53616a"
          sectionSize={isStatic ? 0.5 : 1}
          sectionThickness={0.8}
        />
        <CameraController
          command={command}
          evidence={evidence}
          hotspot={hotspot}
          selectedTool={selectedTool}
          targetedHotspotId={targetedHotspotId}
          onTargetChange={setTargetedHotspotId}
          measuredDimensions={measuredDimensions}
          onObservationChange={onObservationChange}
        />
      </Canvas>

      {isStatic && assetStatus !== 'ready' ? (
        <div className={styles.assetStatus} role="status">
          {assetStatus === 'error' ? (
            <>
              <img src={evidence.posterUrl} alt="桌子物证静态预览" />
              <strong>物证模型暂时无法打开</strong>
              <p>可先查阅档案和案件材料，或重新加载模型。</p>
              <button
                type="button"
                onClick={() => {
                  useGLTF.clear(evidence.modelUrl)
                  setAssetStatus('loading')
                  setLoadAttempt((attempt) => attempt + 1)
                }}
              >
                重新加载模型
              </button>
            </>
          ) : (
            <p>正在读取物证模型…</p>
          )}
        </div>
      ) : null}

      {selectedTool === 'measurement' && isStatic && assetStatus === 'ready' ? (
        <div className={styles.measurementPanel} aria-label="物证尺寸测量">
          <p>点击表面两点测距，或使用边缘卡尺。</p>
          <div>
            <button type="button" onClick={() => measureTabletop('width')}>
              测量桌面宽度
            </button>
            <button type="button" onClick={() => measureTabletop('depth')}>
              测量桌面深度
            </button>
          </div>
          <dl aria-live="polite">
            <div>
              <dt>宽度</dt>
              <dd>
                {measuredDimensions.width === undefined
                  ? '待测量'
                  : `${measuredDimensions.width.toFixed(2)} M`}
              </dd>
            </div>
            <div>
              <dt>深度</dt>
              <dd>
                {measuredDimensions.depth === undefined
                  ? '待测量'
                  : `${measuredDimensions.depth.toFixed(2)} M`}
              </dd>
            </div>
          </dl>
        </div>
      ) : selectedTool === 'measurement' && !isStatic ? (
        <div className={styles.measurementOverlay} aria-live="polite">
          <span className={styles.widthMeasure}>
            {evidenceMeasurements[evidenceId]?.width ?? '—'}
          </span>
          <span className={styles.heightMeasure}>
            {evidenceMeasurements[evidenceId]?.height ?? '—'}
          </span>
        </div>
      ) : null}

      <div className={styles.axis} aria-hidden="true">
        <span className={styles.axisY}>Y</span>
        <span className={styles.axisX}>X</span>
        <span className={styles.axisZ}>Z</span>
      </div>
    </div>
  )
}

const evidenceNames: Record<string, string> = {
  'moved-desk': '被移动过的桌子',
  'damaged-camera': '损坏的旧相机',
  'brass-key': '黄铜钥匙',
}

const evidenceMeasurements: Record<string, { width: string; height: string }> =
  {
    'moved-desk': { width: '1.42 M', height: '0.76 M' },
    'damaged-camera': { width: '138 MM', height: '92 MM' },
    'brass-key': { width: '84 MM', height: '29 MM' },
  }

function SceneLighting({ tool, compact }: { tool: ToolId; compact: boolean }) {
  if (tool === 'side-light') {
    return (
      <>
        <ambientLight intensity={0.18} />
        <spotLight
          castShadow
          angle={0.55}
          color="#e9edf0"
          intensity={compact ? 45 : 85}
          penumbra={0.6}
          position={compact ? [-1.2, 0.25, 1.2] : [-5, 1.2, 2]}
        />
      </>
    )
  }

  if (tool === 'ultraviolet') {
    return (
      <>
        <ambientLight color="#20223a" intensity={0.65} />
        <spotLight
          angle={0.75}
          color="#7771c6"
          intensity={55}
          penumbra={0.75}
          position={[2.5, 5, 3]}
        />
        <pointLight color="#b9e5d0" intensity={7} position={[-2, 1, -2]} />
      </>
    )
  }

  return (
    <>
      <hemisphereLight args={['#eef1ef', '#1b2023', 2.1]} />
      <directionalLight color="#f4f0e8" intensity={3.5} position={[4, 6, 5]} />
      <directionalLight
        color="#8195a0"
        intensity={1.2}
        position={[-4, 2, -3]}
      />
    </>
  )
}

function EvidenceModel({
  evidenceId,
  tool,
  authoringHotspot,
}: {
  evidenceId: string
  tool: ToolId
  authoringHotspot?: EvidenceViewportProps['authoringHotspot']
}) {
  if (evidenceId === 'damaged-camera') {
    return <CameraEvidence tool={tool} />
  }

  if (evidenceId === 'brass-key') {
    return <BrassKeyEvidence tool={tool} />
  }

  return <DeskEvidence tool={tool} authoringHotspot={authoringHotspot} />
}

function DeskEvidence({
  tool,
  authoringHotspot,
}: {
  tool: ToolId
  authoringHotspot?: EvidenceViewportProps['authoringHotspot']
}) {
  const wireframe = tool === 'wireframe'
  const ultraviolet = tool === 'ultraviolet'
  const material = {
    color: ultraviolet ? '#566861' : '#b9b7ae',
    metalness: 0.05,
    roughness: tool === 'side-light' ? 0.88 : 0.72,
    wireframe,
  }

  return (
    <group position={[0, 0.05, 0]} rotation={[0, -0.24, 0]}>
      <mesh castShadow receiveShadow position={[0, 1.28, 0]}>
        <boxGeometry args={[3.2, 0.18, 1.65]} />
        <meshStandardMaterial {...material} />
      </mesh>

      {[
        [-1.27, 0.62, -0.57],
        [1.27, 0.62, -0.57],
        [-1.27, 0.62, 0.57],
        [1.27, 0.62, 0.57],
      ].map((position) => (
        <mesh
          key={position.join(':')}
          castShadow
          receiveShadow
          position={position as [number, number, number]}
        >
          <boxGeometry args={[0.18, 1.2, 0.18]} />
          <meshStandardMaterial
            {...material}
            color={ultraviolet ? '#3f514d' : '#92938e'}
          />
        </mesh>
      ))}

      <mesh castShadow position={[0, 0.88, -0.68]}>
        <boxGeometry args={[2.75, 0.12, 0.14]} />
        <meshStandardMaterial
          {...material}
          color={ultraviolet ? '#42554f' : '#8a8c87'}
        />
      </mesh>

      <mesh position={[-1.28, 0.06, 0.57]} rotation={[0.02, 0.06, 0.08]}>
        <boxGeometry args={[0.26, 0.025, 0.34]} />
        <meshStandardMaterial
          color={ultraviolet ? '#c6ebd7' : '#595d5c'}
          emissive={ultraviolet ? '#66b08d' : '#000000'}
          emissiveIntensity={ultraviolet ? 1.5 : 0}
          roughness={1}
          wireframe={wireframe}
        />
      </mesh>

      {authoringHotspot ? (
        <mesh position={authoringHotspot.center} renderOrder={10}>
          <sphereGeometry args={[authoringHotspot.radius, 20, 12]} />
          <meshBasicMaterial
            color="#f0a83a"
            depthTest={false}
            opacity={0.75}
            transparent
            wireframe
          />
        </mesh>
      ) : null}
    </group>
  )
}

function CameraEvidence({ tool }: { tool: ToolId }) {
  const wireframe = tool === 'wireframe'
  const ultraviolet = tool === 'ultraviolet'
  const bodyColor = ultraviolet ? '#455753' : '#777a78'
  const metalColor = ultraviolet ? '#65746e' : '#a5a7a3'

  return (
    <group position={[0, 0.12, 0]} rotation={[0.04, -0.3, 0]}>
      <mesh castShadow receiveShadow position={[0, 0.72, 0]}>
        <boxGeometry args={[2.45, 1.35, 0.82]} />
        <meshStandardMaterial
          color={bodyColor}
          metalness={0.38}
          roughness={tool === 'side-light' ? 0.82 : 0.58}
          wireframe={wireframe}
        />
      </mesh>

      <mesh
        castShadow
        position={[0, 0.72, 0.64]}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <cylinderGeometry args={[0.63, 0.72, 0.58, 32]} />
        <meshStandardMaterial
          color={metalColor}
          metalness={0.72}
          roughness={0.38}
          wireframe={wireframe}
        />
      </mesh>
      <mesh position={[0, 0.72, 0.95]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.45, 0.5, 0.08, 32]} />
        <meshStandardMaterial
          color={ultraviolet ? '#8bc4ad' : '#242a2b'}
          emissive={ultraviolet ? '#4f9e7d' : '#000000'}
          emissiveIntensity={ultraviolet ? 1.1 : 0}
          metalness={0.3}
          roughness={0.2}
          wireframe={wireframe}
        />
      </mesh>

      <mesh castShadow position={[-0.62, 1.53, -0.02]}>
        <boxGeometry args={[0.64, 0.34, 0.52]} />
        <meshStandardMaterial
          color={metalColor}
          metalness={0.5}
          roughness={0.46}
          wireframe={wireframe}
        />
      </mesh>
      <mesh castShadow position={[0.7, 1.47, 0]}>
        <cylinderGeometry args={[0.3, 0.3, 0.16, 24]} />
        <meshStandardMaterial
          color={metalColor}
          metalness={0.65}
          roughness={0.42}
          wireframe={wireframe}
        />
      </mesh>

      <mesh position={[0.72, 1.57, 0.02]} rotation={[0, 0.3, 0]}>
        <boxGeometry args={[0.42, 0.025, 0.16]} />
        <meshStandardMaterial
          color={ultraviolet ? '#c9eadb' : '#4f5352'}
          emissive={ultraviolet ? '#75b99a' : '#000000'}
          emissiveIntensity={ultraviolet ? 1.5 : 0}
          roughness={0.95}
          wireframe={wireframe}
        />
      </mesh>
    </group>
  )
}

function BrassKeyEvidence({ tool }: { tool: ToolId }) {
  const wireframe = tool === 'wireframe'
  const ultraviolet = tool === 'ultraviolet'
  const brass = ultraviolet ? '#78866b' : '#a9853f'
  const wornBrass = ultraviolet ? '#9ba88d' : '#c5a867'
  const material = {
    color: brass,
    metalness: 0.82,
    roughness: tool === 'side-light' ? 0.56 : 0.38,
    wireframe,
  }

  return (
    <group
      position={[-0.15, 0.62, 0]}
      rotation={[Math.PI / 2.35, -0.28, -0.12]}
      scale={1.18}
    >
      <mesh castShadow position={[-1.2, 0, 0]}>
        <torusGeometry args={[0.62, 0.2, 18, 42]} />
        <meshStandardMaterial {...material} />
      </mesh>

      <mesh castShadow position={[0.25, 0, 0]}>
        <boxGeometry args={[2.35, 0.34, 0.22]} />
        <meshStandardMaterial {...material} />
      </mesh>

      <mesh castShadow position={[1.25, -0.28, 0]}>
        <boxGeometry args={[0.35, 0.65, 0.22]} />
        <meshStandardMaterial {...material} color={wornBrass} />
      </mesh>
      <mesh castShadow position={[0.72, -0.22, 0]}>
        <boxGeometry args={[0.3, 0.5, 0.22]} />
        <meshStandardMaterial {...material} color={wornBrass} />
      </mesh>

      <mesh position={[0.1, 0.19, 0.13]}>
        <boxGeometry args={[1.15, 0.035, 0.035]} />
        <meshStandardMaterial
          color={ultraviolet ? '#c9eadb' : '#6d562e'}
          emissive={ultraviolet ? '#72a88d' : '#000000'}
          emissiveIntensity={ultraviolet ? 1.15 : 0}
          roughness={1}
          wireframe={wireframe}
        />
      </mesh>
    </group>
  )
}

function CameraController({
  command,
  evidence,
  hotspot,
  selectedTool,
  targetedHotspotId,
  onTargetChange,
  measuredDimensions,
  onObservationChange,
}: {
  command: ViewCommand
  evidence: EvidenceDefinition
  hotspot?: HotspotDefinition
  selectedTool: ToolId
  targetedHotspotId?: string
  onTargetChange: (hotspotId?: string) => void
  measuredDimensions: { width?: number; depth?: number }
  onObservationChange: (observation: CameraObservation) => void
}) {
  const { camera, scene } = useThree()
  const isStatic = evidence.representation === 'glb'
  const target = useMemo(
    () =>
      new Vector3(
        ...(isStatic ? evidence.initialCamera.target : ([0, 0.7, 0] as const)),
      ),
    [evidence, isStatic],
  )
  const limits = isStatic
    ? evidence.cameraLimits
    : {
        minDistance: 2.4,
        maxDistance: 9,
        minPolarAngleDeg: 14.4,
        maxPolarAngleDeg: 165.6,
      }
  const raycaster = useMemo(() => new Raycaster(), [])
  const handledCommand = useRef(0)
  const hotspotPosition = useMemo(
    () => new Vector3(...(hotspot?.shape.center ?? [0, 0.7, 0])),
    [hotspot],
  )
  const hotspotNormal = useMemo(
    () => new Vector3(...(hotspot?.surfaceNormal ?? [0, 0, 1])),
    [hotspot],
  )

  const reportObservation = useCallback(() => {
    const hotspotToCamera = camera.position.clone().sub(hotspotPosition)
    const cameraDistance = hotspotToCamera.length()
    const viewAngleDeg =
      (hotspotToCamera.normalize().angleTo(hotspotNormal) * 180) / Math.PI
    onObservationChange({
      cameraDistance: Math.round(cameraDistance * 10) / 10,
      viewAngleDeg: Math.round(viewAngleDeg),
      targetedHotspotId,
      measuredDimensions,
    })
  }, [
    camera,
    hotspotNormal,
    hotspotPosition,
    onObservationChange,
    targetedHotspotId,
    measuredDimensions,
  ])

  useEffect(() => {
    if (command.sequence === handledCommand.current) return
    handledCommand.current = command.sequence
    if (command.type === 'inspect') {
      const model = scene.getObjectByName('static-evidence-model')
      if (model && hotspot) {
        raycaster.setFromCamera(new Vector2(0, 0), camera)
        const intersections = raycaster.intersectObject(model, true)
        const hit =
          selectedTool === 'wireframe'
            ? intersections.find(({ point }) =>
                isPointInHotspot(point, hotspot),
              )
            : intersections[0]
        onTargetChange(
          hit && isPointInHotspot(hit.point, hotspot) ? hotspot.id : undefined,
        )
      }
      return
    }
    onTargetChange(undefined)
    if (command.type === 'reset') {
      camera.position.fromArray(
        isStatic ? evidence.initialCamera.position : [4.8, 3.2, 5.2],
      )
    } else if (command.type === 'zoom-in') {
      camera.position.sub(target).multiplyScalar(0.82).add(target)
    } else if (command.type === 'zoom-out') {
      camera.position.sub(target).multiplyScalar(1.2).add(target)
    } else {
      const angle = command.type === 'rotate-left' ? 0.32 : -0.32
      const x = camera.position.x - target.x
      const z = camera.position.z - target.z
      camera.position.set(
        target.x + x * Math.cos(angle) - z * Math.sin(angle),
        camera.position.y,
        target.z + x * Math.sin(angle) + z * Math.cos(angle),
      )
    }

    const offset = camera.position.clone().sub(target)
    offset.clampLength(limits.minDistance, limits.maxDistance)
    camera.position.copy(target).add(offset)
    camera.lookAt(target)
    camera.updateProjectionMatrix()
  }, [
    camera,
    command,
    evidence,
    hotspot,
    isStatic,
    limits.minDistance,
    limits.maxDistance,
    onTargetChange,
    raycaster,
    scene,
    selectedTool,
    target,
  ])

  useEffect(() => {
    reportObservation()
  }, [reportObservation])

  return (
    <OrbitControls
      enableDamping
      keyEvents={isStatic}
      dampingFactor={0.08}
      maxDistance={limits.maxDistance}
      maxPolarAngle={(limits.maxPolarAngleDeg * Math.PI) / 180}
      minDistance={limits.minDistance}
      minPolarAngle={(limits.minPolarAngleDeg * Math.PI) / 180}
      onStart={() => onTargetChange(undefined)}
      onChange={reportObservation}
      onEnd={reportObservation}
      target={target}
    />
  )
}

function supportsWebGL() {
  if (typeof window === 'undefined' || !('WebGLRenderingContext' in window)) {
    return false
  }

  try {
    const canvas = document.createElement('canvas')
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'))
  } catch {
    return false
  }
}
