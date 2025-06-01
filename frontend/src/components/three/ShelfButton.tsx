import {useEffect, useRef, useState} from 'react'
import * as THREE from 'three'

// Constants from the original ShelfRenderer.js
const SHELF_HEIGHT = 3

interface ShelfButtonProps {
    state: number // 0: yellow, -1: red, 1: green
    position: [number, number, number]
    rotation: [number, number, number]
    onClick?: () => void
    visible?: boolean
}

const ShelfButton = ({state, position, rotation, onClick, visible = true}: ShelfButtonProps) => {
    const buttonRef = useRef<THREE.Mesh>(null)
    const [hovered, setHovered] = useState(false)

    // Get color based on state
    const getStateColor = (): THREE.Color => {
        if (state === 0) {
            return new THREE.Color(252 / 255, 226 / 255, 5 / 255) // Yellow
        }
        if (state < 0) {
            return new THREE.Color(0.8, 0, 0) // Red
        }
        return new THREE.Color(0, 0.9, 0) // Green
    }

    // Handle hover effect
    useEffect(() => {
        if (buttonRef.current && hovered) {
            if ((buttonRef.current.material as THREE.MeshStandardMaterial).emissive) {
                (buttonRef.current.material as THREE.MeshStandardMaterial).emissive.setHex(0x333333)
                document.body.style.cursor = 'pointer';
            }
        } else if (buttonRef.current && !hovered) {
            if ((buttonRef.current.material as THREE.MeshStandardMaterial).emissive) {
                (buttonRef.current.material as THREE.MeshStandardMaterial).emissive.setHex(0x000000)
                document.body.style.cursor = 'auto';
            }
        }
    })

    const buttonRadius = SHELF_HEIGHT * 0.9 / 2

    if (!visible) return null

    return (
        <group position={position} rotation={rotation}>
            {/* Button socket */}
            <mesh position={[0, 0, 0]} castShadow>
                <cylinderGeometry args={[buttonRadius * 1.1, buttonRadius * 1.1, 0.1, 30]}/>
                <meshStandardMaterial
                    color={new THREE.Color(0.8, 0.8, 0.8)}
                    roughness={0.5}
                    metalness={0.7}
                    flatShading={true}
                />
            </mesh>

            {/* Button */}
            <mesh
                ref={buttonRef}
                position={[0, 0, 0.3]}
                castShadow
                onClick={onClick}
                onPointerOver={() => setHovered(true)}
                onPointerOut={() => setHovered(false)}
            >
                <cylinderGeometry args={[buttonRadius, buttonRadius, 0.5, 30]}/>
                <meshStandardMaterial
                    color={getStateColor()}
                    roughness={0.5}
                    metalness={0.3}
                />
            </mesh>
        </group>
    )
}

export default ShelfButton