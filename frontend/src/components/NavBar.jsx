import { Container, Nav, Navbar } from 'react-bootstrap';
import cencoLogo from '../logo.svg';

function NavigationBar() {
  
  return (
    <>
      <Navbar expand="lg" className="bg-body-tertiary">
        <Container fluid>
          <Navbar.Brand href="home">
            <img src={cencoLogo} alt="Centro de Reservas" />
            Centro de Reservas
          </Navbar.Brand>
          {/* <Navbar.Toggle aria-controls="basic-navbar-nav" />
          <Navbar.Collapse id="basic-navbar-nav">
            <Nav className="me-auto">
              <Nav.Link href="/">Calendario</Nav.Link>
            </Nav>
          </Navbar.Collapse> */}
        </Container>
      </Navbar>
    </>
  );
}

export default NavigationBar;