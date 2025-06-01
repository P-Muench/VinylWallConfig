import { Routes, Route } from 'react-router-dom'
import { Container } from 'react-bootstrap'
import Navigation from './components/Navigation'
import ShelfView from './pages/ShelfView'
import ShelfPickerView from './pages/ShelfPickerView'
import DevicesView from './pages/DevicesView'

function App() {
  return (
    <Container fluid className="min-vh-100 d-flex flex-column">
      <Navigation />
      <Routes>
        <Route path="/" element={<ShelfView />} />
        <Route path="/active_shelf" element={<ShelfView />} />
        <Route path="/shelf/:shelfId" element={<ShelfView />} />
        <Route path="/shelfpicker" element={<ShelfPickerView />} />
        <Route path="/devices" element={<DevicesView />} />
      </Routes>
    </Container>
  )
}

export default App