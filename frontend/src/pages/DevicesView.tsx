import { useEffect } from 'react'
import { ListGroup, Form } from 'react-bootstrap'
import { useStore } from '../store/useStore'

const DevicesView = () => {
  const { devices, fetchDevices, activateDevice, isLoading } = useStore()
  
  // Fetch devices on mount
  useEffect(() => {
    fetchDevices()
  }, [fetchDevices])
  
  // Handle device activation
  const handleActivateDevice = (deviceId: number) => {
    activateDevice(deviceId)
  }

  
  return (
      <>
      <div className="row"><br/><br/></div>
    <div className="row p-0 m-0">
      {devices.length > 0 ? (
        <Form>
          <ListGroup>
            {devices.map((device) => (
              <ListGroup.Item key={device.device_id} >
                {device.active ? '✔️' : ''} {device.device_name} -- {device.device_type}

                {!device.active &&
                    <button
                    className="m-1 btn btn-primary"
                    onClick={() => handleActivateDevice(device.device_id)}
                  >
                    Activate
                  </button>}

              </ListGroup.Item>
            ))}
          </ListGroup>
        </Form>
      ) : (
        <p>No devices are available.</p>
      )}

      
      {isLoading && (
        <div id="my-loader" className="ldld full light"></div>
      )}
    </div>
          </>
  )
}

export default DevicesView