import { useRef, useState, useEffect, forwardRef, ForwardedRef } from 'react'
import * as THREE from 'three'
import { Playable } from '../../types'
import { Vector2 } from 'three'

// Constants from the original ShelfRenderer.js
const ALBUM_WIDTH = 30
const ALBUM_DEPTH = 1

interface AlbumProps {
  playable: Playable
  position: [number, number, number]
  rotation: [number, number, number]
  onClick?: () => void
  clickable?: boolean
}

// Cache for textures to avoid reloading
const textureCache: Record<string, THREE.MeshStandardMaterial> = {}

const Album = forwardRef(({ playable, position, rotation, onClick, clickable }: AlbumProps, ref: ForwardedRef<THREE.Mesh>) => {
  const localRef = useRef<THREE.Mesh>(null)
  const meshRef = ref || localRef
  const [hovered, setHovered] = useState(false)
  const [material, setMaterial] = useState<THREE.MeshStandardMaterial | null>(null)
  const [pointerDownPosition, setPointerDownPosition] = useState<Vector2 | null>(null)

  // Load texture if available
  useEffect(() => {
    if (playable.image_url && playable.image_url !== '') {
      if (textureCache[playable.image_url]) {
        // Create a copy of the cached material to avoid shared references
        const materialCopy = textureCache[playable.image_url].clone()
        setMaterial(materialCopy)
      } else {
        const textureLoader = new THREE.TextureLoader()
        textureLoader.load(
          playable.image_url,
          (texture) => {
            texture.colorSpace = THREE.SRGBColorSpace
            const newMaterial = new THREE.MeshStandardMaterial({
              map: texture,
              roughness: 0.4,
              metalness: 0,
              flatShading: true,
            })
            textureCache[playable.image_url] = newMaterial
            setMaterial(newMaterial)
          },
          undefined,
          (error) => {
            console.error('Error loading texture:', error)
          }
        )
      }
    }
  }, [playable.image_url])

  // Handle hover effect
  useEffect(() => {
    const currentRef = (meshRef as React.MutableRefObject<THREE.Mesh | null>).current
    if (clickable && currentRef && hovered) {
      if ((currentRef.material as THREE.MeshStandardMaterial).emissive) {
        (currentRef.material as THREE.MeshStandardMaterial).emissive.setHex(0x333333)
        document.body.style.cursor = 'pointer';
      }
    } else if (currentRef && !hovered) {
      if ((currentRef.material as THREE.MeshStandardMaterial).emissive) {
        (currentRef.material as THREE.MeshStandardMaterial).emissive.setHex(0x000000)
        document.body.style.cursor = 'auto';
      }
    }
  })

  // Handle pointer down event
  const handlePointerDown = (event: any) => {
    // Store the pointer position when the pointer is down
    setPointerDownPosition(new Vector2(event.point.x, event.point.y))
  }

  // Handle pointer up event
  const handlePointerUp = (event: any) => {
    // Only proceed if we have a pointerDownPosition and onClick handler
    if (pointerDownPosition && onClick) {
      // Calculate the distance between pointerdown and pointerup positions
      const pointerUpPosition = new Vector2(event.point.x, event.point.y)
      const distance = pointerDownPosition.distanceTo(pointerUpPosition)

      // Define a threshold for what counts as "no movement"
      const threshold = 0.5 // in Three.js units

      // Only execute onClick if the distance is below the threshold
      if (distance < threshold) {
        onClick()
      }
    }

    // Reset the pointer down position
    setPointerDownPosition(null)
  }

  return (
    <mesh
      ref={meshRef as React.MutableRefObject<THREE.Mesh>}
      position={position}
      rotation={rotation}
      castShadow
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <boxGeometry args={[ALBUM_WIDTH, ALBUM_WIDTH, ALBUM_DEPTH]} />
      {material ? (
        <primitive object={material} attach="material" />
      ) : (
        <meshStandardMaterial
          color={new THREE.Color().setHSL(1, 1, 1, THREE.SRGBColorSpace)}
          roughness={0.5}
          metalness={0}
          flatShading={true}
        />
      )}
    </mesh>
  )
})

export default Album
