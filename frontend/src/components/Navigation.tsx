import { Navbar, Nav, Container } from 'react-bootstrap'
import { NavLink, useLocation } from 'react-router-dom'

const Navigation = () => {
  const location = useLocation()
  const path = location.pathname

  return (
    <Navbar expand="sm" fixed="top" bg="light" className="p-0 shadow">
      <Container fluid>
        <Navbar.Brand href="/active_shelf/">VinylWallConfig</Navbar.Brand>
        <Navbar.Toggle aria-controls="responsive-navbar-nav" />
        <Navbar.Collapse id="responsive-navbar-nav">
          <Nav className="me-auto">
            <Nav.Item>
              <Nav.Link 
                as={NavLink} 
                to="/active_shelf" 
                disabled={path.includes('/shelf/')}
              >
                SHELF
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link 
                as={NavLink} 
                to="/shelfpicker" 
                disabled={path === '/shelfpicker'}
              >
                Collection
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link 
                as={NavLink} 
                to="/devices" 
                disabled={path === '/devices'}
              >
                Devices
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link disabled>Albums</Nav.Link>
            </Nav.Item>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  )
}

export default Navigation
