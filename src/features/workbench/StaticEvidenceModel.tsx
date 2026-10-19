import { useGLTF } from '@react-three/drei'
import type { ThreeEvent } from '@react-three/fiber'
import { Component, useEffect, useMemo, type ReactNode } from 'react'
import { Box3, Mesh, MeshStandardMaterial, Vector3, type Object3D } from 'three'

import type { HotspotDefinition, ToolId } from '../../cases/schema'
import { isPointInHotspot } from './surface-inspection'

type StaticEvidenceModelProps = {
  url: string
  tool: ToolId
  hotspot?: HotspotDefinition
  onLoaded: (tabletopBounds: Box3) => void
  onTargetChange: (hotspotId?: string) => void
  onMeasure: (point: Vector3) => void
}

export function StaticEvidenceModel({
  url,
  tool,
  hotspot,
  onLoaded,
  onTargetChange,
  onMeasure,
}: StaticEvidenceModelProps) {
  // These uncompressed assets need no remote Draco or Meshopt decoder.
  const { scene } = useGLTF(url, false, false)
  const { model, tabletopBounds } = useMemo(() => {
    const model = scene.clone(true)
    model.name = 'static-evidence-model'
    const tabletopBounds = new Box3()
    model.updateMatrixWorld(true)
    model.traverse((node) => {
      if (!isEvidenceMesh(node)) return
      if (node.name.startsWith('Tabletop')) tabletopBounds.expandByObject(node)
      node.castShadow = true
      node.receiveShadow = true
      const originals = Array.isArray(node.material)
        ? node.material
        : [node.material]
      const materials = originals.map((original) => {
        const material = original.clone()
        if (material instanceof MeshStandardMaterial) {
          if (tool === 'wireframe') {
            material.wireframe = true
            const structural = node.userData.inspectionTool === 'wireframe'
            material.color.set(structural ? '#d6b885' : '#a5b1ac')
            material.map = null
            material.transparent = !structural
            material.opacity = structural ? 1 : 0.22
            material.depthWrite = structural
          } else if (tool === 'ultraviolet') {
            material.color.set('#697b75')
            material.roughness = 0.95
          }
        }
        return material
      })
      node.material = Array.isArray(node.material) ? materials : materials[0]!
    })
    return { model, tabletopBounds }
  }, [scene, tool])

  useEffect(() => {
    onLoaded(tabletopBounds)
    return () => {
      model.traverse((node) => {
        if (!isEvidenceMesh(node)) return
        const materials = Array.isArray(node.material)
          ? node.material
          : [node.material]
        materials.forEach((material) => material.dispose())
      })
    }
  }, [model, tabletopBounds, onLoaded])

  const inspectSurface = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation()
    if (!hotspot || tool === 'measurement' || event.buttons !== 0) {
      onTargetChange(undefined)
      return
    }
    // In wireframe mode the scan may reach the bracket behind the outer shell.
    const point =
      tool === 'wireframe'
        ? event.intersections.find((hit) =>
            isPointInHotspot(hit.point, hotspot),
          )?.point
        : event.point
    onTargetChange(
      point && isPointInHotspot(point, hotspot) ? hotspot.id : undefined,
    )
  }

  return (
    <primitive
      object={model}
      dispose={null}
      onPointerMove={inspectSurface}
      onPointerLeave={() => onTargetChange(undefined)}
      onClick={(event: ThreeEvent<MouseEvent>) => {
        if (tool !== 'measurement' || event.delta > 4) return
        event.stopPropagation()
        onMeasure(event.point.clone())
      }}
    />
  )
}

function isEvidenceMesh(node: Object3D): node is Mesh {
  return node instanceof Mesh
}

type ModelBoundaryProps = {
  children: ReactNode
  fallback: ReactNode
  onError: () => void
}

export class ModelBoundary extends Component<ModelBoundaryProps> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch() {
    this.props.onError()
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}
