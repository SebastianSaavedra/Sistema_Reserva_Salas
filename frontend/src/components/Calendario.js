import React, { useState, useEffect } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import moment from 'moment';
import { Modal, Button, Dropdown } from 'react-bootstrap';
import 'moment/locale/es';
import api from '../Api';

const localizer = momentLocalizer(moment);

const Calendario = () => {
  const [selectedDate, setSelectedDate] = useState(null);
  const [reservas, setReservas] = useState([]);
  const [salas, setSalas] = useState([]);
  const [selectedSala, setSelectedSala] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [horarioInicio, setHorarioInicio] = useState(null);
  const [horarioFin, setHorarioFin] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [reservasResponse, salasResponse] = await Promise.all([
          api.getReservas(),
          api.getSalas()
        ]);
        const numerosSalas = salasResponse.data.map(sala => ({ numero: sala.numero, id: sala._id }));
        setSalas(numerosSalas);
        setReservas(reservasResponse.data)
      } catch (error) {
        console.error('Error al solicitar los datos al backend:', error);
      }
    };
    fetchData();
  }, []);

  const handleSelectDate = date => {
    setSelectedDate(date);
    setShowModal(true);
    console.log(selectedDate);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedSala(null);
    setHorarioInicio(null);
    setHorarioFin(null);
  };

  const handleSalaSelect = sala => {
    setSelectedSala(sala);
  };

  const handleHorarioInicioSelect = horario => {
    setHorarioInicio(horario);
    api.getHorariosDisponibles(selectedDate,selectedSala._id).then((res) => console.log(res));
  };

  const handleHorarioFinSelect = horario => {
    setHorarioFin(horario);
  };

  const handleSubmit = () => {
    console.log('Sala seleccionada:', selectedSala);
    console.log('Horario de inicio:', horarioInicio);
    console.log('Horario de fin:', horarioFin);
    // Puedes agregar la lógica adicional aquí, como enviar los datos al backend
    handleCloseModal();
  };

  const horarios = [
    { start: '08:00', end: '09:00', label: '8:00 am - 9:00 am' },
    { start: '09:00', end: '10:00', label: '9:00 am - 10:00 am' },
    // Agrega más opciones según sea necesario
  ];

  return (
    <div>
      <Calendar
        localizer={localizer}
        selectable={true}
        onSelectSlot={handleSelectDate}
        style={{ height: 500 }}
        events={[]}
      />

      <Modal show={showModal} onHide={handleCloseModal}>
        <Modal.Header closeButton>
          <Modal.Title>Reservar</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Selecciona una sala:</p>
          <Dropdown>
            <Dropdown.Toggle variant="primary" id="dropdown-basic">
              {selectedSala ? `Sala ${selectedSala.numero}` : 'Sala'}
            </Dropdown.Toggle>
            <Dropdown.Menu>
              {salas.map(sala => (
                <Dropdown.Item
                  key={sala.id}
                  onClick={() => handleSalaSelect(sala)}
                >
                  {sala.numero}
                </Dropdown.Item>
              ))}
            </Dropdown.Menu>
          </Dropdown>
          <p>Selecciona un horario de inicio:</p>
          <Dropdown>
            <Dropdown.Toggle variant="primary" id="dropdown-horario-inicio">
              {horarioInicio ? horarioInicio.label : 'Seleccionar horario de inicio'}
            </Dropdown.Toggle>
            <Dropdown.Menu>
              {horarios.map(horario => (
                <Dropdown.Item
                  key={horario.start}
                  onClick={() => handleHorarioInicioSelect(horario)}
                >
                  {horario.label}
                </Dropdown.Item>
              ))}
            </Dropdown.Menu>
          </Dropdown>
          <p>Selecciona un horario de fin:</p>
          <Dropdown>
            <Dropdown.Toggle variant="primary" id="dropdown-horario-fin">
              {horarioFin ? horarioFin.label : 'Seleccionar horario de fin'}
            </Dropdown.Toggle>
            <Dropdown.Menu>
              {horarios.map(horario => (
                <Dropdown.Item
                  key={horario.start}
                  onClick={() => handleHorarioFinSelect(horario)}
                >
                  {horario.label}
                </Dropdown.Item>
              ))}
            </Dropdown.Menu>
          </Dropdown>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseModal}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleSubmit}>
            Guardar reserva
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default Calendario;