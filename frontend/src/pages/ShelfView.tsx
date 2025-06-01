import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Canvas } from '@react-three/fiber'
import { Modal } from 'react-bootstrap'
import * as THREE from 'three'
import { useStore } from '../store/useStore'
import ShelfRenderer from '../components/three/ShelfRenderer'
import AlbumPicker from '../components/AlbumPicker'

const ShelfView = () => {
  const { shelfId } = useParams<{ shelfId: string }>()
  const { 
    currentShelf, 
    fetchShelf,
    fetchActiveShelf,
    isLoading, 
    togglePause, 
    isEditMode, 
    toggleEditMode,
    modalMessage,
    showModal,
    setShowModal,
    connectWebSocket,
    disconnectWebSocket,
    setShelfSpotPlayable,
    sendWebSocketMessage
  } = useStore()

  const [showAlbumPicker, setShowAlbumPicker] = useState(false)
  const [selectedShelfSpotId, setSelectedShelfSpotId] = useState<number | null>(null)

  // Fetch shelf data on mount and when shelfId changes
  useEffect(() => {
    const fetchData = async () => {
      try {
        let id: number;

        if (shelfId) {
          // If shelfId is provided, use it
          id = parseInt(shelfId);
          fetchShelf(id);
        } else {
          // If no shelfId is provided, fetch the active shelf
          const activeShelf = await fetchActiveShelf();
          id = activeShelf.shelf_id;
        }

        // Connect to WebSocket with the appropriate ID
        connectWebSocket(id);
      } catch (error) {
        console.error('Error fetching shelf data:', error);
      }
    };

    fetchData();

    // Cleanup WebSocket on unmount
    return () => {
      disconnectWebSocket();
    };
  }, [shelfId, fetchShelf, fetchActiveShelf, connectWebSocket, disconnectWebSocket])

  // Handle shelf spot click
  const handleShelfSpotClick = (shelfSpotId: number) => {
    if (isEditMode) return

    setSelectedShelfSpotId(shelfSpotId)
    togglePause()
    setShowAlbumPicker(true)
  }

  // Handle album selection
  const handleAlbumSelect = (albumId: number) => {
    if (selectedShelfSpotId !== null) {
      setShelfSpotPlayable(selectedShelfSpotId, albumId)
      setShowAlbumPicker(false)
      togglePause()
      setSelectedShelfSpotId(null)
    }
  }

  // Handle album picker close
  const handleAlbumPickerClose = () => {
    setShowAlbumPicker(false)
    togglePause()
    setSelectedShelfSpotId(null)
  }

  // Handle shelf button click - sends message to WebSocket
  const handleShelfButtonClick = (shelfSpotId: number) => {
    if (isEditMode) return

    // Send the shelfspot_id to the WebSocket
    sendWebSocketMessage(shelfSpotId)
  }

  if (!currentShelf) {
    return <div>Loading...</div>
  }

  return (
    <>
      <div className="canvas-container">
        <Canvas 
          shadows={{ type: THREE.BasicShadowMap }}
          gl={{ antialias: true, alpha: true, powerPreference: "high-performance"}}

        >
          <ShelfRenderer 
            shelfData={currentShelf} 
            onShelfSpotClick={handleShelfSpotClick}
            onShelfButtonClick={handleShelfButtonClick}
          />
        </Canvas>

        <button id="editButton" onClick={toggleEditMode}>
          <svg width="64" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-labelledby="title"
               aria-describedby="desc" role="img" xmlnsXlink="http://www.w3.org/1999/xlink">
            <circle strokeWidth="1" strokeMiterlimit="10" stroke="#b0b0b0"
                    fill="white" r="30" cy="32" cx="32" data-name="layer1" strokeLinejoin="round"
                    strokeLinecap="round"></circle>
            <path strokeWidth="2"
                  strokeMiterlimit="10" stroke="#202020" fill="none"
                  d="M44.889 26.138l1.882-1.883c1.941-1.94 1.439-4.584-.5-6.524s-4.584-2.442-6.525-.5l-1.882 1.883"
                  data-name="layer2" strokeLinejoin="round" strokeLinecap="round"></path>
            <path d="M41.814 29.212l3.075-3.074-7.027-7.027-3.074 3.074M18.164 38.809l7.026 7.026"
                  strokeWidth="2" strokeMiterlimit="10" stroke="#202020" fill="none" data-name="layer2"
                  strokeLinejoin="round" strokeLinecap="round"></path>
            <path d="M25.19 45.835l16.624-16.623-7.026-7.027-16.624 16.624L16 47.999l9.19-2.164z"
                  strokeWidth="2" strokeMiterlimit="10" stroke="#202020" fill="none" data-name="layer2"
                  strokeLinejoin="round" strokeLinecap="round"></path>
          </svg>
        </button>

        {isLoading && (
          <div id="my-loader" className="ldld full light"></div>
        )}

        {showAlbumPicker && (
          <AlbumPicker
            onSelect={handleAlbumSelect} 
            onClose={handleAlbumPickerClose} 
          />
        )}
      </div>

      <Modal 
        show={showModal} 
        onHide={() => setShowModal(false)}
        backdrop="static"
        keyboard={false}
        centered
      >
        <Modal.Body id="myModalText">
          <>
            Press Button to connect. You have
            {/*<br>*/}
              <h1 style={{textAlign: 'center'}}>
                {modalMessage}
              </h1>
            {/*<br>*/}
              seconds
          </>
        </Modal.Body>
      </Modal>
    </>
  )
}

export default ShelfView
