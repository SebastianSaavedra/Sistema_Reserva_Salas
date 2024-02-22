import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { selectOfficeId, getAllOffices } from '../slices/oficinaSlice';
import Container from 'react-bootstrap/Container';
import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';
import Form from 'react-bootstrap/Form';

function NavigationBar() {
  const dispatch = useDispatch();
  const oficinas = useSelector(getAllOffices);
  const [loading, setLoading] = useState(true);
  const [oficinaToggle, setOficinaToggle] = useState('');

  useEffect(() => {
    if (oficinas)
    {
      setOficinaToggle(oficinas[0].nombre);
      setLoading(false);
    }
  }, [oficinas]);

  useEffect(() => {
    if (oficinaToggle) {
      saveStateAndCookies();
    }
  }, [oficinaToggle]);

  const handleToggleChange = () => {
    const currentIndex = oficinas.findIndex(office => office.nombre === oficinaToggle);
    const nextIndex = (currentIndex + 1) % oficinas.length; // Ciclo circular a través de las oficinas
    setOficinaToggle(oficinas[nextIndex].nombre);
  };

  const saveStateAndCookies = () => {
    const currentOffice = oficinas.find(office => office.nombre === oficinaToggle);
    if (currentOffice) {
      dispatch(selectOfficeId(currentOffice.oficina_id));
    }
  };

  return (
    <>
      <Navbar expand="lg" className="bg-body-tertiary">
        <Container>
          <Navbar.Brand href="home">Reserva de Salas</Navbar.Brand>
          <Navbar.Toggle aria-controls="basic-navbar-nav" />
          <Navbar.Collapse id="basic-navbar-nav">
            <Nav className="me-auto">
              <Nav.Link href="/">Calendario</Nav.Link>
            </Nav>
            <Form.Check
              type="switch"
              id="oficinaToggle"
              label={`Oficina ${loading ? 'Cargando...' : oficinaToggle}`}
              onChange={handleToggleChange}
            />
          </Navbar.Collapse>
        </Container>
      </Navbar>
    </>
  );
}

export default NavigationBar;