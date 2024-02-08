import React, { useState, useEffect, useRef } from 'react';
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
  const [horariosDisponibles, setHorariosDisponibles] = useState([]);
  const calendarRef = useRef(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [reservasResponse, salasResponse] = await Promise.all([
          api.getReservas(),
          api.getSalas()
        ]);
        const numerosSalas = salasResponse.data.map(sala => ({ numero: sala.numero, id: sala._id }));
        setSalas(numerosSalas);
        setReservas(reservasResponse.data);
      } catch (error) {
        console.error('Error al solicitar los datos al backend:', error);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    const ref = calendarRef.current;
    const listenSlotClick = (event) => {
      // get nearest elements from click
      const elements = document.elementsFromPoint(event.clientX, event.clientY);
      // get day wrapper
      const dayElement = elements.find((element) =>
        element.matches(".rbc-day-bg")
      );
      if (dayElement) {
        const date = new Date(dayElement.getAttribute("data-date"));
        handler.SelectDate(date);
      }
    };
    if (calendarRef && ref) {
      ref.addEventListener("click", listenSlotClick);
      return () => {
        ref.removeEventListener("click", listenSlotClick);
      };
    }
  }, []);

  const onSelectEvent = (event) => {
    // console.log("Horario clickleado: " + selectedDate);
    // reservas.forEach(reserva => {
    //   console.log(reserva.fecha_inicio);
    // });
  };

  const handler = {
    SelectDate: (date) => {
      setSelectedDate(date);
      setShowModal(true);
    },

    CloseModal: () => {
      setShowModal(false);
      setSelectedSala(null);
      setHorarioInicio(null);
      setHorarioFin(null);
      setSelectedDate(null);
      setHorariosDisponibles(null);
    },

    SalaSelect: async (sala) => {
      try
      {
        setSelectedSala(sala);
      } catch (error) {
        console.error('Error al obtener los horarios disponibles:', error);
      }
    },

    HorarioInicioSelect: (horario) => {
      setHorarioInicio(horario);
    },

    HorarioFinSelect: (horario) => {
      setHorarioFin(horario);
    },

    Submit: () => {
      console.log('Sala seleccionada:', selectedSala);
      console.log('Horario de inicio:', horarioInicio);
      console.log('Horario de fin:', horarioFin);
      handler.CloseModal();
    },
  }

  useEffect(() => {
    if (selectedDate) {
      console.log(selectedDate);
      const fetchHorariosDisponibles = async () => {
        const year = selectedDate.getFullYear();
        const month = ("0" + (selectedDate.getMonth() + 1)).slice(-2);
        const day = ("0" + selectedDate.getDate()).slice(-2);
        const apiDateString = `${year}-${month}-${day}`;
        try {
          const res = await api.getHorariosDisponibles(apiDateString, selectedSala.id);
          setHorariosDisponibles(res.data);
          console.log(horariosDisponibles);
        } catch (error) {
          console.error('Error al obtener los horarios disponibles:', error);
        }
      };
      fetchHorariosDisponibles();
    }
  }, [selectedSala]);
  
  // Función para limitar las opciones del horario de fin
  const limitarHorariosFin = () => {
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


  const eventos = reservas.map(reserva => ({
    title: `${reserva.nombre_reservante} - Sala: ${reserva.sala_numero}`,
    start: new Date(reserva.fecha_inicio),
    end: new Date(reserva.fecha_fin),
  }));

  return (
    <div ref={calendarRef}>
      <Calendar
        components={{
          dateCellWrapper: ({ children, value }) =>
            React.cloneElement(children, { "data-date": value }),
        }}
        localizer={localizer}
        selectable={true}
        onSelectSlot={onSelectEvent}
        style={{ height: 500 }}
        events={eventos}
      />

      <Modal show={showModal} onHide={handler.CloseModal}>
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
                  onClick={() => handler.SalaSelect(sala)}
                >
                  {sala.numero}
                </Dropdown.Item>
              ))}
            </Dropdown.Menu>
          </Dropdown>
          <p>Selecciona un horario de inicio:</p>
          <Dropdown>
            <Dropdown.Toggle variant="primary" id="dropdown-horario-inicio">
              {horarioInicio ? horarioInicio : 'Seleccionar horario de inicio'}
            </Dropdown.Toggle>
              <Dropdown.Menu>
                {Array.isArray(horariosDisponibles) && horariosDisponibles.map(horario => (
                <Dropdown.Item
                  key={horario.id}
                  onClick={() => handler.HorarioInicioSelect(horario)}
                >
                  {horario}
                </Dropdown.Item>
              ))}
            </Dropdown.Menu>
          </Dropdown>
          <p>Selecciona un horario de fin:</p>
          <Dropdown>
            <Dropdown.Toggle variant="primary" id="dropdown-horario-fin">
              {horarioFin ? horarioFin : 'Seleccionar horario de fin'}
            </Dropdown.Toggle>
            <Dropdown.Menu>
            {Array.isArray(horariosDisponibles) && horariosFinLimitados.map(horario => (
                <Dropdown.Item
                  key={horario.id}
                  onClick={() => handler.HorarioFinSelect(horario)}
                >
                  {horario}
                </Dropdown.Item>
              ))}
            </Dropdown.Menu>
          </Dropdown>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handler.CloseModal}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handler.Submit}>
            Guardar reserva
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default Calendario;
