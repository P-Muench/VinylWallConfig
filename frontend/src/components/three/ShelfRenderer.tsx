import {useRef, useEffect, useCallback, useLayoutEffect, useState} from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useGLTF, useTexture } from '@react-three/drei'
import { ShelfData, ShelfSpotData } from '../../types'
import { useStore } from '../../store/useStore'
import ShelfSpot from './ShelfSpot'

// Utility function to detect if the device is mobile
const isMobile = (): boolean => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
}

// Constants from the original ShelfRenderer.js
const FOV = 54.4 // 35mm

// Background wall component with texture
const BackgroundWall = () => {
  const [baseTexture, aoTexture, normalTexture] = useTexture([
    '/static/configurator/imgs/Wallpaper_Woodchip_001_basecolor.jpg',
    '/static/configurator/imgs/Wallpaper_Woodchip_001_ambientOcclusion.jpg',
    '/static/configurator/imgs/Wallpaper_Woodchip_001_normal.jpg'
  ])

  // Configure textures
  useLayoutEffect(() => {
    [baseTexture, aoTexture, normalTexture].forEach(texture => {
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping
      texture.repeat.set(14, 14)
    })
  }, [baseTexture, aoTexture, normalTexture])

  return (
    <mesh position={[0, 0, -0.05]} receiveShadow>
      <boxGeometry args={[1000, 1000, 0.1]} />
      <meshStandardMaterial 
        map={baseTexture}
        aoMap={aoTexture}
        normalMap={normalTexture}

      />
    </mesh>
  )
}

// Monstera plant model
const MonsteraModel = () => {
  const { scene } = useGLTF('/static/configurator/assets/monstera.glb')
  const model = useRef<THREE.Group>(null)

  useLayoutEffect(() => {
    if (model.current) {
      // Apply the same transformations as in the original code
      const monsti = model.current.children[0]

      // Calculate bounding sphere for scaling
      const box = new THREE.Box3().setFromObject(monsti)
      const center = new THREE.Vector3()
      box.getCenter(center)
      const bsphere = box.getBoundingSphere(new THREE.Sphere(center))

      // Apply scale and position
      const scale = bsphere.radius * 2 * 60
      monsti.scale.set(scale, scale, scale)
      monsti.position.set(140, -150, 40)

      // Enable shadows
      monsti.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = true
        }
      })
    }
  }, [])

  return <primitive ref={model} object={scene} />
}

// Sofa model
const SofaModel = () => {
  const { scene } = useGLTF('/static/configurator/assets/sofa.glb')
  const model = useRef<THREE.Group>(null)

  useLayoutEffect(() => {
    if (model.current) {
      console.log(model.current)
      // Apply the same transformations as in the original code
      const couch = model.current.children[0]

      // Apply scale and position
      const scale = 2.5
      couch.scale.set(scale, scale, scale)
      couch.position.set(0, -190, 50)
      couch.rotation.z = Math.PI / 2

      // Enable shadows
      couch.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = true
        }
      })
    }
  }, [model])

  return <primitive ref={model} object={scene} />
}

interface ShelfRendererProps {
  shelfData: ShelfData
  onShelfSpotClick?: (shelfSpotId: number) => void
  onShelfButtonClick?: (shelfSpotId: number) => void
}

const ShelfRenderer = ({ shelfData, onShelfSpotClick, onShelfButtonClick }: ShelfRendererProps) => {
  const { isPaused, isEditMode, addShelfSpot, removeShelfSpot } = useStore()
  const [temporarySpots, setTemporarySpots] = useState<ShelfSpotData[]>([])
  const [deviceOrientation, setDeviceOrientation] = useState<{beta: number, gamma: number} | null>(null)
  const [gyroscopeAvailable, setGyroscopeAvailable] = useState<boolean>(false)
  const [isMobileDevice, setIsMobileDevice] = useState<boolean>(false)
  const viewableGroup = useRef<THREE.Group>(null)
  const backgroundGroup = useRef<THREE.Group>(null)
  const allObjectsGroup = useRef<THREE.Group>(null)
  const boundingSphere = useRef<THREE.Sphere | null>(null)
  const lightTargetRef = useRef<THREE.Object3D>(null)
  const pointLightRef = useRef<THREE.PointLight>(null)
  const camera = useThree((state) => state.camera)

  // Initialize camera
  useEffect(() => {
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = FOV
      camera.near = 0.1
      camera.far = 2000
      camera.updateProjectionMatrix()
    }
  }, [camera])

  // Function to handle device orientation events
  const handleDeviceOrientation = useCallback((event: DeviceOrientationEvent) => {
    // Beta is the front-to-back tilt in degrees, where front is positive
    // Gamma is the left-to-right tilt in degrees, where right is positive
    if (event.beta !== null && event.gamma !== null) {

      setDeviceOrientation({
        beta: event.beta,
        gamma: event.gamma
      })
      setGyroscopeAvailable(true)
    }
  }, [])

  // Function to request gyroscope permission
  const requestGyroscopePermission = useCallback(async () => {
    if (typeof DeviceOrientationEvent !== 'undefined' && 
        typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      try {
        const permissionState = await (DeviceOrientationEvent as any).requestPermission()
        if (permissionState === 'granted') {
          window.addEventListener('deviceorientation', handleDeviceOrientation, true)
          return true
        } else {
          console.log('Permission to access device orientation was denied')
          return false
        }
      } catch (error) {
        console.error('Error requesting device orientation permission:', error)
        return false
      }
    } else {
      // For non-iOS 13+ devices, add the event listener directly
      window.addEventListener('deviceorientation', handleDeviceOrientation, true)
      return true
    }
  }, [handleDeviceOrientation])

  // Initialize device orientation and mobile detection
  useEffect(() => {
    // Check if device is mobile
    const mobileCheck = isMobile()
    setIsMobileDevice(mobileCheck)

    if (mobileCheck) {
      // For non-iOS devices or older iOS versions, add the event listener directly
      if (typeof DeviceOrientationEvent === 'undefined' || 
          typeof (DeviceOrientationEvent as any).requestPermission !== 'function') {
        window.addEventListener('deviceorientation', handleDeviceOrientation, true)
      }
      // For iOS 13+, we'll wait for the user to click the permission button
    }

    // Cleanup function to remove event listener
    return () => {
      window.removeEventListener('deviceorientation', handleDeviceOrientation, true)
    }
  }, [handleDeviceOrientation])

  // Create temporary spots when edit mode is toggled
  useEffect(() => {
    if (isEditMode) {
      // Create a dictionary of existing spots by their row and column
      const spotDict: Record<string, boolean> = {}
      shelfData.spot_matrix.forEach(spot => {
        spotDict[`${spot.row},${spot.col}`] = true
      })

      // Create temporary spots around existing ones
      const newTemporarySpots: ShelfSpotData[] = []
      shelfData.spot_matrix.forEach(spot => {
        // Check in 4 directions: up, down, left, right
        [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([rowDelta, colDelta]) => {
          const newRow = spot.row + rowDelta
          const newCol = spot.col + colDelta
          const key = `${newRow},${newCol}`

          // Only add if there's no spot at this position
          if (!spotDict[key]) {
            spotDict[key] = true // Mark as used to avoid duplicates
            newTemporarySpots.push({
              id: 0, // Temporary spots have id 0
              row: newRow,
              col: newCol,
              playable: null,
              associated_key: null
            })
          }
        })
      })

      setTemporarySpots(newTemporarySpots)
      calculateBoundingSphere()
      resizeScene()
    } else {
      // Clear temporary spots when edit mode is toggled off
      setTemporarySpots([])
    }
  }, [isEditMode, shelfData.spot_matrix])

  useLayoutEffect(() => {
    // if (isEditMode && temporarySpots.length > 0) {
      calculateBoundingSphere();
      resizeScene();
    // }
  }, [isEditMode, temporarySpots]);


  // Calculate bounding sphere for all viewable objects
  const calculateBoundingSphere = useCallback(() => {
    if (viewableGroup.current) {
      const box = new THREE.Box3().setFromObject(viewableGroup.current)
      const center = new THREE.Vector3()
      box.getCenter(center)
      boundingSphere.current = box.getBoundingSphere(new THREE.Sphere(center))

      // Position camera based on bounding sphere
      if (boundingSphere.current) {
        const minX = box.min.x
        const minY = box.min.y
        const maxX = box.max.x
        const maxY = box.max.y

        const tan = (deg: number) => Math.tan(deg * Math.PI / 180)

        const vert_fov = camera instanceof THREE.PerspectiveCamera ? camera.fov : FOV
        const aspect = window.innerWidth / window.innerHeight
        const hor_fov = (2 * Math.atan(aspect * tan(vert_fov / 2)) * 180 / Math.PI)

        const dist = Math.max(
          ((maxX - minX) / 2) / tan(hor_fov / 2),
          ((maxY - minY) / 2) / tan(vert_fov / 2)
        ) * 1.1

        camera.position.x = (maxX + minX) / 2
        camera.position.y = (maxY + minY) / 2
        camera.position.z = dist * 1.2

        // Position light target at bounding sphere center
        if (lightTargetRef.current) {
          lightTargetRef.current.position.copy(boundingSphere.current.center)
        }

        // Store original position for hover effect
        camera.userData.originalPosition = new THREE.Vector3().copy(camera.position)
        camera.lookAt(boundingSphere.current.center)
      }
    }
  }, [camera, viewableGroup, lightTargetRef])

  // Recalculate bounding sphere when shelf data changes
  useEffect(() => {
    calculateBoundingSphere()
  }, [shelfData, calculateBoundingSphere])

  // Resize scene function - similar to the vanilla JS implementation
  const resizeScene = useCallback(() => {
    calculateBoundingSphere()
  }, [calculateBoundingSphere])

  // Add window resize event listener
  useEffect(() => {
    const handleResize = () => {
      resizeScene()
    }

    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [resizeScene])

  // Set point light target when refs are initialized
  useLayoutEffect(() => {
    if (pointLightRef.current && lightTargetRef.current && boundingSphere.current) {
      console.log("Init lights")
      // pointLightRef.current.target = lightTargetRef.current
      lightTargetRef.current.position.copy(boundingSphere.current.center)

      // Force shadow map update
      if (pointLightRef.current.shadow) {
        pointLightRef.current.shadow.needsUpdate = true
      }
    }
  }, [boundingSphere])

  // Handle camera position adjustment based on mouse or gyroscope
  useFrame((state) => {
    if (isPaused) return

    if (camera.userData.originalPosition && boundingSphere.current) {
      let newPos: THREE.Vector3

      // Use gyroscope data on mobile devices if available
      if (isMobileDevice && gyroscopeAvailable && deviceOrientation) {
        // Convert gyroscope data to camera movement
        // Beta (front-to-back tilt) affects y position
        // Gamma (left-to-right tilt) affects x position

        // Normalize the values to a range similar to mouse movement (-1 to 1)
        // Beta ranges from -180 to 180, we'll use a smaller range for better control
        // const normalizedBeta = (deviceOrientation.beta + 45) / 180
        let normalizedBeta
        // Gamma ranges from -90 to 90, we'll use a smaller range for better control
        let normalizedGamma

        if (window.innerWidth < window.innerHeight) {
          // Portait
          normalizedGamma = - (deviceOrientation.beta - 45) / 90
          normalizedBeta = deviceOrientation.gamma / 90
        } else {
          // Landscape
          normalizedBeta = 2 * deviceOrientation.beta / 90
          normalizedGamma = (deviceOrientation.gamma + 45) / 90
        }

        const leeWay = 30 // Same as mouse movement

        newPos = new THREE.Vector3(
          camera.userData.originalPosition.x + normalizedBeta * leeWay,
          camera.userData.originalPosition.y + normalizedGamma * leeWay,
          camera.userData.originalPosition.z
        )
      } else {
        // Use mouse movement on desktop or if gyroscope is not available
        const pointer = state.pointer
        const leeWay = 3
        const transform = (p: number) => p // Could use Math.sign(p) * Math.sqrt(Math.abs(p)) for non-linear effect

        newPos = new THREE.Vector3(
          camera.userData.originalPosition.x + transform(pointer.x) * leeWay,
          camera.userData.originalPosition.y + transform(pointer.y) * leeWay,
          camera.userData.originalPosition.z
        )
      }

      camera.position.copy(newPos)
      camera.lookAt(boundingSphere.current.center)
    }
  })

  // Handle adding a new shelf spot
  const handleAddShelfSpot = useCallback((spot: ShelfSpotData) => {
      if (!shelfData?.shelf_id) {
    console.warn("Shelf ID is undefined, cannot add a shelf spot.");
    return;
  }

    if (isEditMode && spot.id === 0) {
      addShelfSpot(shelfData.shelf_id, spot.row, spot.col)
    }
  }, [isEditMode, addShelfSpot, shelfData.shelf_id])

  // Handle removing an existing shelf spot
  const handleRemoveShelfSpot = useCallback((spot: ShelfSpotData) => {
    if (isEditMode && spot.id !== 0) {
      removeShelfSpot(shelfData.shelf_id, spot.row, spot.col)
    }
  }, [isEditMode, removeShelfSpot, shelfData.shelf_id])

  // Add a visual indicator for gyroscope status with permission button
  useEffect(() => {
    // Create a container div for the gyroscope status and button
    const containerDiv = document.createElement('div')
    containerDiv.id = 'gyroscope-container'
    containerDiv.style.position = 'fixed'
    containerDiv.style.bottom = '10px'
    containerDiv.style.right = '10px'
    containerDiv.style.display = 'flex'
    containerDiv.style.flexDirection = 'column'
    containerDiv.style.alignItems = 'flex-end'
    containerDiv.style.gap = '5px'
    containerDiv.style.zIndex = '1000'

    // Create a button for requesting gyroscope permission
    const permissionButton = document.createElement('button')
    permissionButton.id = 'gyroscope-permission-button'
    permissionButton.textContent = 'Enable Gyroscope'
    permissionButton.style.padding = '5px 10px'
    permissionButton.style.borderRadius = '5px'
    permissionButton.style.fontSize = '12px'
    permissionButton.style.backgroundColor = '#007bff'
    permissionButton.style.color = 'white'
    permissionButton.style.border = 'none'
    permissionButton.style.cursor = 'pointer'
    permissionButton.style.display = 'none' // Hide by default

    // Add click event listener to the button
    permissionButton.addEventListener('click', async () => {
      const success = await requestGyroscopePermission()
      if (success) {
        permissionButton.style.display = 'none'
      }
    })

    // Add elements to the container
    containerDiv.appendChild(permissionButton)

    // Add the container to the document body
    document.body.appendChild(containerDiv)

    // Check if we need to show the permission button
    const needsPermissionButton = 
      isMobileDevice && 
      !gyroscopeAvailable && 
      typeof DeviceOrientationEvent !== 'undefined' && 
      typeof (DeviceOrientationEvent as any).requestPermission === 'function'

    if (needsPermissionButton) {
      permissionButton.style.display = 'block'
    }

    // Cleanup function
    return () => {
      if (document.body.contains(containerDiv)) {
        document.body.removeChild(containerDiv)
      }
    }
  }, [isMobileDevice, gyroscopeAvailable, requestGyroscopePermission])

  return (
    <>
      {/* Ambient light */}
      <hemisphereLight intensity={1.4} position={[50, -36, 20]} />

      {/* Point light with shadow */}
      <object3D ref={lightTargetRef} position={[0, 0, 0]} />
      <pointLight 
        ref={pointLightRef}
        intensity={1.7}
        decay={0.1}
        color={0xfff5f6}
        position={[20, 50, 200]} 
        castShadow 
        shadow-mapSize-width={1024 * 4}
        shadow-mapSize-height={1024 * 4}
        shadow-camera-near={0.5}
        shadow-camera-far={1000}
      />

      {/* Group containing all objects for bounding sphere calculation */}
      <group ref={allObjectsGroup}>

        {/* Background group containing static elements */}
        <group ref={backgroundGroup}>
          {/* Background with wallpaper texture */}
          <BackgroundWall />
          {/* 3D Models */}
          <SofaModel />
          <MonsteraModel />
        </group>
        {/* Viewable group containing all shelf spots */}
        <group ref={viewableGroup}>
          {/* Regular shelf spots */}
          {shelfData.spot_matrix.map((spot) => (
            <ShelfSpot 
              key={`regular-${spot.id}`}
              spotData={spot}
              onClick={isEditMode 
                ? () => handleRemoveShelfSpot(spot) 
                : onShelfSpotClick 
                  ? () => onShelfSpotClick(spot.id) 
                  : undefined}
              isEditMode={isEditMode}
              onButtonClick={onShelfButtonClick ? () => onShelfButtonClick(spot.id) : undefined}
            />
          ))}

          {/* Temporary shelf spots in edit mode */}
          {isEditMode && temporarySpots.map((spot) => (
            <ShelfSpot 
              key={`temp-${spot.row}-${spot.col}`}
              spotData={spot}
              onClick={() => handleAddShelfSpot(spot)}
              isEditMode={isEditMode}
              onButtonClick={undefined}

            />
          ))}
        </group>
      </group>

    </>
  )
}

export default ShelfRenderer
