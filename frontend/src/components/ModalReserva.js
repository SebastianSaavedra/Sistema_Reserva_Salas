import React, { useState, useEffect } from 'react';
import { Modal, Button, Dropdown } from 'react-bootstrap';
import moment from 'moment';
import 'moment/locale/es';
import ApiCaller from '../Api';

const ModalReserva = ({
  show,
  selectedDate,
  salas,
  isModifying,
  selectedEvent,
  onClose,
  onModifiedReservation
}) => {
  const api = ApiCaller();
  const [selectedSala, setSelectedSala] = useState(null);
  const [horarioInicio, setHorarioInicio] = useState(null);
  const [horarioFin, setHorarioFin] = useState(null);
  const [horariosDisponibles, setHorariosDisponibles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState();
  
  const createReservationDict = () => {
    const fechaInicio = moment(selectedDate).set({
      hour: parseInt(horarioInicio.split(':')[0]),
      minute: parseInt(horarioInicio.split(':')[1]),
    });
  
    const fechaFin = moment(selectedDate).set({
      hour: parseInt(horarioFin.split(':')[0]),
      minute: parseInt(horarioFin.split(':')[1]),
    });
  
    const reserva = {
      nombre_reservante: 'Seba', // Esto puede ser dinámico según el usuario actual
      sala_numero: parseInt(selectedSala.numero),
      fecha_inicio: fechaInicio.format('YYYY-MM-DDTHH:mm:ss'),
      fecha_fin: fechaFin.format('YYYY-MM-DDTHH:mm:ss'),
      sala_id: selectedSala.id,
    };
  
    if (selectedEvent && selectedEvent.reserva_id) {
      reserva.reserva_id = selectedEvent.reserva_id;
    }
  
    return reserva;
  };
  

  const handler = {
    ResetModal: () => {
        status ? onClose(status.status, status.statusText) : onClose();
        setSelectedSala(null);
        setHorarioInicio(null);
        setHorarioFin(null);
        setHorariosDisponibles([]);
        setStatus(null);
    },

    SalaSelect: (sala) => {
      setSelectedSala(sala);
      if (horarioInicio && horarioFin) {
        setHorarioInicio(null);
        setHorarioFin(null);
      }
    },

    HorarioInicioSelect: (horario) => {
      setHorarioInicio(horario);
      if (horarioFin) {
        setHorarioFin(null);
      }
    },

    HorarioFinSelect: (horario) => {
      setHorarioFin(horario);
    },
    
    submitReservation: async () => {
        try {
        const reservation = createReservationDict();
        setIsLoading(true);
        const result = await api.postReservation(reservation);
        console.log(result);
        setStatus(result);
        } catch (error) {
        console.error('Error al realizar la reserva:', error);
        setIsLoading(false);
        }
    },

    modifyReservation: async () => {
        try {
        const reservationData = createReservationDict();
        setIsLoading(true);
        const result = await api.modifyReservation(selectedEvent.reserva_id, reservationData);
        console.log(result);
        onModifiedReservation(reservationData);
        setStatus(result);
        } catch (error) {
        console.error('Error al modificar la reserva:', error);
        setIsLoading(false);
        }
    },
  }

  useEffect(() => {
    if (selectedEvent) {
      setSelectedSala({ id: selectedEvent.sala_id, numero: selectedEvent.sala_numero });
      setHorarioInicio(moment(selectedEvent.fecha_inicio).format('HH:mm'));
      setHorarioFin(moment(selectedEvent.fecha_fin).format('HH:mm'));
    }
  }, [selectedEvent]);

  useEffect(() => {
    if (status) {
      setIsLoading(false);
      handler.ResetModal();
    }
  }, [status]);

  useEffect(() => {
    if (selectedSala) {
      const fetchHorariosDisponibles = async () => {
        const year = selectedDate.getFullYear();
        const month = ("0" + (selectedDate.getMonth() + 1)).slice(-2);
        const day = ("0" + selectedDate.getDate()).slice(-2);
        const apiDateString = `${year}-${month}-${day}`;
        try {
          const res = await api.getHorariosDisponibles(
            apiDateString, 
            selectedSala.id, 
            isModifying ? selectedEvent.reserva_id : null
          );        
          setHorariosDisponibles(res.data);
        } catch (error) {
          console.error('Error al obtener los horarios disponibles:', error);
        }
      };
      fetchHorariosDisponibles();
    }
  }, [selectedSala]);

  const limitarHorariosFin = () => {
    console.log("h inicio: " + horarioInicio);
    if (!horarioInicio || !horariosDisponibles.length) return [];

    const horaInicioComparable = parseInt(horarioInicio.split(":")[0]);
    const horariosDisponiblesPosteriores = [];

    // Comenzamos a contar desde la hora de inicio + 1 hacia adelante, en intervalos de una hora
    for (let hora = horaInicioComparable + 1; hora < 24; hora++) {
        const horarioActual = `${hora.toString().padStart(2, "0")}:00`; // Formateamos el horario actual
        if (horariosDisponibles.includes(horarioActual)) {
            // Si el horario actual está en la lista de horarios disponibles, lo agregamos a la lista de horarios disponibles posteriores
            horariosDisponiblesPosteriores.push(horarioActual);
        } else {
            // Si el horario actual no está en la lista de horarios disponibles, terminamos el bucle
            break;
        }
    }
    return horariosDisponiblesPosteriores;
  };
  const horariosFinLimitados = limitarHorariosFin();

  return (
    <Modal show={show} onHide={handler.ResetModal}>
      <Modal.Header closeButton>
        <Modal.Title>{isModifying ? `Modificar Reserva ${moment(selectedDate).format('dddd, D [de] MMMM [de] YYYY')}` : `Reservar ${moment(selectedDate).format('dddd, D [de] MMMM [de] YYYY')}`}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div style={{ marginBottom: '15px' }}>
          <h6>Selecciona una sala:</h6>
          <Dropdown>
            <Dropdown.Toggle
              variant="primary"
              id="dropdown-basic"
              disabled={isModifying}
            >
              {selectedSala ? `Sala ${selectedSala.numero}` : 'Sala'}
            </Dropdown.Toggle>
            <Dropdown.Menu>
              {salas.map(sala => (
                <Dropdown.Item
                  key={sala.id}
                  onClick={() => handler.SalaSelect(sala)}
                >
                  {sala.numero}
                </Dropdown.Item>
              ))}
            </Dropdown.Menu>
          </Dropdown>
        </div>
        <div style={{ marginBottom: '15px' }}>
          <h6>Selecciona un horario de inicio:</h6>
          <Dropdown>
            <Dropdown.Toggle variant="primary" id="dropdown-horario-inicio">
              {horarioInicio ? horarioInicio : 'Seleccionar horario de inicio'}
            </Dropdown.Toggle>
            <Dropdown.Menu>
              {horariosDisponibles.map(horario => (
                <Dropdown.Item
                  key={horario}
                  onClick={() => handler.HorarioInicioSelect(horario)}
                >
                  {horario}
                </Dropdown.Item>
              ))}
            </Dropdown.Menu>
          </Dropdown>
        </div>
        <div style={{ marginBottom: '15px' }}>
          <h6>Selecciona un horario de fin:</h6>
          <Dropdown>
            <Dropdown.Toggle variant="primary" id="dropdown-horario-fin">
              {horarioFin ? horarioFin : 'Seleccionar horario de fin'}
            </Dropdown.Toggle>
            <Dropdown.Menu>
            {Array.isArray(horariosDisponibles) && horariosFinLimitados.map(horario => (
                <Dropdown.Item
                  key={horario}
                  onClick={() => handler.HorarioFinSelect(horario)}
                >
                  {horario}
                </Dropdown.Item>
              ))}
            </Dropdown.Menu>
          </Dropdown>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handler.ResetModal} disabled={isLoading}>
          Cancelar
        </Button>
        <Button variant="primary" onClick={isModifying ? handler.modifyReservation : handler.submitReservation} disabled={isLoading}>
          {isModifying ? 'Guardar cambios' : 'Guardar reserva'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default ModalReserva;