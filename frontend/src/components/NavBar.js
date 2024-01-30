import Container from 'react-bootstrap/Container';
import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';
import axios from 'axios';
import React, { useState, useEffect } from 'react';
import api from '../Api';

function NavigationBar(oficinaSeleccionada) {
  return (
    <>
      {oficinaSeleccionada && (
        <Navbar expand="lg" className="bg-body-tertiary">
          <Container>
            <Navbar.Brand href="#home">Barra de Navegación</Navbar.Brand>
            <Navbar.Toggle aria-controls="basic-navbar-nav" />
            <Navbar.Collapse id="basic-navbar-nav">
              <Nav className="me-auto">
                <Nav.Link href="#home">Home</Nav.Link>
                {oficinaSeleccionada && <Nav.Link href="#calendario">Calendario</Nav.Link>}
                {oficinaSeleccionada && <Nav.Link href="#reservas">Mis Reservas</Nav.Link>}
              </Nav>
            </Navbar.Collapse>
          </Container>
        </Navbar>
      )}
    </>
  );
}

export default NavigationBar;
