import { ContactShadows, Grid, OrbitControls } from '@react-three/drei'
import { Canvas, useThree } from '@react-three/fiber'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Vector3 } from 'three'

import type { ToolId } from '../../cases/schema'
import styles from './EvidenceViewport.module.css'

export type ViewCommand = {
  sequence: number
  type: 'rotate-left' | 'rotate-right' | 'zoom-in' | 'zoom-out' | 'reset'
}

type EvidenceViewportProps = {
  selectedTool: ToolId
  command: ViewCommand
  onObservationChange: (observation: CameraObservation) => void
}

export type CameraObservation = {
  cameraDistance: number
  viewAngleDeg: number
}

export function EvidenceViewport({
  selectedTool,
  command,
  onObservationChange,
}: EvidenceViewportProps) {
  const [webGLAvailable] = useState(supportsWebGL)

  if (!webGLAvailable) {
    return (
      <div className={styles.fallback} role="img" aria-label="桌子物证文字预览">
        <span>WEBGL UNAVAILABLE</span>
        <strong>被移动过的桌子</strong>
        <p>
          浏览器无法建立 3D 场景。你仍可阅读物证档案，换用支持 WebGL
          的桌面浏览器后可旋转检查。
        </p>
      </div>
    )
  }

  return (
    <div className={styles.viewport} data-testid="evidence-viewport">
      <Canvas
        camera={{ position: [4.8, 3.2, 5.2], fov: 38 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
      >
        <color attach="background" args={['#0b0d0e']} />
        <fog attach="fog" args={['#0b0d0e', 8, 15]} />
        <SceneLighting tool={selectedTool} />
        <DeskEvidence tool={selectedTool} />
        <ContactShadows
          position={[0, -0.03, 0]}
          opacity={0.38}
          scale={8}
          blur={2.6}
          far={4.5}
        />
        <Grid
          position={[0, -0.04, 0]}
          args={[12, 12]}
          cellColor="#32383b"
          cellSize={0.25}
          cellThickness={0.45}
          fadeDistance={9}
          fadeStrength={1.6}
          sectionColor="#53616a"
          sectionSize={1}
          sectionThickness={0.8}
        />
        <CameraController
          command={command}
          onObservationChange={onObservationChange}
        />
      </Canvas>

      {selectedTool === 'measurement' ? (
        <div className={styles.measurementOverlay} aria-live="polite">
          <span className={styles.widthMeasure}>1.42 M</span>
          <span className={styles.heightMeasure}>0.76 M</span>
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

function SceneLighting({ tool }: { tool: ToolId }) {
  if (tool === 'side-light') {
    return (
      <>
        <ambientLight intensity={0.18} />
        <spotLight
          castShadow
          angle={0.55}
          color="#e9edf0"
          intensity={85}
          penumbra={0.6}
          position={[-5, 1.2, 2]}
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

function DeskEvidence({ tool }: { tool: ToolId }) {
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
    </group>
  )
}

function CameraController({
  command,
  onObservationChange,
}: {
  command: ViewCommand
  onObservationChange: (observation: CameraObservation) => void
}) {
  const { camera } = useThree()
  const [target] = useState(() => ({ x: 0, y: 0.7, z: 0 }))
  const hotspotPosition = useMemo(
    () =>
      new Vector3(-1.27, 0.11, 0.57).applyAxisAngle(
        new Vector3(0, 1, 0),
        -0.24,
      ),
    [],
  )
  const hotspotNormal = useMemo(
    () => new Vector3(0, 0, 1).applyAxisAngle(new Vector3(0, 1, 0), -0.24),
    [],
  )

  const reportObservation = useCallback(() => {
    const hotspotToCamera = camera.position.clone().sub(hotspotPosition)
    const cameraDistance = hotspotToCamera.length()
    const viewAngleDeg =
      (hotspotToCamera.normalize().angleTo(hotspotNormal) * 180) / Math.PI
    onObservationChange({
      cameraDistance: Math.round(cameraDistance * 10) / 10,
      viewAngleDeg: Math.round(viewAngleDeg),
    })
  }, [camera, hotspotNormal, hotspotPosition, onObservationChange])

  useEffect(() => {
    if (command.sequence === 0) {
      reportObservation()
      return
    }

    if (command.type === 'reset') {
      camera.position.set(4.8, 3.2, 5.2)
    } else if (command.type === 'zoom-in') {
      camera.position.multiplyScalar(0.82)
    } else if (command.type === 'zoom-out') {
      camera.position.multiplyScalar(1.2)
    } else {
      const angle = command.type === 'rotate-left' ? 0.32 : -0.32
      const x = camera.position.x
      const z = camera.position.z
      camera.position.set(
        x * Math.cos(angle) - z * Math.sin(angle),
        camera.position.y,
        x * Math.sin(angle) + z * Math.cos(angle),
      )
    }

    const distance = camera.position.length()
    if (distance < 2.4) camera.position.setLength(2.4)
    if (distance > 9) camera.position.setLength(9)
    camera.lookAt(target.x, target.y, target.z)
    camera.updateProjectionMatrix()
    reportObservation()
  }, [camera, command, reportObservation, target])

  return (
    <OrbitControls
      enableDamping
      dampingFactor={0.08}
      maxDistance={9}
      maxPolarAngle={Math.PI * 0.92}
      minDistance={2.4}
      minPolarAngle={Math.PI * 0.08}
      onEnd={reportObservation}
      target={[target.x, target.y, target.z]}
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
