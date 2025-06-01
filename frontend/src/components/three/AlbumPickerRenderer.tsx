import { useRef, useEffect, useState, useCallback } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { MapControls } from '@react-three/drei'
import * as THREE from 'three'
import { AlbumLibraryData } from '../../types'
import { useStore } from '../../store/useStore'
import Album from './Album'

// Constants from the original ShelfRenderer.js
const ALBUM_WIDTH = 30
const FOV_ALBUMPICKER = 20
const SHELF_ANGLE = -3.14 / 12

interface AlbumPickerRendererProps {
  searchQuery: string
  albumLibrary: AlbumLibraryData
  onAlbumSelect: (albumId: number) => void
}

const AlbumPickerRenderer = ({ searchQuery, albumLibrary, onAlbumSelect }: AlbumPickerRendererProps) => {
  const { fetchAlbumLibrary} = useStore()
  const [isExpanding, setIsExpanding] = useState(false)
  const controlsRef = useRef<any>(null)
  const camera = useThree((state) => state.camera)
  const albumRefs = useRef<Map<number, THREE.Mesh>>(new Map())

  // Initialize camera
  useEffect(() => {
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = FOV_ALBUMPICKER
      camera.position.z = 130
      camera.lookAt(0, ALBUM_WIDTH / 2, 0)
      camera.updateProjectionMatrix()
    }
  }, [camera])

  // Update album positions and rotations based on camera position
  const updateAlbums = () => {
    if (!camera) return

    albumRefs.current.forEach((albumMesh) => {
      if (!albumMesh) return

      const deltaZ = 18
      const x = albumMesh.position.x - camera.position.x

      // Update Z position - albums closer to camera's focus point come forward
      albumMesh.position.z = deltaZ * Math.pow(Math.E, -1.5 / ALBUM_WIDTH * (Math.abs(x)))

      // Update Y rotation - albums turn to face the camera as they approach the center
      if (Math.abs(x) > ALBUM_WIDTH / 2) {
        albumMesh.rotation.y = (-Math.sign(x) * Math.sin(Math.PI / 4) ** 2) * Math.PI / 2 * 1.3
      } else {
        albumMesh.rotation.y = (-Math.sign(x) * Math.sin(x * (Math.PI / 2) / ALBUM_WIDTH) ** 2) * Math.PI / 2 * 1.3
      }
    })
  }

  // Handle camera movement, pagination, and album animations
  useFrame(() => {
    if (controlsRef.current) {
      // Keep camera at y=0
      controlsRef.current.target.y = 0
      camera.position.y = 0

      // Calculate upper limit for x position
      const upperLimit = (ALBUM_WIDTH * 4 / 5) * (albumLibrary.album_list.length - 1)
      const newX = Math.min(Math.max(camera.position.x, 0), upperLimit)

      // Load more albums when reaching the end
      if (camera.position.x >= upperLimit - ALBUM_WIDTH && !isExpanding && albumLibrary.page < albumLibrary.max_page) {
        setIsExpanding(true)
        fetchAlbumLibrary(searchQuery, albumLibrary.page + 1).then(() => {
          setIsExpanding(false)
        })
      }

      // Update camera position
      controlsRef.current.target.x = newX
      camera.position.x = newX

      // Update album animations
      updateAlbums()
    }
  })

  // Callback ref function to store album refs
  const setAlbumRef = useCallback((id: number) => (instance: THREE.Mesh | null) => {
    if (instance) {
      albumRefs.current.set(id, instance)
    } else {
      albumRefs.current.delete(id)
    }
  }, [])

  // Clean up refs for albums that are no longer in the list
  useEffect(() => {
    const currentIds = new Set(albumLibrary.album_list.map(album => album.id))

    albumRefs.current.forEach((_, id) => {
      if (!currentIds.has(id)) {
        albumRefs.current.delete(id)
      }
    })
  }, [albumLibrary.album_list])

  return (
    <>
      {/* Ambient light */}
      <hemisphereLight intensity={3} position={[50, -36, 20]} />

      {/* Controls */}
      <MapControls 
        ref={controlsRef} 
        enableDamping 
        dampingFactor={0.05} 
        enableZoom={false} 
        screenSpacePanning 
        panSpeed={1.8} 
      />

      {/* Albums */}
      {albumLibrary.album_list.map((album, index) => {
        const x = (ALBUM_WIDTH * 4 / 5) * index

        return (
          <Album
            key={album.id}
            playable={album}
            position={[x, 0, 0]}
            rotation={[-SHELF_ANGLE, 0, 0]}
            onClick={() => onAlbumSelect(album.id)}
            ref={setAlbumRef(album.id)}
            clickable={true}
          />
        )
      })}
    </>
  )
}

export default AlbumPickerRenderer
