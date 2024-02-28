// import { useState, useEffect } from 'react';
// import { useDispatch, useSelector } from 'react-redux';
// import { setOfficeId, getAllOffices } from '../slices/oficinaSlice';
import { Container, Nav, Navbar/*, Dropdown*/ } from 'react-bootstrap';

function NavigationBar() {
  // const dispatch = useDispatch();
  // const oficinas = useSelector(getAllOffices);
  // const [loading, setLoading] = useState(true);
  // const [selectedOffice, setOffice] = useState('');

  // useEffect(() => {
  //   if (oficinas)
  //   {
  //     setOffice(oficinas[0].nombre);
  //     dispatch(setOfficeId(oficinas[0].oficina_id));
  //     setLoading(false);
  //   }
  // }, [oficinas]);

  // const saveOffice_ReduxState = (office) => {
  //   setOffice(office.nombre);
  //   dispatch(setOfficeId(office.oficina_id));
  // }; 
  
  return (
    <>
      <Navbar expand="lg" className="bg-body-tertiary">
        <Container>
          <Navbar.Brand href="home">Reserva de Salas</Navbar.Brand>
          <Navbar.Toggle aria-controls="basic-navbar-nav" />
          <Navbar.Collapse id="basic-navbar-nav">
            <Nav className="me-auto">
              {/* <Nav.Link href="/">Calendario</Nav.Link> */}
            </Nav>
            {/* <Dropdown>
              <Dropdown.Toggle
                variant=""
                id="dropdown-basic"
              >
                {`Oficina ${loading ? 'Cargando...' : selectedOffice}`}
              </Dropdown.Toggle>
              <Dropdown.Menu>
                {oficinas && oficinas.map(office => (
                  <Dropdown.Item
                    key={office.id}
                    onClick={() => saveOffice_ReduxState(office)}
                  >
                    {office.nombre}
                  </Dropdown.Item>
                ))}
              </Dropdown.Menu>
          </Dropdown> */}
          </Navbar.Collapse>
        </Container>
      </Navbar>
    </>
  );
}

export default NavigationBar;