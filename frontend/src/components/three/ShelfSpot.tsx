import {useEffect, useRef, useState} from 'react'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { ShelfSpotData } from '../../types'
import Album from './Album'
import ShelfButton from './ShelfButton'

// Constants from the original ShelfRenderer.js
const ALBUM_WIDTH = 30
const ALBUM_DEPTH = 1
const ALBUM_PADDING_HOR = ALBUM_WIDTH * 0.15
const ALBUM_PADDING_VERT = ALBUM_WIDTH * 0.1
const SHELF_HEIGHT = 3
const SHELF_DEPTH = 15
const SHELF_ANGLE = -3.14 / 12

interface ShelfSpotProps {
  spotData: ShelfSpotData
  onClick?: () => void
  onButtonClick?: () => void
  isEditMode: boolean
}

const ShelfSpot = ({ spotData, onClick, onButtonClick, isEditMode }: ShelfSpotProps) => {
  const shelfRef = useRef<THREE.Mesh>(null)
  const [hovered, setHovered] = useState(false)

  // Load shelf texture
  const [diffuseTexture, aoTexture] = useTexture([
    '/static/configurator/imgs/oak_veneer_01_diff_4k_2.jpg',
    '/static/configurator/imgs/oak_veneer_01_ao_4k_3.jpg'
  ])


  // Calculate positions
  const albumX = (2 * ALBUM_PADDING_HOR + ALBUM_WIDTH) * spotData.col
  const albumY = -(ALBUM_PADDING_VERT + Math.cos(SHELF_ANGLE) * ALBUM_WIDTH + SHELF_HEIGHT) * spotData.row
  const albumZ = ALBUM_DEPTH / 2 - Math.sin(SHELF_ANGLE) * ALBUM_WIDTH / 2

  const shelfX = albumX
  const shelfY = albumY - (Math.cos(SHELF_ANGLE) * ALBUM_WIDTH / 2 + SHELF_HEIGHT / 2)
  const shelfZ = SHELF_DEPTH / 2

  const buttonX = shelfX
  const buttonY = shelfY
  const buttonZ = shelfZ * 2

  // Handle hover effect
  useEffect(() => {
    if (shelfRef.current && hovered) {
      const material = shelfRef.current.material as THREE.MeshStandardMaterial
      material.emissive.setHex(0x333333)
      document.body.style.cursor = 'pointer';
    } else if (shelfRef.current && !hovered) {
      const material = shelfRef.current.material as THREE.MeshStandardMaterial
      material.emissive.setHex(0x000000)
      document.body.style.cursor = 'auto';
    }
  })

  return (
    <group>
      {/* Shelf */}
      <mesh 
        ref={shelfRef}
        position={[shelfX, shelfY, shelfZ]}
        receiveShadow
        castShadow
        onClick={isEditMode ? onClick : undefined}
        onPointerOver={() => isEditMode ? setHovered(true): undefined}
        onPointerOut={() => setHovered(false)}
      >
        <boxGeometry args={[ALBUM_WIDTH + 2 * ALBUM_PADDING_HOR, SHELF_HEIGHT, SHELF_DEPTH]} />
        <meshStandardMaterial
          map={diffuseTexture}
          aoMap={aoTexture}
          roughness={0.5}
          metalness={0}
          transparent={isEditMode && !spotData.id}
          opacity={isEditMode && !spotData.id ? 0.6 : 1}
        />
      </mesh>

      {/* Album */}
      {spotData.playable && (
        <Album 
          playable={spotData.playable}
          position={[albumX, albumY, albumZ]}
          rotation={[SHELF_ANGLE, 0, 0]}
          onClick={onClick}
          clickable={!isEditMode}
        />
      )}

      {/* Button */}
      {spotData.id && (
        <ShelfButton 
          state={spotData.buttonState !== undefined ? spotData.buttonState : (spotData.associated_key === null ? -1 : 1)}
          position={[buttonX, buttonY, buttonZ]}
          rotation={[-Math.PI / 2, 0, 0]}
          onClick={onButtonClick}
          visible={!isEditMode}
        />
      )}
    </group>
  )
}

export default ShelfSpot
